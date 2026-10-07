export interface WordCategory {
  name: string;
  icon: string;
  words: string[];
}

export const IMPOSTER_CATEGORIES: WordCategory[] = [
  {
    name: 'Food & Drinks',
    icon: '🍕',
    words: [
      'Pizza', 'Sushi', 'Ice Cream', 'Hamburger', 'Tacos', 
      'Chocolate', 'Spaghetti', 'Pancake', 'Croissant', 'Popcorn',
      'Cheesecake', 'Dumplings', 'Hot Dog', 'French Fries', 'Watermelon',
      'Bacon', 'Donut', 'Sandwich', 'Burrito', 'Waffles',
      'Coffee', 'Smoothie', 'Lemonade', 'Lasagna', 'Cupcake'
    ]
  },
  {
    name: 'Animals',
    icon: '🦁',
    words: [
      'Elephant', 'Penguin', 'Lion', 'Kangaroo', 'Dolphin',
      'Giraffe', 'Koala', 'Octopus', 'Chameleon', 'Panda',
      'Cheetah', 'Owl', 'Hedgehog', 'Sloth', 'Flamingo',
      'Gorilla', 'Crocodile', 'Zebra', 'Polar Bear', 'Eagle',
      'Squirrel', 'Tiger', 'Wolf', 'Hamster', 'Turtle'
    ]
  },
  {
    name: 'Places & Landmarks',
    icon: '🗼',
    words: [
      'Airport', 'Beach', 'Hospital', 'Library', 'Cinema',
      'Amusement Park', 'Museum', 'Pyramids', 'Eiffel Tower', 'Mount Everest',
      'Space Station', 'Zoo', 'Supermarket', 'Castle', 'Subway',
      'Hotel', 'Police Station', 'Gym', 'Aquarium', 'Campground'
    ]
  },
  {
    name: 'Sports & Activities',
    icon: '⚽',
    words: [
      'Basketball', 'Tennis', 'Swimming', 'Skateboarding', 'Boxing',
      'Snowboarding', 'Volleyball', 'Cricket', 'Formula 1', 'Archery',
      'Surfing', 'Bowling', 'Golf', 'Badminton', 'Karate',
      'Soccer', 'Baseball', 'Rock Climbing', 'Table Tennis', 'Cycling'
    ]
  },
  {
    name: 'Movies & Entertainment',
    icon: '🎬',
    words: [
      'Titanic', 'Inception', 'Harry Potter', 'Spider-Man', 'Star Wars',
      'Jurassic Park', 'The Matrix', 'The Lion King', 'Batman', 'Avengers',
      'Toy Story', 'Gladiator', 'Pirates of the Caribbean', 'Avatar', 'Shrek',
      'Finding Nemo', 'Interstellar', 'Lord of the Rings', 'Ghostbusters', 'Frozen'
    ]
  },
  {
    name: 'Technology & Gadgets',
    icon: '💻',
    words: [
      'Smartphone', 'Laptop', 'Virtual Reality', 'Smartwatch', 'Drone',
      'Robot', 'Headphones', '3D Printer', 'Microwave', 'Camera',
      'Satellite', 'Video Game Console', 'Electric Scooter', 'Telescope', 'Solar Panel',
      'Microphone', 'Keyboard', 'Power Bank', 'Smart Speaker', 'Flash Drive'
    ]
  },
  {
    name: 'Everyday Objects',
    icon: '🎒',
    words: [
      'Umbrella', 'Sunglasses', 'Acoustic Guitar', 'Backpack', 'Flashlight',
      'Pocket Compass', 'Wallet', 'Pillow', 'Scissors', 'Paintbrush',
      'Wristwatch', 'Keys', 'Mirror', 'Toothbrush', 'Magnifying Glass',
      'Thermos Flask', 'Candle', 'Clock', 'Notebook', 'Headphones'
    ]
  },
  {
    name: 'School & Campus',
    icon: '📚',
    words: [
      'Blackboard', 'Calculator', 'Microscope', 'Graduation Cap', 'Stapler',
      'Textbook', 'Highlighter', 'Whiteboard', 'Exam Paper', 'School Bus',
      'Diploma', 'Cafeteria', 'Locker', 'Pencil Case', 'Globe',
      'Backpack', 'Protractor', 'Ruler', 'Desk', 'Detention'
    ]
  },
  {
    name: 'Travel & Vacation',
    icon: '✈️',
    words: [
      'Passport', 'Airplane', 'Suitcase', 'Cruise Ship', 'World Map',
      'Hiking Backpack', 'Train Station', 'Postcard', 'Camping Tent', 'Taxi',
      'Lighthouse', 'Sunglasses', 'Souvenir', 'Ferry', 'Boarding Pass'
    ]
  },
  {
    name: 'Nature & Weather',
    icon: '🌋',
    words: [
      'Waterfall', 'Volcano', 'Rainbow', 'Desert', 'Lightning',
      'Glacier', 'Jungle', 'Coral Reef', 'Sunset', 'Northern Lights',
      'Tornado', 'Canyon', 'Snowstorm', 'Earthquake', 'Island'
    ]
  },
  {
    name: 'Games & Hobbies',
    icon: '🎲',
    words: [
      'Chess', 'Monopoly', 'Poker', 'Hide and Seek', 'Video Games',
      'Jenga', 'Scrabble', 'Billiards', 'Darts', 'Bowling',
      'Pinball', 'Charades', 'Origami', 'Sudoku', 'Rubik Cube'
    ]
  },
  {
    name: 'Daily Life & Home',
    icon: '🏠',
    words: [
      'Alarm Clock', 'Coffee Mug', 'Refrigerator', 'Shower', 'Sofa',
      'Doorbell', 'Washing Machine', 'Balcony', 'Ceiling Fan', 'Closet',
      'Dining Table', 'Television', 'Microwave', 'Vacuum Cleaner', 'Mailbox'
    ]
  }
];

export function getRandomWord(): { category: string; icon: string; word: string } {
  const categoryIndex = Math.floor(Math.random() * IMPOSTER_CATEGORIES.length);
  const selectedCat = IMPOSTER_CATEGORIES[categoryIndex];
  const wordIndex = Math.floor(Math.random() * selectedCat.words.length);
  return {
    category: selectedCat.name,
    icon: selectedCat.icon,
    word: selectedCat.words[wordIndex]
  };
}
