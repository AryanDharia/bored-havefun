import type { TileInfo, ColorGroup, Card, Player } from './types';

export const COLOR_GROUPS: Record<
  ColorGroup,
  { name: string; hex: string; bgClass: string; borderClass: string; totalProperties: number }
> = {
  brown: {
    name: 'East Hub',
    hex: '#8b4513',
    bgClass: 'bg-amber-900',
    borderClass: 'border-amber-700',
    totalProperties: 2
  },
  cyan: {
    name: 'Coastal Cities',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-600',
    borderClass: 'border-cyan-400',
    totalProperties: 3
  },
  pink: {
    name: 'Central Heartland',
    hex: '#ec4899',
    bgClass: 'bg-pink-600',
    borderClass: 'border-pink-400',
    totalProperties: 3
  },
  orange: {
    name: 'Spice Corridor',
    hex: '#f97316',
    bgClass: 'bg-orange-600',
    borderClass: 'border-orange-400',
    totalProperties: 3
  },
  red: {
    name: 'Heritage Capital',
    hex: '#ef4444',
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-400',
    totalProperties: 3
  },
  yellow: {
    name: 'Industrial Zone',
    hex: '#eab308',
    bgClass: 'bg-yellow-500',
    borderClass: 'border-yellow-300',
    totalProperties: 3
  },
  green: {
    name: 'Tech Metros',
    hex: '#10b981',
    bgClass: 'bg-emerald-600',
    borderClass: 'border-emerald-400',
    totalProperties: 3
  },
  darkblue: {
    name: 'Prime Megacities',
    hex: '#3b82f6',
    bgClass: 'bg-blue-600',
    borderClass: 'border-blue-400',
    totalProperties: 2
  }
};

