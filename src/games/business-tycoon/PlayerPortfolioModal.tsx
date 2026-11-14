import React from 'react';
import type { Player, PropertyState } from './types';
import { TILES, COLOR_GROUPS } from './boardData';
import { calculateNetWorth, calculateRent, checkMonopoly } from './businessLogic';
import { Home, Building2, Handshake, Eye, X } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface PlayerPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  currentPlayer: Player;
  properties: Record<number, PropertyState>;
  onInspectProperty: (tileId: number) => void;
  onInitiateTrade: (targetPlayerId: number, propertyId?: number) => void;
}

export const PlayerPortfolioModal: React.FC<PlayerPortfolioModalProps> = ({
  isOpen,
  onClose,
  player,
  currentPlayer,
  properties,
  onInspectProperty,
  onInitiateTrade
}) => {
  if (!isOpen || !player) return null;

  const isCurrentViewer = player.id === currentPlayer.id;
  const netWorth = calculateNetWorth(player, properties);
  const ownedTiles = TILES.filter((t) => properties[t.id]?.ownerId === player.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xl rounded-3xl bg-[#0c0e18]/95 border border-white/10 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border border-white/20 shrink-0"
              style={{ backgroundColor: player.colorHex }}
            >
              {player.tokenEmoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {player.name}
                </h2>
                {isCurrentViewer && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    You
                  </span>
                )}
                {player.isAi && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                    {player.personality || player.aiDifficulty} AI
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {player.bankrupt ? 'Bankrupt' : player.inJail ? 'In Jail' : 'Active Tycoon'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm font-bold shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Cash Balance</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">
              ₹{player.money}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Total Net Worth</span>
            <span className="text-base sm:text-lg font-black text-amber-400">
              ₹{netWorth}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Deeds Owned</span>
            <span className="text-base sm:text-lg font-black text-blue-400">
              {ownedTiles.length}
            </span>
          </div>
        </div>

        {/* Trade with this player CTA if viewing an opponent */}
        {!isCurrentViewer && !player.bankrupt && (
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-white block">Negotiate Trade</span>
                <span className="text-[10.5px] text-slate-400">Propose a property exchange or cash offer to {player.name}</span>
              </div>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
                onInitiateTrade(player.id);
              }}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Propose Trade
            </button>
          </div>
        )}

        {/* Owned Properties List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
              Property Portfolio ({ownedTiles.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Click any property to inspect or manage
            </span>
          </div>

          {ownedTiles.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-black/40 border border-white/5 text-slate-500 text-xs">
              This player does not currently own any properties.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {ownedTiles.map((tile) => {
                const ps = properties[tile.id];
                const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;
                const isMono = tile.group ? checkMonopoly(tile.group, player.id, properties) : false;
                const { rent } = calculateRent(tile.id, 7, properties);

                return (
                  <div
                    key={tile.id}
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                      onInspectProperty(tile.id);
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      ps.isMortgaged
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60'
                        : isMono
                        ? 'bg-emerald-950/15 border-emerald-500/40 hover:border-emerald-500/70'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Color indicator dot or banner */}
                      {groupInfo ? (
                        <div
                          className="w-3.5 h-8 rounded-lg shrink-0 shadow-xs"
                          style={{ backgroundColor: groupInfo.hex }}
                        />
                      ) : (
                        <div className="w-3.5 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px]">🚂</span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-[180px]">
                            {tile.name}
                          </span>
                          {ps.isMortgaged && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                              Mortgaged
                            </span>
                          )}
                          {isMono && !ps.isMortgaged && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                              Monopoly
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5">
                          <span>Cost: ₹{tile.cost}</span>
                          <span>•</span>
                          <span className="text-amber-400">Current Rent: ₹{rent}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* House or Hotel indicators */}
                      {ps.houses > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono font-bold">
                          {ps.houses === 5 ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>Hotel</span>
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Home className="w-3 h-3" />
                              <span>{ps.houses} {ps.houses === 1 ? 'House' : 'Houses'}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                        title="View Property Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Close Portfolio
        </button>
      </div>
    </div>
  );
};
