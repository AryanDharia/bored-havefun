import React from 'react';
import { Dices, Play, Zap, ShieldCheck, Flame, Users, Sparkles } from 'lucide-react';
import { GAMES } from '../lib/gamesRegistry';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

interface HeroProps {
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick }) => {
  const handleRandomPlay = () => {
    sounds.playClick();
    const playableGames = GAMES.filter((g) => !g.comingSoon);
    const randomIndex = Math.floor(Math.random() * playableGames.length);
    const chosen = playableGames[randomIndex];
    navigate(`/games/${chosen.id}`);
  };

  const handleQuickPlay = (gameId: string) => {
    sounds.playClick();
    navigate(`/games/${gameId}`);
  };

  // Top 3 spotlight games for instant 1-click launch above the fold
  const spotlightGames = [
    {
      id: 'snake',
      name: 'Snake',
      tag: '60s Reflex',
      time: '2 MIN',
      icon: '🐍',
      desc: 'Wrap-around classic arcade',
      accent: 'border-emerald-500/40 hover:border-emerald-400 group-hover:text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    },
    {
      id: '2048',
      name: '2048',
      tag: 'Brain Reset',
      time: '3 MIN',
      icon: '🔢',
      desc: 'Hypnotic sliding tile merge',
      accent: 'border-amber-500/40 hover:border-amber-400 group-hover:text-amber-400',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    {
      id: 'ludo',
      name: 'Ludo',
      tag: 'Pass & Play',
      time: '5 MIN',
      icon: '🎯',
      desc: '4-token race with smart bots',
      accent: 'border-rose-500/40 hover:border-rose-400 group-hover:text-rose-400',
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    }
  ];

  return (
    <section className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 text-center arcade-grid-bg border-b border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Monospace Architectural Eyebrow */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 border border-slate-700/70 dark:border-slate-700/70 light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-700 font-mono-telemetry text-xs mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold uppercase tracking-wider">LIVE ARCADE</span>
          <span className="text-slate-600 dark:text-slate-600 light:text-slate-400">•</span>
          <span className="text-slate-300 dark:text-slate-300 light:text-slate-600 tracking-wide">ZERO INSTALLS • ZERO ACCOUNTS</span>
        </div>

        {/* Hero Dominant Headline */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white dark:text-white light:text-slate-900 mb-4 leading-[1.08]">
          Bored?{' '}
          <span className="text-violet-400 dark:text-violet-400 light:text-violet-600">
            Play something.
          </span>
        </h1>

        {/* Clear First 5-Second Explanation: What it is & Who it is for */}
        <p className="font-body text-base sm:text-lg md:text-xl text-slate-300 dark:text-slate-300 light:text-slate-600 max-w-2xl mx-auto mb-6 font-normal leading-relaxed">
          Instant, friction-free browser games built for quick 2-to-5 minute mental resets between meetings, code builds, and study sessions.
        </p>

        {/* Value Proposition Bar: Why It Matters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8 text-xs font-mono-telemetry text-slate-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850/80 dark:bg-slate-850/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-400 light:text-amber-500" />
            0.0s Launch
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850/80 dark:bg-slate-850/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" />
            No Signups
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850/80 dark:bg-slate-850/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-rose-400 dark:text-rose-400 light:text-rose-600" />
            No Video Ads
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-850/80 dark:bg-slate-850/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 shadow-sm">
            <Users className="w-3.5 h-3.5 text-violet-400 dark:text-violet-400 light:text-violet-600" />
            Solo & Multiplayer
          </span>
        </div>

        {/* Primary Call to Actions: Clear Next Step */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-10">
          <button
            onClick={() => {
              sounds.playClick();
              onExploreClick();
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 !text-white font-display font-bold text-base shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span className="!text-white font-bold">Browse {GAMES.length} Games</span>
          </button>

          <button
            onClick={handleRandomPlay}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 light:bg-white hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-white dark:hover:text-white light:hover:text-slate-900 font-display font-semibold text-base shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            title="Launch a random game immediately [Press R]"
          >
            <Dices className="w-4 h-4 text-violet-400 dark:text-violet-400 light:text-violet-600" />
            <span className="light:text-slate-800 font-semibold">Surprise Game</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono-telemetry bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded text-slate-400 dark:text-slate-400 light:text-slate-700">R</kbd>
          </button>
        </div>

        {/* Above-The-Fold Instant Launch Deck: What to do next right away */}
        <div className="pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-3 px-1 text-left">
            <span className="text-xs font-mono-telemetry uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Instant Break Picks — 1-Click Launch:
            </span>
            <span className="text-[11px] font-mono-telemetry text-slate-500 hidden sm:inline">
              READY IN BROWSER
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {spotlightGames.map((item) => (
              <div
                key={item.id}
                onClick={() => handleQuickPlay(item.id)}
                className={`group relative text-left p-3.5 rounded-xl bg-[#11131c] hover:bg-[#161925] border transition-all duration-150 cursor-pointer flex flex-col justify-between ${item.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[10px] font-mono-telemetry font-bold px-2 py-0.5 rounded border ${item.badge}`}>
                      {item.time}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-base group-hover:text-violet-300 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono-telemetry text-slate-400">
                    {item.tag}
                  </span>
                  <span className="text-xs font-bold text-violet-400 dark:text-violet-400 light:text-violet-600 flex items-center gap-1">
                    Play <Play className="w-2.5 h-2.5 fill-current" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
