import type { Mission } from "../types";
import { missionPool } from "./constants";

export function createMissions(): Mission[] {
  const offset = Math.floor(Math.random() * missionPool.length);
  return [0, 1, 2].map((index) => {
    const mission = missionPool[(offset + index) % missionPool.length];
    return { ...mission, progress: 0, complete: false };
  });
}

export function stepMissions(
  missions: Mission[],
  state: { foodsEaten: number; level: number; maxCombo: number; score: number },
): { missions: Mission[]; completedCount: number } {
  let completedCount = 0;
  const updated = missions.map((mission) => {
    const progress =
      mission.id === "food"
        ? state.foodsEaten
        : mission.id === "level"
          ? state.level
          : mission.id === "combo"
            ? state.maxCombo
            : state.score;
    const complete = progress >= mission.target;
    if (complete && !mission.complete) completedCount++;
    return { ...mission, progress: Math.min(progress, mission.target), complete };
  });
  return { missions: updated, completedCount };
}
