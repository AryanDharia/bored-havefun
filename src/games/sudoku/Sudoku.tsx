import React, { useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Lightbulb, Timer, AlertCircle } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

// Complete Sudoku generator & solver algorithms
function generateCompleteSudoku(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(b: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (b[row][i] === num || b[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (b[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  function fill(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (isValid(b, r, c, num)) {
              b[r][c] = num;
              if (fill(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  fill(board);
  return board;
}

export const Sudoku: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'sudoku')!;

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [solution, setSolution] = useState<number[][]>([]);
  const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);
  const [currentGrid, setCurrentGrid] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  const [mistakes, setMistakes] = useState<number>(0);
  const [hintsLeft, setHintsLeft] = useState<number>(3);
  const [seconds, setSeconds] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('sudoku'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const initGame = useCallback((diff: Difficulty) => {
    const solved = generateCompleteSudoku();
    const puzzle = solved.map((r) => [...r]);
    const isInitial = Array.from({ length: 9 }, () => Array(9).fill(false));

    // Remove cells based on difficulty
    // Easy: remove ~30, Medium: remove ~42, Hard: remove ~52
    const cellsToRemove = diff === 'easy' ? 32 : diff === 'medium' ? 44 : 54;
    let removed = 0;

    while (removed < cellsToRemove) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (puzzle[r][c] !== 0) {
        puzzle[r][c] = 0;
        removed++;
      }
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          isInitial[r][c] = true;
        }
      }
    }

    setSolution(solved);
    setCurrentGrid(puzzle);
    setInitialGrid(isInitial);
    setSelectedCell(null);
    setMistakes(0);
    setHintsLeft(3);
    setSeconds(0);
    setGameOver(false);
    setIsNewHigh(false);
  }, []);

  useEffect(() => {
    initGame(difficulty);
  }, [difficulty, initGame]);

  // Timer
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const handleCellSelect = (r: number, c: number) => {
    setSelectedCell([r, c]);
    sounds.playClick();
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameOver) return;
    const [r, c] = selectedCell;
    if (initialGrid[r][c]) return; // Initial cell cannot be modified

    const nextGrid = currentGrid.map((row) => [...row]);

    if (num === 0) {
      // Erase
      nextGrid[r][c] = 0;
      setCurrentGrid(nextGrid);
      sounds.playMove();
      return;
    }

    // Check against solution
    if (solution[r][c] === num) {
      sounds.playScore();
      nextGrid[r][c] = num;
      setCurrentGrid(nextGrid);

      // Check win condition
      const isComplete = nextGrid.every((row, rIdx) =>
        row.every((val, cIdx) => val === solution[rIdx][cIdx])
      );
      if (isComplete) {
        handleWin();
      }
    } else {
      sounds.playHit();
      setMistakes((m) => {
        const nextM = m + 1;
        if (nextM >= 3) {
          setGameOver(true);
        }
        return nextM;
      });
    }
  };

  // Keyboard support for 1-9 & backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumberInput(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, handleNumberInput]);

  const handleHint = () => {
    if (hintsLeft <= 0 || !selectedCell || gameOver) return;
    const [r, c] = selectedCell;
    if (initialGrid[r][c] || currentGrid[r][c] === solution[r][c]) return;

    const nextGrid = currentGrid.map((row) => [...row]);
    nextGrid[r][c] = solution[r][c];
    setCurrentGrid(nextGrid);
    setHintsLeft((h) => h - 1);
    sounds.playScore();

    const isComplete = nextGrid.every((row, rIdx) =>
      row.every((val, cIdx) => val === solution[rIdx][cIdx])
    );
    if (isComplete) {
      handleWin();
    }
  };

  const handleWin = () => {
    sounds.playWin();
    const bonus = difficulty === 'hard' ? 1000 : difficulty === 'medium' ? 600 : 300;
    const calculatedScore = Math.max(100, bonus - seconds * 2 - mistakes * 50);
    setScore(calculatedScore);
    setGameOver(true);

    const wasNew = saveHighScore('sudoku', calculatedScore);
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
      onRestart={() => initGame(difficulty)}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                difficulty === d ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      }
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Sudoku Meta Header */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-2 px-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatTime(seconds)}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Mistakes: {mistakes}/3</span>
          </div>

          <button
            onClick={handleHint}
            disabled={hintsLeft <= 0 || !selectedCell}
            className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/40 disabled:opacity-40"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint ({hintsLeft})</span>
          </button>
        </div>

        {/* 9x9 Sudoku Board */}
        <div className="w-full aspect-square max-w-[390px] bg-[#0c0e18] p-2 rounded-3xl border-2 border-slate-800 shadow-2xl">
          <div className="grid grid-cols-9 grid-rows-9 w-full h-full border-2 border-slate-700 rounded-xl overflow-hidden">
            {currentGrid.map((row, r) =>
              row.map((cell, c) => {
                const isInitial = initialGrid[r]?.[c];
                const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
                const selectedVal = selectedCell ? currentGrid[selectedCell[0]][selectedCell[1]] : 0;
                const isSameVal = selectedVal > 0 && cell === selectedVal && !isSelected;
                const isRelated =
                  selectedCell &&
                  (selectedCell[0] === r ||
                    selectedCell[1] === c ||
                    (Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) &&
                      Math.floor(selectedCell[1] / 3) === Math.floor(c / 3)));

                // 3x3 block borders
                const borderRight = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-2 border-r-slate-600' : 'border-r border-r-slate-800/80';
                const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-2 border-b-slate-600' : 'border-b border-b-slate-800/80';

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellSelect(r, c)}
                    className={`flex items-center justify-center font-bold text-sm sm:text-base select-none transition-colors ${borderRight} ${borderBottom} ${
                      isSelected
                        ? 'bg-violet-600 text-white font-black'
                        : isSameVal
                        ? 'bg-violet-950/70 text-violet-300 ring-1 ring-violet-500/50'
                        : isRelated
                        ? 'bg-[#181b2e]'
                        : 'bg-[#10121d] hover:bg-[#151828]'
                    } ${isInitial ? 'text-slate-100 font-extrabold' : 'text-violet-300 font-bold'}`}
                  >
                    {cell !== 0 ? <span className="anim-pop inline-block">{cell}</span> : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 1-9 Virtual Keypad */}
        <div className="w-full grid grid-cols-10 gap-1.5 mt-5 max-w-[390px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              className="py-2.5 rounded-xl bg-[#141726] hover:bg-violet-600 active:scale-95 text-white font-bold text-sm border border-slate-800 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberInput(0)}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 active:scale-95 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all"
            title="Erase"
          >
            ✕
          </button>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={mistakes >= 3 ? 'Game Over' : '🎉 Puzzle Solved!'}
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={
          mistakes >= 3
            ? '3 mistakes reached. Try again!'
            : `Completed on ${difficulty} in ${formatTime(seconds)}!`
        }
        onRestart={() => initGame(difficulty)}
      />
    </GameLayout>
  );
};
