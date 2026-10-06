import React from 'react';
import { Play, Users } from 'lucide-react';
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

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
      case 'Casual':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium':
      case 'Adaptive':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Hard':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    }
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
      className="group relative flex flex-col justify-between bg-[#11131c] hover:bg-[#161925] border border-slate-800/80 hover:border-violet-500/40 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    >
      <div>
        {/* Top bar: Icon and Badges */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="w-13 h-13 rounded-2xl bg-[#191c2b] group-hover:bg-[#202438] border border-slate-800 flex items-center justify-center text-3xl shadow-inner transition-colors duration-200">
            <span className="transform group-hover:scale-110 transition-transform duration-200">
              {game.icon}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {game.comingSoon ? (
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                {game.statusText || 'COMING VERY SOON'}
              </span>
            ) : (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getDifficultyColor(
                  game.difficulty
                )}`}
              >
                {game.difficulty}
              </span>
            )}
            {!game.comingSoon && highScore > 0 && (
              <span className="text-[10px] text-amber-300 font-medium bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                Best: {highScore}
              </span>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors mb-1.5 flex items-center justify-between">
          <span>{game.name}</span>
          {game.subtitle && (
            <span className="text-xs font-semibold text-amber-400/90 tracking-wide font-mono">
              {game.subtitle}
            </span>
          )}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {game.description}
        </p>
      </div>

      {/* Card Footer: Metadata and Action button */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="text-slate-300 font-semibold">{game.category}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Users className="w-3 h-3 text-slate-400" />
            {game.playerCount}
          </span>
        </div>

        {game.comingSoon ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-amber-300/90 border border-amber-500/30">
            <span>COMING SOON</span>
          </span>
        ) : (
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 group-hover:bg-violet-500 text-white shadow-md shadow-violet-600/20 group-hover:shadow-violet-600/40 transition-all duration-150"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>PLAY</span>
          </button>
        )}
      </div>
    </div>
  );
};
