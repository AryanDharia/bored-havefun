export type TileType =
  | 'property'
  | 'station'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'chest'
  | 'corner';

export type ColorGroup =
  | 'brown'
  | 'cyan'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue';

export interface TileInfo {
  id: number; // 0 to 39
  name: string;
  subtitle?: string;
  type: TileType;
  group?: ColorGroup;
  cost?: number;
  baseRent?: number;
  houseRents?: [number, number, number, number, number]; // 1, 2, 3, 4 houses, 1 hotel
  houseCost?: number;
  taxAmount?: number;
  icon?: string;
  gridRow: number; // 1 to 11
  gridCol: number; // 1 to 11
}

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: number;
  name: string;
  isAi: boolean;
  aiDifficulty: AiDifficulty;
  colorHex: string;
  badgeHex: string;
  tokenName: string;
  tokenEmoji: string;
  position: number; // 0 to 39
  money: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  bankrupt: boolean;
}

export interface PropertyState {
  ownerId: number | null;
  houses: number; // 0 = none, 1-4 = houses, 5 = hotel
  isMortgaged: boolean;
}

export interface Card {
  id: string;
  type: 'chance' | 'chest';
  title: string;
  description: string;
  amount?: number;
  moveTo?: number;
  nearestStation?: boolean;
  sendToJail?: boolean;
  getOutOfJail?: boolean;
  collectFromAll?: number;
  repairHouseFee?: number;
  repairHotelFee?: number;
}

export type GamePhase =
  | 'setup'
  | 'roll'
  | 'moving'
  | 'action_needed'
  | 'turn_ready'
  | 'game_over';

export interface GameLog {
  id: string;
  text: string;
  time: string;
  type: 'move' | 'buy' | 'rent' | 'card' | 'jail' | 'upgrade' | 'bankrupt';
  playerId?: number;
}
