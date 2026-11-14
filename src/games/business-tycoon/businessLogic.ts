import { TILES, COLOR_GROUPS } from './boardData';
import type { TileInfo, PropertyState, Player, ColorGroup } from './types';

/**
 * Calculates rent for a tile based on owner monopoly, house count, or utility/station multipliers.
 */
export function calculateRent(
  tileId: number,
  diceRollTotal: number,
  properties: Record<number, PropertyState>
): { rent: number; breakdown: string } {
  const tile = TILES.find((t) => t.id === tileId);
  if (!tile) return { rent: 0, breakdown: 'Invalid space' };

  const propState = properties[tileId];
  if (!propState || propState.ownerId === null || propState.isMortgaged) {
    return { rent: 0, breakdown: propState?.isMortgaged ? 'Mortgaged property (0 rent)' : 'Unowned' };
  }

  const ownerId = propState.ownerId;

  // 1. City Properties
  if (tile.type === 'property') {
    if (propState.houses > 0 && tile.houseRents) {
      const idx = Math.min(propState.houses - 1, 4);
      const rent = tile.houseRents[idx];
      const label = propState.houses === 5 ? 'Hotel' : `${propState.houses} House${propState.houses > 1 ? 's' : ''}`;
      return { rent, breakdown: `${label} rent` };
    }

    const hasMono = tile.group ? checkMonopoly(tile.group, ownerId, properties) : false;
    const base = tile.baseRent || 10;
    const rent = hasMono ? base * 2 : base;
    return {
      rent,
      breakdown: hasMono ? 'Full Monopoly Group (2× base rent)' : 'Standard base rent'
    };
  }

  // 2. Railway Stations (4 total: IDs 5, 15, 25, 35)
  if (tile.type === 'station') {
    const stationIds = [5, 15, 25, 35];
    const stationsOwned = stationIds.filter((id) => properties[id]?.ownerId === ownerId).length;
    // Scale: 1: ₹25, 2: ₹50, 3: ₹100, 4: ₹200
    const stationRents = [0, 25, 50, 100, 200];
    const rent = stationRents[Math.min(stationsOwned, 4)] || 25;
    return {
      rent,
      breakdown: `${stationsOwned} of 4 Railway Junctions owned`
    };
  }

  // 3. Utilities (Electric Grid ID 12, Water Works ID 28)
  if (tile.type === 'utility') {
    const utilityIds = [12, 28];
    const utilitiesOwned = utilityIds.filter((id) => properties[id]?.ownerId === ownerId).length;
    const multiplier = utilitiesOwned >= 2 ? 10 : 4;
    const rent = diceRollTotal * multiplier;
    return {
      rent,
      breakdown: `${utilitiesOwned} of 2 Utilities owned (${multiplier}× dice total of ${diceRollTotal})`
    };
  }

  return { rent: 0, breakdown: 'Special space' };
}

/**
 * Checks if a player owns all properties in a color group.
 */
export function checkMonopoly(
  group: ColorGroup,
  ownerId: number,
  properties: Record<number, PropertyState>
): boolean {
  const groupTiles = TILES.filter((t) => t.group === group);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => properties[t.id]?.ownerId === ownerId);
}

/**
 * Evaluates whether a property can be upgraded with another house or hotel.
 */
export function canUpgradeProperty(
  tileId: number,
  properties: Record<number, PropertyState>,
  player: Player
): { canUpgrade: boolean; reason?: string } {
  const tile = TILES.find((t) => t.id === tileId);
  if (!tile || tile.type !== 'property' || !tile.group || !tile.houseCost) {
    return { canUpgrade: false, reason: 'This space cannot be upgraded with buildings.' };
  }

  const propState = properties[tileId];
  if (!propState || propState.ownerId !== player.id) {
    return { canUpgrade: false, reason: 'You do not own this property.' };
  }

  if (propState.isMortgaged) {
    return { canUpgrade: false, reason: 'Cannot build on a mortgaged property.' };
  }

  if (propState.houses >= 5) {
    return { canUpgrade: false, reason: 'Maximum building level reached (Skyscraper Hotel).' };
  }

  const hasMono = checkMonopoly(tile.group, player.id, properties);
  if (!hasMono) {
    return {
      canUpgrade: false,
      reason: `You must own all properties in the ${COLOR_GROUPS[tile.group].name} group before building.`
    };
  }

  if (player.money < tile.houseCost) {
    return {
      canUpgrade: false,
      reason: `Insufficient funds. House cost is ₹${tile.houseCost}.`
    };
  }

  // Even building rule (cannot build a 2nd house until all properties in group have 1 house)
  const groupTiles = TILES.filter((t) => t.group === tile.group);
  const minHousesInGroup = Math.min(...groupTiles.map((t) => properties[t.id]?.houses || 0));
  if (propState.houses > minHousesInGroup) {
    return {
      canUpgrade: false,
      reason: 'Building must be even across all properties in the group.'
    };
  }

  return { canUpgrade: true };
}

/**
 * Calculates a player's total net worth (Cash + property deed costs + building investments).
 */
