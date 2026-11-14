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
  shortName?: string; // Clean concise label for portrait mobile tiles
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
export type AiPersonality = 'conservative' | 'aggressive' | 'trader' | 'balanced';

export interface Player {
  id: number;
  name: string;
  isAi: boolean;
  aiDifficulty: AiDifficulty;
  personality?: AiPersonality;
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

export interface TradeOffer {
  id: string;
  fromPlayerId: number;
  toPlayerId: number;
  offeredPropertyIds: number[];
  requestedPropertyIds: number[];
  offeredCash: number;
  requestedCash: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
}

export interface IncomingTradeOffer {
  fromAiPlayerId: number;
  targetPlayerId: number;
  offeredPropertyIds: number[];
  requestedPropertyIds: number[];
  offeredCash: number;
  requestedCash: number;
  fairnessScore: number;
  strategicReason: string;
}

export interface PendingDebt {
  debtorId: number;
  creditorId: number | null; // null = Bank (tax, card, jail fine), number = Player (rent)
  amountDue: number;
  originalAmount: number;
  reason: string;
}

export type GamePhase =
  | 'setup'
  | 'roll'
  | 'moving'
  | 'action_needed'
  | 'auction'
  | 'debt_recovery'
  | 'turn_ready'
  | 'trading'
  | 'game_over';

export interface AuctionBid {
  playerId: number;
  bid: number;
  time: string;
}

export interface AuctionState {
  tileId: number;
  currentBid: number;
  minIncrement: number;
  highestBidderId: number | null;
  activeBidderIds: number[];
  passedPlayerIds: number[];
  currentBidderIndex: number;
  history: AuctionBid[];
  isCompleted: boolean;
  winnerId: number | null;
  declinedByPlayerId: number;
}

export interface GameLog {
  id: string;
  text: string;
  time: string;
  type:
    | 'move'
    | 'buy'
    | 'rent'
    | 'card'
    | 'jail'
    | 'upgrade'
    | 'bankrupt'
    | 'trade'
    | 'mortgage'
    | 'unmortgage'
    | 'auction'
    | 'debt';
  playerId?: number;
}
