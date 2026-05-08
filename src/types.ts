export type GameStatus = "menu" | "running" | "paused" | "gameover";
export type Direction = "up" | "down" | "left" | "right";
export type Difficulty = "chill" | "classic" | "arcade";
export type PowerUpType = "slow" | "doubleScore" | "shield";

export type Point = {
  x: number;
  y: number;
};

export type Mission = {
  id: string;
  label: string;
  target: number;
  progress: number;
  complete: boolean;
};

export type ActivePowerUp = {
  type: PowerUpType;
  label: string;
  remainingMs: number;
};

export type PersistedStats = {
  bestScore: number;
  bestLevel: number;
  bestCombo: number;
  missionTotal: number;
  difficulty: Difficulty;
  audioEnabled: boolean;
  migratedLegacyHighScore: boolean;
};

export type GameSnapshot = PersistedStats & {
  status: GameStatus;
  score: number;
  level: number;
  foodsEaten: number;
  combo: number;
  maxCombo: number;
  missions: Mission[];
  activePowerUps: ActivePowerUp[];
  message: string;
};
