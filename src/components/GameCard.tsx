import React from 'react';
import { Play, Users, Clock, Trophy } from 'lucide-react';
import type { GameInfo } from '../types';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';
import { getHighScore } from '../lib/storage';

interface GameCardProps {
  game: GameInfo;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const highScore = getHighScore(game.id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    navigate(`/games/${game.id}`);
  };

  return (
    <div
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handlePlay(e as unknown as React.MouseEvent);
        }
      }}
      className={`group relative flex flex-col justify-between arcade-card rounded-2xl p-4 sm:p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
        game.featured ? 'border-violet-500/30' : ''
      }`}
    >
      <div>
        {/* Header Bar: Icon & Playtime metadata */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#181a26] border border-slate-800 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform duration-150">
            <span>{game.icon}</span>
          </div>

          <div className="flex flex-col items-end gap-1">
            {game.comingSoon ? (
              <span className="text-[10px] font-mono-telemetry font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                {game.statusText || 'COMING SOON'}
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {game.estimatedTime && (
                  <span className="text-[10px] font-mono-telemetry text-slate-400 bg-slate-850/80 px-2 py-0.5 rounded border border-slate-800/80 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-violet-400" />
                    {game.estimatedTime}
                  </span>
                )}
              </div>
            )}

            {!game.comingSoon && highScore > 0 && (
              <span className="text-[10px] font-mono-telemetry text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 flex items-center gap-1">
                <Trophy className="w-2.5 h-2.5" />
                Best: {highScore}
              </span>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              {game.name}
            </h3>
            {game.subtitle && (
              <span className="text-[11px] font-mono-telemetry text-amber-400">
                {game.subtitle}
              </span>
            )}
          </div>
          <p className="font-body text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Category, Players & High-contrast CTA */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-mono-telemetry text-slate-400">
          <span className="text-slate-300 font-semibold">{game.category}</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Users className="w-3 h-3 text-slate-500" />
            {game.playerCount}
          </span>
        </div>

        {game.comingSoon ? (
          <span className="px-3 py-1.5 rounded-xl text-xs font-mono-telemetry font-bold bg-slate-800/90 text-amber-400/90 border border-amber-500/20">
            SOON
          </span>
        ) : (
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20 group-hover:shadow-violet-600/40 group-hover:scale-102 active:scale-98 transition-all duration-150 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>PLAY</span>
          </button>
        )}
      </div>
    </div>
  );
};
