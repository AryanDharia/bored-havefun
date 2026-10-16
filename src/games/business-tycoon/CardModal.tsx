import React, { useState, useEffect } from 'react';
import type { Card } from './types';
import { Sparkles, Gift, ArrowRight, DollarSign, MapPin, ShieldAlert, Award } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface CardModalProps {
  card: Card | null;
  onDismiss: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, onDismiss }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!card) {
      setIsFlipped(false);
      return;
    }
    // Respect reduced motion settings
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setIsFlipped(true);
    } else {
      setIsFlipped(false);
      const timer = setTimeout(() => {
        setIsFlipped(true);
        sounds.playScore();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [card]);

  if (!card) return null;
  const isChance = card.type === 'chance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm [perspective:1200px]">
        <div
          onClick={() => {
            if (!isFlipped) {
              setIsFlipped(true);
              sounds.playScore();
            }
          }}
          className={`relative w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
          }`}
        >
          {/* ================= CARD BACK ================= */}
          <div
            className={`w-full rounded-3xl p-8 text-center border-2 shadow-2xl [backface-visibility:hidden] flex flex-col items-center justify-center min-h-[360px] cursor-pointer ${
              isChance
                ? 'bg-gradient-to-br from-rose-950 via-[#1e1022] to-slate-950 border-rose-500/60 shadow-rose-950/60'
                : 'bg-gradient-to-br from-blue-950 via-[#0e192c] to-slate-950 border-blue-500/60 shadow-blue-950/60'
            }`}
          >
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-inner border border-white/20 bg-white/10 animate-pulse">
              {isChance ? '❓' : '🎁'}
            </div>
            <h2 className="text-xl font-black font-display text-white tracking-widest uppercase mb-1">
              {isChance ? 'CHANCE' : 'COMMUNITY CHEST'}
            </h2>
            <p className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">
              Tap to Reveal Fortune
            </p>
          </div>

          {/* ================= CARD FRONT ================= */}
          <div
            className={`absolute inset-0 w-full rounded-3xl p-6 text-center border-2 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between ${
              isChance
                ? 'bg-gradient-to-b from-rose-950/95 via-slate-900 to-[#0e1017] border-rose-500/70 shadow-rose-900/50'
                : 'bg-gradient-to-b from-blue-950/95 via-slate-900 to-[#0e1017] border-blue-500/70 shadow-blue-900/50'
            }`}
          >
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest mb-3 border bg-white/5 border-white/10 text-white">
                {isChance ? <Sparkles className="w-3.5 h-3.5 text-rose-400" /> : <Gift className="w-3.5 h-3.5 text-blue-400" />}
                <span>{isChance ? 'CHANCE CARD' : 'COMMUNITY CHEST'}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-black font-display text-white mb-2 tracking-tight">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm font-body text-slate-300 leading-relaxed mb-4 px-2">
                {card.description}
              </p>

              {/* Effect Pill */}
              <div className="mb-4">
                {card.amount !== undefined && (
                  <div
                    className={`py-2 px-4 rounded-xl border font-mono font-black text-lg inline-flex items-center gap-1.5 ${
                      card.amount > 0
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-950/50'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-400 shadow-md shadow-rose-950/50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{card.amount > 0 ? `+₹${card.amount}` : `-₹${Math.abs(card.amount)}`}</span>
                  </div>
                )}
                {card.moveTo !== undefined && (
                  <div className="py-2 px-4 rounded-xl border border-amber-500/40 bg-amber-950/60 text-amber-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Advance to Board Space #{card.moveTo}</span>
                  </div>
                )}
                {card.nearestStation && (
                  <div className="py-2 px-4 rounded-xl border border-blue-500/40 bg-blue-950/60 text-blue-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Travel to Nearest Railway Junction</span>
                  </div>
                )}
                {card.sendToJail && (
                  <div className="py-2 px-4 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Go Directly to Jail</span>
                  </div>
                )}
                {card.getOutOfJail && (
                  <div className="py-2 px-4 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Get Out of Jail Free (Saved to Inventory)</span>
                  </div>
                )}
                {card.collectFromAll && (
                  <div className="py-2 px-4 rounded-xl border border-amber-500/40 bg-amber-950/60 text-amber-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Collect ₹{card.collectFromAll} From Every Player</span>
                  </div>
                )}
                {(card.repairHouseFee || card.repairHotelFee) && (
                  <div className="py-2 px-4 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-300 font-mono font-bold text-xs inline-flex items-center gap-1.5">
                    <span>Pay ₹{card.repairHouseFee}/House & ₹{card.repairHotelFee}/Hotel</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                sounds.playClick();
                onDismiss();
              }}
              className={`w-full py-3 rounded-2xl font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isChance
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 active:scale-98'
                  : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/30 active:scale-98'
              }`}
            >
              <span>Apply & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
