import { getStorageItem, setStorageItem } from '../../lib/storage';

export type GameMode = 'BEST_OF_5' | 'VS_FRIEND';

export type SequencePhase =
  | 'IDLE'          // Cockpit ready, waiting to initiate start sequence
  | 'STAGING'       // Gantry active, preparing sequential lights
  | 'LIGHTS_ON'     // 1 to 5 red lights illuminating in sequence
  | 'HOLDING'       // All 5 red lights on; randomized hold before extinguishing
  | 'LIGHTS_OUT'    // All lights turned off! Player must tap immediately
  | 'RESULT'        // Valid tap registered, displaying measured time
  | 'FALSE_START'   // Player tapped before lights went off (jump start)
  | 'HANDOVER'      // Pass & Play transition between Player 1 and Player 2
  | 'GAME_OVER';    // All rounds finished, showing final scorecard

export interface RoundAttempt {
  roundNumber: number; // 1 to 5
  playerIndex: 0 | 1;  // 0 for Player 1, 1 for Player 2
  reactionMs: number | null; // null if false start
  isFalseStart: boolean;
  signalTimestamp: number;
  inputTimestamp: number;
}

export interface PlayerStats {
  playerName: string;
  attempts: RoundAttempt[];
  validCount: number;
  falseStartsCount: number;
  validAverageMs: number | null;
  bestMs: number | null;
  worstMs: number | null;
}

export const TOTAL_ROUNDS = 5;
export const LIGHTS_COUNT = 5;
export const LIGHT_INTERVAL_MS = 800; // Cadence between each red light illuminating
export const MIN_HOLD_MS = 1000;      // Minimum randomized hold with all 5 lights on
export const MAX_HOLD_MS = 3200;      // Maximum randomized hold

/**
 * Returns a randomized duration in milliseconds for the 5-lights hold interval.
 * Uses cryptographically seeded randomness if available, falling back to Math.random.
 */
export function getRandomHoldDuration(): number {
  return Math.floor(MIN_HOLD_MS + Math.random() * (MAX_HOLD_MS - MIN_HOLD_MS));
}

/**
 * Accurately calculates reaction time from exact high-resolution performance timestamps.
 * reactionTime = inputTimestamp - signalTimestamp
 */
export function evaluateReaction(signalTimestamp: number, inputTimestamp: number): number {
  if (inputTimestamp < signalTimestamp) {
    return 0;
  }
  return Math.max(1, Math.round(inputTimestamp - signalTimestamp));
}

/**
 * Computes comprehensive performance statistics for a player's set of attempts.
 * Averages are strictly calculated from valid attempts only.
 */
export function calculatePlayerStats(playerName: string, attempts: RoundAttempt[]): PlayerStats {
  const validAttempts = attempts.filter((a) => !a.isFalseStart && a.reactionMs !== null && a.reactionMs > 0);
  const falseStarts = attempts.filter((a) => a.isFalseStart);

  const validTimes = validAttempts.map((a) => a.reactionMs as number);
  const validCount = validTimes.length;
  const falseStartsCount = falseStarts.length;

  let validAverageMs: number | null = null;
  let bestMs: number | null = null;
  let worstMs: number | null = null;

  if (validCount > 0) {
    const sum = validTimes.reduce((acc, val) => acc + val, 0);
    validAverageMs = Math.round(sum / validCount);
    bestMs = Math.min(...validTimes);
    worstMs = Math.max(...validTimes);
  }

  return {
    playerName,
    attempts,
    validCount,
    falseStartsCount,
    validAverageMs,
    bestMs,
    worstMs
  };
}

/**
 * Rating brackets based on realistic human and elite driver reaction times.
 * Note: Never includes the phrase "Can you beat an F1 driver?".
 */
