import type { SpeedRunTrackOption, TypingPassage, PassageCategory, TestDuration } from './types';

// =============================================================================
// COMPREHENSIVE TYPING PASSAGES CORPUS (75+ Original Rich Passages)
// =============================================================================
export const TYPING_PASSAGES: TypingPassage[] = [
  // ---------------------------------------------------------------------------
  // 1. GENERAL ENGLISH (Literature, History, Language, Philosophy)
  // ---------------------------------------------------------------------------
  {
    id: 'gen-01',
    category: 'general',
    title: 'The Architecture of Thought',
    targetDuration: 15,
    text: 'Clear thinking precedes eloquent writing. When thoughts are organized with clarity, language naturally flows with effortless grace.'
  },
  {
    id: 'gen-02',
    category: 'general',
    title: 'The Whispering Forest',
    targetDuration: 15,
    text: 'Ancient pines swayed gently beneath the autumn breeze, scattering gold and amber needles across the mossy floor of the valley.'
  },
  {
    id: 'gen-03',
    category: 'general',
    title: 'Echoes of Antiquity',
    targetDuration: 30,
    text: 'Great libraries have always stood as sanctuaries for human curiosity. Between their weathered stone arches, centuries of philosophy, poetry, and scientific discovery rest quietly upon mahogany shelves, waiting for the inquisitive hands of tomorrow.'
  },
  {
    id: 'gen-04',
    category: 'general',
    title: 'The Art of Conversation',
    targetDuration: 30,
    text: 'A meaningful dialogue is not merely an exchange of opinions, but a shared journey into understanding. When two people listen with genuine empathy and patience, even contentious debates transform into bridges of mutual respect.'
  },
  {
    id: 'gen-05',
    category: 'general',
    title: 'The River of Time',
    targetDuration: 60,
    text: 'Time moves like a relentless mountain river, cutting deep canyons through rock and reshaping landscapes over thousands of years. We often measure our days in minutes and hours, yet the truest moments in life are remembered not by the numbers on a clock, but by the intensity of our experiences, the laughter shared with beloved companions, and the silent decisions that subtly change the course of our destiny forever.'
  },
  {
    id: 'gen-06',
    category: 'general',
    title: 'The Power of Written Word',
    targetDuration: 60,
    text: 'Before the advent of modern printing presses, every manuscript was a singular labor of devotion. Scribes spent months painstakingly copying manuscripts under flickering candlelight, preserving Homeric epics, classical mathematics, and philosophical treatises across turbulent centuries. Without their quiet dedication, vast chapters of human heritage would have evaporated into the shadows of forgotten history.'
  },
  {
    id: 'gen-07',
    category: 'general',
    title: 'The Renaissance Spirit',
    targetDuration: 120,
    text: 'In the bustling workshops of fifteenth-century Florence, painters, sculptors, engineers, and philosophers congregated to debate the principles of proportion, anatomy, and optics. Figures like Leonardo da Vinci refused to observe strict boundaries between artistic creation and scientific inquiry; for them, drawing the flight of a falcon was inseparable from calculating mechanical leverage or studying botanical vascular systems. This boundless synthesis of imagination and empirical observation ignited the European Renaissance, reminding humanity that curiosity is our most enduring virtue. To cultivate a vibrant intellect requires us to step beyond comfortable specializations and perceive the world as an interconnected tapestry of wonders.'
  },
  {
    id: 'gen-08',
    category: 'general',
    title: 'The Solitude of Winter',
    targetDuration: 15,
    text: 'Snow fell quietly over the sleeping village at dusk, blanketing rooftops and cobblestone alleys in a tranquil shroud of pure white.'
  },
  {
    id: 'gen-09',
    category: 'general',
    title: 'Labyrinths of Memory',
    targetDuration: 30,
    text: 'Memory rarely preserves events exactly as they unfolded; rather, it weaves fragments of emotion, aroma, and half-remembered melodies into personal mythologies that grow more colorful with every passing season.'
  },
  {
    id: 'gen-10',
    category: 'general',
    title: 'The Craft of Storytelling',
    targetDuration: 60,
    text: 'Every culture across the globe has gathered around glowing hearths to recount tales of courage, trickery, and redemption. These oral narratives served as ethical compasses and communal anchors long before formal legal codes existed. By placing themselves in the shoes of fictional heroes and wandering outcasts, listeners discovered universal truths regarding honor, loss, and the eternal triumph of human perseverance.'
  },

  // ---------------------------------------------------------------------------
  // 2. TECHNOLOGY (Computing, Software, AI, Networking, Cryptography)
  // ---------------------------------------------------------------------------
  {
    id: 'tech-01',
    category: 'tech',
    title: 'The Essence of Code',
    targetDuration: 15,
    text: 'Clean code is simple, direct, and readable. It reads like well-written prose and never obscures the designer intent behind clever tricks.'
  },
  {
    id: 'tech-02',
    category: 'tech',
    title: 'Distributed Systems',
    targetDuration: 15,
    text: 'Building reliable distributed systems requires preparing for unexpected network partitions, clock drift, and independent hardware failures.'
  },
  {
    id: 'tech-03',
    category: 'tech',
    title: 'Algorithmic Optimization',
    targetDuration: 30,
    text: 'Replacing an O(n^2) nested loop with an O(n log n) divide-and-conquer strategy can reduce execution time from several minutes down to milliseconds on million-row datasets, unlocking smooth interactive experiences for millions of users worldwide.'
  },
  {
    id: 'tech-04',
    category: 'tech',
    title: 'Modern Web Architecture',
    targetDuration: 30,
    text: 'Progressive web applications combine the broad reach of the open web with the tactile fluidity of native software. By leveraging service workers, client-side caching, and responsive design, modern sites stay functional even during spotty offline connectivity.'
  },
  {
    id: 'tech-05',
    category: 'tech',
    title: 'Neural Networks & Machine Learning',
    targetDuration: 60,
    text: 'Deep neural networks learn representations of the physical world by passing inputs through dozens of parameterized matrix transformations. Backpropagation adjusts millions of synaptic weights through stochastic gradient descent, allowing models to detect tumors in radiography scans, transcribe multilingual conversational audio with superhuman precision, and compose syntactically valid software programs from concise natural language specifications.'
  },
  {
    id: 'tech-06',
    category: 'tech',
    title: 'The Evolution of Microprocessors',
    targetDuration: 60,
    text: 'As semiconductor lithography approaches atomic boundaries at 2-nanometer node sizes, chip designers can no longer rely purely on frequency scaling to accelerate performance. Modern architectures embrace heterogenous computing, pairing general-purpose CPU cores with specialized neural engines, vector math accelerators, and unified low-latency memory buses to maximize energy efficiency and throughput.'
  },
  {
    id: 'tech-07',
    category: 'tech',
    title: 'Zero-Knowledge Cryptography',
    targetDuration: 120,
    text: 'Cryptographic proofs allow one party to mathematically prove to a verifier that a statement is true without revealing any secret auxiliary information. These zero-knowledge protocols form the backbone of next-generation privacy-preserving blockchains, verifiable credentials, and trustless distributed computations. Rather than trusting centralized servers with sensitive credit scores or medical histories, cryptographic succinct arguments (zk-SNARKs) allow users to prove eligibility, authenticate payments, and audit ledgers while keeping their private data encrypted at all times. As digital identity becomes central to international commerce, mathematical guarantees will increasingly replace blind institutional trust as the foundation of secure online civilization.'
  },
  {
    id: 'tech-08',
    category: 'tech',
    title: 'Version Control Systems',
    targetDuration: 15,
    text: 'Git models project history as a directed acyclic graph of immutable commit snapshots, enabling friction-free branching and distributed teamwork.'
  },
  {
    id: 'tech-09',
    category: 'tech',
    title: 'The Linux Kernel',
    targetDuration: 30,
    text: 'Originally written as a student hobby project in 1991, the Linux operating system kernel now powers supercomputers, cloud servers, Mars rovers, and billions of mobile smartphones across the planet.'
  },
  {
    id: 'tech-10',
    category: 'tech',
    title: 'The Open Source Movement',
    targetDuration: 60,
    text: 'The open-source revolution demonstrated that transparent collaboration between independent developers could create infrastructure more resilient and adaptable than proprietary software silos. Shared standards, peer-reviewed pull requests, and automated continuous integration pipelines empower small teams to deploy planetary-scale platforms that democratize technological innovation for all.'
  },

  // ---------------------------------------------------------------------------
  // 3. BUSINESS & ECONOMICS (Finance, Strategy, Entrepreneurship)
  // ---------------------------------------------------------------------------
  {
    id: 'biz-01',
    category: 'business',
    title: 'Compound Interest',
    targetDuration: 15,
    text: 'Compound interest is the eighth wonder of the world. He who understands it, earns it; he who does not, pays it diligently every day.'
  },
  {
    id: 'biz-02',
    category: 'business',
    title: 'Value Proposition',
    targetDuration: 15,
    text: 'Sustainable business models do not begin with fundraising decks; they begin by solving an acute, painful problem for a clearly defined customer.'
  },
  {
    id: 'biz-03',
    category: 'business',
    title: 'Economic Moats',
    targetDuration: 30,
    text: 'A durable economic moat protects corporate margins against aggressive competitors. Network effects, high switching costs, proprietary patents, and low-cost manufacturing advantages ensure that a profitable enterprise can reinvest capital at high rates of return.'
  },
  {
    id: 'biz-04',
    category: 'business',
    title: 'The Venture Capital Model',
    targetDuration: 30,
    text: 'In early-stage venture finance, returns follow a sharp power-law distribution. A single breakout unicorn investment typically generates greater financial gains than all other fund investments combined, requiring partners to embrace bold risks.'
  },
  {
    id: 'biz-05',
    category: 'business',
    title: 'Supply Chain Resilience',
    targetDuration: 60,
    text: 'Modern supply networks have shifted away from fragile just-in-time logistics toward redundant multi-region manufacturing hubs. Geopolitical friction, unexpected container shipping bottlenecks, and semiconductor shortages forced executives to recognize that saving a fraction of a percent in warehouse inventory is trivial compared to the catastrophic cost of a total production standstill.'
  },
  {
    id: 'biz-06',
    category: 'business',
    title: 'Building Authentic Brands',
    targetDuration: 60,
    text: 'A brand is not merely a logo, color palette, or catchy marketing slogan; it is the sum total of every promise kept over years of customer interactions. In an era where consumers possess instant access to global price comparisons and candid online reviews, trust is the scarcest commercial currency. Companies that champion transparent quality and ethical practices foster fierce loyalty that no advertising campaign can purchase.'
  },
  {
    id: 'biz-07',
    category: 'business',
    title: 'The Philosophy of Long-Term Investing',
    targetDuration: 120,
    text: 'The financial markets fluctuate unpredictably in the short term, swayed by sensational headlines, speculative frenzies, and shifting macroeconomic interest rates. However, over decades, equities invariably mirror the fundamental growth of human enterprise and productivity gains. The most successful investors distinguish themselves not by predicting quarterly earnings surprises or trading volatile derivative contracts, but through emotional discipline, rigorous balance-sheet analysis, and the patience to hold exceptional businesses through full economic cycles. By ignoring ephemeral panic and focusing on tangible competitive advantages, one harnesses the immense compounding power of innovation.'
  },
  {
    id: 'biz-08',
    category: 'business',
    title: 'Market Liquidity',
    targetDuration: 15,
    text: 'Deep bid-ask liquidity minimizes transaction friction, allowing global institutional funds to allocate billions without triggering slippage.'
  },
  {
    id: 'biz-09',
    category: 'business',
    title: 'Agile Product Management',
    targetDuration: 30,
    text: 'Shipping iterative product increments allows engineering teams to validate hypotheses with actual user metrics before allocating months of scarce capital toward unproven features.'
  },
  {
    id: 'biz-10',
    category: 'business',
    title: 'The S-Curve of Innovation',
    targetDuration: 60,
    text: 'Every technological paradigm follows an S-curve: sluggish early experimentation, rapid exponential adoption, and eventual maturity as physical constraints are reached. Visionary executives anticipate this inflection point and reinvest mature cash flows into the next technological wave before their legacy revenue engines experience terminal decline.'
  },

  // ---------------------------------------------------------------------------
  // 4. SCIENCE (Astronomy, Physics, Biology, Ecology, Chemistry)
  // ---------------------------------------------------------------------------
  {
    id: 'sci-01',
    category: 'science',
    title: 'Stardust Origins',
    targetDuration: 15,
    text: 'Every carbon atom in your DNA, every iron molecule in your bloodstream, was forged billions of years ago inside the furnace of a dying star.'
  },
  {
    id: 'sci-02',
    category: 'science',
    title: 'The Speed of Light',
    targetDuration: 15,
    text: 'Photons travel through the vacuum of space at exactly 299,792 kilometers per second, establishing the ultimate cosmic speed limit of the universe.'
  },
  {
    id: 'sci-03',
    category: 'science',
    title: 'The Double Helix',
    targetDuration: 30,
    text: 'DNA encodes the genetic blueprints for all known terrestrial life across four chemical base pairs: adenine, thymine, cytosine, and guanine. Paired along a twisted sugar-phosphate backbone, these microscopic sequences dictate cellular development and evolutionary adaptation.'
  },
  {
    id: 'sci-04',
    category: 'science',
    title: 'Plate Tectonics',
    targetDuration: 30,
    text: 'The crust of the Earth floats upon the semi-fluid mantle in massive rigid plates. Their gradual continental drift of a few centimeters per year forms towering mountain ranges, triggers volcanic eruptions, and opens vast oceanic basins across geologic epochs.'
  },
  {
    id: 'sci-05',
    category: 'science',
    title: 'The Enigma of Black Holes',
    targetDuration: 60,
    text: 'When a massive star exhausts its nuclear fuel, its core collapses under immense gravitational force until density approaches infinity at a central singularity. Beyond the boundary known as the event horizon, escape velocity exceeds the speed of light itself, warping surrounding spacetime so severely that neither matter nor electromagnetic radiation can ever return to the observable cosmos.'
  },
  {
    id: 'sci-06',
    category: 'science',
    title: 'Photosynthesis & Life',
    targetDuration: 60,
    text: 'Chlorophyll pigments within plant chloroplasts capture solar photons to split water molecules, releasing breathable oxygen while combining carbon dioxide into energetic glucose molecules. This quiet biochemical mechanism fuels almost every food web on Earth, transforming radiant stellar energy into the diverse living biosphere that carpets our blue planet.'
  },
  {
    id: 'sci-07',
    category: 'science',
    title: 'Quantum Mechanics and Reality',
    targetDuration: 120,
    text: 'At subatomic scales, the predictable determinism of classical Newtonian physics gives way to probabilistic wavefunctions and quantum superposition. Particles such as electrons do not occupy definitive positions until measured; instead, they exist across a cloud of potential states described by the Schrodinger equation. Furthermore, entangled pairs of particles maintain correlated quantum properties across vast astronomical distances, an effect that Albert Einstein famously referred to as spooky action at a distance. Modern quantum technologies utilize these counterintuitive phenomena to develop ultra-secure quantum cryptography keys and parallel quantum processors capable of simulating complex molecular chemistry beyond the reach of classical supercomputers.'
  },
  {
    id: 'sci-08',
    category: 'science',
    title: 'The James Webb Telescope',
    targetDuration: 15,
    text: 'Orbiting 1.5 million kilometers away at the second Lagrange point, infrared space telescopes peer through cosmic dust to capture the first galaxies.'
  },
  {
    id: 'sci-09',
    category: 'science',
    title: 'Oceanic Ecosystems',
    targetDuration: 30,
    text: 'Hydrothermal vents in the deepest oceanic trenches support vibrant chemosynthetic ecosystems completely independent of sunlight, deriving warmth and sustenance from mineral-rich geothermal fluids.'
  },
  {
    id: 'sci-10',
    category: 'science',
    title: 'Atmospheric Physics',
    targetDuration: 60,
    text: 'The thin gaseous blanket surrounding Earth shields terrestrial biology from lethal ultraviolet radiation and solar wind. Complex thermodynamic currents driven by uneven equator-to-pole solar heating circulate moisture across trade winds and jet streams, producing the dynamic weather patterns that sustain continental agriculture and freshwater rivers.'
  },

  // ---------------------------------------------------------------------------
  // 5. EVERYDAY SENTENCES (Travel, Daily Life, Food, Conversations, Practical)
  // ---------------------------------------------------------------------------
  {
    id: 'day-01',
    category: 'everyday',
    title: 'Morning Coffee Routine',
    targetDuration: 15,
    text: 'Freshly ground dark coffee beans brewed at 92 degrees Celsius filled the kitchen with a warm, comforting aroma on a chilly Tuesday morning.'
  },
  {
    id: 'day-02',
    category: 'everyday',
    title: 'Catching the Morning Train',
    targetDuration: 15,
    text: 'Commuters checked platform monitors, grabbed umbrellas, and boarded the 8:15 express train just as the doors slid shut with a soft chime.'
  },
  {
    id: 'day-03',
    category: 'everyday',
    title: 'The Weekend Farmers Market',
    targetDuration: 30,
    text: 'Every Saturday morning, local vendors line the village square with crates of crisp red apples, freshly baked sourdough loaves, artisan honey, and bunches of fragrant wild lavender picked at sunrise from nearby hillside farms.'
  },
  {
    id: 'day-04',
    category: 'everyday',
    title: 'Packing for Vacation',
    targetDuration: 30,
    text: 'Before heading to the airport, double-check your passport, boarding passes, noise-canceling headphones, and portable charger. It is always wise to keep a spare jacket in your carry-on bag in case the aircraft cabin gets cold during the night flight.'
  },
  {
    id: 'day-05',
    category: 'everyday',
    title: 'Cooking Sourdough Bread',
    targetDuration: 60,
    text: 'Baking artisanal sourdough bread requires patience and attentive touch. After mixing flour, water, and active starter culture, the dough undergoes slow fermentation for twelve hours. As wild yeasts digest starches, gluten networks develop naturally, yielding an open, airy crumb and a golden caramelized crust with deep, complex flavor when baked inside a preheated cast-iron Dutch oven.'
  },
  {
    id: 'day-06',
    category: 'everyday',
    title: 'Exploring a Coastal Town',
    targetDuration: 60,
    text: 'Wandering through the narrow cobblestone lanes of a Mediterranean fishing harbor at sunset reveals centuries of maritime charm. Whitewashed stone cottages adorned with bright magenta bougainvillea look out over turquoise waters, where colorful wooden boats bob gently against weathered docks while seaside cafes serve freshly caught grilled sea bass drizzled with olive oil and fresh lemon juice.'
  },
  {
    id: 'day-07',
    category: 'everyday',
    title: 'The Joy of Urban Cycling',
    targetDuration: 120,
    text: 'Commuting through the city on a bicycle offers an intimate perspective on urban life that automobile passengers rarely experience. As you pedal through tree-lined boulevards and dedicated riverside greenways, you hear the distant murmur of morning conversation, smell warm pastries wafting from neighborhood bakeries, and feel the cool river breeze on your face. Navigating city traffic by bike requires sharp situational awareness, hand signals, and proactive braking, yet it rewards cyclists with invigorating daily exercise, zero carbon emissions, and total freedom from subway delays and gridlocked rush-hour intersections. By the time you arrive at your office desk, your mind is alert, energized, and ready to tackle the workday ahead.'
  },
  {
    id: 'day-08',
    category: 'everyday',
    title: 'A Rainy Afternoon',
    targetDuration: 15,
    text: 'Raindrops tapped gently against the windowpane as we sat reading paperbacks beside the crackling fireplace with mugs of hot chamomile tea.'
  },
  {
    id: 'day-09',
    category: 'everyday',
    title: 'Navigating Airport Security',
    targetDuration: 30,
    text: 'Place your electronic devices in the plastic bin, remove your wrist watch and belt, and step calmly through the metal detector with your boarding pass ready for the agent.'
  },
  {
    id: 'day-10',
    category: 'everyday',
    title: 'The Community Garden',
    targetDuration: 60,
    text: 'Neighbors gathered on Sunday morning to pull stubborn weeds, prune overgrown tomato vines, and harvest ripe yellow squash from shared garden plots. Children watered blooming sunflowers with green tin cans while older residents shared tips on organic composting and pest prevention, turning an empty downtown lot into a flourishing oasis of community goodwill and fresh produce.'
  }
];

