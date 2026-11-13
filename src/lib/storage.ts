// Safe localStorage wrapper with memoryStore fallback for SSR & test environments

const PREFIX = 'playbreak_';
const memoryStore = new Map<string, string>();

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw) as T;
    }
  } catch {
    // Fall back to memoryStore
  }

  const mem = memoryStore.get(PREFIX + key);
  if (mem !== undefined) {
    try {
      return JSON.parse(mem) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

export function setStorageItem<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value);
  memoryStore.set(PREFIX + key, serialized);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PREFIX + key, serialized);
    }
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
