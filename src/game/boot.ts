import { EscapeGame } from "./escape-game";

let session: EscapeGame | null = null;

export function startGame(canvas: HTMLCanvasElement, overlay: HTMLElement): void {
  stopGame();
  session = new EscapeGame(canvas, overlay);
}

export function stopGame(): void {
  session?.dispose();
  session = null;
}
