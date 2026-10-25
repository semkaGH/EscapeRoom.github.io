import * as THREE from "three";
import { AudioSystem } from "./audio";
import { DOOR_CODE, LAYOUT, MONSTER, PLAYER, QUALITY, SAVE_KEY, ZIPLINE } from "./config";
import { GameLoop } from "./engine";
import { Input } from "./input";
import { Watcher } from "./monster";
import { GameStateMachine } from "./state";
import { storage } from "./storage";
import { GameUI } from "./ui";
import { RoomWorld } from "./world";
import type { DebugSnapshot, EscapeRoute, Interactable, Inventory, PlayMode, PuzzleState, RunStats, SavedProgress } from "./types";

interface Cinematic {
  kind: "escape" | "caught";
  route: EscapeRoute | null;
  time: number;
  duration: number;
  start: THREE.Vector3;
}

interface Room13TestApi {
  start: () => void;
  restart: () => void;
  teleport: (x: number, z: number, yaw?: number, pitch?: number) => void;
  interact: (id: string) => void;
  closeModal: () => void;
  keypad: (code: string) => void;
  submitCode: () => void;
  setMonster: (x: number, z: number, chase?: boolean) => void;
  forceCatch: () => void;
  setZiplineBalance: (value: number) => void;
  snapshot: () => DebugSnapshot;
}

declare global {
  interface Window {
    __gameProbe?: () => { x: number; y: number; z: number };
    __GAME_READY__?: boolean;
    __gameDebug?: () => DebugSnapshot;
    __room13Test?: Room13TestApi;
  }
}

const _eye = new THREE.Vector3();
const _toInteraction = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _zipPoint = new THREE.Vector3();
const _zipAhead = new THREE.Vector3();
const _titleTarget = new THREE.Vector3(-0.6, 1.35, -1.4);

