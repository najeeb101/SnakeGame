import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { SnakeGameEngine } from "./gameEngine";
import type { Difficulty, Direction, GameSnapshot } from "./types";

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
};

const difficultyLabels: Record<Difficulty, string> = {
  chill: "Chill",
  classic: "Classic",
  arcade: "Arcade",
};

const directionButtons: Array<{ direction: Direction; label: string }> = [
  { direction: "up", label: "Up" },
  { direction: "left", label: "Left" },
  { direction: "right", label: "Right" },
  { direction: "down", label: "Down" },
];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SnakeGameEngine | null>(null);
  const statusRef = useRef(initialSnapshot.status);
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    statusRef.current = snapshot.status;
  }, [snapshot.status]);

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

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
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
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
    if (snapshot.status === "running") {
      return "Live Run";
    }
    if (snapshot.status === "paused") {
      return "Paused";
    }
    if (snapshot.status === "gameover") {
      return "Run Complete";
    }
    return "Ready";
  }, [snapshot.status]);

  const engine = engineRef.current;

  return (
    <main className="app">
      <section className="arcade-layout">
        <motion.aside
          className="panel menu-panel"
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="panel-heading">
            <p className="eyebrow">Setup</p>
            <h2>Run controls</h2>
          </div>

          <div className="difficulty-grid" role="group" aria-label="Difficulty">
            {(Object.keys(difficultyLabels) as Difficulty[]).map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                className={snapshot.difficulty === difficulty ? "selected" : ""}
                onClick={() => engine?.setDifficulty(difficulty)}
              >
                <span>{difficultyLabels[difficulty]}</span>
              </button>
            ))}
          </div>

          <div className="action-stack">
            <button className="primary-action" type="button" onClick={() => engine?.start()}>
              {snapshot.status === "gameover" ? "Play Again" : snapshot.status === "paused" ? "Resume Run" : "Start Run"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => (snapshot.status === "running" ? engine?.pause() : engine?.resume())}
              disabled={snapshot.status === "menu" || snapshot.status === "gameover"}
            >
              {snapshot.status === "running" ? "Pause" : "Resume"}
            </button>
            <button className="secondary-action danger" type="button" onClick={() => engine?.reset()}>
              Reset
            </button>
          </div>

          <div className="message-card">
            <span>System</span>
            {snapshot.message}
          </div>
        </motion.aside>

        <motion.section
          className="game-stage"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          <div className="stage-header">
            <div className="brand-lockup">
              <span className="brand-mark">S</span>
              <div>
                <p className="eyebrow">Arcade Snake</p>
                <h1>Snake Arcade</h1>
              </div>
            </div>
            <div className="topbar-actions">
              <button className="icon-button" type="button" onClick={() => engine?.toggleAudio()}>
                {snapshot.audioEnabled ? "Sound On" : "Muted"}
              </button>
              <div className="status-badge" data-state={snapshot.status}>
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="hud">
            <Stat label="Score" value={snapshot.score} highlight />
            <Stat label="Level" value={snapshot.level} />
            <Stat label="Combo" value={`${snapshot.combo}x`} pulse={snapshot.combo > 2} />
            <Stat label="Best" value={snapshot.bestScore} />
          </div>

          <div className="canvas-wrap">
            <div className="cabinet-strip">
              <span>{difficultyLabels[snapshot.difficulty]}</span>
              <strong>{snapshot.status === "running" ? "Playing" : statusLabel}</strong>
              <span>20 x 20</span>
            </div>
            <canvas
              ref={canvasRef}
              aria-label="Snake Arcade game board"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (touch) {
                  engine?.handleTouchStart(touch.clientX, touch.clientY);
                }
              }}
              onTouchEnd={(event) => {
                const touch = event.changedTouches[0];
                if (touch) {
                  engine?.handleTouchEnd(touch.clientX, touch.clientY);
                }
              }}
            />
            <AnimatePresence initial={false}>
              {snapshot.status !== "running" && (
                <motion.div
                  className="game-overlay"
                  initial={false}
                  animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 12, scale: 0.98 }}
                    className="overlay-card"
                  >
                    <p className="eyebrow">{statusLabel}</p>
                    <h2>{snapshot.status === "gameover" ? "Run complete" : "Ready to play"}</h2>
                    <p>{snapshot.message}</p>
                    <button className="primary-action" type="button" onClick={() => engine?.start()}>
                      {snapshot.status === "gameover" ? "Restart" : "Launch"}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mobile-pad" aria-label="Mobile movement controls">
            {directionButtons.map((button) => (
              <button
                key={button.direction}
                className={`pad-button pad-${button.direction}`}
                type="button"
                onClick={() => engine?.setDirection(button.direction)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.aside
          className="panel side-panel"
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
        >
          <section>
            <div className="panel-heading">
              <p className="eyebrow">Missions</p>
              <h2>Objective deck</h2>
            </div>
            <div className="mission-list">
              {snapshot.missions.map((mission) => (
                <motion.div
                  className="mission-card"
                  data-complete={mission.complete}
                  key={mission.id}
                  animate={{ scale: mission.complete ? 1.02 : 1 }}
                >
                  <span>{mission.label}</span>
                  <strong>
                    {mission.progress}/{mission.target}
                  </strong>
                  <div>
                    <i style={{ width: `${(mission.progress / mission.target) * 100}%` }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <div className="panel-heading compact">
              <p className="eyebrow">Power-ups</p>
              <h2>Active boosts</h2>
            </div>
            <div className="boost-list">
              {snapshot.activePowerUps.length ? (
                snapshot.activePowerUps.map((power) => (
                  <motion.div
                    className="boost-chip"
                    key={power.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span>{power.label}</span>
                    <strong>{Math.ceil(power.remainingMs / 1000)}s</strong>
                  </motion.div>
                ))
              ) : (
                <p className="empty-state">Collect glowing tiles to trigger boosts.</p>
              )}
            </div>
          </section>

          <section className="records">
            <Stat label="Best Level" value={snapshot.bestLevel} />
            <Stat label="Best Combo" value={`${snapshot.bestCombo}x`} />
            <Stat label="Missions" value={snapshot.missionTotal} />
          </section>
        </motion.aside>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  pulse = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  pulse?: boolean;
}) {
  return (
    <motion.article
      className={highlight ? "stat highlight" : "stat"}
      animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.article>
  );
}
