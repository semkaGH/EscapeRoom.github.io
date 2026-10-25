export const INPUT_CONFIG = {
  MOUSE_SENS_X: 0.0022,
  MOUSE_SENS_Y: 0.0019,
  INVERT_X: false,
  INVERT_Y: false,
} as const;

export const PLAYER = {
  radius: 0.29,
  eyeHeight: 1.64,
  crouchHeight: 1.03,
  walkSpeed: 2.45,
  sprintSpeed: 4.15,
  crouchSpeed: 1.28,
  acceleration: 14,
  staminaDrain: 23,
  staminaRecovery: 17,
  maxBattery: 100,
  batteryDrain: 0.28,
  repelDrain: 3.8,
} as const;

export const MONSTER = {
  patrolSpeed: 1.05,
  investigateSpeed: 1.55,
  chaseSpeed: 2.82,
  catchDistance: 0.72,
  sightDistance: 7.2,
  darkSightDistance: 3.5,
  hearingMemory: 5.5,
  searchDuration: 5.5,
  repelDistance: 5.6,
  activationDelay: 24,
} as const;

export const ZIPLINE = {
  duration: 12,
  drift: 0.34,
  steer: 1.18,
  damping: 1.7,
  failLimit: 1,
} as const;

export const QUALITY = {
  maxDpr: 1.5,
  lowDpr: 1,
  dustHigh: 190,
  dustLow: 70,
  degradeFps: 42,
} as const;

export const LAYOUT = {
  room: { minX: -6, maxX: 6, minZ: -5, maxZ: 5, height: 4.35 },
  storage: { minX: 6, maxX: 10, minZ: 0, maxZ: 4.6, height: 3.65 },
  door: { x: 2.65, z: -5, width: 1.55, height: 2.72 },
  window: { x: -6, y: 2.05, z: -1.15, width: 2.25, height: 2.05 },
  hatch: { x: 8.15, y: 3.52, z: 2.25 },
} as const;

export const COLORS = {
  night: 0x05080d,
  fog: 0x081018,
  wallpaper: 0x3b4241,
  wood: 0x2a1c17,
  woodLight: 0x4a3527,
  rust: 0x5e3326,
  moon: 0x9ebcd2,
  lamp: 0xe0a062,
  danger: 0x9c2430,
  bone: 0xc5b9a4,
} as const;

export const DOOR_CODE = "0313";
export const SAVE_KEY = "room13.progress";
