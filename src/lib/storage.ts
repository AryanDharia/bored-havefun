// Safe localStorage wrapper

const PREFIX = 'playbreak_';

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or disabled localStorage exceptions
  }
}

export function getHighScore(gameId: string): number {
  return getStorageItem<number>(`highscore_${gameId}`, 0);
}

export function saveHighScore(gameId: string, score: number): boolean {
  const current = getHighScore(gameId);
  if (score > current) {
    setStorageItem(`highscore_${gameId}`, score);
    return true; // New high score
  }
  return false;
}
