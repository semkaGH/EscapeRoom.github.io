import { mulberry32 } from "./random";

export type SfxId =
  | "ui" | "pickup" | "step" | "runStep" | "pry" | "fuse"
  | "unlock" | "error" | "door" | "hide" | "scare" | "win"
  | "lose" | "heartbeat" | "latch" | "zip";

const MUTE_KEY = "room13.muted";

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private windGain: GainNode | null = null;
  private dangerGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private drone: OscillatorNode | null = null;
  private disposed = false;
  muted = readMuted();

  private readonly unlock = () => {
    this.ensureCtx();
    this.detachUnlock();
  };

  constructor() {
    window.addEventListener("pointerdown", this.unlock);
    window.addEventListener("keydown", this.unlock);
  }

  private detachUnlock(): void {
    window.removeEventListener("pointerdown", this.unlock);
    window.removeEventListener("keydown", this.unlock);
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer(this.ctx);
      this.createAmbience(this.ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const random = mulberry32(130313);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      data[i] = brown * 3.2 + white * 0.07;
    }
    return buffer;
  }

  private createAmbience(ctx: AudioContext): void {
    if (!this.master || !this.noiseBuffer) return;
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.14;
    this.ambience.connect(this.master);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 310;
    lowpass.Q.value = 0.6;
    lowpass.connect(this.ambience);
    this.ambientSource = ctx.createBufferSource();
    this.ambientSource.buffer = this.noiseBuffer;
    this.ambientSource.loop = true;
    this.ambientSource.connect(lowpass);
    this.ambientSource.start();

    this.drone = ctx.createOscillator();
    this.drone.type = "sine";
    this.drone.frequency.value = 43;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.055;
    this.drone.connect(droneGain).connect(this.ambience);
    this.drone.start();

    this.dangerGain = ctx.createGain();
    this.dangerGain.gain.value = 0;
    const dangerOsc = ctx.createOscillator();
    dangerOsc.type = "sawtooth";
    dangerOsc.frequency.value = 54;
    const dangerFilter = ctx.createBiquadFilter();
    dangerFilter.type = "lowpass";
    dangerFilter.frequency.value = 115;
    dangerOsc.connect(dangerFilter).connect(this.dangerGain).connect(this.master);
    dangerOsc.start();

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 720;
    windFilter.Q.value = 0.35;
    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;
    this.windSource.playbackRate.value = 1.7;
    this.windSource.connect(windFilter).connect(this.windGain).connect(this.master);
    this.windSource.start();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0"); } catch { /* session-only fallback */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.03);
    return this.muted;
  }

  setDanger(value: number): void {
    if (!this.ctx || !this.dangerGain) return;
    this.dangerGain.gain.setTargetAtTime(Math.min(0.2, Math.max(0, value) * 0.2), this.ctx.currentTime, 0.08);
  }

  setZipline(active: boolean): void {
    if (!this.ctx || !this.windGain || !this.ambience) return;
    this.windGain.gain.setTargetAtTime(active ? 0.5 : 0, this.ctx.currentTime, 0.25);
    this.ambience.gain.setTargetAtTime(active ? 0.04 : 0.14, this.ctx.currentTime, 0.25);
  }

  private tone(type: OscillatorType, f0: number, f1: number, duration: number, gain: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + duration);
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, gain: number, frequency: number, type: BiquadFilterType = "lowpass"): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter).connect(env).connect(this.master);
    source.start(t, 0, duration);
    source.stop(t + duration + 0.02);
  }

  sfx(id: SfxId): void {
    if (this.disposed || this.muted) return;
    this.ensureCtx();
    switch (id) {
      case "ui": this.tone("sine", 420, 540, 0.06, 0.1); break;
      case "pickup":
        this.tone("sine", 420, 780, 0.16, 0.12);
        this.tone("sine", 690, 1040, 0.18, 0.07, 0.06);
        break;
      case "step": this.noise(0.08, 0.12, 180); break;
      case "runStep": this.noise(0.12, 0.24, 230); break;
      case "pry":
        this.noise(0.36, 0.36, 840);
        this.tone("sawtooth", 135, 48, 0.28, 0.14);
        break;
      case "fuse":
        this.tone("square", 90, 150, 0.08, 0.09);
        this.tone("sine", 220, 440, 0.4, 0.1, 0.12);
        break;
      case "unlock":
        this.tone("square", 280, 280, 0.06, 0.08);
        this.tone("sine", 520, 760, 0.18, 0.12, 0.08);
        break;
      case "error": this.tone("square", 150, 90, 0.28, 0.1); break;
      case "door": this.noise(0.75, 0.22, 290); this.tone("sine", 72, 43, 0.7, 0.12); break;
      case "hide": this.noise(0.24, 0.13, 430); break;
      case "scare":
        this.noise(0.85, 0.6, 1600, "bandpass");
        this.tone("sawtooth", 210, 42, 0.8, 0.32);
        break;
      case "win":
        this.tone("sine", 392, 523, 0.6, 0.13);
        this.tone("sine", 523, 784, 0.9, 0.11, 0.16);
        break;
      case "lose": this.tone("sawtooth", 180, 38, 0.8, 0.2); break;
      case "heartbeat":
        this.tone("sine", 72, 48, 0.12, 0.2);
        this.tone("sine", 64, 43, 0.1, 0.13, 0.16);
        break;
      case "latch": this.noise(0.18, 0.25, 1200, "highpass"); this.tone("square", 110, 80, 0.1, 0.1); break;
      case "zip": this.noise(0.45, 0.2, 1900, "bandpass"); break;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachUnlock();
    try { this.ambientSource?.stop(); } catch { /* already stopped */ }
    try { this.windSource?.stop(); } catch { /* already stopped */ }
    try { this.drone?.stop(); } catch { /* already stopped */ }
    this.master?.disconnect();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }
}
