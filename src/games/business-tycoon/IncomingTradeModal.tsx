import React from 'react';
import type { IncomingTradeOffer, Player } from './types';
import { TILES, COLOR_GROUPS } from './boardData';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface IncomingTradeModalProps {
  isOpen: boolean;
  offer: IncomingTradeOffer | null;
  players: Player[];
  onAccept: () => void;
  onReject: () => void;
  onCounteroffer: () => void;
}

export const IncomingTradeModal: React.FC<IncomingTradeModalProps> = ({
  isOpen,
  offer,
  players,
  onAccept,
  onReject,
  onCounteroffer
}) => {
  if (!isOpen || !offer) return null;

  const aiPlayer = players.find((p) => p.id === offer.fromAiPlayerId);
  const humanPlayer = players.find((p) => p.id === offer.targetPlayerId);
  if (!aiPlayer || !humanPlayer) return null;

  const offeredTiles = TILES.filter((t) => offer.offeredPropertyIds.includes(t.id));
  const requestedTiles = TILES.filter((t) => offer.requestedPropertyIds.includes(t.id));

  // Compute total value received by human vs value given away
  const offeredValue =
    offer.offeredCash + offeredTiles.reduce((sum, t) => sum + (t.cost || 0), 0);
  const requestedValue =
    offer.requestedCash + requestedTiles.reduce((sum, t) => sum + (t.cost || 0), 0);
  const valueDelta = offeredValue - requestedValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c0e18]/95 border-2 border-indigo-500/40 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md border border-white/20 shrink-0"
              style={{ backgroundColor: aiPlayer.colorHex }}
            >
              {aiPlayer.tokenEmoji}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                Incoming Trade Proposal
              </span>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {aiPlayer.name} wants to make a deal!
              </h2>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/30 uppercase">
            {aiPlayer.personality || 'Balanced'} AI
          </div>
        </div>

        {/* AI's Strategic Reason */}
        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
          <span className="font-bold text-white block mb-0.5">💬 Message from {aiPlayer.name}:</span>
          <p className="italic">"{offer.strategicReason}"</p>
        </div>

        {/* Trade Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* What AI is offering you */}
          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase font-mono">
                You Will Receive
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-300">
                Est. ₹{offeredValue}
              </span>
            </div>

            {offer.offeredCash > 0 && (
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-300">Cash Transfer:</span>
                <span className="font-bold text-emerald-400">+₹{offer.offeredCash}</span>
              </div>
            )}

            {offeredTiles.length > 0 ? (
              <div className="space-y-1.5">
                {offeredTiles.map((tile) => {
                  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;
                  return (
                    <div
                      key={tile.id}
                      className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-1 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {groupInfo && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: groupInfo.hex }}
                          />
                        )}
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {tile.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 shrink-0">
                        ₹{tile.cost}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              offer.offeredCash === 0 && (
                <span className="text-[11px] text-slate-500 italic">No properties offered</span>
              )
            )}
          </div>

          {/* What AI is asking from you */}
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-1.5">
              <span className="text-xs font-bold text-rose-400 uppercase font-mono">
                You Will Give
              </span>
              <span className="text-[11px] font-mono font-bold text-rose-300">
                Est. ₹{requestedValue}
              </span>
            </div>

            {offer.requestedCash > 0 && (
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-300">Cash Transfer:</span>
                <span className="font-bold text-rose-400">-₹{offer.requestedCash}</span>
              </div>
            )}

            {requestedTiles.length > 0 ? (
              <div className="space-y-1.5">
                {requestedTiles.map((tile) => {
                  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;
                  return (
                    <div
                      key={tile.id}
                      className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-1 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {groupInfo && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: groupInfo.hex }}
                          />
                        )}
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {tile.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 shrink-0">
                        ₹{tile.cost}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              offer.requestedCash === 0 && (
                <span className="text-[11px] text-slate-500 italic">No properties requested</span>
              )
            )}
          </div>
        </div>

        {/* Valuation & Fairness Banner */}
        <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Net Valuation Difference:</span>
          <span
            className={`font-bold ${
              valueDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {valueDelta >= 0 ? `+₹${valueDelta} (In Your Favor)` : `-₹${Math.abs(valueDelta)} (In AI Favor)`}
          </span>
        </div>

        {/* Action Buttons: Accept / Counteroffer / Reject */}
        <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2">
          {/* Reject */}
          <button
            onClick={() => {
              sounds.playClick();
              onReject();
            }}
            className="py-2.5 px-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono font-bold text-xs uppercase border border-rose-500/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Decline</span>
          </button>

          {/* Counteroffer */}
          <button
            onClick={() => {
              sounds.playClick();
              onCounteroffer();
            }}
            className="py-2.5 px-3 rounded-2xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-mono font-bold text-xs uppercase border border-amber-500/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Counter</span>
          </button>

          {/* Accept */}
          <button
            onClick={() => {
              sounds.playScore();
              onAccept();
            }}
            className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase shadow-md shadow-emerald-950/40 transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-98"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
