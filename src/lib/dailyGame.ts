import { GAMES } from './gamesRegistry';
import type { GameInfo } from '../types';

/**
 * Deterministically select a Game of the Day based on calendar date (YYYY-MM-DD).
 * - Generates the identical selection for all visitors on the same date worldwide.
 * - Automatically advances at midnight.
 * - Does not change on simple page refresh.
 * - Allows passing a custom Date for testing / verification.
 */
export function getGameOfTheDay(targetDate: Date = new Date()): GameInfo {
  const playable = GAMES.filter((g) => !g.comingSoon);
  if (playable.length === 0) return GAMES[0];

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  // Deterministic 32-bit FNV-1a hash of the date string
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const index = Math.abs(hash) % playable.length;
  return playable[index];
}

/**
 * Formats a date for editorial display (e.g., "OCTOBER 15, 2026")
 */
export function formatDailyDate(targetDate: Date = new Date()): string {
  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
}