export const TILES: TileInfo[] = [
  // 0: Start / GO (Bottom-Right Corner)
  {
    id: 0,
    name: 'START (GO)',
    subtitle: 'Collect ₹200 on Pass',
    type: 'corner',
    icon: '🚀',
    gridRow: 11,
    gridCol: 11
  },
  // 1: Guwahati (Brown)
  {
    id: 1,
    name: 'Guwahati',
    subtitle: 'Assam Metro',
    type: 'property',
    group: 'brown',
    cost: 60,
    baseRent: 4,
    houseRents: [20, 60, 180, 320, 450],
    houseCost: 50,
    gridRow: 11,
    gridCol: 10
  },
  // 2: Community Chest
  {
    id: 2,
    name: 'Community Chest',
    subtitle: 'Open Treasure Card',
    type: 'chest',
    icon: '🎁',
    gridRow: 11,
    gridCol: 9
  },
  // 3: Bhubaneswar (Brown)
  {
    id: 3,
    name: 'Bhubaneswar',
    subtitle: 'Temple City',
    type: 'property',
    group: 'brown',
    cost: 60,
    baseRent: 4,
    houseRents: [20, 60, 180, 320, 450],
    houseCost: 50,
    gridRow: 11,
    gridCol: 8
  },
  // 4: Income Tax
  {
    id: 4,
    name: 'Income Tax',
    subtitle: 'Pay ₹200',
    type: 'tax',
    taxAmount: 200,
    icon: '💸',
    gridRow: 11,
    gridCol: 7
  },
  // 5: Howrah Junction (East Station)
  {
    id: 5,
    name: 'East Junction',
    subtitle: 'Howrah Railway',
    type: 'station',
    cost: 200,
    baseRent: 25,
    icon: '🚂',
    gridRow: 11,
    gridCol: 6
  },
  // 6: Panaji (Cyan)
  {
    id: 6,
    name: 'Panaji',
    subtitle: 'Goa Coastal',
    type: 'property',
    group: 'cyan',
    cost: 100,
    baseRent: 6,
    houseRents: [30, 90, 270, 400, 550],
    houseCost: 50,
    gridRow: 11,
    gridCol: 5
  },
  // 7: Chance
  {
    id: 7,
    name: 'Chance',
    subtitle: 'Mystery Draw',
    type: 'chance',
    icon: '❓',
    gridRow: 11,
    gridCol: 4
  },
  // 8: Agra (Cyan)
  {
    id: 8,
    name: 'Agra',
    subtitle: 'Heritage Hub',
    type: 'property',
    group: 'cyan',
    cost: 100,
    baseRent: 6,
    houseRents: [30, 90, 270, 400, 550],
    houseCost: 50,
    gridRow: 11,
    gridCol: 3
  },
  // 9: Vadodara (Cyan)
  {
    id: 9,
    name: 'Vadodara',
    subtitle: 'Gujarat Cultural',
    type: 'property',
    group: 'cyan',
    cost: 120,
    baseRent: 8,
    houseRents: [40, 100, 300, 450, 600],
    houseCost: 50,
    gridRow: 11,
    gridCol: 2
  },

  // 10: Jail (Bottom-Left Corner)
  {
    id: 10,
    name: 'In Jail',
    subtitle: 'Just Visiting',
    type: 'corner',
    icon: '🔒',
    gridRow: 11,
    gridCol: 1
  },

  // 11: Ludhiana (Pink)
  {
    id: 11,
    name: 'Ludhiana',
    subtitle: 'Textile Capital',
    type: 'property',
    group: 'pink',
    cost: 140,
    baseRent: 10,
    houseRents: [50, 150, 450, 625, 750],
    houseCost: 100,
    gridRow: 10,
    gridCol: 1
  },
  // 12: Electric Grid (Utility)
  {
    id: 12,
    name: 'Electric Grid',
    subtitle: 'Power Utility',
    type: 'utility',
    cost: 150,
    baseRent: 10,
    icon: '⚡',
    gridRow: 9,
    gridCol: 1
  },
  // 13: Patna (Pink)
  {
    id: 13,
    name: 'Patna',
    subtitle: 'Pataliputra',
    type: 'property',
    group: 'pink',
    cost: 140,
    baseRent: 10,
    houseRents: [50, 150, 450, 625, 750],
    houseCost: 100,
    gridRow: 8,
    gridCol: 1
  },
  // 14: Bhopal (Pink)
  {
    id: 14,
    name: 'Bhopal',
    subtitle: 'City of Lakes',
    type: 'property',
    group: 'pink',
    cost: 160,
    baseRent: 12,
    houseRents: [60, 180, 500, 700, 900],
    houseCost: 100,
    gridRow: 7,
    gridCol: 1
  },
  // 15: Central Junction (CSMT)
  {
    id: 15,
    name: 'Central Junction',
    subtitle: 'Central Railway',
    type: 'station',
    cost: 200,
    baseRent: 25,
    icon: '🚂',
    gridRow: 6,
    gridCol: 1
  },
  // 16: Indore (Orange)
  {
    id: 16,
    name: 'Indore',
    subtitle: 'Cleanest Metro',
    type: 'property',
    group: 'orange',
    cost: 180,
    baseRent: 14,
    houseRents: [70, 200, 550, 750, 950],
    houseCost: 100,
    gridRow: 5,
    gridCol: 1
  },
  // 17: Community Chest
  {
    id: 17,
    name: 'Community Chest',
    subtitle: 'Open Treasure Card',
    type: 'chest',
    icon: '🎁',
    gridRow: 4,
    gridCol: 1
  },
  // 18: Nagpur (Orange)
  {
    id: 18,
    name: 'Nagpur',
    subtitle: 'Zero Mile City',
    type: 'property',
    group: 'orange',
    cost: 180,
    baseRent: 14,
    houseRents: [70, 200, 550, 750, 950],
    houseCost: 100,
    gridRow: 3,
    gridCol: 1
  },
  // 19: Kochi (Orange)
  {
    id: 19,
    name: 'Kochi',
    subtitle: 'Queen of Arabia',
    type: 'property',
    group: 'orange',
    cost: 200,
    baseRent: 16,
    houseRents: [80, 220, 600, 800, 1000],
    houseCost: 100,
    gridRow: 2,
    gridCol: 1
  },

  // 20: Free Parking / Rest Stop (Top-Left Corner)
  {
    id: 20,
    name: 'Free Rest Stop',
    subtitle: 'No Rent Safe Zone',
    type: 'corner',
    icon: '🚗',
    gridRow: 1,
    gridCol: 1
  },

  // 21: Lucknow (Red)
  {
    id: 21,
    name: 'Lucknow',
    subtitle: 'City of Nawabs',
    type: 'property',
    group: 'red',
    cost: 220,
    baseRent: 18,
    houseRents: [90, 250, 700, 875, 1050],
    houseCost: 150,
    gridRow: 1,
    gridCol: 2
  },
  // 22: Chance
  {
    id: 22,
    name: 'Chance',
    subtitle: 'Mystery Draw',
    type: 'chance',
    icon: '❓',
    gridRow: 1,
    gridCol: 3
  },
  // 23: Chandigarh (Red)
  {
    id: 23,
    name: 'Chandigarh',
    subtitle: 'The Beautiful City',
    type: 'property',
    group: 'red',
    cost: 220,
    baseRent: 18,
    houseRents: [90, 250, 700, 875, 1050],
    houseCost: 150,
    gridRow: 1,
    gridCol: 4
  },
  // 24: Jaipur (Red)
  {
    id: 24,
    name: 'Jaipur',
    subtitle: 'The Pink City',
    type: 'property',
    group: 'red',
    cost: 240,
    baseRent: 20,
    houseRents: [100, 300, 750, 925, 1100],
    houseCost: 150,
    gridRow: 1,
    gridCol: 5
  },
  // 25: North Junction (New Delhi)
  {
    id: 25,
    name: 'North Junction',
    subtitle: 'Northern Railway',
    type: 'station',
    cost: 200,
    baseRent: 25,
    icon: '🚂',
    gridRow: 1,
    gridCol: 6
  },
  // 26: Pune (Yellow)
  {
    id: 26,
    name: 'Pune',
    subtitle: 'Oxford of the East',
    type: 'property',
    group: 'yellow',
    cost: 260,
    baseRent: 22,
    houseRents: [110, 330, 800, 975, 1150],
    houseCost: 150,
    gridRow: 1,
    gridCol: 7
  },
  // 27: Ahmedabad (Yellow)
  {
    id: 27,
    name: 'Ahmedabad',
    subtitle: 'Sabarmati Hub',
    type: 'property',
    group: 'yellow',
    cost: 260,
    baseRent: 22,
    houseRents: [110, 330, 800, 975, 1150],
    houseCost: 150,
    gridRow: 1,
    gridCol: 8
  },
  // 28: Water Works (Utility)
  {
    id: 28,
    name: 'Water Works',
    subtitle: 'Hydro Utility',
    type: 'utility',
    cost: 150,
    baseRent: 10,
    icon: '🚰',
    gridRow: 1,
    gridCol: 9
  },
  // 29: Hyderabad (Yellow)
  {
    id: 29,
    name: 'Hyderabad',
    subtitle: 'Cyberabad City',
    type: 'property',
    group: 'yellow',
    cost: 280,
    baseRent: 24,
    houseRents: [120, 360, 850, 1025, 1200],
    houseCost: 150,
    gridRow: 1,
    gridCol: 10
  },

  // 30: Go to Jail (Top-Right Corner)
  {
    id: 30,
    name: 'Go to Jail',
    subtitle: 'Do Not Pass GO',
    type: 'corner',
    icon: '🚨',
    gridRow: 1,
    gridCol: 11
  },

  // 31: Chennai (Green)
  {
    id: 31,
    name: 'Chennai',
    subtitle: 'Gateway of South',
    type: 'property',
    group: 'green',
    cost: 300,
    baseRent: 26,
    houseRents: [130, 390, 900, 1100, 1275],
    houseCost: 200,
    gridRow: 2,
    gridCol: 11
  },
  // 32: Community Chest
  {
    id: 32,
    name: 'Community Chest',
    subtitle: 'Open Treasure Card',
    type: 'chest',
    icon: '🎁',
    gridRow: 3,
    gridCol: 11
  },
  // 33: Bengaluru (Green)
  {
    id: 33,
    name: 'Bengaluru',
    subtitle: 'Silicon Valley',
    type: 'property',
    group: 'green',
    cost: 320,
    baseRent: 28,
    houseRents: [150, 450, 1000, 1200, 1400],
    houseCost: 200,
    gridRow: 4,
    gridCol: 11
  },
  // 34: Kolkata (Green)
  {
    id: 34,
    name: 'Kolkata',
    subtitle: 'City of Joy',
    type: 'property',
    group: 'green',
    cost: 320,
    baseRent: 28,
    houseRents: [150, 450, 1000, 1200, 1400],
    houseCost: 200,
    gridRow: 5,
    gridCol: 11
  },
  // 35: South Junction (Chennai Central)
  {
    id: 35,
    name: 'South Junction',
    subtitle: 'Southern Railway',
    type: 'station',
    cost: 200,
    baseRent: 25,
    icon: '🚂',
    gridRow: 6,
    gridCol: 11
  },
  // 36: Chance
  {
    id: 36,
    name: 'Chance',
    subtitle: 'Mystery Draw',
    type: 'chance',
    icon: '❓',
    gridRow: 7,
    gridCol: 11
  },
  // 37: Delhi (Dark Blue)
  {
    id: 37,
    name: 'Delhi',
    subtitle: 'National Capital',
    type: 'property',
    group: 'darkblue',
    cost: 350,
    baseRent: 35,
    houseRents: [175, 500, 1100, 1300, 1500],
    houseCost: 200,
    gridRow: 8,
    gridCol: 11
  },
  // 38: Super Tax
  {
    id: 38,
    name: 'Super Tax',
    subtitle: 'Pay ₹100',
    type: 'tax',
    taxAmount: 100,
    icon: '💎',
    gridRow: 9,
    gridCol: 11
  },
  // 39: Mumbai (Dark Blue)
  {
    id: 39,
    name: 'Mumbai',
    subtitle: 'Financial Capital',
    type: 'property',
    group: 'darkblue',
    cost: 400,
    baseRent: 50,
    houseRents: [200, 600, 1400, 1700, 2000],
    houseCost: 200,
    gridRow: 10,
    gridCol: 11
  }
];

