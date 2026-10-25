import type { GamePhase } from "./types";

const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  title: ["playing"],
  playing: ["paused", "gameover", "victory", "title"],
  paused: ["playing", "title"],
  gameover: ["playing", "title"],
  victory: ["playing", "title"],
};

export class GameStateMachine {
  private _state: GamePhase = "title";
  private listeners = new Set<(state: GamePhase, previous: GamePhase) => void>();

  get state(): GamePhase { return this._state; }
  is(...states: GamePhase[]): boolean { return states.includes(this._state); }

  transition(next: GamePhase): void {
    const previous = this._state;
    if (previous === next) return;
    if (!TRANSITIONS[previous].includes(next)) return;
    this._state = next;
    for (const listener of this.listeners) listener(next, previous);
  }

  onChange(listener: (state: GamePhase, previous: GamePhase) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
