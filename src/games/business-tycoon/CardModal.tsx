import React from 'react';
import type { Card } from './types';
import { Sparkles, Gift, ArrowRight } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface CardModalProps {
  card: Card | null;
  onDismiss: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, onDismiss }) => {
  if (!card) return null;
  const isChance = card.type === 'chance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-sm rounded-3xl p-6 text-center select-none shadow-2xl relative border-2 transition-all transform animate-pop ${
          isChance
            ? 'bg-gradient-to-b from-rose-950 via-slate-900 to-[#0e1017] border-rose-500/50 shadow-rose-950/60'
            : 'bg-gradient-to-b from-blue-950 via-slate-900 to-[#0e1017] border-blue-500/50 shadow-blue-950/60'
        }`}
      >
        {/* Glow halo */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner border border-white/20 bg-white/10">
          {isChance ? '❓' : '🎁'}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest mb-2 border bg-white/5 border-white/10 text-white">
          {isChance ? <Sparkles className="w-3 h-3 text-rose-400" /> : <Gift className="w-3 h-3 text-blue-400" />}
          <span>{isChance ? 'CHANCE CARD' : 'COMMUNITY CHEST'}</span>
        </div>

        <h3 className="text-xl font-black font-display text-white mb-2 tracking-tight">
          {card.title}
        </h3>

        <p className="text-sm font-body text-slate-300 leading-relaxed mb-6 px-2">
          {card.description}
        </p>

        {card.amount !== undefined && (
          <div className="mb-6 py-2 px-4 rounded-xl bg-white/[0.04] border border-white/10 inline-block font-mono font-black text-lg">
            {card.amount > 0 ? (
              <span className="text-emerald-400">+₹{card.amount}</span>
            ) : (
              <span className="text-rose-400">-₹{Math.abs(card.amount)}</span>
            )}
          </div>
        )}

        <button
          onClick={() => {
            sounds.playClick();
            onDismiss();
          }}
          className={`w-full py-3 rounded-xl font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            isChance
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
              : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/30'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