export const CHANCE_CARDS: Card[] = [
  {
    id: 'ch_go',
    type: 'chance',
    title: 'Rapid Express to Start',
    description: 'Advance straight to START (GO). Collect ₹200 immediately!',
    moveTo: 0
  },
  {
    id: 'ch_jaipur',
    type: 'chance',
    title: 'Heritage Tourism Tour',
    description: 'Travel to Jaipur. If you pass START, collect ₹200!',
    moveTo: 24
  },
  {
    id: 'ch_station',
    type: 'chance',
    title: 'Bullet Train Ticket',
    description: 'Advance to the nearest Railway Station. If unowned, you may purchase it!',
    nearestStation: true
  },
  {
    id: 'ch_tech',
    type: 'chance',
    title: 'Angel Venture IPO',
    description: 'Your startup venture went public! Collect ₹150 in founder dividends.',
    amount: 150
  },
  {
    id: 'ch_speed',
    type: 'chance',
    title: 'Expressway Toll Penalty',
    description: 'Caught overspeeding on the expressway. Pay ₹50 traffic fine.',
    amount: -50
  },
  {
    id: 'ch_jail',
    type: 'chance',
    title: 'Securities Commission Audit',
    description: 'Go directly to Jail. Do not pass START, do not collect ₹200.',
    sendToJail: true
  },
  {
    id: 'ch_repairs',
    type: 'chance',
    title: 'Property Renovation Drive',
    description: 'Renovate your real estate holdings. Pay ₹25 per house and ₹100 per hotel.',
    repairHouseFee: 25,
    repairHotelFee: 100
  },
  {
    id: 'ch_diwali',
    type: 'chance',
    title: 'Festival Sweets & Bonus',
    description: 'Diwali festive prosperity! Collect ₹50 from every player.',
    collectFromAll: 50
  }
];

