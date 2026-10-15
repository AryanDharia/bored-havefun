import { Dices, Play, Zap, ShieldCheck, Flame, Users } from 'lucide-react';
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-slate-300 font-mono text-[11px] mb-5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
          <span className="text-orange-400 font-bold uppercase tracking-widest">ARCADE OS // V2.4</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 tracking-wider">ZERO LATENCY • NO LOGIN REQUIRED</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
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
      </div>
    </section>
  );
};
