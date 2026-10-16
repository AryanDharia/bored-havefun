import React from 'react';
import { TILES, COLOR_GROUPS } from './boardData';
import { canUpgradeProperty } from './businessLogic';
import type { PropertyState, Player } from './types';
import { X, Home, Building2, AlertCircle } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface PropertyModalProps {
  tileId: number | null;
  onClose: () => void;
  properties: Record<number, PropertyState>;
  players: Player[];
  activePlayer: Player;
  onUpgrade: (tileId: number) => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  tileId,
  onClose,
  properties,
  players,
  activePlayer,
  onUpgrade,
}) => {
  if (tileId === null) return null;
  const tile = TILES.find((t) => t.id === tileId);
  if (!tile) return null;

  const propState = properties[tileId];
  const owner = propState && propState.ownerId !== null ? players.find((p) => p.id === propState.ownerId) : null;
  const group = tile.group ? COLOR_GROUPS[tile.group] : null;
  const isOwnedByActivePlayer = owner && owner.id === activePlayer.id;
  const upgradeCheck = isOwnedByActivePlayer ? canUpgradeProperty(tileId, properties, activePlayer) : { canUpgrade: false };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#0f111a] border border-white/15 p-5 shadow-2xl relative select-none transform transition-all animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Close Deed"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title Deed Header */}
        <div
          className={`w-full py-4 px-4 rounded-2xl text-center mb-4 shadow-md ${
            group ? group.bgClass : 'bg-slate-800'
          } text-white`}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold opacity-85 block">
            {group ? group.name : tile.type.toUpperCase()} TITLE DEED
          </span>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-0.5">
            {tile.name}
          </h2>
          <span className="text-xs font-mono font-medium opacity-90 block">
            {tile.subtitle || `Board Space #${tile.id}`}
          </span>
        </div>

        {/* Ownership Status Banner */}
        <div className="mb-4 flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <span className="text-slate-400 font-mono">Current Owner:</span>
          {owner ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: owner.colorHex }} />
              <strong className="text-white font-bold">{owner.name}</strong>
              {isOwnedByActivePlayer && <span className="text-emerald-400 font-mono text-[10px]">(You)</span>}
            </div>
          ) : (
            <span className="text-amber-400 font-mono font-bold">Unowned (Bank)</span>
          )}
        </div>

        {/* Property Type Details */}
        {tile.type === 'property' && (
          <div className="space-y-2 text-xs font-mono mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex justify-between text-slate-300 pb-1.5 border-b border-white/5">
              <span>Base Rent:</span>
              <strong className="text-white">₹{tile.baseRent}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Monopoly Rent (Group owned):</span>
              <strong className="text-amber-400">₹{(tile.baseRent || 0) * 2}</strong>
            </div>

            {tile.houseRents && (
              <>
                <div className={`flex justify-between ${propState?.houses === 1 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <span>With 1 House:</span>
                  <span>₹{tile.houseRents[0]}</span>
                </div>
                <div className={`flex justify-between ${propState?.houses === 2 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <span>With 2 Houses:</span>
                  <span>₹{tile.houseRents[1]}</span>
                </div>
                <div className={`flex justify-between ${propState?.houses === 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <span>With 3 Houses:</span>
                  <span>₹{tile.houseRents[2]}</span>
                </div>
                <div className={`flex justify-between ${propState?.houses === 4 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <span>With 4 Houses:</span>
                  <span>₹{tile.houseRents[3]}</span>
                </div>
                <div className={`flex justify-between pt-1 border-t border-white/5 ${propState?.houses === 5 ? 'text-rose-400 font-bold' : 'text-amber-300 font-bold'}`}>
                  <span>With Skyscraper Hotel:</span>
                  <span>₹{tile.houseRents[4]}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
              <span>Building Cost:</span>
              <span className="text-white font-bold">₹{tile.houseCost} each</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Mortgage Value:</span>
              <span className="text-white font-bold">₹{(tile.cost || 0) / 2}</span>
            </div>
          </div>
        )}

        {tile.type === 'station' && (
          <div className="space-y-2 text-xs font-mono mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-slate-300">
            <div className="text-slate-400 pb-1 border-b border-white/5">
              Rent scales with number of Railway Junctions owned:
            </div>
            <div className="flex justify-between"><span>1 Railway Junction:</span><strong className="text-white">₹25</strong></div>
            <div className="flex justify-between"><span>2 Railway Junctions:</span><strong className="text-white">₹50</strong></div>
            <div className="flex justify-between"><span>3 Railway Junctions:</span><strong className="text-white">₹100</strong></div>
            <div className="flex justify-between text-amber-400 font-bold"><span>4 Railway Junctions:</span><strong>₹200</strong></div>
          </div>
        )}

        {tile.type === 'utility' && (
          <div className="space-y-2 text-xs font-mono mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-slate-300">
            <div className="text-slate-400 pb-1 border-b border-white/5">
              Rent is calculated by multiplying the dice roll:
            </div>
            <div className="flex justify-between"><span>1 Utility owned:</span><strong className="text-white">4× Dice Total</strong></div>
            <div className="flex justify-between text-amber-400 font-bold"><span>Both Utilities owned:</span><strong>10× Dice Total</strong></div>
          </div>
        )}

        {/* Upgrade Actions */}
        {tile.type === 'property' && isOwnedByActivePlayer && (
          <div className="mt-3">
            {upgradeCheck.canUpgrade ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  onUpgrade(tileId);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                {propState.houses === 4 ? <Building2 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                <span>
                  Build {propState.houses === 4 ? 'Hotel' : 'House'} (₹{tile.houseCost})
                </span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{upgradeCheck.reason || 'Upgrade locked.'}</span>
              </div>
            )}
          </div>
        )}

        {/* Purchase Price footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Deed Purchase Value:</span>
          <span className="text-base font-black text-orange-400">₹{tile.cost || 0}</span>
        </div>
      </div>
    </div>
  );
};