export const CHEST_CARDS: Card[] = [
  {
    id: 'cs_dividend',
    type: 'chest',
    title: 'Bank Annual Dividend',
    description: 'National banking council pays your portfolio dividend. Collect ₹100.',
    amount: 100
  },
  {
    id: 'cs_consult',
    type: 'chest',
    title: 'Consulting Advisory Retainer',
    description: 'Advised peers on expansion. Collect ₹25 from each player.',
    collectFromAll: 25
  },
  {
    id: 'cs_hospital',
    type: 'chest',
    title: 'Healthcare Insurance Premium',
    description: 'Annual corporate medical checkup and health insurance. Pay ₹50.',
    amount: -50
  },
  {
    id: 'cs_refund',
    type: 'chest',
    title: 'GST Tax Refund',
    description: 'Government audit found an overpayment refund. Collect ₹75.',
    amount: 75
  },
  {
    id: 'cs_out_jail',
    type: 'chest',
    title: 'Legal Counsel Retainer',
    description: 'Get Out of Jail Free! This card is saved in your inventory until needed.',
    getOutOfJail: true
  },
  {
    id: 'cs_smart_city',
    type: 'chest',
    title: 'Smart City Green Grant',
    description: 'Your commercial properties won a sustainability award! Collect ₹120.',
    amount: 120
  },
  {
    id: 'cs_donation',
    type: 'chest',
    title: 'Heritage Trust Charity',
    description: 'Donation to historical monument conservation trust. Pay ₹50.',
    amount: -50
  },
  {
    id: 'cs_jail',
    type: 'chest',
    title: 'Financial Irregularity Warrant',
    description: 'Go directly to Jail. Do not pass START, do not collect ₹200.',
    sendToJail: true
  }
];

export const DEFAULT_PLAYERS: Player[] = [
  {
    id: 0,
    name: 'You (Tycoon)',
    isAi: false,
    aiDifficulty: 'medium',
    colorHex: '#ef4444',
    badgeHex: 'from-rose-500 to-red-600',
    tokenName: 'Sports Car',
    tokenEmoji: '🏎️',
    position: 0,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false
  },
  {
    id: 1,
    name: 'Ambani AI',
    isAi: true,
    aiDifficulty: 'hard',
    colorHex: '#10b981',
    badgeHex: 'from-emerald-500 to-teal-600',
    tokenName: 'Tower',
    tokenEmoji: '🏢',
    position: 0,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false
  },
  {
    id: 2,
    name: 'Tata AI',
    isAi: true,
    aiDifficulty: 'medium',
    colorHex: '#f59e0b',
    badgeHex: 'from-amber-500 to-orange-500',
    tokenName: 'Yacht',
    tokenEmoji: '⛵',
    position: 0,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false
  },
  {
    id: 3,
    name: 'Adani AI',
    isAi: true,
    aiDifficulty: 'easy',
    colorHex: '#3b82f6',
    badgeHex: 'from-blue-500 to-indigo-600',
    tokenName: 'Diamond',
    tokenEmoji: '💎',
    position: 0,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false
  }
];
