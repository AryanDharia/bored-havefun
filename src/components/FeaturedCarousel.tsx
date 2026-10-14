import React, { useState, useEffect, useRef } from 'react';
import type { GameInfo } from '../types';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ExternalLink
} from 'lucide-react';

interface FeaturedCarouselProps {
  featuredGames: GameInfo[];
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ featuredGames }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = featuredGames.length;
  const currentGame = featuredGames[currentIndex] || featuredGames[0];

  // Auto-advance every 6.5s unless hovered
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, total]);

  const handlePrev = () => {
    sounds.playClick();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    sounds.playClick();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handleSelect = (idx: number) => {
    sounds.playClick();
    setCurrentIndex(idx);
  };

  const handlePlay = (id: string) => {
    sounds.playClick();
    navigate(`/games/${id}`);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  if (total === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-sm font-mono tracking-wider font-bold uppercase text-slate-300">
            FEATURED ARCADES // SPOTLIGHT [0{currentIndex + 1}/0{total}]
          </h2>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Previous game"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Next game"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Showcase Banner (Steam / Industrial Style) */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#161922] to-[#0c0d12] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Subtle dot matrix pattern overlay */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Diagonal industrial slash accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
          {/* Left: Game Overview & Details */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30 uppercase">
                  {currentGame.category}
                </span>
                <span className="px-2.5 py-1 rounded font-mono text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" />
                  {currentGame.playerCount}
                </span>
                {currentGame.estimatedTime && (
                  <span className="px-2.5 py-1 rounded font-mono text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {currentGame.estimatedTime}
                  </span>
                )}
                {currentGame.difficulty && (
                  <span className="px-2.5 py-1 rounded font-mono text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    {currentGame.difficulty}
                  </span>
                )}
              </div>

              {/* Title & Tagline */}
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
                <span>{currentGame.icon}</span>
                <span>{currentGame.name}</span>
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mb-4 line-clamp-2 sm:line-clamp-3">
                {currentGame.description}
              </p>

              {/* How to play bullets */}
              {currentGame.howToPlay && currentGame.howToPlay.length > 0 && (
                <div className="hidden sm:flex flex-col gap-1.5 mb-6 text-xs text-slate-400 border-l-2 border-orange-500/40 pl-3">
                  {currentGame.howToPlay.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-orange-500 font-mono text-[10px]">0{i + 1}</span>
                      <span className="line-clamp-1">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Launch CTA Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => handlePlay(currentGame.id)}
                className="px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm tracking-wide uppercase transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Play {currentGame.name} Now
              </button>

              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Instant Launch • Zero Installs
              </span>
            </div>
          </div>

          {/* Right: Steam-Style Visual Stage & Thumbnail Selector */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            {/* Big Stage Visual Card */}
            <div
              onClick={() => handlePlay(currentGame.id)}
              className="w-full aspect-video rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/15 p-6 flex flex-col items-center justify-center text-center shadow-2xl relative group cursor-pointer hover:border-orange-500/50 transition-all overflow-hidden"
            >
              {/* Glow backdrop */}
              <div className="absolute inset-0 bg-radial-gradient from-orange-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />

              <span className="text-6xl sm:text-7xl mb-3 transform group-hover:scale-110 transition-transform duration-200 drop-shadow-xl">
                {currentGame.icon}
              </span>
              <div className="font-mono text-xs uppercase tracking-widest text-orange-400 font-bold mb-1">
                {currentGame.name}
              </div>
              <span className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                {currentGame.tags?.join(' • ')}
              </span>

              {/* Hover overlay hint */}
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-white/70 bg-black/60 px-2 py-1 rounded backdrop-blur border border-white/10 flex items-center gap-1 group-hover:text-orange-300">
                <span>LAUNCH GAME</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>

            {/* Thumbnail Strip (Steam style) */}
            <div className="grid grid-cols-4 gap-2 w-full mt-3">
              {featuredGames.slice(0, 4).map((game, idx) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer flex flex-col items-center justify-center ${
                    idx === currentIndex
                      ? 'bg-orange-500/15 border-orange-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{game.icon}</span>
                  <span className="text-[10px] font-mono font-bold truncate max-w-full mt-1">
                    {game.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Carousel Progress Dots */}
        <div className="flex items-center justify-center gap-2 pb-4">
          {featuredGames.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-orange-500' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
