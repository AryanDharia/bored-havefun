import React from 'react';
import type { TileInfo, PropertyState, Player } from './types';
import { COLOR_GROUPS } from './boardData';
import {
  canUpgradeProperty,
  canMortgageProperty,
  canUnmortgageProperty,
  canSellBuilding
} from './businessLogic';

interface PropertyModalProps {
  tile: TileInfo;
  propertyState: PropertyState;
  owner: Player | undefined;
  currentPlayer: Player;
  allPropertyStates: Record<number, PropertyState>;
  onClose: () => void;
  onBuy?: () => void;
  onBuildHouse?: () => void;
  onSellBuilding?: () => void;
  onMortgage?: () => void;
  onUnmortgage?: () => void;
  onInitiateTrade?: (targetPlayerId: number, propertyId: number) => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  tile,
  propertyState,
  owner,
  currentPlayer,
  allPropertyStates,
  onClose,
  onBuy,
  onBuildHouse,
  onSellBuilding,
  onMortgage,
  onUnmortgage,
  onInitiateTrade
}) => {
  const isOwner = owner?.id === currentPlayer.id;
  const isUnowned = !owner;
  const canAffordBuy = isUnowned && tile.cost && currentPlayer.money >= tile.cost;

  const buildCheck = isOwner
    ? canUpgradeProperty(tile.id, allPropertyStates, currentPlayer)
    : { canUpgrade: false, reason: '' };
  const sellCheck = isOwner
    ? canSellBuilding(tile.id, allPropertyStates, currentPlayer)
    : { canSell: false, reason: '', refund: 0 };
  const mortgageCheck = isOwner
    ? canMortgageProperty(tile.id, allPropertyStates, currentPlayer)
    : { canMortgage: false, reason: '', mortgageValue: 0 };
  const unmortgageCheck = isOwner
    ? canUnmortgageProperty(tile.id, allPropertyStates, currentPlayer)
    : { canUnmortgage: false, reason: '', redemptionCost: 0 };

  const mortgageValue = tile.cost ? Math.floor(tile.cost * 0.5) : 0;
  const unmortgageCost = Math.ceil(mortgageValue * 1.1);
  const houseCost = tile.houseCost || 100;
  const houseRefund = Math.floor(houseCost * 0.5);

  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;
  const bannerBg = groupInfo ? groupInfo.hex : '#1e293b';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Color Banner */}
        <div
          className="p-3 text-center font-bold text-base sm:text-lg tracking-wide uppercase shadow-inner relative flex items-center justify-between"
          style={{
            backgroundColor: bannerBg,
            color: '#ffffff'
          }}
        >
          <div className="flex-1 text-center font-extrabold truncate px-2">
            {tile.name}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-xs font-bold shrink-0"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 text-xs sm:text-sm">
          {/* Status Badges */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <span className="text-zinc-400 font-medium">Status</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {propertyState.isMortgaged && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  Mortgaged
                </span>
              )}
              {isUnowned ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Unowned (₹{tile.cost})
                </span>
              ) : (
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: owner?.colorHex }}
                  />
                  <span className="font-semibold text-zinc-200 text-xs truncate max-w-[110px]">
                    {owner?.name} {isOwner && '(You)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Buildings info if applicable */}
          {tile.type === 'property' && (
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-zinc-400 font-medium">Developments</span>
              <span className="font-semibold text-zinc-200">
                {propertyState.houses === 5 ? (
                  <span className="text-amber-400 font-bold">1 Hotel (Max)</span>
                ) : propertyState.houses > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    {propertyState.houses} {propertyState.houses === 1 ? 'House' : 'Houses'}
                  </span>
                ) : (
                  <span className="text-zinc-400">None</span>
                )}
              </span>
            </div>
          )}

          {/* Rent Schedule Table */}
          {tile.type === 'property' && tile.baseRent && tile.houseRents && (
            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800/80 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 pb-1 mb-1 border-b border-zinc-800 flex justify-between">
                <span>Tier</span>
                <span>Rent Amount</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 0 && !propertyState.isMortgaged
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>Base Rent</span>
                <span>₹{tile.baseRent}</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 1
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>With 1 House</span>
                <span>₹{tile.houseRents[0]}</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 2
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>With 2 Houses</span>
                <span>₹{tile.houseRents[1]}</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 3
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>With 3 Houses</span>
                <span>₹{tile.houseRents[2]}</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 4
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>With 4 Houses</span>
                <span>₹{tile.houseRents[3]}</span>
              </div>
              <div
                className={`flex justify-between py-0.5 px-1.5 rounded ${
                  propertyState.houses === 5
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-zinc-400'
                }`}
              >
                <span>With Hotel</span>
                <span>₹{tile.houseRents[4]}</span>
              </div>
            </div>
          )}

          {/* Railroad / Utility rent rule explanation */}
          {tile.type === 'station' && (
            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Station Rent Scale
              </div>
              <div className="flex justify-between">
                <span>1 Station owned:</span>
                <span className="font-semibold text-zinc-100">₹25</span>
              </div>
              <div className="flex justify-between">
                <span>2 Stations owned:</span>
                <span className="font-semibold text-zinc-100">₹50</span>
              </div>
              <div className="flex justify-between">
                <span>3 Stations owned:</span>
                <span className="font-semibold text-zinc-100">₹100</span>
              </div>
              <div className="flex justify-between">
                <span>4 Stations owned:</span>
                <span className="font-semibold text-zinc-100">₹200</span>
              </div>
            </div>
          )}

          {tile.type === 'utility' && (
            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Utility Rent Formula
              </div>
              <div className="flex justify-between">
                <span>1 Utility owned:</span>
                <span className="font-semibold text-zinc-100">4× Dice Roll</span>
              </div>
              <div className="flex justify-between">
                <span>Both Utilities owned:</span>
                <span className="font-semibold text-zinc-100">10× Dice Roll</span>
              </div>
            </div>
          )}

          {/* Financial summary: Mortgage and Development Costs */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                Mortgage Value
              </span>
              <span className="text-amber-400 font-bold text-sm">₹{mortgageValue}</span>
              <span className="text-zinc-500 block text-[9.5px]">
                Redeem for ₹{unmortgageCost} (+10%)
              </span>
            </div>
            {tile.type === 'property' && (
              <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                  House Cost
                </span>
                <span className="text-emerald-400 font-bold text-sm">₹{houseCost}</span>
                <span className="text-zinc-500 block text-[9.5px]">Sell refund: ₹{houseRefund}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex flex-col gap-2">
          {/* Unowned Buy Option */}
          {isUnowned && onBuy && (
            <button
              onClick={() => {
                onBuy();
                onClose();
              }}
              disabled={!canAffordBuy}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                canAffordBuy
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Buy Property for ₹{tile.cost}
            </button>
          )}

          {/* Owner Operations */}
          {isOwner && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Build House / Hotel */}
                {tile.type === 'property' && onBuildHouse && (
                  <button
                    onClick={() => {
                      onBuildHouse();
                    }}
                    disabled={!buildCheck.canUpgrade}
                    title={buildCheck.reason}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all ${
                      buildCheck.canUpgrade
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                        : 'bg-zinc-800/80 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    + Build (₹{houseCost})
                  </button>
                )}

                {/* Sell House / Hotel */}
                {tile.type === 'property' && onSellBuilding && (
                  <button
                    onClick={() => {
                      onSellBuilding();
                    }}
                    disabled={!sellCheck.canSell}
                    title={sellCheck.reason}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all ${
                      sellCheck.canSell
                        ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
                        : 'bg-zinc-800/80 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    - Sell (₹{houseRefund})
                  </button>
                )}
              </div>

              {/* Mortgage / Unmortgage */}
              <div className="grid grid-cols-2 gap-2">
                {!propertyState.isMortgaged && onMortgage && (
                  <button
                    onClick={() => {
                      onMortgage();
                    }}
                    disabled={!mortgageCheck.canMortgage}
                    title={mortgageCheck.reason}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all ${
                      mortgageCheck.canMortgage
                        ? 'bg-rose-700/80 hover:bg-rose-600 text-white active:scale-95'
                        : 'bg-zinc-800/80 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    Mortgage (+₹{mortgageValue})
                  </button>
                )}

                {propertyState.isMortgaged && onUnmortgage && (
                  <button
                    onClick={() => {
                      onUnmortgage();
                    }}
                    disabled={!unmortgageCheck.canUnmortgage}
                    title={unmortgageCheck.reason}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all ${
                      unmortgageCheck.canUnmortgage
                        ? 'bg-teal-600 hover:bg-teal-500 text-white active:scale-95'
                        : 'bg-zinc-800/80 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    Redeem (-₹{unmortgageCost})
                  </button>
                )}

                {/* Trade Property */}
                {onInitiateTrade && (
                  <button
                    onClick={() => {
                      onInitiateTrade(owner.id, tile.id);
                      onClose();
                    }}
                    className="col-span-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98]"
                  >
                    Open Trade Negotiation
                  </button>
                )}
              </div>
            </div>
          )}

          {/* If another player owns it, allow player to initiate trade for it */}
          {!isOwner && !isUnowned && onInitiateTrade && owner && (
            <button
              onClick={() => {
                onInitiateTrade(owner.id, tile.id);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98]"
            >
              Offer Trade to {owner.name}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
