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
 * Deterministically select exactly 4 Featured Games for the Day based on calendar date (YYYY-MM-DD).
 * - Rotates every day at midnight so users discover 4 fresh games daily.
 * - Always returns exactly 4 distinct, playable games (never duplicates).
 * - Uses a seeded pseudo-random shuffle tied to the calendar day.
 * - Identical for all visitors on the same day; does not change on simple refresh.
 * - Allows passing a custom Date for testing / verification.
 */
export function getDailyFeaturedGames(targetDate: Date = new Date(), count = 4): GameInfo[] {
  const playable = GAMES.filter((g) => !g.comingSoon);
  if (playable.length <= count) return playable;

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateKey = `featured-${year}-${month}-${day}`;

  // Deterministic 32-bit FNV-1a hash of the date string
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Mulberry32 32-bit PRNG initialized with the day's hash
  let seed = hash >>> 0;
  const nextRnd = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates shuffle on a clone of playable games
  const pool = [...playable];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRnd() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool.slice(0, count);
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
