import type { Group } from "three";

export type GamePhase = "title" | "playing" | "paused" | "gameover" | "victory";
export type EscapeRoute = "window" | "attic" | "door";
export type MonsterMode = "dormant" | "patrol" | "investigate" | "chase" | "search";
export type PlayMode = "explore" | "note" | "keypad" | "journal" | "hidden" | "cinematic" | "zipline";

export interface Inventory {
  crowbar: boolean;
  fuse: boolean;
  rope: boolean;
  handle: boolean;
  note: boolean;
  battery: boolean;
}

export interface PuzzleState {
  boardsRemoved: number;
  power: boolean;
  doorUnlocked: boolean;
  ziplineReady: boolean;
}

export interface RunStats {
  elapsed: number;
  closeCalls: number;
  deaths: number;
  route: EscapeRoute | null;
}

export interface SavedProgress {
  version: 1;
  endings: EscapeRoute[];
  bestTimes: Partial<Record<EscapeRoute, number>>;
}

export interface DebugSnapshot {
  phase: GamePhase;
  mode: PlayMode;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  stamina: number;
  battery: number;
  flashlight: boolean;
  hidden: boolean;
  monster: MonsterMode;
  monsterDistance: number;
  monsterRepelled: boolean;
  inventory: Inventory;
  puzzles: PuzzleState;
  route: EscapeRoute | null;
  ziplineTime: number;
  ziplineBalance: number;
  fps: number;
  calls: number;
  triangles: number;
  endings: EscapeRoute[];
}

export interface Interactable {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  maxDistance: number;
  prompt: () => string;
  enabled: () => boolean;
  action: () => void;
}

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  enabled?: () => boolean;
}

export interface AssetRoot extends Group {
  setState: (name: string) => AssetRoot | Promise<AssetRoot>;
  prepareState: (name: string) => Promise<AssetRoot>;
  dispose: () => Promise<void>;
}
