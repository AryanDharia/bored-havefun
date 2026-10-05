import React, { useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Delete } from 'lucide-react';

const WORDS = [
  'REACT', 'GAMES', 'BRAIN', 'SPEED', 'SNAKE', 'CHESS',
  'CLOUD', 'POWER', 'FLAME', 'GHOST', 'MAGIC', 'SHARK',
  'PIXEL', 'SPACE', 'SWIFT', 'QUEST', 'BLAZE', 'STORM',
  'CYBER', 'ROBOT', 'LASER', 'MUSIC', 'PRISM', 'OCEAN'
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

export const WordQuest: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'wordle')!;

  const [targetWord, setTargetWord] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('wordle'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const initGame = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setGameWon(false);
    setIsNewHigh(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleChar = useCallback(
    (char: string) => {
      if (gameOver) return;

      if (char === 'DEL' || char === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
        sounds.playClick();
        return;
      }

      if (char === 'ENTER') {
        if (currentGuess.length !== 5) return;

        sounds.playMove();
        const nextGuesses = [...guesses, currentGuess];
        setGuesses(nextGuesses);
        setCurrentGuess('');

        // Check Win
        if (currentGuess === targetWord) {
          sounds.playWin();
          setGameWon(true);
          setGameOver(true);
          const points = (7 - nextGuesses.length) * 100;
          setScore(points);
          const isNew = saveHighScore('wordle', points);
          if (isNew) {
            setIsNewHigh(true);
            setHighScore(points);
          }
          return;
        }

        // Check Loss
        if (nextGuesses.length >= 6) {
          sounds.playGameOver();
          setGameWon(false);
          setGameOver(true);
        }
        return;
      }

      if (currentGuess.length < 5 && /^[A-Z]$/.test(char)) {
        setCurrentGuess((prev) => prev + char);
        sounds.playClick();
      }
    },
    [currentGuess, gameOver, guesses, targetWord]
  );

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') handleChar('DEL');
      else if (e.key === 'Enter') handleChar('ENTER');
      else {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) handleChar(letter);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChar]);

  // Letter color status
  const getLetterStatus = (letter: string, colIdx: number) => {
    if (targetWord[colIdx] === letter) return 'green';
    if (targetWord.includes(letter)) return 'yellow';
    return 'gray';
  };

  // Keyboard key colors
  const getKeyColor = (key: string) => {
    let status = 'default';
    for (const g of guesses) {
      for (let i = 0; i < 5; i++) {
        if (g[i] === key) {
          if (targetWord[i] === key) return 'green';
          if (targetWord.includes(key)) status = 'yellow';
          else if (status === 'default') status = 'gray';
        }
      }
    }
    return status;
  };

  return (
    <GameLayout game={gameInfo} score={score} onRestart={initGame}>
      <div className="w-full max-w-sm flex flex-col items-center select-none">
        {/* 6x5 Board Grid */}
        <div className="grid grid-rows-6 gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, r) => {
            const isCurrentRow = r === guesses.length;
            const submittedWord = guesses[r];

            return (
              <div key={r} className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, c) => {
                  let letter = '';
                  let status = 'empty';

                  if (submittedWord) {
                    letter = submittedWord[c];
                    status = getLetterStatus(letter, c);
                  } else if (isCurrentRow) {
                    letter = currentGuess[c] || '';
                    status = letter ? 'typing' : 'empty';
                  }

                  return (
                    <div
                      key={c}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                        status === 'green'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : status === 'yellow'
                          ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                          : status === 'gray'
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : status === 'typing'
                          ? 'bg-[#181a29] border-violet-500 text-white'
                          : 'bg-[#10121d] border-slate-800 text-white'
                      }`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Virtual On-Screen Keyboard */}
        <div className="w-full space-y-1.5 max-w-[360px]">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {row.map((k) => {
                const colorStatus = getKeyColor(k);
                const isSpecial = k === 'ENTER' || k === 'DEL';

                return (
                  <button
                    key={k}
                    onClick={() => handleChar(k)}
                    className={`py-3 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center ${
                      isSpecial ? 'px-3 bg-slate-700 text-white' : 'w-8 bg-[#181b2a] text-white'
                    } ${
                      colorStatus === 'green'
                        ? 'bg-emerald-600'
                        : colorStatus === 'yellow'
                        ? 'bg-amber-600'
                        : colorStatus === 'gray'
                        ? 'bg-slate-800/60 text-slate-500 opacity-60'
                        : 'hover:bg-violet-600/60'
                    }`}
                  >
                    {k === 'DEL' ? <Delete className="w-4 h-4" /> : k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={gameWon ? '🎉 Brilliant Word Mastery!' : 'Word Missed!'}
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={gameWon ? `You deduced "${targetWord}" in ${guesses.length} tries!` : `The word was "${targetWord}". Try another!`}
        onRestart={initGame}
      />
    </GameLayout>
  );
};
