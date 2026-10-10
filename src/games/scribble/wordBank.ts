export interface ScribbleWord {
  word: string;
  category: 'Animals' | 'Food' | 'Objects' | 'Nature' | 'Places' | 'Action' | 'Tech';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const SCRIBBLE_WORDS: ScribbleWord[] = [
  // Animals
  { word: 'CAT', category: 'Animals', difficulty: 'Easy' },
  { word: 'DOG', category: 'Animals', difficulty: 'Easy' },
  { word: 'FISH', category: 'Animals', difficulty: 'Easy' },
  { word: 'BIRD', category: 'Animals', difficulty: 'Easy' },
  { word: 'LION', category: 'Animals', difficulty: 'Easy' },
  { word: 'TIGER', category: 'Animals', difficulty: 'Easy' },
  { word: 'ELEPHANT', category: 'Animals', difficulty: 'Medium' },
  { word: 'GIRAFFE', category: 'Animals', difficulty: 'Medium' },
  { word: 'MONKEY', category: 'Animals', difficulty: 'Easy' },
  { word: 'PENGUIN', category: 'Animals', difficulty: 'Medium' },
  { word: 'DOLPHIN', category: 'Animals', difficulty: 'Medium' },
  { word: 'OCTOPUS', category: 'Animals', difficulty: 'Medium' },
  { word: 'SNAKE', category: 'Animals', difficulty: 'Easy' },
  { word: 'FROG', category: 'Animals', difficulty: 'Easy' },
  { word: 'BUTTERFLY', category: 'Animals', difficulty: 'Medium' },
  { word: 'KANGAROO', category: 'Animals', difficulty: 'Hard' },
  { word: 'CROCODILE', category: 'Animals', difficulty: 'Hard' },
  { word: 'FLAMINGO', category: 'Animals', difficulty: 'Hard' },
  { word: 'CHAMELEON', category: 'Animals', difficulty: 'Hard' },

  // Food
  { word: 'PIZZA', category: 'Food', difficulty: 'Easy' },
  { word: 'BURGER', category: 'Food', difficulty: 'Easy' },
  { word: 'ICE CREAM', category: 'Food', difficulty: 'Easy' },
  { word: 'APPLE', category: 'Food', difficulty: 'Easy' },
  { word: 'BANANA', category: 'Food', difficulty: 'Easy' },
  { word: 'TACO', category: 'Food', difficulty: 'Easy' },
  { word: 'COOKIE', category: 'Food', difficulty: 'Easy' },
  { word: 'CAKE', category: 'Food', difficulty: 'Easy' },
  { word: 'SUSHI', category: 'Food', difficulty: 'Medium' },
  { word: 'HOTDOG', category: 'Food', difficulty: 'Easy' },
  { word: 'POPCORN', category: 'Food', difficulty: 'Medium' },
  { word: 'PENCIL', category: 'Objects', difficulty: 'Easy' },
  { word: 'DONUT', category: 'Food', difficulty: 'Easy' },
  { word: 'CHEESE', category: 'Food', difficulty: 'Easy' },
  { word: 'PANCAKE', category: 'Food', difficulty: 'Medium' },
  { word: 'CUPCAKE', category: 'Food', difficulty: 'Medium' },
  { word: 'PINEAPPLE', category: 'Food', difficulty: 'Medium' },
  { word: 'WATERMELON', category: 'Food', difficulty: 'Medium' },

  // Objects
  { word: 'CAR', category: 'Objects', difficulty: 'Easy' },
  { word: 'AIRPLANE', category: 'Objects', difficulty: 'Easy' },
  { word: 'ROCKET', category: 'Objects', difficulty: 'Easy' },
  { word: 'GUITAR', category: 'Objects', difficulty: 'Medium' },
  { word: 'CLOCK', category: 'Objects', difficulty: 'Easy' },
  { word: 'SWORD', category: 'Objects', difficulty: 'Easy' },
  { word: 'SHOE', category: 'Objects', difficulty: 'Easy' },
  { word: 'SUNGLASSES', category: 'Objects', difficulty: 'Easy' },
  { word: 'BALLOON', category: 'Objects', difficulty: 'Easy' },
  { word: 'UMBRELLA', category: 'Objects', difficulty: 'Easy' },
  { word: 'KEY', category: 'Objects', difficulty: 'Easy' },
  { word: 'SCISSORS', category: 'Objects', difficulty: 'Medium' },
  { word: 'HEADPHONES', category: 'Objects', difficulty: 'Medium' },
  { word: 'CAMERA', category: 'Objects', difficulty: 'Medium' },
  { word: 'MICROSCOPE', category: 'Objects', difficulty: 'Hard' },
  { word: 'TELESCOPE', category: 'Objects', difficulty: 'Hard' },
  { word: 'SKATEBOARD', category: 'Objects', difficulty: 'Medium' },
  { word: 'SUBMARINE', category: 'Objects', difficulty: 'Hard' },

  // Nature
  { word: 'SUN', category: 'Nature', difficulty: 'Easy' },
  { word: 'MOON', category: 'Nature', difficulty: 'Easy' },
  { word: 'STAR', category: 'Nature', difficulty: 'Easy' },
  { word: 'CLOUD', category: 'Nature', difficulty: 'Easy' },
  { word: 'RAINBOW', category: 'Nature', difficulty: 'Easy' },
  { word: 'VOLCANO', category: 'Nature', difficulty: 'Medium' },
  { word: 'MOUNTAIN', category: 'Nature', difficulty: 'Easy' },
  { word: 'LIGHTNING', category: 'Nature', difficulty: 'Medium' },
  { word: 'WATERFALL', category: 'Nature', difficulty: 'Medium' },
  { word: 'CAMPFIRE', category: 'Nature', difficulty: 'Medium' },
  { word: 'TORNADO', category: 'Nature', difficulty: 'Hard' },
  { word: 'ISLAND', category: 'Nature', difficulty: 'Medium' },

  // Tech & Gaming
  { word: 'ROBOT', category: 'Tech', difficulty: 'Easy' },
  { word: 'LAPTOP', category: 'Tech', difficulty: 'Easy' },
  { word: 'PHONE', category: 'Tech', difficulty: 'Easy' },
  { word: 'GAMEBOY', category: 'Tech', difficulty: 'Medium' },
  { word: 'JOYSTICK', category: 'Tech', difficulty: 'Medium' },
  { word: 'DRONE', category: 'Tech', difficulty: 'Medium' },
  { word: 'VR HEADSET', category: 'Tech', difficulty: 'Hard' },
  { word: 'SATELLITE', category: 'Tech', difficulty: 'Hard' },
];

export function getRandomWordOptions(count = 3): ScribbleWord[] {
  const shuffled = [...SCRIBBLE_WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
