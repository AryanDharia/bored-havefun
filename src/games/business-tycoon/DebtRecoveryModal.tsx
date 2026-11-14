import React from 'react';
import type { Player, PropertyState, PendingDebt } from './types';
import { TILES, COLOR_GROUPS } from './boardData';
import { canMortgageProperty, canSellBuilding, calculateLiquidationValue } from './businessLogic';
import { AlertTriangle, DollarSign, Building, Handshake, ArrowRight, ShieldAlert } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface DebtRecoveryModalProps {
  isOpen: boolean;
  debt: PendingDebt | null;
  debtor: Player;
  creditor: Player | undefined; // undefined if Bank
  properties: Record<number, PropertyState>;
  onMortgageProperty: (tileId: number) => void;
  onSellBuilding: (tileId: number) => void;
  onOpenTrade: () => void;
  onPayDebt: () => void;
  onDeclareBankruptcy: () => void;
}

export const DebtRecoveryModal: React.FC<DebtRecoveryModalProps> = ({
  isOpen,
  debt,
  debtor,
  creditor,
  properties,
  onMortgageProperty,
  onSellBuilding,
  onOpenTrade,
  onPayDebt,
  onDeclareBankruptcy
}) => {
  if (!isOpen || !debt) return null;

  const shortfall = Math.max(0, debt.amountDue - debtor.money);
  const canPayNow = debtor.money >= debt.amountDue;
  const liquidation = calculateLiquidationValue(debtor, properties);
  const isGenuinelyBankrupt = liquidation.totalLiquidationValue < debt.amountDue;

  // Owned properties that can be mortgaged
  const eligibleMortgages = TILES.filter((t) => {
    const ps = properties[t.id];
    if (ps?.ownerId !== debtor.id || ps?.isMortgaged) return false;
    const check = canMortgageProperty(t.id, properties, debtor);
    return check.canMortgage;
  });

  // Owned properties that have buildings to sell
  const eligibleSales = TILES.filter((t) => {
    const ps = properties[t.id];
    if (ps?.ownerId !== debtor.id || !ps?.houses) return false;
    const check = canSellBuilding(t.id, properties, debtor);
    return check.canSell;
  });

  const creditorName = creditor ? creditor.name : 'The Bank';
  const creditorEmoji = creditor ? creditor.tokenEmoji : '🏛️';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c0e18]/95 border-2 border-rose-500/40 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest block">
                Financial Recovery Mode
              </span>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Outstanding Debt Settlement
              </h2>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono font-black text-xs">
            Due: ₹{debt.amountDue}
          </div>
        </div>

        {/* Debt Explanation & Balances */}
        <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Creditor:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>{creditorEmoji}</span>
              <span>{creditorName}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Payment Reason:</span>
            <span className="font-semibold text-amber-300">{debt.reason}</span>
          </div>

          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[9.5px] text-slate-400 uppercase block">Available Cash</span>
              <span className="text-sm font-black text-emerald-400">₹{debtor.money}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[9.5px] text-slate-400 uppercase block">Deficit</span>
              <span className={`text-sm font-black ${shortfall > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₹{shortfall}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[9.5px] text-slate-400 uppercase block">Total Net Worth</span>
              <span className="text-sm font-black text-amber-400">₹{liquidation.totalLiquidationValue}</span>
            </div>
          </div>
        </div>

        {/* Action Status Banner */}
        {canPayNow ? (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center animate-pulse">
            <p className="text-xs sm:text-sm font-bold text-emerald-300">
              ✅ You have raised enough cash to settle your debt! Click below to pay and continue.
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center">
            <p className="text-xs text-amber-200">
              Raise at least <strong className="font-mono font-bold text-amber-400">₹{shortfall}</strong> more by mortgaging properties, selling buildings, or negotiating trades with other players.
            </p>
          </div>
        )}

        {/* Recovery Options Sections */}
        <div className="flex flex-col gap-3">
          {/* 1. Mortgage Section */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Mortgage Properties (50% Value Credit)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {eligibleMortgages.length} Eligible
              </span>
            </div>

            {eligibleMortgages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {eligibleMortgages.map((prop) => {
                  const mortVal = prop.cost ? Math.floor(prop.cost * 0.5) : 0;
                  const groupInfo = prop.group ? COLOR_GROUPS[prop.group] : null;
                  return (
                    <div
                      key={prop.id}
                      className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {groupInfo && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: groupInfo.hex }}
                          />
                        )}
                        <span className="text-xs font-bold text-white truncate max-w-[100px]">
                          {prop.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onMortgageProperty(prop.id);
                        }}
                        className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono font-bold text-[10.5px] border border-amber-500/40 transition-colors"
                      >
                        +₹{mortVal}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No eligible properties available to mortgage.</p>
            )}
          </div>

          {/* 2. Sell Buildings Section */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sell Buildings (50% Refund)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {eligibleSales.length} Upgraded
              </span>
            </div>

            {eligibleSales.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {eligibleSales.map((prop) => {
                  const refund = Math.floor((prop.houseCost || 100) * 0.5);
                  const ps = properties[prop.id];
                  const houseLabel = ps.houses === 5 ? 'Hotel' : `${ps.houses} ${ps.houses === 1 ? 'House' : 'Houses'}`;
                  return (
                    <div
                      key={prop.id}
                      className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-1.5"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block max-w-[100px]">
                          {prop.name}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">{houseLabel}</span>
                      </div>
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onSellBuilding(prop.id);
                        }}
                        className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono font-bold text-[10.5px] border border-emerald-500/40 transition-colors"
                      >
                        Sell (+₹{refund})
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No buildings constructed on owned properties.</p>
            )}
          </div>

          {/* 3. Trade Emergency Option */}
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-white block">Emergency Property Trade</span>
                <span className="text-[10.5px] text-slate-400">Sell properties or deeds to rivals for emergency cash</span>
              </div>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenTrade();
              }}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
            >
              <span>Negotiate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
          {/* Settle Debt Button */}
          <button
            onClick={() => {
              sounds.playScore();
              onPayDebt();
            }}
            disabled={!canPayNow}
            className={`w-full py-3 rounded-2xl font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              canPayNow
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 active:scale-98 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <span>Pay Full Debt (₹{debt.amountDue})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Declare Bankruptcy Button */}
          <button
            onClick={() => {
              sounds.playGameOver();
              onDeclareBankruptcy();
            }}
            className="w-full py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {isGenuinelyBankrupt
                ? 'No Assets Left — Declare Bankruptcy'
                : 'Surrender & Declare Bankruptcy'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
