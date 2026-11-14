import React, { useState, useEffect } from 'react';
import { TILES, COLOR_GROUPS } from './boardData';
import { evaluateAiTradeOffer } from './businessLogic';
import type { Player, PropertyState } from './types';
import { X, ArrowLeftRight, Check, Coins, ShieldAlert } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlayer: Player;
  players: Player[];
  properties: Record<number, PropertyState>;
  onExecuteTrade: (trade: {
    fromPlayerId: number;
    toPlayerId: number;
    offeredPropertyIds: number[];
    requestedPropertyIds: number[];
    offeredCash: number;
    requestedCash: number;
  }) => { success: boolean; message: string };
  initialTargetPlayerId?: number | null;
  initialRequestedPropertyId?: number | null;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  activePlayer,
  players,
  properties,
  onExecuteTrade,
  initialTargetPlayerId,
  initialRequestedPropertyId
}) => {
  const otherPlayers = players.filter((p) => p.id !== activePlayer.id && !p.bankrupt);

  const [selectedTargetId, setSelectedTargetId] = useState<number>(
    initialTargetPlayerId ?? (otherPlayers[0]?.id || 0)
  );
  const [offeredPropertyIds, setOfferedPropertyIds] = useState<number[]>([]);
  const [requestedPropertyIds, setRequestedPropertyIds] = useState<number[]>([]);
  const [offeredCash, setOfferedCash] = useState<number>(0);
  const [requestedCash, setRequestedCash] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'info' | 'success'; message: string } | null>(null);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      if (initialTargetPlayerId !== undefined && initialTargetPlayerId !== null) {
        setSelectedTargetId(initialTargetPlayerId);
      } else if (otherPlayers[0]) {
        setSelectedTargetId(otherPlayers[0].id);
      }
      if (initialRequestedPropertyId !== undefined && initialRequestedPropertyId !== null) {
        setRequestedPropertyIds([initialRequestedPropertyId]);
      } else {
        setRequestedPropertyIds([]);
      }
      setOfferedPropertyIds([]);
      setOfferedCash(0);
      setRequestedCash(0);
      setFeedback(null);
    }
  }, [isOpen, initialTargetPlayerId, initialRequestedPropertyId]);

  if (!isOpen) return null;

  const targetPlayer = players.find((p) => p.id === selectedTargetId) || otherPlayers[0];
  if (!targetPlayer) return null;

  // Active player owned properties (only un-improved or all buildings sold)
  const myProperties = TILES.filter((t) => {
    const ps = properties[t.id];
    return ps && ps.ownerId === activePlayer.id;
  });

  // Target player owned properties
  const theirProperties = TILES.filter((t) => {
    const ps = properties[t.id];
    return ps && ps.ownerId === targetPlayer.id;
  });

  const toggleOfferedProperty = (id: number) => {
    sounds.playClick();
    const ps = properties[id];
    if (ps && ps.houses > 0) {
      setFeedback({
        type: 'error',
        message: 'Properties with buildings cannot be traded. Sell houses first.'
      });
      return;
    }
    setFeedback(null);
    setOfferedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleRequestedProperty = (id: number) => {
    sounds.playClick();
    const ps = properties[id];
    if (ps && ps.houses > 0) {
      setFeedback({
        type: 'error',
        message: 'Properties with buildings cannot be traded. Rival must sell houses first.'
      });
      return;
    }
    setFeedback(null);
    setRequestedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Values calculation
  const totalOfferedValue =
    offeredCash +
    offeredPropertyIds.reduce((sum, id) => sum + (TILES.find((t) => t.id === id)?.cost || 0), 0);
  const totalRequestedValue =
    requestedCash +
    requestedPropertyIds.reduce((sum, id) => sum + (TILES.find((t) => t.id === id)?.cost || 0), 0);

  const handleSubmitTrade = () => {
    // Basic validation
    if (
      offeredPropertyIds.length === 0 &&
      requestedPropertyIds.length === 0 &&
      offeredCash === 0 &&
      requestedCash === 0
    ) {
      setFeedback({ type: 'error', message: 'You must offer or request at least one property or cash amount.' });
      return;
    }

    if (offeredCash > activePlayer.money) {
      setFeedback({ type: 'error', message: `You only have ₹${activePlayer.money} in cash.` });
      return;
    }

    if (requestedCash > targetPlayer.money) {
      setFeedback({
        type: 'error',
        message: `${targetPlayer.name} only has ₹${targetPlayer.money} in cash.`
      });
      return;
    }

    // AI Evaluation
    if (targetPlayer.isAi) {
      const evaluation = evaluateAiTradeOffer(
        activePlayer,
        targetPlayer,
        offeredPropertyIds,
        requestedPropertyIds,
        offeredCash,
        requestedCash,
        properties
      );

      if (!evaluation.accept) {
        sounds.playHit();
        setFeedback({
          type: 'error',
          message: `${targetPlayer.name} declined: "${evaluation.reason}"`
        });
        return;
      }
    }

    // Execute trade atomically
    const result = onExecuteTrade({
      fromPlayerId: activePlayer.id,
      toPlayerId: targetPlayer.id,
      offeredPropertyIds,
      requestedPropertyIds,
      offeredCash,
      requestedCash
    });

    if (result.success) {
      sounds.playScore();
      onClose();
    } else {
      sounds.playHit();
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#0c0e17] border border-white/15 p-4 sm:p-6 shadow-2xl relative select-none max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-display text-white tracking-wide">
                Property Trading Floor
              </h2>
              <span className="text-[10px] sm:text-xs font-mono text-slate-400 block">
                Negotiate deeds & cash transfers with rival tycoons
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rival Selection Tabs */}
        <div className="mb-4">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
            Trade With:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {otherPlayers.map((p) => {
              const isSelected = p.id === targetPlayer.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedTargetId(p.id);
                    setRequestedPropertyIds([]);
                    setRequestedCash(0);
                    setFeedback(null);
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-orange-500/20 border-orange-400 text-white shadow-md'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.colorHex }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate">{p.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      ₹{p.money} {p.isAi ? '(AI)' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-xs font-mono mb-4 flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
            }`}
          >
            {feedback.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span className="leading-snug">{feedback.message}</span>
          </div>
        )}

        {/* Trade Columns: Offer vs Request */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 flex-1">
          {/* Left Column: You Offer */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{activePlayer.tokenEmoji}</span>
                  <span className="text-xs font-black text-white font-display uppercase tracking-wide">
                    You Offer
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  Avail: ₹{activePlayer.money}
                </span>
              </div>

              {/* Cash Offer Slider/Input */}
              <div className="mb-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Cash:
                  </span>
                  <span className="font-black text-emerald-400">₹{offeredCash}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={activePlayer.money}
                  step={10}
                  value={offeredCash}
                  onChange={(e) => setOfferedCash(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Property Offer Chips */}
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">
                Properties ({myProperties.length} owned):
              </label>
              {myProperties.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] text-center text-xs font-mono text-slate-500">
                  No properties owned yet
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {myProperties.map((tile) => {
                    const isSelected = offeredPropertyIds.includes(tile.id);
                    const group = tile.group ? COLOR_GROUPS[tile.group] : null;
                    const ps = properties[tile.id];

                    return (
                      <div
                        key={tile.id}
                        onClick={() => toggleOfferedProperty(tile.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-400 text-white shadow-xs'
                            : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: group?.hex || '#94a3b8' }}
                          />
                          <span className="text-xs font-bold truncate">
                            {tile.shortName || tile.name}
                          </span>
                          {ps?.isMortgaged && (
                            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              MORTGAGED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 shrink-0 font-bold">
                          ₹{tile.cost}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
              <span className="text-slate-400">Total Value:</span>
              <strong className="text-amber-400">₹{totalOfferedValue}</strong>
            </div>
          </div>

          {/* Right Column: You Request */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{targetPlayer.tokenEmoji}</span>
                  <span className="text-xs font-black text-white font-display uppercase tracking-wide">
                    You Request
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  Avail: ₹{targetPlayer.money}
                </span>
              </div>

              {/* Cash Request Slider/Input */}
              <div className="mb-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Cash:
                  </span>
                  <span className="font-black text-emerald-400">₹{requestedCash}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={targetPlayer.money}
                  step={10}
                  value={requestedCash}
                  onChange={(e) => setRequestedCash(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Property Request Chips */}
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">
                Properties ({theirProperties.length} owned):
              </label>
              {theirProperties.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] text-center text-xs font-mono text-slate-500">
                  Rival owns no properties
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {theirProperties.map((tile) => {
                    const isSelected = requestedPropertyIds.includes(tile.id);
                    const group = tile.group ? COLOR_GROUPS[tile.group] : null;
                    const ps = properties[tile.id];

                    return (
                      <div
                        key={tile.id}
                        onClick={() => toggleRequestedProperty(tile.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs'
                            : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: group?.hex || '#94a3b8' }}
                          />
                          <span className="text-xs font-bold truncate">
                            {tile.shortName || tile.name}
                          </span>
                          {ps?.isMortgaged && (
                            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              MORTGAGED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 shrink-0 font-bold">
                          ₹{tile.cost}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
              <span className="text-slate-400">Total Value:</span>
              <strong className="text-amber-400">₹{totalRequestedValue}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-mono text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmitTrade}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-mono text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-98 cursor-pointer flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Send Trade Offer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
