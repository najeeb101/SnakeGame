import type { Difficulty, Direction, Point, PowerUpType } from "../types";

export const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const difficultySpeeds: Record<Difficulty, number> = {
  chill: 160,
  classic: 118,
  arcade: 88,
};

export const powerLabels: Record<PowerUpType, string> = {
  slow: "Slow Time",
  doubleScore: "2x Score",
  shield: "Shield",
};

export const difficultyLabels: Record<Difficulty, string> = {
  chill: "Chill",
  classic: "Classic",
  arcade: "Arcade",
};

export const missionPool: Array<{ id: string; label: string; target: number }> = [
  { id: "food", label: "Eat 8 food", target: 8 },
  { id: "level", label: "Reach level 4", target: 4 },
  { id: "combo", label: "Build a 5x combo", target: 5 },
  { id: "score", label: "Score 300", target: 300 },
];