export function calculateNetWorth(
  player: Player,
  properties: Record<number, PropertyState>
): number {
  if (player.bankrupt) return 0;
  let worth = player.money;

  TILES.forEach((tile) => {
    const pState = properties[tile.id];
    if (pState && pState.ownerId === player.id) {
      if (!pState.isMortgaged) {
        worth += tile.cost || 0;
        if (tile.houseCost && pState.houses > 0) {
          worth += pState.houses * tile.houseCost;
        }
      } else {
        worth += (tile.cost || 0) / 2;
      }
    }
  });

  return worth;
}

/**
 * Finds the nearest Railway Station ahead of current position.
 */
export function getNearestStation(currentPosition: number): number {
  const stationIds = [5, 15, 25, 35];
  for (const sId of stationIds) {
    if (sId > currentPosition) return sId;
  }
  return stationIds[0]; // wraps around to Howrah (5)
}

/**
 * Rolls two dice, returning values between 1 and 6.
 */
export function rollDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2];
}

/**
 * AI decision-making logic for buying properties and building upgrades.
 */
export function evaluateAiAction(
  player: Player,
  currentTile: TileInfo,
  properties: Record<number, PropertyState>
): {
  shouldBuy: boolean;
  upgradeCandidateId: number | null;
} {
  // 1. Evaluate Buying
  let shouldBuy = false;
  const prop = properties[currentTile.id];
  const isPurchasable = (currentTile.type === 'property' || currentTile.type === 'station' || currentTile.type === 'utility') && prop?.ownerId === null;

  if (isPurchasable && currentTile.cost) {
    const safetyBuffer =
      player.aiDifficulty === 'hard' ? 120 : player.aiDifficulty === 'medium' ? 180 : 250;

    // Check if this property completes a monopoly for AI
    let completesMonopoly = false;
    if (currentTile.group) {
      const groupTiles = TILES.filter((t) => t.group === currentTile.group && t.id !== currentTile.id);
      completesMonopoly = groupTiles.every((t) => properties[t.id]?.ownerId === player.id);
    }

    if (completesMonopoly && player.money >= currentTile.cost) {
      shouldBuy = true;
    } else if (player.money >= currentTile.cost + safetyBuffer) {
      shouldBuy = true;
    }
  }

  // 2. Evaluate Upgrades
  let upgradeCandidateId: number | null = null;
  const reserveCash = player.aiDifficulty === 'hard' ? 200 : 350;

  if (player.money > reserveCash) {
    // Find any property the AI can legally upgrade
    const ownedProperties = TILES.filter(
      (t) => t.type === 'property' && properties[t.id]?.ownerId === player.id
    );

    for (const tile of ownedProperties) {
      const check = canUpgradeProperty(tile.id, properties, player);
      if (check.canUpgrade) {
        upgradeCandidateId = tile.id;
        break;
      }
    }
  }

  return { shouldBuy, upgradeCandidateId };
}

/**
 * Evaluates whether a property can be mortgaged to the bank.
 */
export function canMortgageProperty(
  tileId: number,
  properties: Record<number, PropertyState>,
  player: Player
): { canMortgage: boolean; reason?: string; mortgageValue: number } {
  const tile = TILES.find((t) => t.id === tileId);
  const cost = tile?.cost || 0;
  const mortgageValue = Math.floor(cost / 2);

  if (!tile || (tile.type !== 'property' && tile.type !== 'station' && tile.type !== 'utility')) {
    return { canMortgage: false, reason: 'This space cannot be mortgaged.', mortgageValue: 0 };
  }

  const propState = properties[tileId];
  if (!propState || propState.ownerId !== player.id) {
    return { canMortgage: false, reason: 'You do not own this property.', mortgageValue };
  }

  if (propState.isMortgaged) {
    return { canMortgage: false, reason: 'This property is already mortgaged.', mortgageValue };
  }

  // Check if this property or any property in its color group has buildings
  if (tile.group) {
    const groupTiles = TILES.filter((t) => t.group === tile.group);
    const hasBuildings = groupTiles.some((t) => (properties[t.id]?.houses || 0) > 0);
    if (hasBuildings) {
      return {
        canMortgage: false,
        reason: 'You must sell all houses/hotels in this color group before mortgaging.',
        mortgageValue
      };
    }
  }

  return { canMortgage: true, mortgageValue };
}

/**
 * Evaluates whether a mortgaged property can be unmortgaged (redeemed from the bank).
 */
export function canUnmortgageProperty(
  tileId: number,
  properties: Record<number, PropertyState>,
  player: Player
): { canUnmortgage: boolean; reason?: string; redemptionCost: number } {
  const tile = TILES.find((t) => t.id === tileId);
  const cost = tile?.cost || 0;
  const mortgageValue = Math.floor(cost / 2);
  const redemptionCost = Math.ceil(mortgageValue * 1.1); // Mortgage value + 10% interest

  if (!tile) {
    return { canUnmortgage: false, reason: 'Invalid space.', redemptionCost: 0 };
  }

  const propState = properties[tileId];
  if (!propState || propState.ownerId !== player.id) {
    return { canUnmortgage: false, reason: 'You do not own this property.', redemptionCost };
  }

  if (!propState.isMortgaged) {
    return { canUnmortgage: false, reason: 'Property is not mortgaged.', redemptionCost };
  }

  if (player.money < redemptionCost) {
    return {
      canUnmortgage: false,
      reason: `Insufficient funds. Need ₹${redemptionCost} (includes 10% interest) to redeem.`,
      redemptionCost
    };
  }

  return { canUnmortgage: true, redemptionCost };
}

