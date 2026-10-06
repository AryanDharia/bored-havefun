import React from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { navigate } from '../../lib/router';
import { ArrowLeft, Sparkles, Gamepad2, ShieldAlert } from 'lucide-react';

export const CarRacingPlaceholder: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'car-racing') || {
    id: 'car-racing',
    name: 'Car Racing',
    subtitle: 'Race. Drift. Win.',
    description: 'High-speed 3D Unity racing with realistic drift physics and time trials.',
    icon: '🏎️',
    category: 'Arcade',
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    comingSoon: true,
    statusText: 'COMING VERY SOON',
    howToPlay: ['Controls will unlock once the Unity WebGL build is compiled and loaded.'],
    controls: [{ key: 'WASD / Arrow Keys', action: 'Steer and Accelerate' }],
    tags: ['racing', 'unity', '3d'],
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={() => {}}
      headerControls={
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Games</span>
        </button>
      }
    >
      <div className="w-full max-w-2xl flex flex-col items-center select-none text-center px-4 py-8">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black tracking-wider uppercase mb-5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>COMING VERY SOON</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
          Car Racing
        </h1>
        <p className="text-lg font-bold text-amber-400 font-mono tracking-wide mb-6">
          Race. Drift. Win.
        </p>

        {/* Staging Canvas Mockup / Container ready for future Unity WebGL build */}
        <div className="w-full aspect-[16/9] max-w-xl bg-gradient-to-b from-[#131627] to-[#0a0c16] rounded-3xl border-2 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 mb-8">
          <div className="w-20 h-20 rounded-3xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-4xl mb-4 shadow-inner">
            🏎️
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Unity WebGL Engine Pipeline Ready
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            The integration container is set up to mount the Unity WebGL build (<code className="text-violet-300 font-mono text-[11px]">Build/*.loader.js</code>, WebAssembly runtime, fullscreen canvas, and input listeners) as soon as files are provided.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-violet-400" />
              Desktop & Gamepad Ready
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Build Files Pending
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Available Games</span>
        </button>
      </div>
    </GameLayout>
  );
};
