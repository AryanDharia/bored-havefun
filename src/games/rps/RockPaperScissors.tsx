import React, { useState } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

type Choice = 'rock' | 'paper' | 'scissors';
type Mode = 'ai' | 'pvp';

interface ChoiceInfo {
  id: Choice;
  label: string;
  emoji: string;
  beats: Choice;
}

const CHOICES: ChoiceInfo[] = [
  { id: 'rock', label: 'Rock', emoji: '✊', beats: 'scissors' },
  { id: 'paper', label: 'Paper', emoji: '✋', beats: 'rock' },
  { id: 'scissors', label: 'Scissors', emoji: '✌️', beats: 'paper' },
];

export const RockPaperScissors: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'rock-paper-scissors')!;

  const [mode, setMode] = useState<Mode>('ai');
  const [targetScore, setTargetScore] = useState<number>(3);
  
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [p2Choice, setP2Choice] = useState<Choice | null>(null);
  
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  const [roundMessage, setRoundMessage] = useState<string>('Make your choice!');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);

  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);

  // PVP pass-and-play turn:
  const [pvpTurn, setPvpTurn] = useState<'p1' | 'p2'>('p1');

  const resolveRound = (p1: Choice, p2: Choice) => {
    setPlayerChoice(p1);
    setP2Choice(p2);

    if (p1 === p2) {
      setRoundWinner('draw');
      setRoundMessage('Tie! Great minds think alike.');
      sounds.playMove();
    } else {
      const p1Wins = CHOICES.find((c) => c.id === p1)?.beats === p2;
      if (p1Wins) {
        setRoundWinner('p1');
        const winnerChoice = CHOICES.find((c) => c.id === p1)!;
        const loserChoice = CHOICES.find((c) => c.id === p2)!;
        setRoundMessage(`${winnerChoice.label} beats ${loserChoice.label}! You score!`);
        sounds.playScore();

        setScores((prev) => {
          const nextP1 = prev.p1 + 1;
          if (nextP1 >= targetScore) {
            setMatchWinner('p1');
            setGameOver(true);
          }
          return { ...prev, p1: nextP1 };
        });
      } else {
        setRoundWinner('p2');
        const winnerChoice = CHOICES.find((c) => c.id === p2)!;
        const loserChoice = CHOICES.find((c) => c.id === p1)!;
        setRoundMessage(`${winnerChoice.label} beats ${loserChoice.label}! ${mode === 'ai' ? 'AI' : 'Player 2'} scores!`);
        sounds.playGameOver();

        setScores((prev) => {
          const nextP2 = prev.p2 + 1;
          if (nextP2 >= targetScore) {
            setMatchWinner('p2');
            setGameOver(true);
          }
          return { ...prev, p2: nextP2 };
        });
      }
    }
  };

  const handleSelectChoice = (choice: Choice) => {
    if (gameOver || isCountingDown) return;
    sounds.playClick();

    if (mode === 'ai') {
      setIsCountingDown(true);
      setCountdownNum(3);

      let step = 3;
      const interval = setInterval(() => {
        step--;
        if (step > 0) {
          setCountdownNum(step);
          sounds.playMove();
        } else {
          clearInterval(interval);
          setCountdownNum(null);
          setIsCountingDown(false);

          // AI picks
          const randomChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
          resolveRound(choice, randomChoice);
        }
      }, 300);
    } else {
      // PVP Pass and Play
      if (pvpTurn === 'p1') {
        setPlayerChoice(choice);
        setPvpTurn('p2');
        setRoundMessage('Player 1 made selection. Player 2 choose!');
      } else {
        setPvpTurn('p1');
        if (playerChoice) {
          resolveRound(playerChoice, choice);
        }
      }
    }
  };

  const resetMatch = () => {
    setScores({ p1: 0, p2: 0 });
    setPlayerChoice(null);
    setP2Choice(null);
    setRoundWinner(null);
    setRoundMessage('Make your choice!');
    setIsCountingDown(false);
    setCountdownNum(null);
    setGameOver(false);
    setMatchWinner(null);
    setPvpTurn('p1');
  };

  return (
    <GameLayout
      game={gameInfo}
      score={scores.p1}
      onRestart={resetMatch}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Mode */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setMode('ai');
                resetMatch();
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                mode === 'ai' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>vs AI</span>
            </button>
            <button
              onClick={() => {
                setMode('pvp');
                resetMatch();
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                mode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2 Players</span>
            </button>
          </div>

          {/* Target Score */}
          <select
            value={targetScore}
            onChange={(e) => {
              setTargetScore(Number(e.target.value));
              resetMatch();
            }}
            className="bg-[#0d0e17] text-slate-300 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value={3}>First to 3</option>
            <option value={5}>First to 5</option>
          </select>
        </div>
      }
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Arena Battle Arena */}
        <div className="w-full bg-[#11131e] border border-slate-800/90 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-violet-600/10 blur-3xl pointer-events-none rounded-full" />

          {/* Arena Hands Faceoff */}
          <div className="w-full flex items-center justify-around mb-6 relative">
            {/* Player 1 Hand */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-violet-400 mb-2">
                {mode === 'ai' ? 'You' : 'Player 1'}
              </span>
              <div
                className={`w-24 h-24 rounded-3xl bg-[#181a28] border-2 flex items-center justify-center text-5xl shadow-xl transition-all duration-300 ${
                  roundWinner === 'p1'
                    ? 'border-emerald-400 ring-4 ring-emerald-400/40 scale-110 shadow-emerald-500/40 anim-pop'
                    : 'border-slate-800'
                }`}
              >
                {isCountingDown ? (
                  <span className="animate-bounce">✊</span>
                ) : playerChoice ? (
                  <span className="anim-pop inline-block">
                    {CHOICES.find((c) => c.id === playerChoice)?.emoji}
                  </span>
                ) : (
                  '❓'
                )}
              </div>
              <span className="text-xl font-black text-white mt-2">{scores.p1}</span>
            </div>

            {/* VS or Countdown Badge */}
            <div className="flex flex-col items-center">
              {isCountingDown ? (
                <div className="w-12 h-12 rounded-full bg-violet-600 text-white font-black text-2xl flex items-center justify-center anim-pop ring-4 ring-violet-400">
                  {countdownNum}
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full bg-slate-800/80 text-xs font-black text-slate-400 tracking-wider">
                  VS
                </div>
              )}
            </div>

            {/* Player 2 / AI Hand */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-pink-400 mb-2">
                {mode === 'ai' ? 'AI' : 'Player 2'}
              </span>
              <div
                className={`w-24 h-24 rounded-3xl bg-[#181a28] border-2 flex items-center justify-center text-5xl shadow-xl transition-all duration-300 ${
                  roundWinner === 'p2'
                    ? 'border-emerald-400 ring-4 ring-emerald-400/40 scale-110 shadow-emerald-500/40 anim-pop'
                    : 'border-slate-800'
                }`}
              >
                {isCountingDown ? (
                  <span className="animate-bounce">✊</span>
                ) : p2Choice ? (
                  <span className="anim-pop inline-block">
                    {CHOICES.find((c) => c.id === p2Choice)?.emoji}
                  </span>
                ) : (
                  '❓'
                )}
              </div>
              <span className="text-xl font-black text-white mt-2">{scores.p2}</span>
            </div>
          </div>

          {/* Round message */}
          <div className="text-center min-h-[32px] flex items-center justify-center">
            <p className="text-sm font-semibold text-slate-300">{roundMessage}</p>
          </div>
        </div>

        {/* Choice Buttons */}
        <div className="w-full mt-6">
          {mode === 'pvp' && (
            <div className="text-center text-xs font-bold text-violet-400 mb-2">
              {pvpTurn === 'p1' ? '👉 Player 1: Choose your move' : '👉 Player 2: Choose your move'}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {CHOICES.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectChoice(item.id)}
                disabled={isCountingDown || gameOver}
                className="flex flex-col items-center justify-center bg-[#131522] hover:bg-[#1a1d2e] active:scale-95 border border-slate-800/80 hover:border-violet-500/50 rounded-2xl py-4 transition-all duration-150 disabled:opacity-50"
              >
                <span className="text-4xl mb-1">{item.emoji}</span>
                <span className="text-xs font-bold text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOver}
        title={
          matchWinner === 'p1'
            ? mode === 'ai'
              ? '🎉 Victory!'
              : '🎉 Player 1 Won!'
            : mode === 'ai'
            ? 'AI Won Match!'
            : '🎉 Player 2 Won!'
        }
        score={scores.p1}
        message={`Final: ${scores.p1} vs ${scores.p2}`}
        onRestart={resetMatch}
      />
    </GameLayout>
  );
};
