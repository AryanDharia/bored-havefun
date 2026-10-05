import React, { useState, useEffect } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Timer, Move } from 'lucide-react';

type GridSize = '4x4' | '6x6';

const EMOJI_POOL = [
  '🚀', '🎮', '💎', '🔥', '⚡', '🍕', '👾', '🌈',
  '🎸', '🍔', '🍦', '🛸', '🎯', '🏆', '🍩', '🥑',
  '🍿', '🍒', '🎲', '🧩', '🎧', '⚽', '👑', '🔮'
];

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryMatch: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'memory')!;

  const [gridSize, setGridSize] = useState<GridSize>('4x4');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('memory'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Initialize cards
  const initBoard = (size: GridSize) => {
    const pairCount = size === '4x4' ? 8 : 18;
    const selectedEmojis = EMOJI_POOL.slice(0, pairCount);
    const deck = [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((symbol, idx) => ({
        id: idx,
        symbol,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setSeconds(0);
    setGameStarted(false);
    setGameOver(false);
    setIsNewHigh(false);
  };

  useEffect(() => {
    initBoard(gridSize);
  }, [gridSize]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  const [mismatchIndices, setMismatchIndices] = useState<number[]>([]);

  const handleCardClick = (index: number) => {
    if (
      cards[index].isFlipped ||
      cards[index].isMatched ||
      flippedIndices.length === 2 ||
      gameOver
    ) {
      return;
    }

    if (!gameStarted) setGameStarted(true);

    sounds.playMove();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      const [firstIdx, secondIdx] = newFlipped;

      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // MATCH!
        sounds.playScore();
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;

            // Check if all matched
            if (updated.every((c) => c.isMatched)) {
              handleGameWin(moves + 1);
            }
            return updated;
          });
          setFlippedIndices([]);
        }, 280);
      } else {
        // Mismatch feedback shake
        setMismatchIndices([firstIdx, secondIdx]);
        sounds.playHit();
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isFlipped = false;
            updated[secondIdx].isFlipped = false;
            return updated;
          });
          setFlippedIndices([]);
          setMismatchIndices([]);
        }, 750);
      }
    }
  };

  const handleGameWin = (finalMoves: number) => {
    // Score formula based on speed and efficiency
    const pairCount = gridSize === '4x4' ? 8 : 18;
    const calculatedScore = Math.max(100, Math.floor(pairCount * 500 - finalMoves * 15 - seconds * 8));
    setScore(calculatedScore);
    setGameOver(true);

    const wasNew = saveHighScore('memory', calculatedScore);
    if (wasNew) {
      setIsNewHigh(true);
      setHighScore(calculatedScore);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={() => initBoard(gridSize)}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          {(['4x4', '6x6'] as GridSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setGridSize(size)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                gridSize === size ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      }
    >
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Moves & Timer Pill Bar */}
        <div className="w-full flex items-center justify-around bg-[#121420] border border-slate-800 rounded-2xl py-2.5 px-4 mb-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Move className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold">Moves:</span>
            <span className="text-base font-black text-white">{moves}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-slate-300">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Time:</span>
            <span className="text-base font-black text-white">{formatTime(seconds)}</span>
          </div>
        </div>

        {/* Card Grid */}
        <div
          className={`grid gap-2.5 sm:gap-3 w-full bg-[#0e101a] p-3 sm:p-4 rounded-3xl border border-slate-800/80 shadow-2xl ${
            gridSize === '4x4' ? 'grid-cols-4 max-w-[360px]' : 'grid-cols-6 max-w-[480px]'
          }`}
        >
          {cards.map((card, idx) => {
            const isRevealed = card.isFlipped || card.isMatched;
            const isMismatch = mismatchIndices.includes(idx);

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                disabled={card.isMatched || card.isFlipped || flippedIndices.length === 2}
                aria-label={`Card ${idx + 1}`}
                className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 select-none cursor-pointer transform ${
                  card.isMatched
                    ? 'bg-emerald-950/40 border border-emerald-500/60 text-3xl opacity-80 scale-95 ring-2 ring-emerald-400/50 anim-pulse-glow'
                    : isMismatch
                    ? 'bg-rose-950/60 border-2 border-rose-500 text-3xl sm:text-4xl anim-shake ring-2 ring-rose-500/70'
                    : isRevealed
                    ? 'bg-[#1e2238] border-2 border-violet-500/80 text-3xl sm:text-4xl shadow-lg shadow-violet-600/30 anim-pop'
                    : 'bg-[#151726] hover:bg-[#1a1e30] border border-slate-800/90 active:scale-95'
                }`}
              >
                {isRevealed ? (
                  <span className="anim-pop inline-block">{card.symbol}</span>
                ) : (
                  <span className="text-slate-600 text-sm font-black">?</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="🎉 Perfect Match!"
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={`Completed in ${moves} moves and ${formatTime(seconds)}!`}
        onRestart={() => initBoard(gridSize)}
      />
    </GameLayout>
  );
};
