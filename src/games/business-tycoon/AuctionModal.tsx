import React, { useState, useEffect } from 'react';
import type { AuctionState, Player, TileInfo } from './types';
import { COLOR_GROUPS } from './boardData';
import { Gavel, TrendingUp, UserX, ArrowRight, ShieldAlert } from 'lucide-react';

interface AuctionModalProps {
  isOpen: boolean;
  auction: AuctionState | null;
  tile: TileInfo | null;
  players: Player[];
  onBid: (amount: number) => void;
  onPass: () => void;
  onAcknowledgeCompletion: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  isOpen,
  auction,
  tile,
  players,
  onBid,
  onPass,
  onAcknowledgeCompletion
}) => {
  const [customBid, setCustomBid] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Reset custom bid input when current bid or turn changes
  useEffect(() => {
    if (auction) {
      const nextMin = auction.currentBid === 0 ? auction.minIncrement : auction.currentBid + auction.minIncrement;
      setCustomBid(String(nextMin));
      setInputError(null);
    }
  }, [auction?.currentBid, auction?.currentBidderIndex]);

  if (!isOpen || !auction || !tile) return null;

  const currentBidderId = auction.activeBidderIds[auction.currentBidderIndex];
  const currentBidder = players.find((p) => p.id === currentBidderId);
  const highestBidder = players.find((p) => p.id === auction.highestBidderId);
  const winner = players.find((p) => p.id === auction.winnerId);
  const isHumanTurn = currentBidder ? !currentBidder.isAi : false;

  const minNextBid = auction.currentBid === 0 ? auction.minIncrement : auction.currentBid + auction.minIncrement;

  // Handle custom bid submission
  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBidder) return;

    const amount = parseInt(customBid, 10);
    if (isNaN(amount) || amount < minNextBid) {
      setInputError(`Minimum bid is ₹${minNextBid}`);
      return;
    }
    if (amount > currentBidder.money) {
      setInputError(`Exceeds cash balance (₹${currentBidder.money})`);
      return;
    }

    setInputError(null);
    onBid(amount);
  };

  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md sm:max-w-lg rounded-3xl bg-[#0c0e18]/95 border border-white/10 p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 sm:gap-4 max-h-[92vh] overflow-y-auto">
        {/* ======================================================== */}
        {/* 1. HEADER: AUCTION GAVEL & PROPERTY BANNER               */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block">
                Public Land Auction
              </span>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {tile.name}
              </h2>
            </div>
          </div>

          {/* Group Color Badge / Type */}
          {groupInfo ? (
            <div
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-white shadow-xs"
              style={{ backgroundColor: groupInfo.hex }}
            >
              {groupInfo.name}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
              {tile.type === 'station' ? 'Railway' : 'Utility'}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 2. PROPERTY SPECIFICATION OVERVIEW                        */}
        {/* ======================================================== */}
        <div className="bg-[#121422] border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block">DEED VALUE</span>
            <strong className="text-amber-400 font-bold text-sm">
              ₹{tile.cost || 0}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">BASE RENT</span>
            <strong className="text-emerald-400 font-bold text-sm">
              ₹{tile.baseRent || 10}
            </strong>
          </div>
          {tile.houseCost && (
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">HOUSE COST</span>
              <strong className="text-sky-400 font-bold text-sm">
                ₹{tile.houseCost}
              </strong>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. PROMINENT CURRENT HIGHEST BID DISPLAY                  */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-b from-[#181a2e] to-[#0f111f] border border-orange-500/40 rounded-2xl p-3.5 sm:p-4 text-center shadow-lg relative overflow-hidden">
          <div className="text-[10px] sm:text-xs font-mono font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Current Highest Bid</span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            {auction.currentBid > 0 ? `₹${auction.currentBid}` : 'No Bids Yet'}
          </div>

          <div className="mt-2 text-xs font-mono flex items-center justify-center gap-2">
            {highestBidder ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                <span className="text-xs">{highestBidder.tokenEmoji}</span>
                <span>Leading: {highestBidder.name}</span>
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">
                Opening bid starts at ₹{auction.minIncrement}
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. ACTIVE BIDDER STATUS / ON-THE-CLOCK INDICATOR         */}
        {/* ======================================================== */}
        {!auction.isCompleted && (
          <div className="bg-[#10121d] border border-white/5 rounded-2xl p-2.5 sm:p-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
              <span className="uppercase font-bold tracking-wider">
                Auction Roster ({auction.activeBidderIds.length} Active / {auction.passedPlayerIds.length} Passed)
              </span>
              {currentBidder && (
                <span className="text-orange-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Turn: {currentBidder.name}
                </span>
              )}
            </div>

            {/* Players Pills */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {players
                .filter((p) => !p.bankrupt)
                .map((p) => {
                  const isTurn = p.id === currentBidderId;
                  const isLeading = p.id === auction.highestBidderId;
                  const hasPassed = auction.passedPlayerIds.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`p-2 rounded-xl border text-[11px] font-mono flex items-center justify-between transition-all ${
                        hasPassed
                          ? 'opacity-40 bg-slate-900/40 border-slate-800 line-through'
                          : isLeading
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/40 shadow-xs'
                          : isTurn
                          ? 'bg-orange-500/15 border-orange-500/60 text-orange-200 ring-1 ring-orange-500/40 shadow-xs'
                          : 'bg-[#151726] border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="shrink-0">{p.tokenEmoji}</span>
                        <span className="font-bold truncate max-w-[70px] sm:max-w-[90px]">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-amber-400">
                          ₹{p.money}
                        </span>
                        {hasPassed && (
                          <span className="block text-[9px] text-red-400 font-bold no-underline">
                            OUT
                          </span>
                        )}
                        {isLeading && (
                          <span className="block text-[9px] text-emerald-400 font-bold">
                            LEADER
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. INTERACTIVE BID & PASS CONTROLS                       */}
        {/* ======================================================== */}
        {!auction.isCompleted ? (
          <div>
            {isHumanTurn ? (
              <div className="flex flex-col gap-2.5">
                {/* Quick Increment Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[10, 50, 100].map((inc) => {
                    const targetBid = auction.currentBid === 0 ? inc : auction.currentBid + inc;
                    const canAfford = currentBidder ? currentBidder.money >= targetBid : false;

                    return (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => onBid(targetBid)}
                        disabled={!canAfford}
                        className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs font-mono uppercase tracking-wider shadow-md active:scale-98 transition-all cursor-pointer flex flex-col items-center justify-center"
                      >
                        <span className="text-[10px] font-bold text-slate-900/80">
                          BID +₹{inc}
                        </span>
                        <span className="text-xs font-black">₹{targetBid}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Bid Input Form */}
                <form
                  onSubmit={handleCustomBidSubmit}
                  className="flex items-center gap-2 bg-[#121422] p-1.5 rounded-xl border border-white/10"
                >
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={minNextBid}
                      max={currentBidder?.money || 9999}
                      step="5"
                      value={customBid}
                      onChange={(e) => {
                        setCustomBid(e.target.value);
                        setInputError(null);
                      }}
                      placeholder={`Min ₹${minNextBid}`}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-black/40 text-white font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!currentBidder || currentBidder.money < minNextBid}
                    className="py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider shadow transition-all cursor-pointer"
                  >
                    Raise
                  </button>
                </form>

                {inputError && (
                  <p className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{inputError}</span>
                  </p>
                )}

                {/* Pass Button */}
                <button
                  type="button"
                  onClick={onPass}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/40 font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Pass (Leave Auction)</span>
                </button>
              </div>
            ) : (
              /* AI Turn Waiting Status */
              <div className="py-3 px-4 rounded-xl bg-[#121422] border border-white/10 text-center flex items-center justify-center gap-2 font-mono text-xs text-amber-300 animate-pulse">
                <span className="text-sm">🤖</span>
                <span>
                  {currentBidder?.name || 'AI'} is calculating valuation & bid...
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* 6. AUCTION COMPLETION RESULT DISPLAY                     */
          /* ======================================================== */
          <div className="flex flex-col gap-3">
            <div
              className={`p-4 rounded-2xl border text-center ${
                winner
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="text-2xl sm:text-3xl mb-1">
                {winner ? '🎉' : '🚫'}
              </div>
              <h3 className="text-base sm:text-lg font-black font-mono tracking-wide">
                {winner ? `SOLD TO ${winner.name.toUpperCase()}!` : 'AUCTION ENDED — NO BIDS'}
              </h3>
              <p className="text-xs font-mono text-slate-300 mt-1 leading-relaxed">
                {winner
                  ? `${winner.name} won ${tile.name} for ₹${auction.currentBid}. Deed ownership transferred immediately.`
                  : `All players passed. ${tile.name} remains unowned.`}
              </p>
            </div>

            <button
              type="button"
              onClick={onAcknowledgeCompletion}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>Continue Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