// =============================================================================
// CATEGORIES METADATA
// =============================================================================
export const TYPING_CATEGORIES = [
  { id: 'random' as PassageCategory, name: 'Random', icon: '🎲', description: 'Surprise passages from every genre and subject' },
  { id: 'general' as PassageCategory, name: 'General English', icon: '📚', description: 'Literature, philosophy, and history' },
  { id: 'tech' as PassageCategory, name: 'Technology', icon: '💻', description: 'Software, algorithms, and computing' },
  { id: 'business' as PassageCategory, name: 'Business', icon: '📈', description: 'Markets, economics, and leadership' },
  { id: 'science' as PassageCategory, name: 'Science', icon: '🔬', description: 'Astronomy, physics, and biology' },
  { id: 'everyday' as PassageCategory, name: 'Everyday', icon: '☕', description: 'Conversations, travel, and routines' }
];

export const TEST_DURATIONS: TestDuration[] = [15, 30, 60, 120];

// =============================================================================
// PASSAGE SELECTION MANAGER (Non-Repeating, Fair Pool Exhaustion)
// =============================================================================
export class PassageManager {
  private usedIds: Set<string> = new Set();
  private lastId: string | null = null;

  public getNextPassage(
    category: PassageCategory = 'random',
    targetDuration?: TestDuration
  ): TypingPassage {
    // 1. Filter by category
    let pool = category === 'random'
      ? TYPING_PASSAGES
      : TYPING_PASSAGES.filter((p) => p.category === category);

    if (pool.length === 0) {
      pool = TYPING_PASSAGES;
    }

    // 2. Filter out already used IDs and the immediately previous passage
    let available = pool.filter((p) => !this.usedIds.has(p.id) && p.id !== this.lastId);

    // 3. If pool is exhausted, reset used IDs for this category and only exclude lastId
    if (available.length === 0) {
      // Clear used IDs from pool
      pool.forEach((p) => this.usedIds.delete(p.id));
      available = pool.filter((p) => p.id !== this.lastId);
    }

    // 4. Absolute fallback
    if (available.length === 0) {
      available = pool;
    }

    // 5. Prefer duration match if available
    if (targetDuration) {
      const durationMatches = available.filter((p) => p.targetDuration === targetDuration);
      if (durationMatches.length > 0) {
        available = durationMatches;
      }
    }

    // 6. Random selection from available
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];

    // 7. Track usage
    this.usedIds.add(selected.id);
    this.lastId = selected.id;

    return selected;
  }

  public resetHistory(): void {
    this.usedIds.clear();
    this.lastId = null;
  }
}

// Global default instance
export const globalPassageManager = new PassageManager();

// =============================================================================
// LEGACY COMPATIBILITY EXPORTS (Maintained for backward compatibility)
// =============================================================================
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
