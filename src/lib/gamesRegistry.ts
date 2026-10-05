import type { GameInfo } from '../types';

export const GAMES: GameInfo[] = [
  // TIER 1 - MUST BUILD FIRST
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3x3 strategy game. Play vs smart AI or friend with streak tracking.',
    icon: '❌',
    category: 'Board',
    additionalCategories: ['Quick Games', 'Multiplayer'],
    playerCount: '1–2 Players',
    difficulty: 'Easy',
    tier: 1,
    howToPlay: [
      'Take turns marking empty grid cells with X or O.',
      'Get three in a row horizontally, vertically, or diagonally to win.',
      'Switch AI difficulty (Easy, Medium, Hard) or challenge a friend locally.'
    ],
    controls: [
      { key: 'Click / Tap', action: 'Place your mark' },
      { key: 'R', action: 'Restart board' }
    ],
    tags: ['classic', 'xo', 'turn-based', 'quick']
  },
  {
    id: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    description: 'Animated showdown against AI or player. High-energy rounds with streak counter.',
    icon: '✊',
    category: 'Quick Games',
    additionalCategories: ['Arcade', 'Party'],
    playerCount: '1–2 Players',
    difficulty: 'Casual',
    tier: 1,
    howToPlay: [
      'Rock beats Scissors, Scissors beats Paper, Paper beats Rock.',
      'Choose your move before the round countdown finishes.',
      'First to win the target rounds wins the match!'
    ],
    controls: [
      { key: 'Buttons / 1,2,3', action: 'Pick Rock, Paper, or Scissors' }
    ],
    tags: ['rps', 'quick', 'countdown', 'reaction']
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'The definitive retro arcade snake with progressive speed and high score save.',
    icon: '🐍',
    category: 'Arcade',
    additionalCategories: ['Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 1,
    howToPlay: [
      'Guide your snake to eat glowing food apples to grow longer and gain points.',
      'Avoid running into the outer arena walls or your own growing tail.',
      'Game speed ramps up as you score higher.'
    ],
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Change direction' },
      { key: 'Swipe / On-screen D-pad', action: 'Touch direction controls' },
      { key: 'Space', action: 'Pause / Resume' }
    ],
    tags: ['retro', 'arcade', 'speed', 'classic']
  },
  {
    id: 'math-rush',
    name: 'Math Rush',
    description: 'High-octane mental arithmetic sprint. Beat the timer and maintain your combo streak!',
    icon: '⚡',
    category: 'Brain',
    additionalCategories: ['Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Adaptive',
    tier: 1,
    howToPlay: [
      'Answer fast mental math questions before the timer bar runs out.',
      'Consecutive correct answers trigger a Combo Multiplier.',
      'Select between Easy (+/-), Medium (*), and Hard (/ and mixed algebra).'
    ],
    controls: [
      { key: 'Number buttons / Keyboard', action: 'Select or type answer' },
      { key: 'Enter', action: 'Submit answer' }
    ],
    tags: ['numbers', 'puzzle', 'speed', 'educational', 'quiz']
  },
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Flip, match, and clear emoji pairs. Tests working memory across 4x4 and 6x6 grids.',
    icon: '🧠',
    category: 'Brain',
    additionalCategories: ['Puzzle', 'Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 1,
    howToPlay: [
      'Click cards to flip and reveal hidden symbols.',
      'Find two matching symbols to clear them from the board.',
      'Complete the full board in the fewest moves and fastest time.'
    ],
    controls: [
      { key: 'Click / Tap', action: 'Flip card' }
    ],
    tags: ['cards', 'concentration', 'pairs', 'brain']
  },

  // TIER 2 - BOARD GAMES
  {
    id: 'connect-four',
    name: 'Connect 4',
    description: 'Vertical checkers drop duel. Connect four discs in a row before your opponent.',
    icon: '🟡',
    category: 'Board',
    additionalCategories: ['Multiplayer', 'Quick Games'],
    playerCount: '1–2 Players',
    difficulty: 'Medium',
    tier: 2,
    howToPlay: [
      'Drop colored discs into one of 7 columns.',
      'Discs fall to the lowest unoccupied space in the selected column.',
      'Connect four of your discs horizontally, vertically, or diagonally to win.'
    ],
    controls: [
      { key: 'Column Click / 1-7 keys', action: 'Drop disc into column' }
    ],
    tags: ['board', 'gravity', 'strategy', 'pvp']
  },
  {
    id: 'checkers',
    name: 'Checkers',
    description: 'Playable 8x8 draughts with diagonal sliding, king promotion, and multi-jumps.',
    icon: '🏁',
    category: 'Board',
    additionalCategories: ['Multiplayer'],
    playerCount: '1–2 Players',
    difficulty: 'Medium',
    tier: 2,
    howToPlay: [
      'Move your pieces diagonally forward to vacant dark squares.',
      'Jump over opponent pieces to capture them.',
      'Reach the opposite end of the board to promote your piece to a King!'
    ],
    controls: [
      { key: 'Click piece & Click destination', action: 'Move or capture' }
    ],
    tags: ['board', 'draughts', 'classic', 'pvp']
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Pristine 9x9 logic puzzle generator with conflict hints, notes, and 3 difficulty tiers.',
    icon: '🔢',
    category: 'Puzzle',
    additionalCategories: ['Brain'],
    playerCount: '1 Player',
    difficulty: 'Hard',
    tier: 2,
    howToPlay: [
      'Fill each row, column, and 3x3 box with digits 1 through 9 without repeating.',
      'Select a cell and click a number or use keyboard 1-9.',
      'Use pencil notes for candidates and the Hint button if you get stuck.'
    ],
    controls: [
      { key: 'Click cell', action: 'Select cell' },
      { key: '1–9 / Backspace', action: 'Enter or erase number' }
    ],
    tags: ['logic', 'numbers', 'puzzle', 'grid']
  },
  {
    id: 'snakes-and-ladders',
    name: 'Snakes & Ladders',
    description: 'Vibrant 100-cell race. Climb soaring ladders and dodge sneaky slippery snakes.',
    icon: '🪜',
    category: 'Board',
    additionalCategories: ['Party', 'Multiplayer'],
    playerCount: '2–4 Players',
    difficulty: 'Casual',
    tier: 2,
    howToPlay: [
      'Roll the dice on your turn to advance across the 100-square board.',
      'Land on a ladder base to climb up ahead.',
      'Land on a snake head to slide down backwards.',
      'Exact roll or first player to square 100 wins!'
    ],
    controls: [
      { key: 'Click Roll Dice / Space', action: 'Roll the 3D dice' }
    ],
    tags: ['dice', 'race', 'family', 'multiplayer']
  },
  {
    id: 'ludo',
    name: 'Ludo',
    description: 'Simplified, fast-paced cross-and-circle token race with captures and safe star zones.',
    icon: '🎯',
    category: 'Board',
    additionalCategories: ['Party', 'Multiplayer'],
    playerCount: '2–4 Players',
    difficulty: 'Casual',
    tier: 2,
    howToPlay: [
      'Roll a 6 to bring a pawn out of your yard into the starting tile.',
      'Race tokens around the track and up the home column to the center triangle.',
      'Land on opponent tokens to knock them back to base!',
      'Star squares are safe zones where pieces cannot be captured.'
    ],
    controls: [
      { key: 'Click Dice to roll', action: 'Roll die' },
      { key: 'Click Token', action: 'Move active token' }
    ],
    tags: ['ludo', 'parcheesi', 'dice', 'tokens']
  },

  // TIER 3 - ADVANCED GAMES
  {
    id: 'chess',
    name: 'Chess',
    description: 'Full tournament-rules chess. Check, checkmate, castling, en-passant & AI opponent.',
    icon: '♟️',
    category: 'Board',
    additionalCategories: ['Brain', 'Multiplayer'],
    playerCount: '1–2 Players',
    difficulty: 'Hard',
    tier: 3,
    howToPlay: [
      'Move your pieces according to legal FIDE chess rules.',
      'Defend your King and attack the opponent King until checkmate is reached.',
      'Supports Player vs AI or local Player vs Player with move history.'
    ],
    controls: [
      { key: 'Click piece & Click target square', action: 'Move piece' }
    ],
    tags: ['chess', 'grandmaster', 'tactics', 'strategy']
  },
  {
    id: 'pocket-tanks',
    name: 'Pocket Tanks',
    description: 'Ballistic artillery duel with deformable terrain, angle & power gauges, and gravity.',
    icon: '🚀',
    category: 'Arcade',
    additionalCategories: ['Multiplayer', 'Quick Games'],
    playerCount: '1–2 Players',
    difficulty: 'Medium',
    tier: 3,
    howToPlay: [
      'Adjust your barrel aim angle (0° to 180°) and launch velocity (power).',
      'Account for gravity and terrain obstacles.',
      'Direct and blast-radius hits deal damage to the opposing tank!'
    ],
    controls: [
      { key: 'Angle & Power sliders', action: 'Tune trajectory' },
      { key: 'FIRE button / Space', action: 'Launch missile' }
    ],
    tags: ['artillery', 'physics', 'tanks', 'trajectories']
  },
  {
    id: 'psych',
    name: 'Psych! Party',
    description: 'Wacky trivia bluffing party game. Write fake answers to trick other players!',
    icon: '🎭',
    category: 'Party',
    additionalCategories: ['Multiplayer', 'Brain'],
    playerCount: '2–6 Players',
    difficulty: 'Casual',
    tier: 3,
    howToPlay: [
      'A real obscure trivia fact or wacky prompt is displayed.',
      'Pass the device around: each player writes a clever, believable fake answer.',
      'All answers + the real one are shuffled. Everyone votes on which they think is true!',
      'Score points for guessing the truth, and for each fool who picks your bluff.'
    ],
    controls: [
      { key: 'Keyboard / Tap', action: 'Write bluffs & cast votes' }
    ],
    tags: ['party', 'bluff', 'trivia', 'social']
  },

  // TIER 4 / EXTRA QUICK GAMES
  {
    id: '2048',
    name: '2048',
    description: 'Join identical numbers and get to the legendary 2048 tile in this hypnotic slider.',
    icon: '🔢',
    category: 'Puzzle',
    additionalCategories: ['Brain', 'Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Swipe or use arrow keys to slide all tiles in one of 4 directions.',
      'When two tiles with the same number collide, they merge into one with double value.',
      'Try to reach 2048 before the board fills up completely!'
    ],
    controls: [
      { key: 'Arrow Keys / Swipe', action: 'Slide board' }
    ],
    tags: ['slide', 'merge', 'numbers', 'addictive']
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    description: 'Classic PC logic game. Uncover numbers, flag bombs, and sweep the minefield safely.',
    icon: '💣',
    category: 'Puzzle',
    additionalCategories: ['Brain', 'Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Left click to uncover squares. Number indicates adjacent hidden mines.',
      'Right click or Toggle Flag button to place protective warning flags on mines.',
      'Uncover all non-mine tiles to win!'
    ],
    controls: [
      { key: 'Left Click / Tap', action: 'Reveal tile' },
      { key: 'Right Click / Flag Mode', action: 'Flag suspected mine' }
    ],
    tags: ['mines', 'logic', 'retro', 'sweep']
  },
  {
    id: 'pong',
    name: 'Pong Retro',
    description: 'Original table tennis showdown. Crisp physics, responsive paddles, 1P vs AI or 2P.',
    icon: '🏓',
    category: 'Arcade',
    additionalCategories: ['Multiplayer', 'Quick Games'],
    playerCount: '1–2 Players',
    difficulty: 'Casual',
    tier: 4,
    howToPlay: [
      'Control your paddle to deflect the speeding ball back into the opponent court.',
      'Angle your hits by striking with paddle edges.',
      'First to 7 points takes the arcade trophy!'
    ],
    controls: [
      { key: 'W/S or Up/Down', action: 'Move paddle' },
      { key: 'Touch slide', action: 'Mobile paddle control' }
    ],
    tags: ['retro', 'pong', 'arcade', 'table-tennis']
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Smash colorful brick walls with ball bounces. High scores and satisfying cascades.',
    icon: '🧱',
    category: 'Arcade',
    additionalCategories: ['Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Bounce the ball with your bottom paddle to demolish all rows of brick blocks.',
      'Keep the ball in play without letting it fall past your paddle.',
      'Clear the entire wall to claim victory!'
    ],
    controls: [
      { key: 'Arrow Keys / Mouse / Touch', action: 'Move paddle horizontally' },
      { key: 'Space', action: 'Launch ball' }
    ],
    tags: ['brick', 'breakout', 'retro', 'arcade']
  },
  {
    id: 'reaction-test',
    name: 'Reaction Test',
    description: 'Test your reflexes down to the exact millisecond! Red to Green lightning tap.',
    icon: '⏱️',
    category: 'Quick Games',
    additionalCategories: ['Brain', 'Arcade'],
    playerCount: '1 Player',
    difficulty: 'Casual',
    tier: 4,
    howToPlay: [
      'Click the screen to prepare. Wait patiently while the screen is RED.',
      'The moment it turns GREEN, click as fast as humanly possible!',
      'Average 5 rounds to measure your true reaction time and rating.'
    ],
    controls: [
      { key: 'Click / Tap / Space', action: 'React' }
    ],
    tags: ['reflex', 'milliseconds', 'speed', 'test']
  },
  {
    id: 'dots-and-boxes',
    name: 'Dots & Boxes',
    description: 'Strategic pencil-and-paper classic. Connect dots, complete 4-sided boxes to claim territory.',
    icon: '📦',
    category: 'Board',
    additionalCategories: ['Brain', 'Multiplayer'],
    playerCount: '1–2 Players',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Take turns drawing a line between two adjacent unlinked dots.',
      'The player who draws the fourth line of a 1x1 box claims it and scores 1 point.',
      'Completing a box grants you an immediate bonus turn!'
    ],
    controls: [
      { key: 'Click edge', action: 'Draw connecting line' }
    ],
    tags: ['dots', 'boxes', 'strategy', 'grid']
  },
  {
    id: 'wordle',
    name: 'Word Quest',
    description: 'Guess the hidden 5-letter word in 6 attempts with color-coded feedback hints.',
    icon: '🔤',
    category: 'Brain',
    additionalCategories: ['Puzzle', 'Quick Games'],
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Guess a secret 5-letter word in 6 tries.',
      '🟩 GREEN: Letter is in the word and in the correct spot.',
      '🟨 YELLOW: Letter is in the word but wrong spot.',
      '⬛ GRAY: Letter is not in the word at all.'
    ],
    controls: [
      { key: 'Keyboard / Virtual keys', action: 'Type letters' },
      { key: 'Enter', action: 'Submit guess' }
    ],
    tags: ['word', 'wordle', 'vocabulary', 'puzzle']
  }
];

export const CATEGORIES = [
  'All',
  'Arcade',
  'Puzzle',
  'Board',
  'Brain',
  'Multiplayer',
  'Quick Games',
  'Party'
] as const;