export class EscapeGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(69, 1, 0.05, 160);
  private world: RoomWorld;
  private watcher: Watcher;
  private input: Input;
  private audio = new AudioSystem();
  private ui: GameUI;
  private state = new GameStateMachine();
  private loop: GameLoop;
  private progress: SavedProgress;
  private interactables: Interactable[] = [];
  private currentInteraction: Interactable | null = null;
  private abort = new AbortController();
  private stateOff: () => void;

  private mode: PlayMode = "explore";
  private modeBeforePause: PlayMode = "explore";
  private inventory: Inventory = { crowbar: false, fuse: false, rope: false, handle: false, note: false, battery: false };
  private puzzles: PuzzleState = { boardsRemoved: 0, power: false, doorUnlocked: false, ziplineReady: false };
  private stats: RunStats = { elapsed: 0, closeCalls: 0, deaths: 0, route: null };
  private player = new THREE.Vector3(0, 0, 3.4);
  private hideReturn = new THREE.Vector3();
  private velocity = new THREE.Vector2();
  private cameraForward = new THREE.Vector3(0, 0, -1);
  private yaw = 0;
  private pitch = 0;
  private hideYaw = 0;
  private eyeHeight: number = PLAYER.eyeHeight;
  private stamina = 100;
  private battery = 100;
  private noise = 0;
  private flashlight = false;
  private stepDistance = 0;
  private bobPhase = 0;
  private movedDistance = 0;
  private heartbeatTimer = 0;
  private shake = 0;
  private keypadEntry = "";
  private cinematic: Cinematic | null = null;
  private zip = { time: 0, balance: 0, velocity: 0, sound: 0 };
  private time = 0;
  private hudTimer = 0;
  private tutorialStage = 0;
  private tutorialTimer = 0;
  private lastPrompt = "";
  private ready = false;
  private disposed = false;
  private highQuality = true;
  private lowFpsTimer = 0;
  private fps = 60;
  private lastFrame = performance.now();

  constructor(private canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0x05080d);
    this.scene.fog = new THREE.Fog(0x081018, 11, 58);
    this.scene.add(this.camera);
    this.world = new RoomWorld(this.scene);
    this.world.attachCamera(this.camera);
    this.watcher = new Watcher(this.scene, this.world);
    this.input = new Input(canvas);
    this.progress = this.loadProgress();
    this.ui = new GameUI(overlay, {
      start: () => this.start(), resume: () => this.resume(), restart: () => this.restart(), menu: () => this.menu(),
      closeModal: () => this.closeModal(), mute: () => { this.audio.toggleMute(); this.ui.setMuted(this.audio.muted); },
      keypadInput: digit => this.keypadInput(digit), keypadClear: () => { this.keypadEntry = ""; },
      keypadSubmit: () => this.submitCode(),
    });
    this.ui.setMuted(this.audio.muted);
    this.ui.setProgress(this.progress);
    this.ui.setLoading(true);
    this.setupInteractables();
    this.stateOff = this.state.onChange(phase => {
      this.ui.setPhase(phase);
      if (phase === "title") { this.ui.setProgress(this.progress); this.world.setPower(true); this.world.setTitleLighting(true); }
    });
    this.ui.setPhase("title");
    this.resetRun();
    this.world.setPower(true);
    this.world.setTitleLighting(true);
    this.onResize();
    this.bindEvents();
    this.loop = new GameLoop({ update: dt => this.update(dt), render: () => this.render() });
    this.loop.start();
    void this.load();
    this.exposeProbes();
  }

  private async load(): Promise<void> {
    try {
      await this.world.loadAssets();
    } catch (error) {
      console.warn("An optional asset could not be loaded; procedural fallbacks remain available.", error);
    }
    if (this.disposed) { this.world.dispose(); return; }
    this.ready = true;
    this.world.reset();
    if (this.state.is("title")) { this.world.setPower(true); this.world.setTitleLighting(true); }
    this.ui.setLoading(false);
  }

  private bindEvents(): void {
    const signal = this.abort.signal;
    window.addEventListener("resize", () => this.onResize(), { signal });
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== this.canvas && this.state.is("playing") && ["explore", "hidden", "zipline"].includes(this.mode)) this.pause();
    }, { signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state.is("playing")) this.pause();
    }, { signal });
    this.canvas.addEventListener("click", () => {
      if (this.state.is("playing") && this.mode === "explore") this.requestPointer();
    }, { signal });
  }

  private requestPointer(): void {
    if (document.pointerLockElement === this.canvas) return;
    try {
      const result = this.canvas.requestPointerLock();
      if (result) void result.catch(() => undefined);
    } catch { /* keyboard play remains available when pointer lock is blocked */ }
  }

  private releasePointer(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onResize(): void {
    const width = window.innerWidth, height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  start(): void {
    if (!this.ready || !this.state.is("title")) return;
    this.audio.sfx("ui");
    this.resetRun();
    this.state.transition("playing");
    this.requestPointer();
    this.ui.showToast("Найдите любой из трёх выходов. Tab — заметки.");
  }

  restart(): void {
    if (this.state.is("title")) return;
    this.audio.sfx("ui");
    this.resetRun();
    this.state.transition("playing");
    this.requestPointer();
  }

  menu(): void {
    if (this.state.is("title")) return;
    this.resetRun();
    this.state.transition("title");
    this.releasePointer();
  }

  pause(): void {
    if (!this.state.is("playing")) return;
    if (["note", "keypad", "journal"].includes(this.mode)) { this.closeModal(); return; }
    this.modeBeforePause = this.mode;
    this.state.transition("paused");
    this.ui.setPrompt("");
    this.audio.setDanger(0);
    if (this.mode === "zipline") this.audio.setZipline(false);
    this.releasePointer();
  }

  resume(): void {
    if (!this.state.is("paused")) return;
    this.audio.sfx("ui");
    this.mode = this.modeBeforePause;
    this.state.transition("playing");
    if (this.mode === "zipline") this.audio.setZipline(true);
    if (!["note", "keypad", "journal", "cinematic"].includes(this.mode)) this.requestPointer();
  }

  closeModal(): void {
    if (!["note", "keypad", "journal"].includes(this.mode)) return;
    this.audio.sfx("ui");
    this.mode = "explore";
    this.ui.closeModals();
    this.requestPointer();
  }

  private resetRun(): void {
    this.inventory = { crowbar: false, fuse: false, rope: false, handle: false, note: false, battery: false };
    this.puzzles = { boardsRemoved: 0, power: false, doorUnlocked: false, ziplineReady: false };
    this.stats = { elapsed: 0, closeCalls: 0, deaths: 0, route: null };
    this.player.set(0, 0, 3.4);
    this.hideReturn.copy(this.player);
    this.velocity.set(0, 0);
    this.yaw = 0; this.pitch = 0; this.eyeHeight = PLAYER.eyeHeight;
    this.stamina = 100; this.battery = 100; this.noise = 0; this.flashlight = true;
    this.stepDistance = this.bobPhase = this.movedDistance = this.heartbeatTimer = this.shake = 0;
    this.mode = "explore"; this.modeBeforePause = "explore";
    this.cinematic = null;
    this.zip = { time: 0, balance: 0, velocity: 0, sound: 0 };
    this.currentInteraction = null; this.lastPrompt = "";
    this.tutorialStage = 0; this.tutorialTimer = 0;
    this.world.reset();
    this.watcher.reset();
    this.input.actions.clear();
    this.ui.closeModals();
    this.ui.hideControls();
    this.ui.setCinematic(false);
    this.ui.setZipline(false);
    this.ui.showJumpscare(false);
    this.ui.setDanger(0, false);
    this.ui.setPrompt("");
    this.ui.setTutorial("WASD — идти · Мышь — осмотреться");
    this.audio.setDanger(0);
    this.audio.setZipline(false);
  }

  private setupInteractables(): void {
    const add = (value: Interactable) => this.interactables.push(value);
    const pickups: Array<{ id: "crowbar" | "rope" | "handle" | "fuse" | "battery"; position: [number, number, number]; label: string }> = [
      { id: "crowbar", position: [-1.25, 0.25, 0.5], label: "Взять монтировку" },
      { id: "rope", position: [7.1, 0.9, 0.58], label: "Взять трос" },
      { id: "handle", position: [-4.35, 1.05, -3.25], label: "Взять рукоятку" },
      { id: "fuse", position: [8.98, 1.43, 0.72], label: "Взять предохранитель" },
      { id: "battery", position: [8.98, 1.43, 3.55], label: "Взять батарею" },
    ];
    for (const item of pickups) {
      add({ id: item.id, position: { x: item.position[0], y: item.position[1], z: item.position[2] }, radius: 0.75, maxDistance: 2.25,
        prompt: () => item.label, enabled: () => !this.inventory[item.id], action: () => this.pickup(item.id, item.label.replace("Взять ", "")) });
    }
    add({ id: "note", position: { x: 3.35, y: 1.05, z: 3.7 }, radius: 0.8, maxDistance: 2.3,
      prompt: () => "Прочитать записку", enabled: () => !this.inventory.note,
      action: () => {
        this.pickup("note", "записку");
        this.mode = "note";
        this.ui.showNote();
        this.releasePointer();
      } });
    add({ id: "window", position: { x: -5.55, y: 2.0, z: -1.15 }, radius: 1.25, maxDistance: 2.65,
      enabled: () => true,
      prompt: () => this.puzzles.boardsRemoved >= 3 ? "Вылезти через окно" : this.inventory.crowbar ? `Сорвать доску (${this.puzzles.boardsRemoved} / 3)` : "Осмотреть заколоченное окно",
      action: () => {
        if (this.puzzles.boardsRemoved >= 3) { this.beginEscape("window"); return; }
        if (!this.inventory.crowbar) { this.ui.showToast("Доски прибиты намертво. Нужна монтировка."); this.audio.sfx("error"); return; }
        this.puzzles.boardsRemoved++;
        this.world.setBoardsRemoved(this.puzzles.boardsRemoved);
        this.audio.sfx("pry");
        this.shake = 0.28;
        this.emitNoise(10, 0.9);
        if (this.puzzles.boardsRemoved === 3) {
          this.world.openWindow();
          this.ui.showToast("Путь открыт. Ещё раз нажмите E, чтобы вылезти.", "item");
          this.audio.sfx("unlock");
        } else this.ui.showToast(`Доска сорвана: ${this.puzzles.boardsRemoved} / 3`);
      } });
    add({ id: "fusebox", position: { x: 0.65, y: 1.45, z: -4.55 }, radius: 0.85, maxDistance: 2.25,
      enabled: () => !this.puzzles.power, prompt: () => this.inventory.fuse ? "Вставить предохранитель" : "Осмотреть щиток",
      action: () => {
        if (!this.inventory.fuse) { this.ui.showToast("Один предохранитель отсутствует. Поищите в кладовой."); this.audio.sfx("error"); return; }
        this.puzzles.power = true;
        this.world.setPower(true);
        this.audio.sfx("fuse");
        this.emitNoise(4, 0.3);
        this.ui.showToast("Питание восстановлено. Кодовый замок активен.", "item");
      } });
    add({ id: "keypad", position: { x: 3.68, y: 1.4, z: -4.55 }, radius: 0.75, maxDistance: 2.15,
      enabled: () => !this.puzzles.doorUnlocked, prompt: () => this.puzzles.power ? "Ввести код" : "Осмотреть кодовый замок",
      action: () => {
        if (!this.puzzles.power) { this.ui.showToast("Замок обесточен. Нужен предохранитель для щитка."); this.audio.sfx("error"); return; }
        this.mode = "keypad";
        this.keypadEntry = "";
        this.ui.showKeypad();
        this.releasePointer();
      } });
    add({ id: "door", position: { x: LAYOUT.door.x, y: 1.25, z: -4.55 }, radius: 1.05, maxDistance: 2.35,
      enabled: () => true, prompt: () => this.puzzles.doorUnlocked ? "Открыть дверь и выйти" : "Дёрнуть ручку двери",
      action: () => {
        if (!this.puzzles.doorUnlocked) { this.ui.showToast("Дверь держит электронный замок. Нужны питание и код."); this.audio.sfx("latch"); return; }
        this.beginEscape("door");
      } });
    add({ id: "hatch", position: { x: LAYOUT.hatch.x, y: 3.4, z: LAYOUT.hatch.z }, radius: 1.1, maxDistance: 3.35,
      enabled: () => true,
      prompt: () => this.puzzles.ziplineReady ? "Подняться на чердак и скользнуть по тросу" : this.inventory.rope && this.inventory.handle ? "Собрать зиплайн у люка" : "Осмотреть чердачный люк",
      action: () => {
        if (this.puzzles.ziplineReady) { this.beginEscape("attic"); return; }
        if (!this.inventory.rope || !this.inventory.handle) {
          const missing = [!this.inventory.rope ? "трос" : "", !this.inventory.handle ? "рукоятка" : ""].filter(Boolean).join(" и ");
          this.ui.showToast(`Для спуска с чердака не хватает: ${missing}.`);
          this.audio.sfx("error"); return;
        }
        this.puzzles.ziplineReady = true;
        this.world.setZiplineReady(true);
        this.audio.sfx("latch");
        this.emitNoise(7.5, 0.65);
        this.ui.showToast("Зиплайн готов. Ещё раз нажмите E у люка.", "item");
      } });
    add({ id: "hide-bed", position: { x: -2.75, y: 0.55, z: 0.38 }, radius: 1.2, maxDistance: 2.1,
      enabled: () => true, prompt: () => "Спрятаться под кроватью", action: () => this.enterHide("bed") });
    add({ id: "hide-wardrobe", position: { x: 4.85, y: 1.4, z: -3.12 }, radius: 1.1, maxDistance: 2.25,
      enabled: () => true, prompt: () => "Спрятаться в шкафу", action: () => this.enterHide("wardrobe") });
  }

  private pickup(id: keyof Inventory, label: string): void {
    if (this.inventory[id]) return;
    this.inventory[id] = true;
    this.world.setItemVisible(id, false);
    this.audio.sfx("pickup");
    this.emitNoise(1.8, 0.08);
    if (id === "battery") {
      this.battery = 100;
      this.ui.showToast("Батарея заменена: заряд 100%.", "item");
    } else this.ui.showToast(`Получено: ${label}`, "item");
    if (this.tutorialStage < 2) { this.tutorialStage = 2; this.tutorialTimer = 7; }
  }

  private updateInteraction(): void {
    _eye.set(this.player.x, this.eyeHeight, this.player.z);
    this.camera.getWorldDirection(this.cameraForward);
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const interactable of this.interactables) {
      if (!interactable.enabled()) continue;
      _toInteraction.set(interactable.position.x, interactable.position.y, interactable.position.z).sub(_eye);
      const distance = _toInteraction.length();
      if (distance > interactable.maxDistance || distance < 0.05) continue;
      _toInteraction.multiplyScalar(1 / distance);
      const dot = this.cameraForward.dot(_toInteraction);
      const minDot = 0.965 - interactable.radius * 0.065;
      if (dot < minDot) continue;
      const score = distance * (1 + (1 - dot) * 3);
      if (score < bestScore) { bestScore = score; best = interactable; }
    }
    this.currentInteraction = best;
    const prompt = best?.prompt() ?? "";
    if (prompt !== this.lastPrompt) { this.ui.setPrompt(prompt); this.lastPrompt = prompt; }
    if (this.input.consumeAction("KeyE") && best) {
      this.lastPrompt = "";
      this.ui.setPrompt("");
      best.action();
    }
  }

  private enterHide(type: "bed" | "wardrobe"): void {
    if (this.watcher.mode === "chase" && this.watcher.distanceToPlayer < 3) {
      this.ui.showToast("Поздно — он видит, куда вы прячетесь!", "danger");
      this.audio.sfx("error");
      return;
    }
    this.hideReturn.copy(this.player);
    this.hideYaw = this.yaw;
    this.mode = "hidden";
    this.flashlight = false;
    if (type === "bed") {
      this.player.set(-2.75, 0, -0.2);
      this.yaw = 0;
      this.eyeHeight = 0.34;
    } else {
      this.player.set(4.85, 0, -3.18);
      this.yaw = Math.PI;
      this.eyeHeight = 1.43;
    }
    this.pitch = 0;
    this.currentInteraction = null;
    this.lastPrompt = "";
    this.ui.setPrompt("");
    this.ui.setTutorial("E — выйти из укрытия · Не шумите");
    this.audio.sfx("hide");
  }

  private exitHide(): void {
    this.player.copy(this.hideReturn);
    this.yaw = this.hideYaw;
    this.eyeHeight = PLAYER.eyeHeight;
    this.mode = "explore";
    this.ui.setTutorial("");
    this.audio.sfx("hide");
  }

  private emitNoise(radius: number, amount: number): void {
    this.noise = Math.max(this.noise, amount);
    this.watcher.hear(this.player, radius);
  }

  private keypadInput(digit: string): void {
    if (this.mode !== "keypad" || this.keypadEntry.length >= 4) return;
    this.keypadEntry += digit;
    this.audio.sfx("ui");
    this.ui.updateKeypad(this.keypadEntry);
  }

  private submitCode(): void {
    if (this.mode !== "keypad") return;
    if (this.keypadEntry.length < 4) { this.ui.updateKeypad(this.keypadEntry, "Нужны четыре цифры"); this.audio.sfx("error"); return; }
    if (this.keypadEntry === DOOR_CODE) {
      this.puzzles.doorUnlocked = true;
      this.audio.sfx("unlock");
      this.closeModal();
      this.ui.showToast("Код принят. Дверной замок разблокирован.", "item");
    } else {
      this.keypadEntry = "";
      this.audio.sfx("error");
      this.ui.updateKeypad("");
      this.ui.keypadError();
      this.emitNoise(10, 1);
    }
  }

  private objective(): string {
    if (this.watcher.mode === "chase" && this.mode !== "hidden") return "Оторвитесь от Смотрителя и спрячьтесь";
    if (this.mode === "hidden") return "Переждите, пока он уйдёт";
    if (this.puzzles.ziplineReady) return "Зиплайн готов — чердак в кладовой";
    if (this.puzzles.doorUnlocked) return "Дверь разблокирована — можно выйти";
    if (this.puzzles.boardsRemoved >= 3) return "Окно открыто — можно вылезти";
    if (this.puzzles.power && !this.inventory.note) return "Найдите подсказку с кодом";
    if (this.inventory.crowbar && this.puzzles.boardsRemoved > 0) return `Освободите окно: ${this.puzzles.boardsRemoved} / 3`;
    return "Найдите любой из трёх выходов";
  }

  private update(dt: number): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 1.65);
    this.world.update(dt, this.time, this.watcher.danger);
    if (this.ui.controlsOpen) {
      if (this.input.consumeAction("Escape") || this.input.consumeAction("Space")) this.ui.hideControls();
      this.input.consumeLook();
      return;
    }
    if (this.state.is("title")) {
      if (this.input.consumeAction("Space") || this.input.consumeAction("Enter")) this.start();
      this.input.consumeLook();
      return;
    }
    if (this.state.is("paused")) {
      if (this.input.consumeAction("Escape")) this.resume();
      this.input.consumeLook();
      return;
    }
    if (this.state.is("gameover", "victory")) {
      if (this.input.consumeAction("Space") || this.input.consumeAction("Enter")) this.restart();
      if (this.input.consumeAction("Escape")) this.menu();
      this.input.consumeLook();
      return;
    }
    if (!this.state.is("playing")) return;

    if (["note", "keypad", "journal"].includes(this.mode)) {
      this.updateModalInput();
      this.input.consumeLook();
      return;
    }
    if (this.input.consumeAction("Escape")) { this.pause(); return; }
    if (this.mode === "explore" && this.input.consumeAction("Tab")) {
      this.mode = "journal";
      this.ui.showJournal(this.inventory, this.puzzles);
      this.releasePointer();
      return;
    }

    if (!["cinematic"].includes(this.mode)) this.stats.elapsed += dt;
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.1; this.refreshHUD(); }

    if (this.mode === "cinematic") {
      this.input.consumeLook();
      this.updateCinematic(dt);
      return;
    }
    if (this.mode === "zipline") {
      this.input.consumeLook();
      this.updateZipline(dt);
      return;
    }
    if (this.mode === "hidden") {
      this.updateLook();
      if (this.input.consumeAction("KeyE")) { this.exitHide(); return; }
      this.watcher.update(dt, this.player, _eye.set(this.player.x, this.eyeHeight, this.player.z), this.cameraForward, true, true, false);
      this.handleWatcherEvents(dt);
      this.noise = Math.max(0, this.noise - dt * 0.55);
      return;
    }
    this.updateExplore(dt);
  }

  private updateModalInput(): void {
    if (this.mode === "note") {
      if (this.input.consumeAction("Escape") || this.input.consumeAction("KeyE") || this.input.consumeAction("Space")) this.closeModal();
    } else if (this.mode === "journal") {
      if (this.input.consumeAction("Escape") || this.input.consumeAction("Tab")) this.closeModal();
    } else if (this.mode === "keypad") {
      if (this.input.consumeAction("Escape")) { this.closeModal(); return; }
      if (this.input.consumeAction("Enter")) this.submitCode();
      if (this.input.consumeAction("Backspace")) {
        this.keypadEntry = this.keypadEntry.slice(0, -1);
        this.ui.updateKeypad(this.keypadEntry);
      }
      for (let i = 0; i <= 9; i++) {
        if (this.input.consumeAction(`Digit${i}`) || this.input.consumeAction(`Numpad${i}`)) this.keypadInput(String(i));
      }
    }
  }

  private updateLook(): void {
    const look = this.input.consumeLook();
    this.yaw += look.yaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.pitch, -1.32, 1.32);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.camera.getWorldDirection(this.cameraForward);
  }

  private updateExplore(dt: number): void {
    this.updateLook();
    if (this.input.consumeAction("KeyF")) {
      if (this.battery <= 0) { this.ui.showToast("Батарея села. В кладовой есть запасная."); this.audio.sfx("error"); }
      else { this.flashlight = !this.flashlight; this.audio.sfx("ui"); }
    }
    const crouched = this.input.isHeld("ControlLeft") || this.input.isHeld("ControlRight");
    const moving = Math.abs(this.input.moveX) + Math.abs(this.input.moveZ) > 0.05;
    const sprinting = moving && !crouched && this.stamina > 1 && (this.input.isHeld("ShiftLeft") || this.input.isHeld("ShiftRight"));
    const speed = crouched ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (sprinting) this.stamina = Math.max(0, this.stamina - PLAYER.staminaDrain * dt);
    else this.stamina = Math.min(100, this.stamina + PLAYER.staminaRecovery * dt);

    const forwardX = -Math.sin(this.yaw), forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    let moveX = rightX * this.input.moveX + forwardX * this.input.moveZ;
    let moveZ = rightZ * this.input.moveX + forwardZ * this.input.moveZ;
    const magnitude = Math.hypot(moveX, moveZ);
    if (magnitude > 1) { moveX /= magnitude; moveZ /= magnitude; }
    const blend = Math.min(1, PLAYER.acceleration * dt);
    this.velocity.x += (moveX * speed - this.velocity.x) * blend;
    this.velocity.y += (moveZ * speed - this.velocity.y) * blend;
    const oldX = this.player.x, oldZ = this.player.z;
    this.world.resolveMove(this.player, this.velocity.x * dt, this.velocity.y * dt, PLAYER.radius);
    const traveled = Math.hypot(this.player.x - oldX, this.player.z - oldZ);
    this.movedDistance += traveled;
    this.stepDistance += traveled;
    this.bobPhase += traveled * (sprinting ? 4.2 : 3.3);
    const stride = crouched ? 1.25 : sprinting ? 1.65 : 1.45;
    if (this.stepDistance > stride) {
      this.stepDistance = 0;
      if (!crouched) {
        this.audio.sfx(sprinting ? "runStep" : "step");
        this.emitNoise(sprinting ? 6.5 : 2.7, sprinting ? 0.65 : 0.22);
      }
    }
    const targetEye = crouched ? PLAYER.crouchHeight : PLAYER.eyeHeight;
    this.eyeHeight += (targetEye - this.eyeHeight) * Math.min(1, dt * 10);

    this.updateInteraction();
    if (this.mode !== "explore") return;
    this.camera.getWorldDirection(this.cameraForward);
    this.watcher.update(dt, this.player, _eye.set(this.player.x, this.eyeHeight, this.player.z), this.cameraForward, false, crouched, this.flashlight);
    this.handleWatcherEvents(dt);
    if (this.mode !== "explore") return;

    if (this.flashlight) {
      this.battery = Math.max(0, this.battery - dt * (PLAYER.batteryDrain + (this.watcher.repelled ? PLAYER.repelDrain : 0)));
      if (this.battery <= 0) { this.flashlight = false; this.ui.showToast("Фонарь погас. Батарея разряжена.", "danger"); }
    }
    this.noise = Math.max(0, this.noise - dt * 0.48);
    this.updateTutorial(dt);
  }

  private updateTutorial(dt: number): void {
    if (this.tutorialStage === 0 && this.movedDistance > 0.65) {
      this.tutorialStage = 1;
      this.tutorialTimer = 7;
      this.ui.setTutorial("Наведитесь на предмет и нажмите E");
      return;
    }
    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt;
      if (this.tutorialStage === 2) this.ui.setTutorial("F — фонарь · Shift — бег · Ctrl — тихий шаг");
      if (this.tutorialTimer <= 0) { this.ui.setTutorial(""); this.tutorialStage = 3; }
    }
  }

  private handleWatcherEvents(dt: number): void {
    if (this.watcher.justSpotted) {
      this.ui.showToast("ОН ВАС УВИДЕЛ. Оторвитесь и спрячьтесь!", "danger");
      this.audio.sfx("heartbeat");
      this.shake = Math.max(this.shake, 0.35);
    }
    if (this.watcher.escapedChase) {
      this.stats.closeCalls++;
      this.ui.showToast("Он потерял вас из виду. Переждите погоню.");
    }
    if (this.watcher.caught) { this.triggerCaught(); return; }
    const danger = this.watcher.danger;
    if (danger > 0.2) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.audio.sfx("heartbeat");
        this.heartbeatTimer = 1.25 - danger * 0.72;
      }
    } else this.heartbeatTimer = 0;
  }

  private refreshHUD(): void {
    this.ui.updateHUD({
      elapsed: this.stats.elapsed, stamina: this.stamina, battery: this.battery, noise: this.noise,
      flashlight: this.flashlight, inventory: this.inventory, puzzles: this.puzzles,
      objective: this.objective(), endings: this.progress.endings,
    });
    const activeDanger = ["explore", "hidden"].includes(this.mode) ? this.watcher.danger : 0;
    this.ui.setDanger(activeDanger, this.watcher.mode === "chase" && activeDanger > 0);
    this.audio.setDanger(activeDanger);
  }

  private triggerCaught(): void {
    if (this.mode === "cinematic") return;
    this.mode = "cinematic";
    this.cinematic = { kind: "caught", route: null, time: 0, duration: 0.85, start: this.camera.position.clone() };
    this.currentInteraction = null;
    this.ui.setPrompt("");
    this.ui.setTutorial("");
    this.ui.showJumpscare(true);
    this.audio.sfx("scare");
    this.shake = 1;
    this.releasePointer();
  }

  private finishGameover(reason: "watcher" | "fall"): void {
    this.stats.deaths++;
    this.cinematic = null;
    this.world.setZipRig(false);
    this.audio.setZipline(false);
    this.audio.setDanger(0);
    this.audio.sfx("lose");
    this.ui.showJumpscare(false);
    this.ui.setZipline(false);
    this.ui.setCinematic(false);
    this.ui.setDanger(0, false);
    this.state.transition("gameover");
    this.ui.showGameover(this.stats, reason);
    this.releasePointer();
  }

  private beginEscape(route: EscapeRoute): void {
    if (!this.state.is("playing") || this.mode !== "explore") return;
    this.stats.route = route;
    this.flashlight = false;
    this.currentInteraction = null;
    this.ui.setPrompt("");
    this.ui.setTutorial("");
    this.ui.setDanger(0, false);
    this.audio.setDanger(0);
    this.watcher.group.visible = false;
    this.mode = "cinematic";
    const duration = route === "attic" ? 1.8 : 2.8;
    this.cinematic = { kind: "escape", route, time: 0, duration, start: this.camera.position.clone() };
    if (route === "door") {
      this.world.openDoor();
      this.audio.sfx("door");
      this.ui.setCinematic(true, "Замок открылся впервые за тринадцать лет");
    } else if (route === "window") {
      this.world.openWindow();
      this.audio.sfx("door");
      this.ui.setCinematic(true, "Последняя доска — и шаг в холодную ночь");
    } else {
      this.audio.sfx("latch");
      this.ui.setCinematic(true, "Крыша. Трос. Дальше — только ветер.");
    }
    this.releasePointer();
  }

  private updateCinematic(dt: number): void {
    const cinematic = this.cinematic;
    if (!cinematic) return;
    cinematic.time += dt;
    if (cinematic.time < cinematic.duration) return;
    if (cinematic.kind === "caught") { this.finishGameover("watcher"); return; }
    if (cinematic.route === "attic") this.beginZipline();
    else if (cinematic.route) this.completeEnding(cinematic.route);
  }

  private beginZipline(): void {
    this.cinematic = null;
    this.mode = "zipline";
    this.zip = { time: 0, balance: 0, velocity: 0, sound: 0 };
    this.world.setZipRig(true);
    this.audio.setZipline(true);
    this.audio.sfx("zip");
    this.ui.setCinematic(false);
    this.ui.setZipline(true, 0, 0);
    this.ui.showToast("A / D — противодействуйте качанию. Не выходите за края шкалы.", "item");
  }

  private updateZipline(dt: number): void {
    this.zip.time += dt / ZIPLINE.duration;
    const seconds = this.zip.time * ZIPLINE.duration;
    const gust = Math.sin(seconds * 1.65) * 0.7 + Math.sin(seconds * 3.7 + 0.8) * 0.3;
    this.zip.velocity += (gust * ZIPLINE.drift + this.input.moveX * ZIPLINE.steer) * dt;
    this.zip.velocity -= this.zip.velocity * ZIPLINE.damping * dt;
    this.zip.balance += this.zip.velocity * dt;
    this.zip.sound -= dt;
    if (this.zip.sound <= 0) { this.audio.sfx("zip"); this.zip.sound = 0.85; }
    this.ui.setZipline(true, this.zip.balance, Math.min(1, this.zip.time));
    if (Math.abs(this.zip.balance) >= ZIPLINE.failLimit) { this.finishGameover("fall"); return; }
    if (this.zip.time >= 1) this.completeEnding("attic");
  }

  private completeEnding(route: EscapeRoute): void {
    const isNew = !this.progress.endings.includes(route);
    if (isNew) this.progress.endings.push(route);
    const previous = this.progress.bestTimes[route];
    const best = Math.min(previous ?? Number.POSITIVE_INFINITY, this.stats.elapsed);
    this.progress.bestTimes[route] = best;
    storage.set(SAVE_KEY, this.progress);
    this.stats.route = route;
    this.world.setZipRig(false);
    this.world.setFlashlight(false, 0);
    this.audio.setZipline(false);
    this.audio.setDanger(0);
    this.audio.sfx("win");
    this.ui.setZipline(false);
    this.ui.setCinematic(false);
    this.ui.setDanger(0, false);
    this.ui.setProgress(this.progress);
    this.state.transition("victory");
    this.ui.showEnding(route, this.stats, best, isNew);
    this.releasePointer();
  }

  private render(): void {
    const now = performance.now();
    const frameDt = Math.min(0.25, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const instantFps = 1 / frameDt;
    this.fps += (instantFps - this.fps) * 0.06;
    if (this.state.is("playing") && this.highQuality) {
      this.lowFpsTimer = this.fps < QUALITY.degradeFps ? this.lowFpsTimer + frameDt : 0;
      if (this.lowFpsTimer > 3) {
        this.highQuality = false;
        this.renderer.setPixelRatio(QUALITY.lowDpr);
        this.world.setQuality(false);
        this.onResize();
      }
    }

    this.renderer.toneMappingExposure = this.state.is("title") ? 1.25 : 1.02;
    if (this.state.is("title")) this.renderTitleCamera();
    else if (this.state.is("gameover")) { /* retain the scare frame behind the result screen */ }
    else if (this.mode === "cinematic" && this.cinematic) this.renderCinematicCamera();
    else if (this.mode === "zipline") this.renderZiplineCamera();
    else this.renderPlayerCamera();

    const flashlightVisible = this.flashlight && this.state.is("playing") && this.mode === "explore";
    this.world.setFlashlight(flashlightVisible, this.battery / 100);
    this.renderer.render(this.scene, this.camera);
    if (this.ready) window.__GAME_READY__ = true;
  }

  private renderTitleCamera(): void {
    this.camera.position.set(4.25 + Math.sin(this.time * 0.16) * 0.16, 2.05 + Math.sin(this.time * 0.23) * 0.025, 3.85);
    this.camera.lookAt(_titleTarget);
  }

  private renderPlayerCamera(): void {
    const speed = this.velocity.length();
    const bob = this.mode === "explore" ? Math.sin(this.bobPhase) * Math.min(0.028, speed * 0.009) : 0;
    const shakeX = Math.sin(this.time * 47) * this.shake * 0.025;
    const shakeY = Math.sin(this.time * 59 + 1.2) * this.shake * 0.018;
    this.camera.position.set(this.player.x + shakeX, this.eyeHeight + bob + shakeY, this.player.z);
    this.camera.rotation.set(this.pitch + shakeY * 0.02, this.yaw, Math.sin(this.time * 41) * this.shake * 0.012, "YXZ");
  }

  private renderCinematicCamera(): void {
    const cinematic = this.cinematic!;
    const progress = Math.min(1, cinematic.time / cinematic.duration);
    if (cinematic.kind === "caught") {
      this.camera.position.copy(cinematic.start);
      this.camera.position.x += Math.sin(this.time * 63) * 0.035;
      this.camera.position.y += Math.sin(this.time * 51) * 0.025;
      this.camera.lookAt(this.watcher.group.position.x, 2.35, this.watcher.group.position.z);
      return;
    }
    const eased = progress * progress * (3 - 2 * progress);
    this.camera.position.copy(cinematic.start);
    if (cinematic.route === "door") {
      _cameraTarget.set(LAYOUT.door.x, 1.65, -7.25);
      this.camera.position.lerp(_cameraTarget, eased);
      this.camera.lookAt(LAYOUT.door.x, 1.55, -14);
    } else if (cinematic.route === "window") {
      _cameraTarget.set(-7.4, 1.45, LAYOUT.window.z);
      this.camera.position.lerp(_cameraTarget, eased);
      this.camera.lookAt(-14, 1.3, LAYOUT.window.z - 2);
    } else {
      _cameraTarget.set(LAYOUT.hatch.x, 5.02, LAYOUT.hatch.z);
      this.camera.position.lerp(_cameraTarget, eased);
      this.camera.lookAt(LAYOUT.hatch.x, 5.1, -8);
    }
  }

  private renderZiplineCamera(): void {
    const t = Math.min(1, Math.max(0, this.zip.time));
    this.world.ziplineCurve.getPoint(t, _zipPoint);
    this.world.ziplineCurve.getPoint(Math.min(1, t + 0.025), _zipAhead);
    this.camera.position.copy(_zipPoint);
    this.camera.position.y -= 0.55;
    this.camera.position.x += this.zip.balance * 0.13;
    this.camera.lookAt(_zipAhead.x, _zipAhead.y - 0.72, _zipAhead.z);
    this.camera.rotateZ(-this.zip.balance * 0.075);
  }

  private loadProgress(): SavedProgress {
    const fallback: SavedProgress = { version: 1, endings: [], bestTimes: {} };
    const raw = storage.get<SavedProgress>(SAVE_KEY, fallback);
    const validRoutes: EscapeRoute[] = ["window", "attic", "door"];
    const endings = Array.isArray(raw?.endings) ? [...new Set(raw.endings.filter(route => validRoutes.includes(route)))] : [];
    const bestTimes: SavedProgress["bestTimes"] = {};
    for (const route of validRoutes) {
      const value = raw?.bestTimes?.[route];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) bestTimes[route] = value;
    }
    return { version: 1, endings, bestTimes };
  }

  private snapshot(): DebugSnapshot {
    return {
      phase: this.state.state, mode: this.mode, x: this.player.x, y: this.eyeHeight, z: this.player.z,
      yaw: this.yaw, pitch: this.pitch, stamina: this.stamina, battery: this.battery,
      flashlight: this.flashlight, hidden: this.mode === "hidden", monster: this.watcher.mode,
      monsterDistance: this.watcher.distanceToPlayer, monsterRepelled: this.watcher.repelled, inventory: { ...this.inventory }, puzzles: { ...this.puzzles },
      route: this.stats.route, ziplineTime: this.zip.time, ziplineBalance: this.zip.balance,
      fps: this.fps, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      endings: [...this.progress.endings],
    };
  }

  private exposeProbes(): void {
    window.__gameProbe = () => ({ x: this.player.x, y: this.player.y, z: this.player.z });
    window.__gameDebug = () => this.snapshot();
    if (!new URLSearchParams(window.location.search).has("verify")) return;
    window.__room13Test = {
      start: () => this.start(), restart: () => this.restart(),
      teleport: (x, z, yaw = 0, pitch = 0) => {
        this.player.set(x, 0, z); this.velocity.set(0, 0); this.yaw = yaw; this.pitch = pitch;
        this.camera.rotation.set(pitch, yaw, 0, "YXZ");
      },
      interact: id => {
        const target = this.interactables.find(item => item.id === id);
        if (target?.enabled()) target.action();
      },
      closeModal: () => this.closeModal(),
      keypad: code => { for (const digit of code) this.keypadInput(digit); },
      submitCode: () => this.submitCode(),
      setMonster: (x, z, chase = false) => { this.watcher.teleport(x, z); if (chase) this.watcher.mode = "chase"; },
      forceCatch: () => { this.watcher.teleport(this.player.x + 0.2, this.player.z); this.watcher.mode = "chase"; },
      setZiplineBalance: value => { this.zip.balance = value; this.zip.velocity = 0; },
      snapshot: () => this.snapshot(),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.abort.abort();
    this.stateOff();
    this.input.dispose();
    this.audio.dispose();
    this.ui.dispose();
    this.watcher.dispose();
    this.world.dispose();
    this.renderer.dispose();
    delete window.__gameProbe;
    delete window.__gameDebug;
    delete window.__room13Test;
    window.__GAME_READY__ = false;
  }
}
