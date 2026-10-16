import React from 'react';
import { TILES, COLOR_GROUPS } from './boardData';
import type { PropertyState, Player, GamePhase } from './types';
import {
  Home,
  Building2,
  Train,
  Zap,
  Droplets,
  Gem,
  ArrowDownLeft,
  Sparkles,
  Gift,
  Coins
} from 'lucide-react';
import { sounds } from '../../lib/audio';

interface BoardViewProps {
  properties: Record<number, PropertyState>;
  players: Player[];
  activePlayerIndex: number;
  dice: [number, number];
  isRolling: boolean;
  isMoving: boolean;
  phase: GamePhase;
  onRollDice: () => void;
  onBuyProperty: () => void;
  onPassTurn: () => void;
  onPayJailBail: () => void;
  onUseJailCard: () => void;
  onEndTurn: () => void;
  onInspectTile: (tileId: number) => void;
  actionMessage: string;
}

export const BoardView: React.FC<BoardViewProps> = ({
  properties,
  players,
  activePlayerIndex,
  dice,
  isRolling,
  isMoving,
  phase,
  onRollDice,
  onBuyProperty,
  onPassTurn,
  onPayJailBail,
  onUseJailCard,
  onEndTurn,
  onInspectTile,
  actionMessage
}) => {
  const activePlayer = players[activePlayerIndex];
  const currentTile = TILES.find((t) => t.id === activePlayer.position);
  const currentPropState = currentTile ? properties[currentTile.id] : null;
  const isPurchasable =
    currentTile &&
    (currentTile.type === 'property' || currentTile.type === 'station' || currentTile.type === 'utility') &&
    currentPropState?.ownerId === null;

  // Dice face dot pattern generator with 3D drop-shadow
  const renderDiceFace = (val: number) => {
    const dots: boolean[][] = [
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ];

    if (val === 1) {
      dots[1][1] = true;
    } else if (val === 2) {
      dots[0][0] = true;
      dots[2][2] = true;
    } else if (val === 3) {
      dots[0][0] = true;
      dots[1][1] = true;
      dots[2][2] = true;
    } else if (val === 4) {
      dots[0][0] = true;
      dots[0][2] = true;
      dots[2][0] = true;
      dots[2][2] = true;
    } else if (val === 5) {
      dots[0][0] = true;
      dots[0][2] = true;
      dots[1][1] = true;
      dots[2][0] = true;
      dots[2][2] = true;
    } else if (val === 6) {
      dots[0][0] = true;
      dots[0][2] = true;
      dots[1][0] = true;
      dots[1][2] = true;
      dots[2][0] = true;
      dots[2][2] = true;
    }

    return (
      <div
        className={`w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.8)] p-1 sm:p-1.5 grid grid-cols-3 grid-rows-3 gap-0.5 border border-slate-300 transition-all ${
          isRolling ? 'animate-bounce rotate-12 scale-105' : 'hover:scale-105'
        }`}
      >
        {dots.map((row, r) =>
          row.map((active, c) => (
            <div key={`${r}-${c}`} className="flex items-center justify-center">
              {active && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-900 shadow-xs" />
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // Helper to determine the outer ownership coin position (100% OUTSIDE the property box on bezel)
  const getOwnershipCoinClass = (gridRow: number, gridCol: number) => {
    // Bottom row (tiles 1 to 9, row 11) -> positioned outside immediately below into bottom bezel
    if (gridRow === 11 && gridCol > 1 && gridCol < 11) {
      return 'top-full mt-1.5 left-1/2 -translate-x-1/2';
    }
    // Left column (tiles 11 to 19, col 1) -> positioned outside immediately to the left into left bezel
    if (gridCol === 1 && gridRow > 1 && gridRow < 11) {
      return 'right-full mr-1.5 top-1/2 -translate-y-1/2';
    }
    // Top row (tiles 21 to 29, row 1) -> positioned outside immediately above into top bezel
    if (gridRow === 1 && gridCol > 1 && gridCol < 11) {
      return 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';
    }
    // Right column (tiles 31 to 39, col 11) -> positioned outside immediately to the right into right bezel
    if (gridCol === 11 && gridRow > 1 && gridRow < 11) {
      return 'left-full ml-1.5 top-1/2 -translate-y-1/2';
    }
    return 'bottom-full mb-1 left-1/2 -translate-x-1/2';
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 11x11 Square Grid Board with outer bezel for ownership markers */}
      <div className="relative w-full max-w-[780px] md:max-w-[860px] aspect-square rounded-3xl bg-[#090b12] border-2 border-amber-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.1)] p-3.5 sm:p-5 md:p-6 overflow-visible">
        
        {/* Board Perimeter Grid with Proportional Tracks (Corners 1.45fr, Edge tiles 1fr x 1.45fr) */}
        <div
          className="w-full h-full gap-0.5 sm:gap-1 rounded-2xl bg-slate-950 border border-slate-800/90 relative overflow-visible"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.45fr)',
            gridTemplateRows: 'minmax(0, 1.45fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.45fr)'
          }}
        >
          
          {/* ========================================================= */}
          {/* 40 PERIMETER TILES */}
          {/* ========================================================= */}
          {TILES.map((tile) => {
            const propState = properties[tile.id];
            const owner =
              propState && propState.ownerId !== null
                ? players.find((p) => p.id === propState.ownerId)
                : null;
            const group = tile.group ? COLOR_GROUPS[tile.group] : null;

            // Find all players currently standing on this space
            const occupants = players.filter((p) => p.position === tile.id && !p.bankrupt);
            const isCorner = tile.type === 'corner';
            const isStation = tile.type === 'station';
            const isUtility = tile.type === 'utility';
            const isTax = tile.type === 'tax';
            const isChance = tile.type === 'chance';
            const isChest = tile.type === 'chest';
            const isCurrentActivePos = activePlayer.position === tile.id;

            return (
              <div
                key={tile.id}
                onClick={() => {
                  sounds.playClick();
                  onInspectTile(tile.id);
                }}
                style={{
                  gridRow: tile.gridRow,
                  gridColumn: tile.gridCol
                }}
                className={`relative flex flex-col justify-between p-0.5 sm:p-1 cursor-pointer transition-all duration-150 hover:brightness-125 border ${
                  isCurrentActivePos
                    ? 'ring-2 ring-orange-400 border-orange-400 z-20'
                    : owner
                    ? 'border-amber-400/50'
                    : 'border-slate-800/80 hover:border-slate-600'
                } ${
                  isCorner
                    ? 'bg-gradient-to-br from-[#161a29] to-[#0c0f18]'
                    : isChance
                    ? 'bg-gradient-to-br from-[#24111f] to-[#120a16]'
                    : isChest
                    ? 'bg-gradient-to-br from-[#0e192c] to-[#09111c]'
                    : isStation
                    ? 'bg-gradient-to-br from-[#101927] to-[#0b101b]'
                    : isTax
                    ? 'bg-gradient-to-br from-[#221215] to-[#120a0d]'
                    : 'bg-[#121422] hover:bg-[#181b2e]'
                } rounded-sm overflow-visible`}
              >
                {/* 1. Property Color Band (Thick & Vibrant with Houses) */}
                {group && (
                  <div
                    className={`w-full h-2 xs:h-2.5 sm:h-3.5 rounded-t-xs shrink-0 shadow-xs flex items-center justify-center gap-0.5 relative ${group.bgClass}`}
                  >
                    {/* Upgrades (Houses or Hotel) on the color band */}
                    {propState && propState.houses > 0 && (
                      <div className="flex items-center gap-0.5 bg-black/60 px-1 py-0.2 rounded-full text-white text-[6px] sm:text-[7.5px] font-mono font-bold leading-none">
                        {propState.houses === 5 ? (
                          <div className="flex items-center gap-0.5 text-yellow-300">
                            <Building2 className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            <span>HOTEL</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 text-emerald-300">
                            <Home className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            <span>{propState.houses}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Space Icon / Banner & Title */}
                <div className="flex-1 flex flex-col items-center justify-center text-center py-0.5 px-0.5 overflow-hidden">
                  {/* Distinct Icons for Special Spaces */}
                  {isStation && (
                    <Train className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-400 mb-0.5 shrink-0" />
                  )}
                  {isUtility && (
                    tile.id === 12 ? (
                      <Zap className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400 mb-0.5 shrink-0" />
                    ) : (
                      <Droplets className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-cyan-400 mb-0.5 shrink-0" />
                    )
                  )}
                  {isTax && (
                    <Gem className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-rose-400 mb-0.5 shrink-0" />
                  )}
                  {isChance && (
                    <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-rose-400 mb-0.5 shrink-0" />
                  )}
                  {isChest && (
                    <Gift className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-400 mb-0.5 shrink-0" />
                  )}

                  {/* Corner Specials Visuals */}
                  {tile.id === 0 && (
                    <span className="text-[11px] sm:text-base leading-none mb-0.5">🚀</span>
                  )}
                  {tile.id === 10 && (
                    <span className="text-[11px] sm:text-base leading-none mb-0.5">🔒</span>
                  )}
                  {tile.id === 20 && (
                    <span className="text-[11px] sm:text-base leading-none mb-0.5">☕</span>
                  )}
                  {tile.id === 30 && (
                    <span className="text-[11px] sm:text-base leading-none mb-0.5">🚨</span>
                  )}

                  {/* City / Space Name (Multi-line wrap, NEVER truncated with ellipses) */}
                  <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] md:text-[11px] font-bold font-display text-slate-100 uppercase tracking-tight leading-[1.05] sm:leading-[1.1] text-center w-full break-words">
                    {tile.name}
                  </span>

                  {/* Price Tag or Tax Amount */}
                  {tile.cost && (
                    <span className="text-[7px] xs:text-[8px] sm:text-[9.5px] font-mono font-black text-amber-400 leading-none mt-0.5">
                      ₹{tile.cost}
                    </span>
                  )}
                  {tile.taxAmount && (
                    <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8.5px] font-mono font-bold text-rose-400 leading-none mt-0.5">
                      Pay ₹{tile.taxAmount}
                    </span>
                  )}
                </div>

                {/* 3. PROPERTY OWNERSHIP COIN — PLACED OUTSIDE THE PROPERTY BOX */}
                {owner && (
                  <div
                    className={`absolute z-30 flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.85)] ring-2 ring-amber-400 font-mono font-black text-white ${getOwnershipCoinClass(
                      tile.gridRow,
                      tile.gridCol
                    )} w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5.5 sm:h-5.5 text-[8px] sm:text-[10px]`}
                    style={{ backgroundColor: owner.colorHex }}
                    title={`Owned by ${owner.name}`}
                  >
                    <span>{owner.tokenEmoji}</span>
                  </div>
                )}

                {/* 4. Occupying Player Movement Pawns */}
                {occupants.length > 0 && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center gap-0.5 pointer-events-none p-0.5 flex-wrap">
                    {occupants.map((occ) => (
                      <div
                        key={occ.id}
                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[11px] shadow-lg ring-1.5 ring-white transition-all transform ${
                          occ.id === activePlayer.id
                            ? 'scale-115 ring-amber-300 animate-pulse'
                            : 'scale-90 opacity-90'
                        }`}
                        style={{ backgroundColor: occ.colorHex }}
                        title={`${occ.name} (₹${occ.money})`}
                      >
                        <span>{occ.tokenEmoji}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ========================================================= */}
          {/* CENTER FIELD (Rows 2..10, Cols 2..10) */}
          {/* ========================================================= */}
          <div
            style={{
              gridRow: '2 / span 9',
              gridColumn: '2 / span 9'
            }}
            className="relative flex flex-col justify-between p-2.5 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-br from-[#0a2316] via-[#081810] to-[#050e09] border border-emerald-900/40 shadow-inner overflow-hidden"
          >
            {/* Background Texture & Watermark */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* TOP HEADER: Game Title & India Logo */}
            <div className="z-10 flex items-center justify-between border-b border-white/10 pb-1.5 sm:pb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black text-xs sm:text-sm shadow-md">
                  ₹
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm md:text-base font-black font-display text-white tracking-wider uppercase leading-none">
                    BUSINESS TYCOON
                  </h1>
                  <span className="text-[8px] sm:text-[9.5px] font-mono text-emerald-400 font-semibold tracking-wide">
                    Indian Property Trading Board Game
                  </span>
                </div>
              </div>

              {/* 3D Dice Area */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1">
                  {renderDiceFace(dice[0])}
                  {renderDiceFace(dice[1])}
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-mono font-black text-xs sm:text-sm text-white">
                    {dice[0] + dice[1]}
                  </div>
                  {dice[0] === dice[1] && (
                    <span className="text-[7.5px] font-mono font-black text-amber-400 uppercase tracking-tighter animate-pulse">
                      Doubles!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* MIDDLE: Active Player Spotlight & Contextual Card Decks */}
            <div className="z-10 my-auto flex flex-col gap-2 py-1">
              {/* Active Player Card */}
              <div className="flex items-center justify-between bg-black/50 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-xl shadow-md border border-white/30 shrink-0"
                    style={{ backgroundColor: activePlayer.colorHex }}
                  >
                    {activePlayer.tokenEmoji}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Current Turn
                      </span>
                      {activePlayer.inJail && (
                        <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          In Jail (Turn {activePlayer.jailTurns}/3)
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                      <span>{activePlayer.name}</span>
                      <span className="text-emerald-400 font-mono font-black">
                        ₹{activePlayer.money}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative Deck Stacks */}
                <div className="hidden xs:flex items-center gap-2">
                  <div
                    onClick={() => {
                      sounds.playClick();
                      onInspectTile(7); // inspect Chance
                    }}
                    className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-gradient-to-br from-rose-900 to-rose-950 border border-rose-500/40 p-1 flex flex-col items-center justify-center text-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                    title="Chance Cards Deck"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-300 mb-0.5" />
                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-white leading-tight uppercase font-display">
                      CHANCE
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      sounds.playClick();
                      onInspectTile(2); // inspect Community Chest
                    }}
                    className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-500/40 p-1 flex flex-col items-center justify-center text-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                    title="Community Chest Cards Deck"
                  >
                    <Gift className="w-3.5 h-3.5 text-blue-300 mb-0.5" />
                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-white leading-tight uppercase font-display">
                      CHEST
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Message Feed Banner */}
              <div className="py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-center">
                <p className="text-xs sm:text-sm font-body font-semibold text-slate-200 leading-snug">
                  {actionMessage}
                </p>
              </div>
            </div>

            {/* BOTTOM: Action Controls Hub & Active Players Roster */}
            <div className="z-10 flex flex-col gap-2">
              {/* Contextual Action Buttons */}
              <div className="flex flex-col gap-2">
                {/* 1. If In Jail: Jail Decisions */}
                {activePlayer.inJail && phase === 'roll' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onPayJailBail();
                        }}
                        disabled={activePlayer.money < 50}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span>Pay ₹50 Bail</span>
                      </button>

                      <button
                        onClick={() => {
                          sounds.playClick();
                          onRollDice();
                        }}
                        className="py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-mono font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span>Roll for Doubles</span>
                      </button>
                    </div>

                    {activePlayer.jailCards > 0 && (
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onUseJailCard();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <span>Use 'Get Out of Jail' Card ({activePlayer.jailCards} available)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Standard Roll Dice Button */}
                {!activePlayer.inJail && phase === 'roll' && (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onRollDice();
                    }}
                    disabled={isRolling || isMoving}
                    className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm font-mono uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="text-base">🎲</span>
                    <span>{isRolling ? 'Rolling Dice...' : isMoving ? 'Moving Pawn...' : 'Roll Dice & Move'}</span>
                  </button>
                )}

                {/* 3. Action Needed: Buy Property or Pass */}
                {phase === 'action_needed' && isPurchasable && currentTile && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onBuyProperty();
                      }}
                      disabled={activePlayer.money < (currentTile.cost || 0)}
                      className="py-2.5 sm:py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-black text-xs uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Buy (₹{currentTile.cost})</span>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playClick();
                        onPassTurn();
                      }}
                      className="py-2.5 sm:py-3 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-mono font-bold text-xs uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <span>Pass</span>
                    </button>
                  </div>
                )}

                {/* 4. Turn Ready: End Turn button */}
                {phase === 'turn_ready' && (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onEndTurn();
                    }}
                    className="w-full py-2.5 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>End Turn & Next Player</span>
                    <ArrowDownLeft className="w-4 h-4" />
                  </button>
                )}

                {/* 5. Moving Indicator */}
                {phase === 'moving' && (
                  <div className="w-full py-2.5 rounded-2xl bg-slate-900/80 border border-orange-500/30 text-amber-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 animate-pulse">
                    <span>🚶 Moving to destination...</span>
                  </div>
                )}
              </div>

              {/* Compact Active Players Roster Strip */}
              <div className="grid grid-cols-4 gap-1 pt-1 border-t border-white/10">
                {players.map((p, idx) => {
                  const isCurrent = idx === activePlayerIndex;
                  return (
                    <div
                      key={p.id}
                      className={`p-1 rounded-lg text-center transition-all ${
                        p.bankrupt
                          ? 'opacity-30 line-through bg-slate-950'
                          : isCurrent
                          ? 'bg-orange-500/20 border border-orange-500/50 shadow-xs'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[9px] sm:text-[11px]">{p.tokenEmoji}</span>
                        <span className="text-[8px] sm:text-[9.5px] font-bold text-white truncate max-w-[45px]">
                          {p.name.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-emerald-400 block leading-tight">
                        ₹{p.money}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
