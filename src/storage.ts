import type { Difficulty, PersistedStats } from "./types";

const storageKey = "snakeArcade.stats";

const defaultStats: PersistedStats = {
  bestScore: 0,
  bestLevel: 1,
  bestCombo: 0,
  missionTotal: 0,
  difficulty: "classic",
  audioEnabled: false,
  migratedLegacyHighScore: false,
};

function normalizeDifficulty(value: unknown): Difficulty {
  return value === "chill" || value === "classic" || value === "arcade"
    ? value
    : "classic";
}

export function loadStats(): PersistedStats {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey) || "{}",
    ) as Partial<PersistedStats>;
    const legacyScore = Number(window.localStorage.getItem("snakeHighScore"));
    const shouldMigrate =
      !parsed.migratedLegacyHighScore && Number.isFinite(legacyScore);

    return {
      bestScore: Math.max(
        Number(parsed.bestScore) || 0,
        shouldMigrate ? legacyScore : 0,
      ),
      bestLevel: Math.max(1, Number(parsed.bestLevel) || 1),
      bestCombo: Math.max(0, Number(parsed.bestCombo) || 0),
      missionTotal: Math.max(0, Number(parsed.missionTotal) || 0),
      difficulty: normalizeDifficulty(parsed.difficulty),
      audioEnabled: Boolean(parsed.audioEnabled),
      migratedLegacyHighScore: true,
    };
  } catch {
    return { ...defaultStats };
  }
}

export function saveStats(stats: PersistedStats) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(stats));
  } catch {
    // Storage can fail in private browsing or restricted contexts.
  }
}
