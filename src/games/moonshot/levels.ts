import type { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
  // ===========================================================================
  // LEVEL 1: Tranquility Basin (Training Flight)
  // ===========================================================================
  {
    id: 1,
    name: 'Tranquility Basin',
    subtitle: 'Cadet Qualification',
    description: 'Launch from Base Alpha, eliminate sector bubbles, and land safely on Extraction Pad Beta.',
    startingFuel: 120,
    startingAmmo: 20,
    spawnRocket: {
      x: 80,
      y: 524,
      angle: 0
    },
    pads: [
      {
        id: 'pad-1a',
        name: 'Base Alpha',
        x1: 50,
        x2: 110,
        y: 540,
        isLaunchPad: true
      },
      {
        id: 'pad-1b',
        name: 'Rescue Pad Beta',
        x1: 680,
        x2: 740,
        y: 530,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 550 },
      { x: 50, y: 540 },
      { x: 110, y: 540 },
      { x: 220, y: 510 },
      { x: 340, y: 535 },
      { x: 460, y: 495 },
      { x: 580, y: 545 },
      { x: 680, y: 530 },
      { x: 740, y: 530 },
      { x: 800, y: 560 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 260,
        y: 220,
        vx: 0,
        vy: 12,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#38bdf8',
        rotationSpeed: 0.5
      },
      {
        type: 'bubble',
        x: 440,
        y: 180,
        vx: 0,
        vy: -10,
        radius: 16,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#f43f5e',
        rotationSpeed: 0.7
      },
      {
        type: 'bubble',
        x: 600,
        y: 240,
        vx: 0,
        vy: 14,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#fbbf24',
        rotationSpeed: 0.6
      }
    ]
  },

  // ===========================================================================
  // LEVEL 2: Crater Ridge
  // ===========================================================================
  {
    id: 2,
    name: 'Crater Ridge',
    subtitle: 'Mesa Crossing',
    description: 'Fly over the central lunar crater. Use Mesa Outpost to refuel before touching down at Pad Gamma.',
    startingFuel: 110,
    startingAmmo: 18,
    spawnRocket: {
      x: 75,
      y: 514,
      angle: 0
    },
    pads: [
      {
        id: 'pad-2a',
        name: 'Launch Pad',
        x1: 45,
        x2: 105,
        y: 530,
        isLaunchPad: true
      },
      {
        id: 'pad-2b',
        name: 'Mesa Refuel',
        x1: 375,
        x2: 435,
        y: 390
      },
      {
        id: 'pad-2c',
        name: 'Pad Gamma',
        x1: 690,
        x2: 750,
        y: 520,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 540 },
      { x: 45, y: 530 },
      { x: 105, y: 530 },
      { x: 200, y: 470 },
      { x: 280, y: 520 },
      { x: 340, y: 440 },
      { x: 375, y: 390 },
      { x: 435, y: 390 },
      { x: 480, y: 450 },
      { x: 550, y: 535 },
      { x: 630, y: 480 },
      { x: 690, y: 520 },
      { x: 750, y: 520 },
      { x: 800, y: 550 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 220,
        y: 200,
        vx: 15,
        vy: 0,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#06b6d4',
        rotationSpeed: 0.5
      },
      {
        type: 'asteroid',
        x: 320,
        y: 150,
        vx: -8,
        vy: 0,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: 1.2
      },
      {
        type: 'bubble',
        x: 520,
        y: 190,
        vx: -12,
        vy: 0,
        radius: 15,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#a855f7',
        rotationSpeed: 0.6
      },
      {
        type: 'asteroid',
        x: 640,
        y: 140,
        vx: 6,
        vy: 0,
        radius: 16,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#cbd5e1',
        rotationSpeed: -0.9
      }
    ]
  },

  // ===========================================================================
  // LEVEL 3: Sea of Serenity
  // ===========================================================================
  {
    id: 3,
    name: 'Sea of Serenity',
    subtitle: 'Jagged Peaks',
    description: 'Traverse treacherous sharp spires. Destroy the orbital research satellite before touchdown.',
    startingFuel: 105,
    startingAmmo: 18,
    spawnRocket: {
      x: 70,
      y: 494,
      angle: 0
    },
    pads: [
      {
        id: 'pad-3a',
        name: 'Outpost Delta',
        x1: 40,
        x2: 100,
        y: 510,
        isLaunchPad: true
      },
      {
        id: 'pad-3b',
        name: 'Valley Depot',
        x1: 370,
        x2: 430,
        y: 540
      },
      {
        id: 'pad-3c',
        name: 'Serenity Base',
        x1: 690,
        x2: 750,
        y: 470,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 520 },
      { x: 40, y: 510 },
      { x: 100, y: 510 },
      { x: 180, y: 380 }, // Sharp spire
      { x: 260, y: 520 },
      { x: 370, y: 540 },
      { x: 430, y: 540 },
      { x: 520, y: 360 }, // Second peak
      { x: 600, y: 510 },
      { x: 690, y: 470 },
      { x: 750, y: 470 },
      { x: 800, y: 520 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 180,
        y: 180,
        vx: 0,
        vy: 16,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#10b981',
        rotationSpeed: 0.8
      },
      {
        type: 'asteroid',
        x: 320,
        y: 130,
        vx: 10,
        vy: 0,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#64748b',
        rotationSpeed: 1.1
      },
      {
        type: 'satellite',
        x: 480,
        y: 120,
        vx: -6,
        vy: 0,
        radius: 24,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#eab308',
        rotationSpeed: 0.4
      },
      {
        type: 'bubble',
        x: 620,
        y: 200,
        vx: 0,
        vy: -15,
        radius: 15,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#ec4899',
        rotationSpeed: 0.5
      },
      {
        type: 'asteroid',
        x: 720,
        y: 140,
        vx: -5,
        vy: 0,
        radius: 17,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: -0.8
      }
    ]
  },

  // ===========================================================================
  // LEVEL 4: Kepler's Gorge
  // ===========================================================================
  {
    id: 4,
    name: "Kepler's Gorge",
    subtitle: 'Deep Cavern Descent',
    description: 'Landing zones are narrower (50px). Watch your lateral slide when landing in the gorge.',
    startingFuel: 100,
    startingAmmo: 16,
    spawnRocket: {
      x: 65,
      y: 474,
      angle: 0
    },
    pads: [
      {
        id: 'pad-4a',
        name: 'Clifftop Alpha',
        x1: 40,
        x2: 90,
        y: 490,
        isLaunchPad: true
      },
      {
        id: 'pad-4b',
        name: 'Gorge Station',
        x1: 375,
        x2: 425,
        y: 560
      },
      {
        id: 'pad-4c',
        name: 'Pinnacle Exit',
        x1: 700,
        x2: 750,
        y: 440,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 500 },
      { x: 40, y: 490 },
      { x: 90, y: 490 },
      { x: 160, y: 410 },
      { x: 240, y: 550 },
      { x: 375, y: 560 },
      { x: 425, y: 560 },
      { x: 500, y: 540 },
      { x: 580, y: 410 },
      { x: 650, y: 480 },
      { x: 700, y: 440 },
      { x: 750, y: 440 },
      { x: 800, y: 500 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 180,
        y: 190,
        vx: 12,
        vy: 10,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#06b6d4',
        rotationSpeed: 0.5
      },
      {
        type: 'asteroid',
        x: 300,
        y: 160,
        vx: -14,
        vy: 6,
        radius: 19,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#cbd5e1',
        rotationSpeed: 1.3
      },
      {
        type: 'asteroid',
        x: 460,
        y: 180,
        vx: 10,
        vy: -8,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: -1.0
      },
      {
        type: 'satellite',
        x: 600,
        y: 110,
        vx: -8,
        vy: 0,
        radius: 23,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#f59e0b',
        rotationSpeed: 0.4
      },
      {
        type: 'bubble',
        x: 680,
        y: 220,
        vx: 0,
        vy: 15,
        radius: 15,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#10b981',
        rotationSpeed: 0.6
      }
    ]
  },

  // ===========================================================================
  // LEVEL 5: Ocean of Storms
  // ===========================================================================
  {
    id: 5,
    name: 'Ocean of Storms',
    subtitle: 'Gravitational Turbulence',
    description: 'Challenging terrain with elevated pillars. Eliminate 6 targets and reach Sanctuary Outpost.',
    startingFuel: 95,
    startingAmmo: 16,
    spawnRocket: {
      x: 70,
      y: 504,
      angle: 0
    },
    pads: [
      {
        id: 'pad-5a',
        name: 'Storm Haven',
        x1: 45,
        x2: 95,
        y: 520,
        isLaunchPad: true
      },
      {
        id: 'pad-5b',
        name: 'High Spire Depot',
        x1: 380,
        x2: 430,
        y: 350
      },
      {
        id: 'pad-5c',
        name: 'Sanctuary Outpost',
        x1: 695,
        x2: 745,
        y: 500,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 530 },
      { x: 45, y: 520 },
      { x: 95, y: 520 },
      { x: 190, y: 430 },
      { x: 260, y: 540 },
      { x: 330, y: 470 },
      { x: 380, y: 350 }, // Pillar top
      { x: 430, y: 350 },
      { x: 470, y: 480 },
      { x: 550, y: 560 },
      { x: 620, y: 460 },
      { x: 695, y: 500 },
      { x: 745, y: 500 },
      { x: 800, y: 540 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 170,
        y: 160,
        vx: 10,
        vy: -10,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#ec4899',
        rotationSpeed: 0.7
      },
      {
        type: 'asteroid',
        x: 290,
        y: 120,
        vx: -12,
        vy: 8,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#64748b',
        rotationSpeed: 1.4
      },
      {
        type: 'satellite',
        x: 390,
        y: 110,
        vx: 6,
        vy: 0,
        radius: 22,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#fbbf24',
        rotationSpeed: 0.3
      },
      {
        type: 'bubble',
        x: 510,
        y: 170,
        vx: -15,
        vy: -8,
        radius: 15,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#38bdf8',
        rotationSpeed: 0.6
      },
      {
        type: 'asteroid',
        x: 610,
        y: 130,
        vx: 8,
        vy: 10,
        radius: 17,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: -1.1
      },
      {
        type: 'bubble',
        x: 710,
        y: 200,
        vx: 0,
        vy: 14,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#34d399',
        rotationSpeed: 0.5
      }
    ]
  },

  // ===========================================================================
  // LEVEL 6: Tycho Deep Shaft
  // ===========================================================================
  {
    id: 6,
    name: 'Tycho Deep Shaft',
    subtitle: 'Subterranean Drop',
    description: 'Descend into a deep crater shaft. Brake early and extend landing gear before reaching the floor.',
    startingFuel: 90,
    startingAmmo: 16,
    spawnRocket: {
      x: 65,
      y: 444,
      angle: 0
    },
    pads: [
      {
        id: 'pad-6a',
        name: 'Surface Ledge',
        x1: 40,
        x2: 90,
        y: 460,
        isLaunchPad: true
      },
      {
        id: 'pad-6b',
        name: 'Shaft Shelf',
        x1: 375,
        x2: 425,
        y: 565
      },
      {
        id: 'pad-6c',
        name: 'Deep Extraction',
        x1: 690,
        x2: 740,
        y: 450,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 470 },
      { x: 40, y: 460 },
      { x: 90, y: 460 },
      { x: 160, y: 400 },
      { x: 230, y: 520 },
      { x: 290, y: 570 },
      { x: 375, y: 565 },
      { x: 425, y: 565 },
      { x: 510, y: 570 },
      { x: 570, y: 520 },
      { x: 630, y: 390 },
      { x: 690, y: 450 },
      { x: 740, y: 450 },
      { x: 800, y: 480 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 160,
        y: 160,
        vx: 12,
        vy: 12,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#f43f5e',
        rotationSpeed: 0.6
      },
      {
        type: 'asteroid',
        x: 270,
        y: 110,
        vx: -8,
        vy: 0,
        radius: 19,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#cbd5e1',
        rotationSpeed: 1.2
      },
      {
        type: 'satellite',
        x: 370,
        y: 90,
        vx: 5,
        vy: 0,
        radius: 24,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#38bdf8',
        rotationSpeed: 0.3
      },
      {
        type: 'bubble',
        x: 480,
        y: 170,
        vx: -10,
        vy: 12,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#eab308',
        rotationSpeed: 0.7
      },
      {
        type: 'asteroid',
        x: 580,
        y: 120,
        vx: 12,
        vy: 0,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#64748b',
        rotationSpeed: -1.3
      },
      {
        type: 'satellite',
        x: 680,
        y: 130,
        vx: -6,
        vy: 0,
        radius: 22,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#a855f7',
        rotationSpeed: 0.4
      }
    ]
  },

  // ===========================================================================
  // LEVEL 7: Mare Imbrium
  // ===========================================================================
  {
    id: 7,
    name: 'Mare Imbrium',
    subtitle: 'Asteroid Belt Peril',
    description: 'High-speed floating space debris and narrow landing pads (45px). Conserve fuel!',
    startingFuel: 85,
    startingAmmo: 15,
    spawnRocket: {
      x: 60,
      y: 494,
      angle: 0
    },
    pads: [
      {
        id: 'pad-7a',
        name: 'Imbrium Base',
        x1: 40,
        x2: 85,
        y: 510,
        isLaunchPad: true
      },
      {
        id: 'pad-7b',
        name: 'Mid-Station',
        x1: 380,
        x2: 425,
        y: 430
      },
      {
        id: 'pad-7c',
        name: 'Perimeter Pad',
        x1: 710,
        x2: 755,
        y: 490,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 520 },
      { x: 40, y: 510 },
      { x: 85, y: 510 },
      { x: 170, y: 390 },
      { x: 250, y: 530 },
      { x: 320, y: 490 },
      { x: 380, y: 430 },
      { x: 425, y: 430 },
      { x: 490, y: 510 },
      { x: 570, y: 370 },
      { x: 640, y: 530 },
      { x: 710, y: 490 },
      { x: 755, y: 490 },
      { x: 800, y: 520 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 160,
        y: 150,
        vx: 16,
        vy: -10,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#06b6d4',
        rotationSpeed: 0.8
      },
      {
        type: 'asteroid',
        x: 270,
        y: 100,
        vx: -14,
        vy: 10,
        radius: 19,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: 1.5
      },
      {
        type: 'satellite',
        x: 370,
        y: 90,
        vx: 8,
        vy: 0,
        radius: 23,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#f59e0b',
        rotationSpeed: 0.4
      },
      {
        type: 'asteroid',
        x: 480,
        y: 130,
        vx: -12,
        vy: -8,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#cbd5e1',
        rotationSpeed: -1.2
      },
      {
        type: 'satellite',
        x: 590,
        y: 100,
        vx: -8,
        vy: 0,
        radius: 24,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#ec4899',
        rotationSpeed: 0.5
      },
      {
        type: 'bubble',
        x: 700,
        y: 170,
        vx: 14,
        vy: 12,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#10b981',
        rotationSpeed: 0.7
      }
    ]
  },

  // ===========================================================================
  // LEVEL 8: The Far Side Citadel (Ultimate Rescue)
  // ===========================================================================
  {
    id: 8,
    name: 'The Far Side Citadel',
    subtitle: 'Final Extraction',
    description: 'The ultimate rescue gauntlet! Neutralize all 7 orbital targets and land on the High Citadel Pinnacle.',
    startingFuel: 80,
    startingAmmo: 16,
    spawnRocket: {
      x: 60,
      y: 504,
      angle: 0
    },
    pads: [
      {
        id: 'pad-8a',
        name: 'Citadel Launch',
        x1: 35,
        x2: 85,
        y: 520,
        isLaunchPad: true
      },
      {
        id: 'pad-8b',
        name: 'Lower Spire Depot',
        x1: 260,
        x2: 305,
        y: 440
      },
      {
        id: 'pad-8c',
        name: 'High Citadel Pinnacle',
        x1: 695,
        x2: 745,
        y: 350,
        isDestination: true
      }
    ],
    terrain: [
      { x: 0, y: 540 },
      { x: 35, y: 520 },
      { x: 85, y: 520 },
      { x: 180, y: 470 },
      { x: 260, y: 440 },
      { x: 305, y: 440 },
      { x: 370, y: 560 }, // Cavern trench
      { x: 470, y: 560 },
      { x: 550, y: 450 },
      { x: 620, y: 480 },
      { x: 695, y: 350 }, // Pinnacle
      { x: 745, y: 350 },
      { x: 800, y: 520 }
    ],
    targets: [
      {
        type: 'bubble',
        x: 140,
        y: 140,
        vx: 14,
        vy: -12,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#06b6d4',
        rotationSpeed: 0.9
      },
      {
        type: 'asteroid',
        x: 240,
        y: 110,
        vx: -16,
        vy: 10,
        radius: 19,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#94a3b8',
        rotationSpeed: 1.6
      },
      {
        type: 'satellite',
        x: 350,
        y: 90,
        vx: 8,
        vy: 0,
        radius: 24,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#f59e0b',
        rotationSpeed: 0.4
      },
      {
        type: 'bubble',
        x: 450,
        y: 150,
        vx: -15,
        vy: -10,
        radius: 15,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#a855f7',
        rotationSpeed: 0.7
      },
      {
        type: 'asteroid',
        x: 540,
        y: 120,
        vx: 12,
        vy: 8,
        radius: 18,
        hp: 2,
        maxHp: 2,
        points: 100,
        color: '#64748b',
        rotationSpeed: -1.4
      },
      {
        type: 'satellite',
        x: 640,
        y: 80,
        vx: -8,
        vy: 0,
        radius: 25,
        hp: 3,
        maxHp: 3,
        points: 250,
        color: '#38bdf8',
        rotationSpeed: 0.5
      },
      {
        type: 'bubble',
        x: 720,
        y: 160,
        vx: 12,
        vy: 14,
        radius: 14,
        hp: 1,
        maxHp: 1,
        points: 50,
        color: '#10b981',
        rotationSpeed: 0.8
      }
    ]
  }
];
