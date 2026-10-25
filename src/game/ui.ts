import type { EscapeRoute, GamePhase, Inventory, PuzzleState, RunStats, SavedProgress } from "./types";

interface UIHandlers {
  start: () => void;
  resume: () => void;
  restart: () => void;
  menu: () => void;
  closeModal: () => void;
  mute: () => void;
  keypadInput: (digit: string) => void;
  keypadClear: () => void;
  keypadSubmit: () => void;
}

export interface HUDData {
  elapsed: number;
  stamina: number;
  battery: number;
  noise: number;
  flashlight: boolean;
  inventory: Inventory;
  puzzles: PuzzleState;
  objective: string;
  endings: EscapeRoute[];
}

const routeNames: Record<EscapeRoute, string> = {
  window: "Окно",
  attic: "Чердак",
  door: "Дверь",
};

const routeDifficulty: Record<EscapeRoute, string> = {
  window: "ЧУТЬ ЛЕГКО",
  attic: "СРЕДНЕ",
  door: "ОБЫЧНО",
};

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export class GameUI {
  private abort = new AbortController();
  private toastCounter = 0;
  private keypadValue = "";
  readonly element: HTMLElement;

  constructor(container: HTMLElement, private handlers: UIHandlers) {
    this.element = document.createElement("div");
    this.element.id = "game-ui";
    this.element.innerHTML = `
      <div class="film-grain"></div>
      <div class="vignette" id="vignette"></div>
      <div class="danger-wash" id="danger-wash"></div>
      <div class="letterbox top"></div><div class="letterbox bottom"></div>

      <section id="title-screen" class="screen title-screen">
        <div class="title-copy">
          <div class="eyebrow"><span class="live-dot"></span> ПСИХОЛОГИЧЕСКИЙ ХОРРОР</div>
          <h1>КОМНАТА <em>13</em></h1>
          <p class="title-sub">Три выхода. Один не должен был существовать.</p>
          <p class="title-description">Исследуйте заброшенную комнату, не привлекайте Смотрителя и выберите свой путь наружу.</p>
          <div class="title-actions">
            <button class="primary" id="start-button" disabled><span>Загрузка комнаты…</span><b>↗</b></button>
            <button class="text-button" id="controls-button">Управление</button>
          </div>
          <div class="headphones">◖ Наушники усиливают атмосферу <span>·</span> WASD + мышь</div>
        </div>
        <div class="route-board">
          <div class="route-board-head"><span>ПУТИ ПОБЕГА</span><small id="ending-count">0 / 3 найдено</small></div>
          ${this.routeCard("window", "01", "Окно", "Монтировка. Три доски. Короткий путь наружу.", "⌑")}
          ${this.routeCard("attic", "02", "Чердак", "Соберите зиплайн и удержитесь на тросе.", "⌁")}
          ${this.routeCard("door", "03", "Дверь", "Восстановите питание и подберите код замка.", "▯")}
          <div class="route-board-foot">Каждый финал сохраняется в этом браузере</div>
        </div>
      </section>

      <div id="hud" class="hud hidden">
        <div class="objective-block">
          <span class="hud-label">КОМНАТА 13 <i>/</i> <b id="run-time">00:00</b></span>
          <div id="objective">Найдите любой выход</div>
        </div>
        <button id="hud-mute" class="icon-button" aria-label="Выключить звук">◖</button>
        <div id="threat" class="threat"><span></span> ОН ВАС ВИДИТ</div>
        <div id="crosshair" class="crosshair"><i></i><i></i><i></i><i></i></div>
        <div id="interaction" class="interaction hidden"><kbd>E</kbd><span></span></div>
        <div id="tutorial" class="tutorial">WASD — идти <i>·</i> Мышь — осмотреться</div>
        <div class="inventory-bar">
          <span class="hud-label">СОБРАНО</span>
          <div id="inventory-items"><small>Пока пусто</small></div>
        </div>
        <div class="meters">
          <div class="meter-line"><span>СИЛЫ</span><div class="meter"><i id="stamina-fill"></i></div></div>
          <div class="meter-line"><span>ШУМ</span><div class="meter noise"><i id="noise-fill"></i></div></div>
          <div class="meter-line battery-line"><span>ФОНАРЬ <b id="battery-value">100</b></span><div class="meter"><i id="battery-fill"></i></div></div>
        </div>
        <div class="hud-help"><kbd>TAB</kbd> выходы <span>·</span> <kbd>F</kbd> фонарь <span>·</span> <kbd>ESC</kbd> пауза</div>
      </div>

      <div id="zipline-hud" class="zipline-hud hidden">
        <div class="zipline-title"><span>НЕ ОТПУСКАЙ</span><small>A / D — удерживать равновесие</small></div>
        <div class="balance-track"><div class="balance-safe"></div><i id="balance-marker"></i></div>
        <div class="zipline-progress"><i id="zipline-progress-fill"></i></div>
      </div>

      <div id="toast-stack" class="toast-stack"></div>
      <div id="cinematic-caption" class="cinematic-caption hidden"></div>
      <div id="jumpscare" class="jumpscare hidden"><div class="scare-eyes"><i></i><i></i></div></div>

      <section id="pause-screen" class="screen overlay-screen hidden">
        <div class="menu-panel">
          <div class="eyebrow">ДЫХАНИЕ ЗАДЕРЖАНО</div><h2>Пауза</h2>
          <p>Комната подождёт. Смотритель — тоже.</p>
          <button class="primary" id="resume-button">Продолжить <b>→</b></button>
          <button class="secondary" id="pause-restart">Начать заново</button>
          <button class="secondary" id="pause-controls">Управление</button>
          <button class="text-button" id="pause-menu">В главное меню</button>
        </div>
      </section>

      <section id="end-screen" class="screen overlay-screen hidden">
        <div class="ending-panel">
          <div id="ending-kicker" class="eyebrow">ВЫ ВЫБРАЛИСЬ</div>
          <div id="ending-symbol" class="ending-symbol">⌑</div>
          <h2 id="ending-title">Свежий воздух</h2>
          <p id="ending-text"></p>
          <div id="ending-stats" class="ending-stats"></div>
          <button class="primary" id="end-restart">Ещё одна попытка <b>↻</b></button>
          <button class="text-button" id="end-menu">В главное меню</button>
        </div>
      </section>

      <section id="note-modal" class="modal hidden">
        <div class="paper-modal">
          <span class="paper-number">13 / 03</span>
          <h3>Записка без имени</h3>
          <p>Если читаешь это — не стучи в дверь. Он приходит на звук.</p>
          <p>Я оставила код там, где его не отнимут: <strong>третий месяц, тринадцатый день.</strong> Сначала верни свет. Замок без питания мёртв.</p>
          <p class="handwritten">Не смотри ему в глаза. Свет только злит его… но ноги у него становятся медленнее.</p>
          <button class="primary dark" id="note-close">Запомнить <b>→</b></button>
        </div>
      </section>

      <section id="keypad-modal" class="modal hidden">
        <div class="keypad-modal">
          <div class="eyebrow">ЭЛЕКТРОННЫЙ ЗАМОК</div>
          <div id="keypad-display" class="keypad-display">____</div>
          <div id="keypad-status">Введите четыре цифры</div>
          <div class="keypad-grid">
            ${["1","2","3","4","5","6","7","8","9"].map(n => `<button data-digit="${n}">${n}</button>`).join("")}
            <button id="keypad-clear" aria-label="Стереть">×</button><button data-digit="0">0</button><button id="keypad-submit" aria-label="Подтвердить">↵</button>
          </div>
          <button class="text-button" id="keypad-close">Отойти <kbd>ESC</kbd></button>
        </div>
      </section>

      <section id="journal-modal" class="modal hidden">
        <div class="journal-modal">
          <div class="journal-head"><div><div class="eyebrow">ЗАМЕТКИ</div><h3>Три пути наружу</h3></div><button id="journal-close" class="icon-button">×</button></div>
          <div id="journal-routes"></div>
          <div class="journal-controls"><b>Shift</b> бег · <b>Ctrl</b> тихий шаг · <b>F</b> фонарь · <b>E</b> действие</div>
          <p class="journal-tip">Смотритель слышит бег и взлом. Фонарь направленный на него замедляет, но быстро сажает батарею.</p>
        </div>
      </section>

      <section id="controls-modal" class="modal hidden">
        <div class="controls-modal">
          <div class="eyebrow">КАК ВЫЖИТЬ</div><h3>Слушайте комнату</h3>
          <div class="control-grid">
            <kbd>W A S D</kbd><span>Движение</span><kbd>Мышь</kbd><span>Осмотреться</span>
            <kbd>E</kbd><span>Взять / использовать / спрятаться</span><kbd>F</kbd><span>Включить фонарь</span>
            <kbd>Shift</kbd><span>Бег — громко и расходует силы</span><kbd>Ctrl</kbd><span>Тихий шаг</span>
            <kbd>Tab</kbd><span>Пути побега и предметы</span><kbd>Esc</kbd><span>Пауза / закрыть окно</span>
          </div>
          <p>Направьте фонарь на Смотрителя, чтобы замедлить его. Под кроватью и в шкафу можно переждать погоню, если он не видел, куда вы спрятались.</p>
          <button class="primary" id="controls-close">Понятно <b>→</b></button>
        </div>
      </section>
    `;
    container.appendChild(this.element);
    this.bind();
  }

  private routeCard(route: EscapeRoute, number: string, title: string, text: string, symbol: string): string {
    return `<article class="route-card" data-route="${route}"><div class="route-symbol">${symbol}</div><div><small>${number} / ${routeDifficulty[route]}</small><h3>${title}<span class="route-check">✓</span></h3><p>${text}</p></div></article>`;
  }

  private on(selector: string, event: string, handler: (event: Event) => void): void {
    const element = this.element.querySelector(selector);
    element?.addEventListener(event, handler, { signal: this.abort.signal });
  }

  private bind(): void {
    this.on("#start-button", "click", this.handlers.start);
    this.on("#resume-button", "click", this.handlers.resume);
    this.on("#pause-restart", "click", this.handlers.restart);
    this.on("#end-restart", "click", this.handlers.restart);
    this.on("#pause-menu", "click", this.handlers.menu);
    this.on("#end-menu", "click", this.handlers.menu);
    this.on("#hud-mute", "click", this.handlers.mute);
    this.on("#note-close", "click", this.handlers.closeModal);
    this.on("#keypad-close", "click", this.handlers.closeModal);
    this.on("#journal-close", "click", this.handlers.closeModal);
    this.on("#controls-close", "click", () => this.hideControls());
    this.on("#controls-button", "click", () => this.showControls());
    this.on("#pause-controls", "click", () => this.showControls());
    this.on("#keypad-clear", "click", () => { this.keypadValue = ""; this.updateKeypad(""); this.handlers.keypadClear(); });
    this.on("#keypad-submit", "click", this.handlers.keypadSubmit);
    for (const button of this.element.querySelectorAll<HTMLButtonElement>("[data-digit]")) {
      button.addEventListener("click", () => this.handlers.keypadInput(button.dataset.digit!), { signal: this.abort.signal });
    }
  }

  private qs<T extends HTMLElement = HTMLElement>(selector: string): T {
    return this.element.querySelector(selector) as T;
  }

  setLoading(loading: boolean): void {
    const button = this.qs<HTMLButtonElement>("#start-button");
    button.disabled = loading;
    button.innerHTML = loading ? "<span>Загрузка комнаты…</span><b>↗</b>" : "<span>Войти в комнату</span><b>↗</b>";
  }

  setPhase(phase: GamePhase): void {
    this.qs("#title-screen").classList.toggle("hidden", phase !== "title");
    this.qs("#pause-screen").classList.toggle("hidden", phase !== "paused");
    this.qs("#end-screen").classList.toggle("hidden", phase !== "victory" && phase !== "gameover");
    this.qs("#hud").classList.toggle("hidden", phase !== "playing");
  }

  setProgress(progress: SavedProgress): void {
    this.qs("#ending-count").textContent = `${progress.endings.length} / 3 найдено`;
    for (const route of ["window", "attic", "door"] as EscapeRoute[]) {
      this.element.querySelector(`[data-route="${route}"]`)?.classList.toggle("completed", progress.endings.includes(route));
    }
  }

  setMuted(muted: boolean): void {
    const button = this.qs("#hud-mute");
    button.textContent = muted ? "×" : "◖";
    button.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
  }

  setObjective(text: string): void { this.qs("#objective").textContent = text; }

  updateHUD(data: HUDData): void {
    this.qs("#run-time").textContent = formatTime(data.elapsed);
    this.qs<HTMLElement>("#stamina-fill").style.transform = `scaleX(${data.stamina / 100})`;
    this.qs<HTMLElement>("#noise-fill").style.transform = `scaleX(${data.noise})`;
    this.qs<HTMLElement>("#battery-fill").style.transform = `scaleX(${data.battery / 100})`;
    this.qs("#battery-value").textContent = String(Math.ceil(data.battery));
    this.qs(".battery-line").classList.toggle("off", !data.flashlight);
    const items: Array<[keyof Inventory, string, string]> = [
      ["crowbar", "⌐", "Монтировка"], ["fuse", "ϟ", "Предохранитель"], ["rope", "◎", "Трос"],
      ["handle", "⊤", "Рукоятка"], ["note", "≡", "Записка"], ["battery", "▣", "Батарея"],
    ];
    const owned = items.filter(([key]) => data.inventory[key]);
    this.qs("#inventory-items").innerHTML = owned.length
      ? owned.map(([, icon, name]) => `<span title="${name}">${icon}<small>${name}</small></span>`).join("")
      : "<small>Пока пусто</small>";
    this.setObjective(data.objective);
  }

  setPrompt(text: string): void {
    const prompt = this.qs("#interaction");
    prompt.classList.toggle("hidden", !text);
    prompt.querySelector("span")!.textContent = text;
    this.qs("#crosshair").classList.toggle("active", Boolean(text));
  }

  setDanger(value: number, chasing: boolean): void {
    this.qs("#danger-wash").style.opacity = String(Math.min(0.8, value * 0.75));
    this.qs("#vignette").style.setProperty("--danger", String(value));
    this.qs("#threat").classList.toggle("visible", chasing);
  }

  setTutorial(text: string): void {
    const tutorial = this.qs("#tutorial");
    tutorial.textContent = text;
    tutorial.classList.toggle("hidden", !text);
  }

  showToast(text: string, kind: "info" | "item" | "danger" = "info"): void {
    const stack = this.qs("#toast-stack");
    while (stack.children.length >= 3) stack.firstElementChild?.remove();
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    toast.dataset.toast = String(++this.toastCounter);
    toast.textContent = text;
    stack.appendChild(toast);
    window.setTimeout(() => toast.classList.add("leaving"), 3200);
    window.setTimeout(() => toast.remove(), 3650);
  }

  showNote(): void { this.qs("#note-modal").classList.remove("hidden"); }
  showKeypad(): void {
    this.keypadValue = "";
    this.updateKeypad("");
    this.qs("#keypad-status").textContent = "Введите четыре цифры";
    this.qs("#keypad-modal").classList.remove("hidden");
  }

  updateKeypad(value: string, status?: string): void {
    this.keypadValue = value;
    this.qs("#keypad-display").textContent = (value + "____").slice(0, 4).replace(/(.)/g, "$1 ");
    if (status) this.qs("#keypad-status").textContent = status;
  }

  keypadError(): void {
    this.qs("#keypad-status").textContent = "Неверный код. Замок щёлкнул слишком громко.";
    this.qs(".keypad-modal").classList.add("shake");
    window.setTimeout(() => this.qs(".keypad-modal")?.classList.remove("shake"), 350);
  }

  showJournal(inventory: Inventory, puzzles: PuzzleState): void {
    const rows: Array<[EscapeRoute, string]> = [
      ["window", !inventory.crowbar ? "Найти монтировку" : puzzles.boardsRemoved < 3 ? `Сорвать доски: ${puzzles.boardsRemoved} / 3` : "Путь открыт — можно выбраться"],
      ["attic", puzzles.ziplineReady ? "Зиплайн готов — люк в кладовой" : !inventory.rope || !inventory.handle ? `Трос ${inventory.rope ? "✓" : "—"} · Рукоятка ${inventory.handle ? "✓" : "—"}` : "Установить трос у люка в кладовой"],
      ["door", !puzzles.power ? "Найти предохранитель и вернуть питание" : !inventory.note ? "Найти записку с подсказкой к коду" : puzzles.doorUnlocked ? "Замок открыт — дверь ждёт" : "Код: третий месяц, тринадцатый день"],
    ];
    this.qs("#journal-routes").innerHTML = rows.map(([route, text]) => `<div class="journal-route"><span>${routeNames[route]}<small>${routeDifficulty[route]}</small></span><p>${text}</p></div>`).join("");
    this.qs("#journal-modal").classList.remove("hidden");
  }

  closeModals(): void {
    for (const selector of ["#note-modal", "#keypad-modal", "#journal-modal"]) this.qs(selector).classList.add("hidden");
  }

  showControls(): void { this.qs("#controls-modal").classList.remove("hidden"); }
  hideControls(): void { this.qs("#controls-modal").classList.add("hidden"); }
  get controlsOpen(): boolean { return !this.qs("#controls-modal").classList.contains("hidden"); }

  setCinematic(active: boolean, caption = ""): void {
    this.element.classList.toggle("cinematic", active);
    const element = this.qs("#cinematic-caption");
    element.classList.toggle("hidden", !active || !caption);
    element.textContent = caption;
  }

  setZipline(active: boolean, balance = 0, progress = 0): void {
    this.qs("#zipline-hud").classList.toggle("hidden", !active);
    this.qs("#hud").classList.toggle("zip-mode", active);
    if (!active) return;
    this.qs<HTMLElement>("#balance-marker").style.left = `${50 + balance * 46}%`;
    this.qs<HTMLElement>("#zipline-progress-fill").style.transform = `scaleX(${progress})`;
    this.qs(".balance-track").classList.toggle("critical", Math.abs(balance) > 0.74);
  }

  showJumpscare(show: boolean): void { this.qs("#jumpscare").classList.toggle("hidden", !show); }

  showEnding(route: EscapeRoute, stats: RunStats, best: number, isNew: boolean): void {
    const copy: Record<EscapeRoute, { symbol: string; title: string; text: string }> = {
      window: { symbol: "⌑", title: "Свежий воздух", text: "Доски остались позади. Вы спрыгнули в мокрую траву — самый короткий путь из комнаты." },
      attic: { symbol: "⌁", title: "Над тёмным лесом", text: "Трос визжит, крыша исчезает за спиной. Вы перелетели через лес и не отпустили рукоятку." },
      door: { symbol: "▯", title: "Правильная дверь", text: "Замок открылся. За дверью оказался не коридор, а рассвет. Комната отпустила вас." },
    };
    this.qs("#ending-kicker").textContent = isNew ? "НОВАЯ КОНЦОВКА ОТКРЫТА" : "ВЫ СНОВА ВЫБРАЛИСЬ";
    this.qs("#ending-symbol").textContent = copy[route].symbol;
    this.qs("#ending-title").textContent = copy[route].title;
    this.qs("#ending-text").textContent = copy[route].text;
    this.qs("#ending-stats").innerHTML = `<div><small>МАРШРУТ</small><b>${routeNames[route]}</b></div><div><small>ВРЕМЯ</small><b>${formatTime(stats.elapsed)}</b></div><div><small>ЛУЧШЕЕ</small><b>${formatTime(best)}</b></div>`;
    this.setPhase("victory");
  }

  showGameover(stats: RunStats, reason: "watcher" | "fall" = "watcher"): void {
    this.qs("#ending-kicker").textContent = reason === "fall" ? "СПУСК ПРЕРВАН" : "КОМНАТА НЕ ОТПУСТИЛА";
    this.qs("#ending-symbol").textContent = reason === "fall" ? "⌁" : "◉";
    this.qs("#ending-title").textContent = reason === "fall" ? "Вы не удержались" : "Он нашёл вас";
    this.qs("#ending-text").textContent = reason === "fall"
      ? "Рукоятка выскользнула. Работайте с качанием заранее: короткие нажатия A и D возвращают метку в центр."
      : "Бег громче шагов, а свет выдаёт движение. В следующий раз разорвите взгляд и спрячьтесь до того, как он подойдёт.";
    this.qs("#ending-stats").innerHTML = `<div><small>ПРОДЕРЖАЛИСЬ</small><b>${formatTime(stats.elapsed)}</b></div><div><small>БЛИЗКИЕ ВСТРЕЧИ</small><b>${stats.closeCalls}</b></div>`;
    this.setPhase("gameover");
  }

  dispose(): void {
    this.abort.abort();
    this.element.remove();
  }
}
