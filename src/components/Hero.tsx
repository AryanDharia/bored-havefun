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
      id: 'ludo',
      name: 'Ludo King',
      tag: 'Rooms & 3D Dice',
      time: '5 MIN',
      icon: '👑',
      desc: 'Classic 15x15 board with WebRTC rooms & avatars',
      accent: 'border-orange-500/40 hover:border-orange-400 group-hover:text-orange-400',
      badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    },
    {
      id: 'retro-racing',
      name: 'Retro Racing',
      tag: 'Highway Sprint',
      time: '3 MIN',
      icon: '🏎️',
      desc: 'Traffic Rider style 3D perspective racing',
      accent: 'border-amber-500/40 hover:border-amber-400 group-hover:text-amber-400',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    {
      id: 'scribble',
      name: 'Scribble',
      tag: 'Online Party',
      time: '4 MIN',
      icon: '🎨',
      desc: 'Multiplayer drawing & guessing with rooms',
      accent: 'border-emerald-500/40 hover:border-emerald-400 group-hover:text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    }
  ];

  return (
    <section className="relative overflow-hidden pt-8 pb-10 sm:pt-12 sm:pb-14 text-center">
      {/* Nothing OS / CMF Industrial Telemetry Grid Backdrop */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Monospace Architectural Eyebrow (Nothing OS style) */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] dark:bg-black/40 border border-white/10 text-slate-300 font-mono text-[11px] mb-5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
          <span className="text-orange-400 font-bold uppercase tracking-widest">ARCADE OS // V2.4</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 tracking-wider">ZERO LATENCY • NO ACCOUNTS</span>
        </div>

        {/* Hero Headline */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-3 leading-[1.06]">
          Bored?{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
            Play something.
          </span>
        </h1>

        {/* First 5-Second Explanation */}
        <p className="font-body text-sm sm:text-base md:text-lg text-slate-400 max-w-xl mx-auto mb-6 leading-relaxed">
          Frictionless, pure client-side arcade games engineered for quick 2-to-5 minute mental resets. No downloads, no paywalls.
        </p>

        {/* Value Proposition Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            0.0s Launch
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            No Signups
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            No Video Ads
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Cross-Device Rooms
          </span>
        </div>

        {/* Primary Call to Actions: Apple Liquid Glass & High Contrast */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-10">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onExploreClick();
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm tracking-wide uppercase shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Browse {GAMES.length} Games</span>
          </button>

          <button
            type="button"
            onClick={handleRandomPlay}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl backdrop-blur-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 text-white font-mono text-xs tracking-wider uppercase shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            title="Launch a random game immediately [Press R]"
          >
            <Dices className="w-4 h-4 text-orange-400" />
            <span>Surprise Game</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-black/40 border border-white/20 rounded text-orange-300 font-bold">
              R
            </kbd>
          </button>
        </div>

        {/* Quick Launch Cards Deck */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-3 px-1 text-left">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Instant Launch Picks:
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-semibold hidden sm:inline">
              CLICK TO START
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {spotlightGames.map((item) => (
              <div
                key={item.id}
                onClick={() => handleQuickPlay(item.id)}
                className={`group relative text-left p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-sm ${item.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${item.badge}`}>
                      {item.time}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-white text-base group-hover:text-orange-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {item.tag}
                  </span>
                  <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
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
