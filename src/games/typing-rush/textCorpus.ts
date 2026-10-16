import type { SpeedRunTrackOption } from './types';

const rawTracks = [
  {
    id: 'sprint-150',
    name: 'Neon Sprint',
    distance: 150,
    description: 'High-speed 150m drag race. Great for quick warm-ups and lightning reflexes.',
    text: 'Shift into high gear and let the turbo ignite. The neon lights blur into streaks of pure electric speed as your fingers dance across the keys to take the checkered flag!'
  },
  {
    id: 'circuit-300',
    name: 'Cyber Highway',
    distance: 300,
    description: 'Medium distance 300m circuit. Test sustained velocity, smooth rhythm, and typing stamina.',
    text: 'Speed is not merely velocity; it is the art of rhythm, precision, and relentless forward momentum. Feel the engine hum through the asphalt as the midnight skyline glows in radiant amber and violet. Push through every curve, maintain focus, and conquer the ultimate cyber street race without lifting!'
  },
  {
    id: 'endurance-500',
    name: 'Apex Grand Prix',
    distance: 500,
    description: 'Championship 500m grand endurance run. Master complex vocabulary and sustained cadence.',
    text: 'Welcome to the apex championship where reflexes and keyboard mastery unite. The tachometer needle pins into the red zone as exhaust flames erupt from the twin tailpipes. True champions do not flinch when the pace accelerates to breakneck supersonic speeds. Every pristine keystroke channels kinetic energy into the electric powertrain, carving a luminous path through the futuristic metropolis straight toward immortality and the winner podium!'
  }
];

export const SPEED_RUN_TRACKS: (SpeedRunTrackOption & { text: string })[] = rawTracks.map((t) => ({
  ...t,
  characterCount: t.text.length
}));

export const ENDLESS_WORD_TIERS = {
  tier1: [
    'dash', 'rush', 'volt', 'fast', 'gear', 'bolt', 'neon', 'zoom', 'glow', 'burn',
    'race', 'spark', 'flow', 'apex', 'grid', 'lane', 'drift', 'warp', 'fuel', 'heat',
    'boost', 'track', 'lead', 'pace', 'revs', 'grip', 'spin', 'tach', 'line', 'blaze',
    'quick', 'flash', 'hyper', 'drive', 'shift', 'wheel', 'speed', 'sonic', 'burst'
  ],
  tier2: [
    'turbo', 'engine', 'streak', 'velocity', 'asphalt', 'horizon', 'overdrive',
    'momentum', 'ignition', 'reflexes', 'precision', 'circuit', 'pursuit', 'hyperdrive',
    'catalyst', 'accelerate', 'streamline', 'aerodynamic', 'chassis', 'dyno', 'quartermile',
    'adrenaline', 'supercharge', 'transmission', 'suspension', 'friction', 'drafting'
  ],
  tier3: [
    'break the sound barrier',
    'maximum engine output',
    'flashing neon streetlights',
    'cutting the apex cleanly',
    'precision steering at high speed',
    'leaving dust in the rearview mirror',
    'full throttle down the back straight',
    'tires gripping the warm asphalt',
    'flawless rhythm unlocks supersonic speed',
    'crossing the finish line in style'
  ]
};

export const TIME_ATTACK_CHALLENGES = [
  'Every clean keystroke fuels the engine with pure kinetic momentum and unlocks your highest speed.',
  'Shift into top gear and let the turbocharger roar as the city lights blur into streaks of amber and cyan.',
  'Precision creates velocity when reflexes and typing rhythm unite upon the endless asphalt circuit.',
  'Keep your eyes on the road and fingers dancing across the keys to conquer the ultimate speed trial.',
  'The digital tachometer pulses with raw horsepower as you accelerate past every obstacle on the track.',
  'Supersonic aerodynamics demand unwavering composure under the ticking pressure of the countdown clock.',
  'Victory belongs to those who trust their muscle memory and never hesitate when the finish comes in sight.',
  'Feel the cool night wind slice past your visor as your runner hits peak velocity across the neon grid.'
];

export const PRACTICE_PASSAGES = [
  'Practice is the quiet foundation of all swift achievement. Relax your shoulders, place your fingers comfortably upon home row, and type with smooth, effortless rhythm.',
  'Consistency matters far more than frantic bursts. Focus on typing each character with natural fluidity, and true speed will follow naturally without strain.',
  'The pavement ahead is clear, the neon horizon is peaceful, and every sentence brings you closer to effortless keyboard mastery at your own leisurely pace.'
];

/**
 * Returns a batch of random words for Endless mode based on current distance tier.
 */
export function getEndlessWords(tier: 1 | 2 | 3, count: number = 5): string[] {
  const words: string[] = [];
  const pool = tier === 1 
    ? ENDLESS_WORD_TIERS.tier1 
    : tier === 2 
      ? [...ENDLESS_WORD_TIERS.tier1, ...ENDLESS_WORD_TIERS.tier2] 
      : [...ENDLESS_WORD_TIERS.tier2, ...ENDLESS_WORD_TIERS.tier3];

  for (let i = 0; i < count; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    words.push(pick);
  }
  return words;
}
