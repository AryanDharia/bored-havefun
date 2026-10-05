import React, { useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Flame } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  text: string;
  answer: number;
  options: number[];
}

export const MathRush: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'math-rush')!;

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(100); // 0-100 percentage
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('math-rush'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Generate dynamic mathematical equations
  const generateQuestion = useCallback((diff: Difficulty): Question => {
    let a: number, b: number, op: '+' | '-' | '×' | '÷';
    let answer = 0;

    if (diff === 'easy') {
      op = Math.random() > 0.5 ? '+' : '-';
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      if (op === '-' && b > a) [a, b] = [b, a]; // keep positive
      answer = op === '+' ? a + b : a - b;
    } else if (diff === 'medium') {
      const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
      op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '×') {
        a = Math.floor(Math.random() * 12) + 2;
        b = Math.floor(Math.random() * 12) + 2;
        answer = a * b;
      } else {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * 50) + 5;
        if (op === '-' && b > a) [a, b] = [b, a];
        answer = op === '+' ? a + b : a - b;
      }
    } else {
      // Hard: larger numbers, divisions with integer answers, or three terms
      const ops: ('+' | '-' | '×' | '÷')[] = ['+', '-', '×', '÷'];
      op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '÷') {
        b = Math.floor(Math.random() * 12) + 2;
        answer = Math.floor(Math.random() * 15) + 2;
        a = b * answer;
      } else if (op === '×') {
        a = Math.floor(Math.random() * 25) + 3;
        b = Math.floor(Math.random() * 20) + 3;
        answer = a * b;
      } else {
        a = Math.floor(Math.random() * 100) + 20;
        b = Math.floor(Math.random() * 100) + 20;
        if (op === '-' && b > a) [a, b] = [b, a];
        answer = op === '+' ? a + b : a - b;
      }
    }

    // Generate 4 plausible options including the correct answer
    const optionsSet = new Set<number>([answer]);
    while (optionsSet.size < 4) {
      const offset = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = answer + offset;
      if (wrong >= 0) {
        optionsSet.add(wrong);
      }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      text: `${a} ${op} ${b} = ?`,
      answer,
      options,
    };
  }, []);

  const nextRound = useCallback(() => {
    setQuestion(generateQuestion(difficulty));
    setTimeLeft(100);
    setFeedback(null);
  }, [difficulty, generateQuestion]);

  // Start question
  useEffect(() => {
    nextRound();
  }, [nextRound]);

  // Timer Countdown
  useEffect(() => {
    if (gameOver) return;

    const tickInterval = 50; // 50ms interval
    // Total duration per question: Easy 8s, Med 6s, Hard 5s
    const totalDuration = difficulty === 'easy' ? 8000 : difficulty === 'medium' ? 6000 : 5000;
    const decrement = (tickInterval / totalDuration) * 100;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= decrement) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        return prev - decrement;
      });
    }, tickInterval);

    return () => clearInterval(interval);
  }, [difficulty, gameOver, question]);

  const handleTimeOut = () => {
    sounds.playGameOver();
    endGame();
  };

  const endGame = () => {
    setGameOver(true);
    const wasNew = saveHighScore('math-rush', score);
    if (wasNew) {
      setIsNewHigh(true);
      setHighScore(score);
    }
  };

  const handleSelectAnswer = (selected: number) => {
    if (gameOver || !question || feedback) return;

    if (selected === question.answer) {
      sounds.playScore();
      setFeedback('correct');
      const bonus = streak > 3 ? 30 : streak > 1 ? 20 : 10;
      setScore((prev) => prev + bonus);
      setStreak((prev) => prev + 1);

      setTimeout(() => {
        nextRound();
      }, 250);
    } else {
      sounds.playHit();
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => {
        endGame();
      }, 400);
    }
  };

  const restartGame = () => {
    setScore(0);
    setStreak(0);
    setGameOver(false);
    setIsNewHigh(false);
    nextRound();
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      streak={streak}
      onRestart={restartGame}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                setScore(0);
                setStreak(0);
                setGameOver(false);
              }}
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
        {/* Timer Bar */}
        <div className="w-full bg-[#121420] rounded-full h-3 p-0.5 border border-slate-800 mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              timeLeft > 40
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : timeLeft > 15
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
            }`}
            style={{ width: `${Math.max(0, timeLeft)}%` }}
          />
        </div>

        {/* Question Card */}
        <div
          className={`w-full bg-[#11131e] border-2 rounded-3xl p-8 text-center shadow-2xl relative transition-all duration-200 ${
            feedback === 'correct'
              ? 'border-emerald-400 shadow-emerald-500/40 bg-emerald-950/30 anim-pop'
              : feedback === 'wrong'
              ? 'border-rose-500 shadow-rose-500/40 bg-rose-950/30 anim-shake'
              : 'border-slate-800'
          }`}
        >
          {streak > 2 && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-600/40 anim-pulse-glow shadow-md">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{streak}x COMBO</span>
            </div>
          )}

          {feedback === 'correct' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-3xl text-emerald-400 pointer-events-none anim-score-float">
              +{streak > 3 ? 30 : streak > 1 ? 20 : 10}
            </div>
          )}

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Solve</span>
          <div className="text-4xl sm:text-5xl font-black text-white mt-3 mb-2 tracking-wide font-mono anim-pop">
            {question ? question.text : '...'}
          </div>
        </div>

        {/* 4 Multi Choice Answers */}
        <div className="grid grid-cols-2 gap-3.5 w-full mt-6">
          {question?.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(option)}
              disabled={gameOver || feedback !== null}
              className="py-5 rounded-2xl bg-[#141726] hover:bg-[#1a1f33] active:scale-95 border border-slate-800 hover:border-violet-500/50 text-2xl font-black text-white font-mono shadow-lg transition-all disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="Time's Up!"
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={streak > 0 ? `Highest combo streak: ${streak}x` : 'Keep practicing your mental math!'}
        onRestart={restartGame}
      />
    </GameLayout>
  );
};
