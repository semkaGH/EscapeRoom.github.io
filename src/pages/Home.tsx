import { useEffect, useRef } from "react";
import { startGame, stopGame } from "@/game/boot";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) return;
    startGame(canvas, overlay);
    return () => stopGame();
  }, []);

  return (
    <main id="game-root" aria-label="Побег из комнаты 13">
      <canvas id="game-canvas" ref={canvasRef} />
      <div id="ui-overlay" />
    </main>
  );
}
