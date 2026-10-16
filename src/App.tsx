import { Suspense, lazy } from 'react';
import { useCurrentRoute } from './lib/router';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Footer } from './components/Footer';

// Lazy load game modules to maximize homepage performance and minimize initial bundle size
const TicTacToe = lazy(() => import('./games/tictactoe/TicTacToe').then(m => ({ default: m.TicTacToe })));
const RockPaperScissors = lazy(() => import('./games/rps/RockPaperScissors').then(m => ({ default: m.RockPaperScissors })));
const Snake = lazy(() => import('./games/snake/Snake').then(m => ({ default: m.Snake })));
const MathRush = lazy(() => import('./games/math-rush/MathRush').then(m => ({ default: m.MathRush })));
const MemoryMatch = lazy(() => import('./games/memory/MemoryMatch').then(m => ({ default: m.MemoryMatch })));
const ConnectFour = lazy(() => import('./games/connect4/ConnectFour').then(m => ({ default: m.ConnectFour })));
const Checkers = lazy(() => import('./games/checkers/Checkers').then(m => ({ default: m.Checkers })));
const Sudoku = lazy(() => import('./games/sudoku/Sudoku').then(m => ({ default: m.Sudoku })));
const SnakesAndLadders = lazy(() => import('./games/snakes-ladders/SnakesAndLadders').then(m => ({ default: m.SnakesAndLadders })));
const Ludo = lazy(() => import('./games/ludo/Ludo').then(m => ({ default: m.Ludo })));
const Chess = lazy(() => import('./games/chess/Chess').then(m => ({ default: m.Chess })));
const PocketTanks = lazy(() => import('./games/pocket-tanks/PocketTanks').then(m => ({ default: m.PocketTanks })));
const PsychGame = lazy(() => import('./games/psych/PsychGame').then(m => ({ default: m.PsychGame })));
const Game2048 = lazy(() => import('./games/game-2048/Game2048').then(m => ({ default: m.Game2048 })));
const Minesweeper = lazy(() => import('./games/minesweeper/Minesweeper').then(m => ({ default: m.Minesweeper })));
const PongGame = lazy(() => import('./games/pong/PongGame').then(m => ({ default: m.PongGame })));
const BreakoutGame = lazy(() => import('./games/breakout/BreakoutGame').then(m => ({ default: m.BreakoutGame })));
const ReactionTest = lazy(() => import('./games/reaction-test/ReactionTest').then(m => ({ default: m.ReactionTest })));
const DotsAndBoxes = lazy(() => import('./games/dots-and-boxes/DotsAndBoxes').then(m => ({ default: m.DotsAndBoxes })));
const WordQuest = lazy(() => import('./games/wordle/WordQuest').then(m => ({ default: m.WordQuest })));
const ImposterGame = lazy(() => import('./games/imposter/ImposterGame').then(m => ({ default: m.ImposterGame })));
const RetroRacing = lazy(() => import('./games/retro-racing/RetroRacing').then(m => ({ default: m.RetroRacing })));
const ScribbleGame = lazy(() => import('./games/scribble/ScribbleGame').then(m => ({ default: m.ScribbleGame })));
const BusinessTycoon = lazy(() => import('./games/business-tycoon/BusinessTycoon').then(m => ({ default: m.BusinessTycoon })));
const TypingSpeedRush = lazy(() => import('./games/typing-rush/TypingSpeedRush').then(m => ({ default: m.TypingSpeedRush })));
const FlappyRush = lazy(() => import('./games/flappy-rush/FlappyRush').then(m => ({ default: m.FlappyRush })));
const BlockStack = lazy(() => import('./games/block-stack/BlockStack').then(m => ({ default: m.BlockStack })));

function GameLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#08090d] text-slate-100">
      <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center animate-spin mb-4 shadow-[0_0_20px_rgba(249,115,22,0.25)]">
        <div className="w-4 h-4 rounded-full bg-orange-500" />
      </div>
      <p className="text-sm font-bold text-slate-300">Loading Game Engine...</p>
    </div>
  );
}

export function App() {
  const currentRoute = useCurrentRoute();

  // Route parser: match /games/:id or #/games/:id
  const matchGame = currentRoute.match(/^\/games\/([a-z0-9-]+)/i);
  const gameId = matchGame ? matchGame[1] : null;

  const renderGame = (id: string) => {
    switch (id) {
      case 'tic-tac-toe':
        return <TicTacToe />;
      case 'rock-paper-scissors':
        return <RockPaperScissors />;
      case 'snake':
        return <Snake />;
      case 'math-rush':
        return <MathRush />;
      case 'memory':
        return <MemoryMatch />;
      case 'connect-four':
        return <ConnectFour />;
      case 'checkers':
        return <Checkers />;
      case 'sudoku':
        return <Sudoku />;
      case 'snakes-and-ladders':
        return <SnakesAndLadders />;
      case 'ludo':
        return <Ludo />;
      case 'chess':
        return <Chess />;
      case 'pocket-tanks':
        return <PocketTanks />;
      case 'psych':
        return <PsychGame />;
      case '2048':
        return <Game2048 />;
      case 'minesweeper':
        return <Minesweeper />;
      case 'pong':
        return <PongGame />;
      case 'breakout':
        return <BreakoutGame />;
      case 'reaction-test':
        return <ReactionTest />;
      case 'dots-and-boxes':
        return <DotsAndBoxes />;
      case 'wordle':
        return <WordQuest />;
      case 'imposter':
        return <ImposterGame />;
      case 'retro-racing':
      case 'car-racing':
        return <RetroRacing />;
      case 'scribble':
        return <ScribbleGame />;
      case 'business-tycoon':
        return <BusinessTycoon />;
      case 'typing-speed-rush':
      case 'typing-rush':
      case 'dash-quest':
      case 'sonic-dash':
      case 'sonic':
      case 'pixel-runner':
      case 'platformer':
        return <TypingSpeedRush />;
      case 'flappy-rush':
      case 'flappy':
      case 'flappy-bird':
        return <FlappyRush />;
      case 'block-stack':
      case 'tetris':
      case 'blockstack':
      case 'blocks':
        return <BlockStack />;
      default:
        return <Home />;
    }
  };

  if (gameId) {
    return (
      <Suspense fallback={<GameLoadingFallback />}>
        {renderGame(gameId)}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Home />
      </main>
      <Footer />
    </div>
  );
}

export default App;
