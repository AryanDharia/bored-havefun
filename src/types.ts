export type GameCategory = 
  | 'All' 
  | 'Arcade' 
  | 'Puzzle' 
  | 'Board' 
  | 'Brain' 
  | 'Multiplayer' 
  | 'Quick Games' 
  | 'Party';

export type GameDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Casual' | 'Adaptive';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or SVG symbol
  badgeColor?: string;
  category: GameCategory;
  additionalCategories?: GameCategory[];
  playerCount: string; // e.g. "1 Player", "1–2 Players", "2–4 Players"
  difficulty: GameDifficulty;
  tier: 1 | 2 | 3 | 4;
  howToPlay: string[];
  controls: { key: string; action: string }[];
  tags: string[];
}

export interface ScoreState {
  score: number;
  highScore: number;
  streak?: number;
}
