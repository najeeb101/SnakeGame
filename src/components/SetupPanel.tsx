import { motion } from "framer-motion";
import type { SnakeGameEngine } from "../engine/SnakeEngine";
import { difficultyLabels } from "../engine/constants";
import type { Difficulty, GameSnapshot } from "../types";

export function SetupPanel({
  snapshot,
  engine,
}: {
  snapshot: GameSnapshot;
  engine: SnakeGameEngine | null;
}) {
  return (
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
          {snapshot.status === "gameover"
            ? "Play Again"
            : snapshot.status === "paused"
              ? "Resume Run"
              : "Start Run"}
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => (snapshot.status === "running" ? engine?.pause() : engine?.resume())}
          disabled={
            snapshot.status === "menu" ||
            snapshot.status === "gameover" ||
            snapshot.status === "countdown"
          }
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
  );
}
