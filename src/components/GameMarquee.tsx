import React from 'react';
import type { GameInfo } from '../types';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';
import { ArrowRight, Zap, Flame, ShieldCheck, Users, type LucideIcon } from 'lucide-react';

interface GameMarqueeProps {
  dailyGame: GameInfo;
  dateStr: string;
}

type TickerItem =
  | { type: 'daily'; title: string; subtitle: string; id: string }
  | { type: 'stat'; label: string; desc: string; icon: LucideIcon };

export const GameMarquee: React.FC<GameMarqueeProps> = ({ dailyGame, dateStr }) => {
  const handlePlayDaily = () => {
    sounds.playClick();
    navigate(`/games/${dailyGame.id}`);
  };

  const tickerItems: TickerItem[] = [
    { type: 'daily', title: `GAME OF THE DAY: ${dailyGame.name}`, subtitle: dateStr, id: dailyGame.id },
    { type: 'stat', label: 'ZERO INSTALLS', desc: 'INSTANT BROWSER PLAY', icon: Zap },
    { type: 'stat', label: 'ZERO ADS', desc: 'NO INTERSTITIALS', icon: Flame },
    { type: 'stat', label: 'MULTIPLAYER', desc: 'WEBRTC CLOUD ROOMS', icon: Users },
    { type: 'stat', label: 'CLIENT-SIDE', desc: 'PRIVACY FIRST', icon: ShieldCheck },
  ];

  return (
    <div className="w-full overflow-hidden border-y border-white/5 bg-black/60 backdrop-blur-md py-2.5 relative select-none">
      <div className="flex items-center gap-8 animate-marquee whitespace-nowrap will-change-transform">
        {/* Repeating sequence twice for seamless loop */}
        {[0, 1].map((copyIdx) => (
          <div key={copyIdx} className="flex items-center gap-8 shrink-0">
            {tickerItems.map((item, idx) => (
              <React.Fragment key={`${copyIdx}-${idx}`}>
                {item.type === 'daily' ? (
                  <div
                    onClick={handlePlayDaily}
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 cursor-pointer transition-colors group"
                  >
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-[11px] font-mono tracking-wider font-bold">
                      [TODAY'S PICK]
                    </span>
                    <span className="text-base leading-none">{dailyGame.icon}</span>
                    <span className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                      {dailyGame.name}
                    </span>
                    <span className="text-[10px] font-mono text-orange-300/70 hidden sm:inline">
                      • {item.subtitle}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-400 group-hover:translate-x-0.5 transition-transform">
                      PLAY <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-400">
                    <item.icon className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-slate-700">//</span>
                    <span className="text-slate-200 font-bold tracking-wider">{item.label}</span>
                    <span className="text-[10px] text-slate-400 tracking-wide">{item.desc}</span>
                  </div>
                )}
                <span className="text-slate-800 font-mono text-xs">◆</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 32s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