/**
 * Evaluates whether a building on a property can be sold back to the bank.
 */
export function canSellBuilding(
  tileId: number,
  properties: Record<number, PropertyState>,
  player: Player
): { canSell: boolean; reason?: string; refund: number } {
  const tile = TILES.find((t) => t.id === tileId);
  if (!tile || tile.type !== 'property' || !tile.houseCost || !tile.group) {
    return { canSell: false, reason: 'Cannot sell buildings on this space.', refund: 0 };
  }

  const propState = properties[tileId];
  if (!propState || propState.ownerId !== player.id) {
    return { canSell: false, reason: 'You do not own this property.', refund: 0 };
  }

  if (propState.houses <= 0) {
    return { canSell: false, reason: 'No buildings constructed on this property.', refund: 0 };
  }

  const refund = Math.floor(tile.houseCost / 2);

  // Even selling rule: cannot sell from a property with fewer houses than another in the group
  const groupTiles = TILES.filter((t) => t.group === tile.group);
  const maxHouses = Math.max(...groupTiles.map((t) => properties[t.id]?.houses || 0));
  if (propState.houses < maxHouses) {
    return {
      canSell: false,
      reason: 'Must sell buildings evenly across the color group.',
      refund
    };
  }

  return { canSell: true, refund };
}

/**
 * Evaluates a trade offer when proposed to an AI player.
 */
export function evaluateAiTradeOffer(
  fromPlayer: Player,
  toAiPlayer: Player,
  offeredPropertyIds: number[],
  requestedPropertyIds: number[],
  offeredCash: number,
  requestedCash: number,
  properties: Record<number, PropertyState>
): { accept: boolean; reason: string } {
  // 1. Can AI afford requested cash?
  if (requestedCash > toAiPlayer.money) {
    return { accept: false, reason: `I cannot afford to pay ₹${requestedCash}.` };
  }

  const safetyReserve =
    toAiPlayer.aiDifficulty === 'hard' ? 180 : toAiPlayer.aiDifficulty === 'medium' ? 120 : 60;
  if (toAiPlayer.money - requestedCash < safetyReserve && requestedCash > 0) {
    return { accept: false, reason: 'That would leave me with dangerously low cash reserves.' };
  }

  // Calculate value of what AI gets (offered by fromPlayer)
  let valueReceived = offeredCash;
  for (const pId of offeredPropertyIds) {
    const tile = TILES.find((t) => t.id === pId);
    if (!tile) continue;
    const baseVal = tile.cost || 0;
    valueReceived += baseVal;

    // Check if this completes a monopoly for the AI!
    if (tile.group) {
      const otherGroupTiles = TILES.filter((t) => t.group === tile.group && t.id !== pId);
      const completesMono = otherGroupTiles.every((t) => {
        return properties[t.id]?.ownerId === toAiPlayer.id || offeredPropertyIds.includes(t.id);
      });
      if (completesMono) {
        valueReceived += 500;
      }
    }
  }

  // Calculate value of what AI gives away (requested by fromPlayer)
  let valueGiven = requestedCash;
  for (const pId of requestedPropertyIds) {
    const tile = TILES.find((t) => t.id === pId);
    if (!tile) continue;
    const baseVal = tile.cost || 0;
    valueGiven += baseVal;

    // Check if AI would be breaking its own monopoly
    if (tile.group) {
      const isAlreadyMono = checkMonopoly(tile.group, toAiPlayer.id, properties);
      if (isAlreadyMono) {
        valueGiven += 700;
      }

      // Check if giving this to fromPlayer completes a monopoly for fromPlayer
      const otherGroupTiles = TILES.filter((t) => t.group === tile.group && t.id !== pId);
      const completesOpponentMono = otherGroupTiles.every((t) => {
        return properties[t.id]?.ownerId === fromPlayer.id || requestedPropertyIds.includes(t.id);
      });
      if (completesOpponentMono) {
        valueGiven += 450;
      }
    }
  }

  // Difficulty adjustment threshold
  let acceptableDiff = 0;
  if (toAiPlayer.aiDifficulty === 'easy') {
    acceptableDiff = -60;
  } else if (toAiPlayer.aiDifficulty === 'medium') {
    acceptableDiff = 0;
  } else {
    acceptableDiff = 50;
  }

  const netBenefit = valueReceived - valueGiven;
  if (netBenefit >= acceptableDiff) {
    return { accept: true, reason: 'This deal works well for both of us. Accepted!' };
  } else {
    return {
      accept: false,
      reason: `That deal is not favorable enough for me (Value gap of ~₹${Math.abs(netBenefit)}). Offer more cash or better properties.`
    };
  }
}
