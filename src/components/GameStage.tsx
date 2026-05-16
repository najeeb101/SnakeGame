import { AnimatePresence, motion } from "framer-motion";
import type { RefObject } from "react";
import type { SnakeGameEngine } from "../engine/SnakeEngine";
import { difficultyLabels } from "../engine/constants";
import type { Direction, GameSnapshot } from "../types";
import { Stat } from "./Stat";

const directionButtons: Array<{ direction: Direction; label: string }> = [
  { direction: "up", label: "↑" },
  { direction: "left", label: "←" },
  { direction: "right", label: "→" },
  { direction: "down", label: "↓" },
];

export function GameStage({
  canvasRef,
  snapshot,
  statusLabel,
  engine,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  snapshot: GameSnapshot;
  statusLabel: string;
  engine: SnakeGameEngine | null;
}) {
  return (
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
            if (touch) engine?.handleTouchStart(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            if (touch) engine?.handleTouchEnd(touch.clientX, touch.clientY);
          }}
        />
        <AnimatePresence initial={false}>
          {snapshot.status !== "running" && snapshot.status !== "countdown" && (
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
        {directionButtons.map((btn) => (
          <button
            key={btn.direction}
            className={`pad-button pad-${btn.direction}`}
            type="button"
            onClick={() => engine?.setDirection(btn.direction)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </motion.section>
  );
}
