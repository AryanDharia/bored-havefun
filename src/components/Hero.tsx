import React from 'react';
import { Dices, Sparkles, Zap } from 'lucide-react';
import { GAMES } from '../lib/gamesRegistry';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

interface HeroProps {
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick }) => {
  const handleRandomPlay = () => {
    sounds.playClick();
    const randomIndex = Math.floor(Math.random() * GAMES.length);
    const chosen = GAMES[randomIndex];
    navigate(`/games/${chosen.id}`);
  };

  return (
    <section className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 text-center">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-gradient-to-tr from-violet-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs sm:text-sm font-medium mb-6 shadow-sm backdrop-blur-sm animate-pulse-slow">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Quick games for quick breaks</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-4 leading-[1.1]">
          Bored?{' '}
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Play something.
          </span>
        </h1>

        {/* Supporting text */}
        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          A collection of quick, fun games to kill a few minutes. Instant play directly in your browser — zero installs, zero friction.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
          <button
            onClick={() => {
              sounds.playClick();
              onExploreClick();
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-600/45 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>Explore Games</span>
          </button>

          <button
            onClick={handleRandomPlay}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-violet-500/50 text-slate-200 hover:text-white font-semibold text-base shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 backdrop-blur-sm"
          >
            <Dices className="w-5 h-5 text-violet-400" />
            <span>Play Something Random</span>
          </button>
        </div>

        {/* Quick Highlights / Trust Bar */}
        <div className="mt-10 pt-8 border-t border-slate-800/60 grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl font-bold text-white">20+</span>
            <span className="text-xs text-slate-400">Playable Games</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl font-bold text-emerald-400">0 sec</span>
            <span className="text-xs text-slate-400">No Downloads</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl font-bold text-violet-400">100%</span>
            <span className="text-xs text-slate-400">Free to Play</span>
          </div>
        </div>
      </div>
    </section>
  );
};
