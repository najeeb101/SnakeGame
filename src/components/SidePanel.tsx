import { motion } from "framer-motion";
import type { GameSnapshot } from "../types";
import { Stat } from "./Stat";

export function SidePanel({ snapshot }: { snapshot: GameSnapshot }) {
  return (
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
  );
}
