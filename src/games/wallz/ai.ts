import type {
  PlayerId,
  Cell,
  Wall,
  MoveAction,
  GameState,
  AIDifficulty,
  WallOrientation
} from './types';
import {
  getLegalPawnMoves,
  validateWallPlacement,
  findShortestPath,
  applyAction,
  WALL_GRID_SIZE,
  areCellsEqual
} from './gameEngine';

/**
 * Returns the best move for the AI given the current state and difficulty setting.
 * Always returns a strictly legal move.
 */
export function getAIMove(
  state: GameState,
  difficulty: AIDifficulty = 'medium',
  aiPlayer: PlayerId = 2
): MoveAction {
  const opponentPlayer: PlayerId = aiPlayer === 1 ? 2 : 1;
  const legalPawnMoves = getLegalPawnMoves(state, aiPlayer);

  if (legalPawnMoves.length === 0) {
    throw new Error('AI has no legal pawn moves');
  }

  const aiPos = aiPlayer === 1 ? state.p1 : state.p2;
  const oppPos = opponentPlayer === 1 ? state.p1 : state.p2;
  const aiWallsLeft = aiPlayer === 1 ? state.p1WallsLeft : state.p2WallsLeft;

  const currentAiPath = findShortestPath(aiPos, aiPlayer, state.walls);
  const currentOppPath = findShortestPath(oppPos, opponentPlayer, state.walls);

  // Helper to find the pawn move that progresses along the shortest path
  const getBestPawnMove = (): Cell => {
    let bestCell = legalPawnMoves[0];
    let bestDist = Infinity;

    for (const move of legalPawnMoves) {
      const nextPath = findShortestPath(move, aiPlayer, state.walls);
      if (nextPath.distance < bestDist) {
        bestDist = nextPath.distance;
        bestCell = move;
      }
    }
    return bestCell;
  };

  // ----------------------------------------------------
  // EASY DIFFICULTY
  // ----------------------------------------------------
  if (difficulty === 'easy') {
    const bestMove = getBestPawnMove();

    // 80% chance: move along shortest path
    // 20% chance: pick an alternative legal move if available
    if (Math.random() < 0.8 || legalPawnMoves.length === 1) {
      return {
        type: 'move',
        player: aiPlayer,
        from: aiPos,
        to: bestMove
      };
    } else {
      const otherMoves = legalPawnMoves.filter((m) => !areCellsEqual(m, bestMove));
      const chosen = otherMoves.length > 0 ? otherMoves[Math.floor(Math.random() * otherMoves.length)] : bestMove;
      return {
        type: 'move',
        player: aiPlayer,
        from: aiPos,
        to: chosen
      };
    }
  }

  // ----------------------------------------------------
  // MEDIUM DIFFICULTY
  // ----------------------------------------------------
  if (difficulty === 'medium') {
    const aiDist = currentAiPath.distance;
    const oppDist = currentOppPath.distance;
    const bestPawnMove = getBestPawnMove();

    // Check if AI can win on this turn
    const winningMove = legalPawnMoves.find((m) => (aiPlayer === 1 ? m.r === 0 : m.r === 8));
    if (winningMove) {
      return {
        type: 'move',
        player: aiPlayer,
        from: aiPos,
        to: winningMove
      };
    }

    // Consider placing a wall if AI has walls and opponent is threatening or ahead
    let bestWall: Wall | null = null;
    let maxDetour = 0;

    if (aiWallsLeft > 0 && (oppDist <= aiDist || oppDist <= 4)) {
      // Collect candidate wall locations around the opponent's current shortest path
      const candidateWalls: { r: number; c: number; orientation: WallOrientation }[] = [];

      for (let i = 0; i < Math.min(4, currentOppPath.path.length); i++) {
        const step = currentOppPath.path[i];
        for (let dr = -1; dr <= 0; dr++) {
          for (let dc = -1; dc <= 0; dc++) {
            const wr = step.r + dr;
            const wc = step.c + dc;
            if (wr >= 0 && wr < WALL_GRID_SIZE && wc >= 0 && wc < WALL_GRID_SIZE) {
              candidateWalls.push({ r: wr, c: wc, orientation: 'H' });
              candidateWalls.push({ r: wr, c: wc, orientation: 'V' });
            }
          }
        }
      }

      for (const cand of candidateWalls) {
        const validation = validateWallPlacement(state, cand.r, cand.c, cand.orientation, aiPlayer);
        if (validation.valid) {
          const testWalls = [...state.walls, { ...cand, player: aiPlayer }];
          const testOpp = findShortestPath(oppPos, opponentPlayer, testWalls);
          const testAi = findShortestPath(aiPos, aiPlayer, testWalls);

          const oppIncrease = testOpp.distance - oppDist;
          const aiIncrease = testAi.distance - aiDist;
          const netBenefit = oppIncrease - aiIncrease;

          if (oppIncrease >= 2 && aiIncrease <= 1 && netBenefit > maxDetour) {
            maxDetour = netBenefit;
            bestWall = { ...cand, player: aiPlayer };
          }
        }
      }
    }

    // Place strategic wall if effective
    if (bestWall && maxDetour >= 2 && Math.random() < 0.85) {
      return {
        type: 'wall',
        player: aiPlayer,
        wall: bestWall
      };
    }

    // Otherwise advance pawn
    return {
      type: 'move',
      player: aiPlayer,
      from: aiPos,
      to: bestPawnMove
    };
  }

  // ----------------------------------------------------
  // HARD DIFFICULTY (Lookahead + Heuristic Minimax)
  // ----------------------------------------------------
  const aiDist = currentAiPath.distance;
  const oppDist = currentOppPath.distance;

  // Immediate winning move
  const winningMove = legalPawnMoves.find((m) => (aiPlayer === 1 ? m.r === 0 : m.r === 8));
  if (winningMove) {
    return {
      type: 'move',
      player: aiPlayer,
      from: aiPos,
      to: winningMove
    };
  }

  // Generate candidate actions for AI
  const candidateActions: MoveAction[] = [];

  // 1. All legal pawn moves
  for (const move of legalPawnMoves) {
    candidateActions.push({
      type: 'move',
      player: aiPlayer,
      from: aiPos,
      to: move
    });
  }

  // 2. High-impact candidate walls (if AI has walls left)
  if (aiWallsLeft > 0) {
    const wallCandidatesSet = new Set<string>();
    const wallCandidates: Wall[] = [];

    // Focus on cells along opponent's critical path
    for (let i = 0; i < Math.min(5, currentOppPath.path.length); i++) {
      const step = currentOppPath.path[i];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const wr = step.r + dr;
          const wc = step.c + dc;
          if (wr >= 0 && wr < WALL_GRID_SIZE && wc >= 0 && wc < WALL_GRID_SIZE) {
            for (const orientation of ['H', 'V'] as WallOrientation[]) {
              const key = `${wr},${wc},${orientation}`;
              if (!wallCandidatesSet.has(key)) {
                wallCandidatesSet.add(key);
                wallCandidates.push({ r: wr, c: wc, orientation, player: aiPlayer });
              }
            }
          }
        }
      }
    }

    // Filter to legal walls that meaningfully block the opponent
    for (const wall of wallCandidates) {
      const validation = validateWallPlacement(state, wall.r, wall.c, wall.orientation, aiPlayer);
      if (validation.valid) {
        const testWalls = [...state.walls, wall];
        const newOpp = findShortestPath(oppPos, opponentPlayer, testWalls);
        const newAi = findShortestPath(aiPos, aiPlayer, testWalls);

        const oppDetour = newOpp.distance - oppDist;
        const aiDetour = newAi.distance - aiDist;

        // Keep walls that give a positive detour differential
        if (oppDetour > 0 && oppDetour >= aiDetour) {
          candidateActions.push({
            type: 'wall',
            player: aiPlayer,
            wall
          });
        }
      }
    }
  }

  // Evaluate candidate actions with 2-ply lookahead
  function evaluatePosition(s: GameState): number {
    if (s.winner === aiPlayer) return 100000;
    if (s.winner === opponentPlayer) return -100000;

    const myCurrPos = aiPlayer === 1 ? s.p1 : s.p2;
    const oppCurrPos = opponentPlayer === 1 ? s.p1 : s.p2;

    const myP = findShortestPath(myCurrPos, aiPlayer, s.walls);
    const oppP = findShortestPath(oppCurrPos, opponentPlayer, s.walls);

    if (myP.distance === Infinity) return -100000;
    if (oppP.distance === Infinity) return 100000;

    const myWalls = aiPlayer === 1 ? s.p1WallsLeft : s.p2WallsLeft;
    const oppWalls = opponentPlayer === 1 ? s.p1WallsLeft : s.p2WallsLeft;

    // Strategic evaluation formula:
    // Lead advantage: (opponent path length - AI path length) * 25
    // Wall advantage: (my walls - opp walls) * 4
    // Proximity to goal: (8 - AI distance) * 5
    return (
      (oppP.distance - myP.distance) * 25 +
      (myWalls - oppWalls) * 4 +
      (8 - myP.distance) * 5
    );
  }

  let bestScore = -Infinity;
  let bestAction: MoveAction = candidateActions[0];

  for (const action of candidateActions) {
    try {
      const nextState = applyAction(state, action);

      if (nextState.winner === aiPlayer) {
        return action;
      }

      // Human response simulation
      const oppLegalPawnMoves = getLegalPawnMoves(nextState, opponentPlayer);
      let worstScoreForAI = Infinity;

      // Evaluate human's best pawn responses
      for (const oppMove of oppLegalPawnMoves) {
        const oppNextState = applyAction(nextState, {
          type: 'move',
          player: opponentPlayer,
          from: oppPos,
          to: oppMove
        });

        const score = evaluatePosition(oppNextState);
        if (score < worstScoreForAI) {
          worstScoreForAI = score;
        }
      }

      // If action is a wall, factor in the wall consumption cost
      // (avoid wasting walls when pawn progress is already effective)
      const adjustedScore =
        action.type === 'wall' && oppDist > aiDist + 2
          ? worstScoreForAI - 8
          : worstScoreForAI;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestAction = action;
      }
    } catch {
      // Skip any action that fails validation
      continue;
    }
  }

  return bestAction;
}
