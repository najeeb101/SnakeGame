import { useEffect, useMemo, useRef, useState } from "react";
import { SnakeGameEngine } from "../engine/SnakeEngine";
import type { Direction, GameSnapshot } from "../types";
import { GameStage } from "./GameStage";
import { SetupPanel } from "./SetupPanel";
import { SidePanel } from "./SidePanel";

const initialSnapshot: GameSnapshot = {
  status: "menu",
  score: 0,
  level: 1,
  foodsEaten: 0,
  combo: 0,
  maxCombo: 0,
  bestScore: 0,
  bestLevel: 1,
  bestCombo: 0,
  missionTotal: 0,
  difficulty: "classic",
  audioEnabled: false,
  migratedLegacyHighScore: true,
  missions: [],
  activePowerUps: [],
  message: "Choose a difficulty and start your run.",
  countdown: 0,
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SnakeGameEngine | null>(null);
  const statusRef = useRef(initialSnapshot.status);
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    statusRef.current = snapshot.status;
  }, [snapshot.status]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const engine = new SnakeGameEngine(canvasRef.current);
    engineRef.current = engine;
    const unsubscribe = engine.subscribe(setSnapshot);

    const handleResize = () => engine.resize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasRef.current.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }
    window.requestAnimationFrame(handleResize);

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["input", "select", "textarea", "button"].includes(target.tagName.toLowerCase())) {
        return;
      }

      const keyMap: Partial<Record<string, Direction>> = {
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
      };

      const direction = keyMap[event.key];
      if (direction) {
        event.preventDefault();
        engine.setDirection(direction);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        statusRef.current === "running" ? engine.pause() : engine.resume();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        engine.start();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        engine.reset();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (snapshot.status === "running") return "Live Run";
    if (snapshot.status === "countdown") return "Get Ready";
    if (snapshot.status === "paused") return "Paused";
    if (snapshot.status === "gameover") return "Run Complete";
    return "Ready";
  }, [snapshot.status]);

  const engine = engineRef.current;

  return (
    <main className="app">
      <section className="arcade-layout">
        <SetupPanel snapshot={snapshot} engine={engine} />
        <GameStage
          canvasRef={canvasRef}
          snapshot={snapshot}
          statusLabel={statusLabel}
          engine={engine}
        />
        <SidePanel snapshot={snapshot} />
      </section>
    </main>
  );
}