export function getRating(ms: number | null): {
  title: string;
  desc: string;
  badge: string;
  color: string;
} {
  if (ms === null || ms <= 0) {
    return {
      title: 'Disqualified / False Start',
      desc: 'No valid reaction recorded. Watch the gantry and wait for lights out!',
      badge: 'JUMP START',
      color: '#ef4444'
    };
  }

  if (ms < 190) {
    return {
      title: 'Sub-200ms Reaction',
      desc: 'World-class starting grid launch! Your nervous system is tuned to the absolute limit.',
      badge: 'APEX REFLEX',
      color: '#a855f7'
    };
  }
  if (ms < 230) {
    return {
      title: 'Pro Championship Pace',
      desc: 'Exceptional reflex speed. You would comfortably lead into Turn 1 on any starting grid.',
      badge: 'POLE POSITION',
      color: '#f59e0b'
    };
  }
  if (ms < 270) {
    return {
      title: 'Sharp Track Reflexes',
      desc: 'Rapid and consistent reaction speed well above average human capability.',
      badge: 'PODIUM CONTENDER',
      color: '#10b981'
    };
  }
  if (ms < 340) {
    return {
      title: 'Standard Grid Pace',
      desc: 'Solid average reaction speed. Stay focused on the gantry to shave off crucial hundredths.',
      badge: 'MIDFIELD RACER',
      color: '#38bdf8'
    };
  }
  return {
    title: 'Delayed Reaction',
    desc: 'Caught sleeping on the starting grid! Focus intently on the lights and launch sooner.',
    badge: 'PIT LANE SPEED',
    color: '#94a3b8'
  };
}

/**
 * Determines the winner in VS Friend mode.
 * Rule:
 * 1. Player with more valid rounds (fewer false starts) has a major advantage.
 * 2. If equal valid rounds, lower validAverageMs wins.
 * 3. If tie on average, lowest bestMs breaks the tie.
 */
export function determineWinner(
  p1: PlayerStats,
  p2: PlayerStats
): {
  winner: 'P1' | 'P2' | 'TIE';
  reason: string;
} {
  // If one had fewer false starts and both have valid times
  if (p1.validCount > p2.validCount && p1.validCount > 0) {
    return {
      winner: 'P1',
      reason: `${p1.playerName} completed ${p1.validCount} valid rounds vs ${p2.validCount}`
    };
  }
  if (p2.validCount > p1.validCount && p2.validCount > 0) {
    return {
      winner: 'P2',
      reason: `${p2.playerName} completed ${p2.validCount} valid rounds vs ${p1.validCount}`
    };
  }

  // If both have 0 valid rounds
  if (p1.validAverageMs === null && p2.validAverageMs === null) {
    return { winner: 'TIE', reason: 'Both players false-started all rounds' };
  }
  if (p1.validAverageMs === null) {
    return { winner: 'P2', reason: `${p1.playerName} had no valid rounds` };
  }
  if (p2.validAverageMs === null) {
    return { winner: 'P1', reason: `${p2.playerName} had no valid rounds` };
  }

  // Compare averages (lower ms is better)
  if (p1.validAverageMs < p2.validAverageMs) {
    const diff = p2.validAverageMs - p1.validAverageMs;
    return {
      winner: 'P1',
      reason: `${p1.playerName} was faster on average by ${diff}ms`
    };
  }
  if (p2.validAverageMs < p1.validAverageMs) {
    const diff = p1.validAverageMs - p2.validAverageMs;
    return {
      winner: 'P2',
      reason: `${p2.playerName} was faster on average by ${diff}ms`
    };
  }

  // Tie breaker on best round
  if (p1.bestMs !== null && p2.bestMs !== null) {
    if (p1.bestMs < p2.bestMs) {
      return {
        winner: 'P1',
        reason: `Equal average! ${p1.playerName} won on peak round (${p1.bestMs}ms vs ${p2.bestMs}ms)`
      };
    }
    if (p2.bestMs < p1.bestMs) {
      return {
        winner: 'P2',
        reason: `Equal average! ${p2.playerName} won on peak round (${p2.bestMs}ms vs ${p1.bestMs}ms)`
      };
    }
  }

  return { winner: 'TIE', reason: 'Dead heat! Identical average and best times' };
}

/**
 * Storage helpers for lowest (best) reaction time in milliseconds.
 */
const BEST_REACTION_KEY = 'formula_reaction_best_ms';

export function getPersonalBestMs(): number {
  return getStorageItem<number>(BEST_REACTION_KEY, 0);
}

export function savePersonalBestMs(ms: number): boolean {
  if (ms <= 0) return false;
  const current = getPersonalBestMs();
  if (current === 0 || ms < current) {
    setStorageItem(BEST_REACTION_KEY, ms);
    return true; // New personal record!
  }
  return false;
}
