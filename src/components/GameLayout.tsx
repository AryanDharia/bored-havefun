import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, HelpCircle, Trophy, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { GameInfo } from '../types';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';
import { getHighScore } from '../lib/storage';
import { ThemeToggle } from './ThemeToggle';

interface GameLayoutProps {
  game: GameInfo;
  score?: number;
  streak?: number;
  onRestart?: () => void;
  headerControls?: React.ReactNode;
  children: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  game,
  score,
  streak,
  onRestart,
  headerControls,
  children,
}) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [soundActive, setSoundActive] = useState(() => sounds.isEnabled());
  const highScore = getHighScore(game.id);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundActive(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#090a0f]/90 border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            onClick={() => {
              sounds.playClick();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs sm:text-sm font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Games</span>
          </button>

          {/* Game Title info */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{game.icon}</span>
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                {game.name}
              </h1>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {game.category} • {game.playerCount}
              </span>
            </div>
          </div>

          {/* Action buttons (Theme, Sound, Help, Restart) */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/60 transition-all"
              title={soundActive ? 'Mute' : 'Unmute'}
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setShowHowToPlay(!showHowToPlay);
              }}
              className={`p-2 rounded-xl border border-slate-800/60 transition-all ${
                showHowToPlay ? 'bg-violet-600/30 text-violet-300 border-violet-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="How to play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {onRestart && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onRestart();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/25 transition-all"
                title="Restart Game"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-start">
        {/* Score & Controls Bar */}
        {(score !== undefined || headerControls) && (
          <div className="w-full max-w-xl flex items-center justify-between bg-[#12141f] border border-slate-800/80 rounded-2xl px-4 py-2.5 mb-4 shadow-sm">
            <div className="flex items-center gap-4">
              {score !== undefined && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Score</span>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
              )}
              {highScore > 0 && (
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" /> Best
                  </span>
                  <div className="text-xl font-bold text-amber-300">{highScore}</div>
                </div>
              )}
              {streak !== undefined && streak > 1 && (
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Streak
                  </span>
                  <div className="text-xl font-bold text-violet-300">{streak}x</div>
                </div>
              )}
            </div>

            {headerControls && <div>{headerControls}</div>}
          </div>
        )}

        {/* How to Play accordion / drawer */}
        {showHowToPlay && (
          <div className="w-full max-w-xl bg-[#141726] border border-violet-500/30 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg animate-fadeIn text-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span>📖 How to Play</span>
                <span className="text-violet-400">{game.name}</span>
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-xs sm:text-sm">
              {game.howToPlay.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            {game.controls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Controls</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs">
                  {game.controls.map((ctrl, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#191c2c] px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <code className="text-violet-300 font-bold">{ctrl.key}</code>
                      <span className="text-slate-400">{ctrl.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center Game Arena */}
        <div className="w-full flex flex-col items-center justify-center flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
