import React from 'react';
import { TILES, COLOR_GROUPS } from './boardData';
import type { PropertyState, Player, GamePhase } from './types';
import { Home, Building2, Train, Zap, Droplets, Gem, ArrowDownLeft } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface BoardViewProps {
  properties: Record<number, PropertyState>;
  players: Player[];
  activePlayerIndex: number;
  dice: [number, number];
  isRolling: boolean;
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

  // Dice face dot pattern generator
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
        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white shadow-md p-1.5 grid grid-cols-3 grid-rows-3 gap-0.5 border border-slate-300 transition-transform ${
          isRolling ? 'animate-bounce rotate-12 scale-105' : 'shadow-black/50'
        }`}
      >
        {dots.map((row, r) =>
          row.map((active, c) => (
            <div key={`${r}-${c}`} className="flex items-center justify-center">
              {active && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-900" />}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 11x11 Square Grid Board */}
      <div className="relative w-full max-w-[620px] aspect-square rounded-3xl bg-[#08090d] border-2 border-slate-800 shadow-2xl p-1.5 sm:p-2.5 overflow-hidden">
        <div className="grid grid-cols-11 grid-rows-11 w-full h-full gap-0.5 rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/80 relative">
          
          {/* ========================================================= */}
          {/* 40 PERIMETER TILES */}
          {/* ========================================================= */}
          {TILES.map((tile) => {
            const propState = properties[tile.id];
            const owner = propState && propState.ownerId !== null ? players.find((p) => p.id === propState.ownerId) : null;
            const group = tile.group ? COLOR_GROUPS[tile.group] : null;

            // Find all players currently standing on this space
            const occupants = players.filter((p) => p.position === tile.id && !p.bankrupt);
            const isCorner = tile.type === 'corner';

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
                  owner ? 'border-amber-400/40' : 'border-slate-800/60'
                } ${
                  isCorner
                    ? 'bg-gradient-to-br from-[#191c2b] to-[#11131c]'
                    : 'bg-[#121422] hover:bg-[#181b2e]'
                }`}
              >
                {/* 1. Property Color Band */}
                {group && (
                  <div
                    className={`w-full h-1.5 sm:h-2.5 rounded-t-sm shrink-0 shadow-xs ${group.bgClass}`}
                  />
                )}

                {/* 2. Space Icon / Banner */}
                <div className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden py-0.5">
                  {tile.type === 'station' && (
                    <Train className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-400 mb-0.5 shrink-0" />
                  )}
                  {tile.type === 'utility' && (
                    tile.id === 12 ? (
                      <Zap className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400 mb-0.5 shrink-0" />
                    ) : (
                      <Droplets className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-cyan-400 mb-0.5 shrink-0" />
                    )
                  )}
                  {tile.type === 'tax' && (
                    <Gem className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-400 mb-0.5 shrink-0" />
                  )}
                  {tile.icon && tile.type !== 'station' && tile.type !== 'utility' && tile.type !== 'tax' && (
                    <span className="text-[10px] sm:text-base leading-none mb-0.5">{tile.icon}</span>
                  )}

                  <span className="text-[7px] sm:text-[9px] font-black font-display text-slate-100 uppercase leading-tight truncate w-full px-0.5">
                    {tile.name}
                  </span>

                  {tile.cost && (
                    <span className="text-[6.5px] sm:text-[8px] font-mono font-bold text-amber-400 leading-none mt-0.5">
                      ₹{tile.cost}
                    </span>
                  )}
                  {tile.taxAmount && (
                    <span className="text-[6.5px] sm:text-[8px] font-mono font-bold text-rose-400 leading-none mt-0.5">
                      Pay ₹{tile.taxAmount}
                    </span>
                  )}
                </div>

                {/* 3. Owner & House Indicator */}
                {owner && (
                  <div
                    className="w-full flex items-center justify-between px-0.5 py-0.2 rounded-xs text-[6px] sm:text-[7.5px] font-mono font-bold text-white shadow-xs"
                    style={{ backgroundColor: owner.colorHex }}
                  >
                    <span className="truncate max-w-[28px] sm:max-w-[40px]">{owner.name.split(' ')[0]}</span>
                    {propState.houses > 0 && (
                      <span className="flex items-center gap-0.5 bg-black/40 px-0.5 rounded">
                        {propState.houses === 5 ? (
                          <Building2 className="w-2 h-2 text-yellow-300" />
                        ) : (
                          <>
                            <Home className="w-2 h-2 text-emerald-300" />
                            <span>{propState.houses}</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* 4. Occupying Player Pawns */}
                {occupants.length > 0 && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center gap-0.5 pointer-events-none p-0.5 flex-wrap">
                    {occupants.map((occ) => (
                      <div
                        key={occ.id}
                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[11px] shadow-lg ring-1.5 ring-white transition-all transform ${
                          occ.id === activePlayer.id ? 'scale-115 ring-amber-300 animate-pulse' : 'scale-90'
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
            className="relative flex flex-col justify-between p-3 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c2a1a] via-[#091a13] to-[#07130e] border border-emerald-900/40 shadow-inner overflow-hidden"
          >
            {/* Background Texture & Watermark */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-black text-3xl sm:text-5xl text-emerald-500/10 tracking-widest uppercase pointer-events-none select-none text-center transform -rotate-12">
              BUSINESS<br />TYCOON
            </div>

            {/* Top Center: Active Player Pill & Status */}
            <div className="z-10 flex items-center justify-between gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-base sm:text-lg shadow-md border border-white/30 shrink-0"
                  style={{ backgroundColor: activePlayer.colorHex }}
                >
                  {activePlayer.tokenEmoji}
                </div>
                <div className="text-left min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Current Turn
                  </span>
                  <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                    <span>{activePlayer.name}</span>
                    <span className="text-emerald-400 font-mono">₹{activePlayer.money}</span>
                    {activePlayer.inJail && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        In Jail
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dice roll visual */}
              <div className="flex items-center gap-2">
                {renderDiceFace(dice[0])}
                {renderDiceFace(dice[1])}
              </div>
            </div>

            {/* Middle Message Feed Banner */}
            <div className="z-10 my-auto py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-center">
              <p className="text-xs sm:text-sm font-body font-semibold text-slate-200 leading-snug">
                {actionMessage}
              </p>
            </div>

            {/* Bottom Actions Hub */}
            <div className="z-10 flex flex-col gap-2">
              {/* If In Jail, provide Jail Decisions */}
              {activePlayer.inJail && phase === 'roll' && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onPayJailBail();
                      }}
                      disabled={activePlayer.money < 50}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Pay ₹50 Bail</span>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playClick();
                        onRollDice();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-mono font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Use 'Get Out of Jail' Card ({activePlayer.jailCards} available)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Standard Roll Dice */}
              {!activePlayer.inJail && phase === 'roll' && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onRollDice();
                  }}
                  disabled={isRolling}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm font-mono uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="text-base">🎲</span>
                  <span>{isRolling ? 'Rolling Dice...' : 'Roll Dice & Move'}</span>
                </button>
              )}

              {/* Action Needed: Buy Property or Pass */}
              {phase === 'action_needed' && isPurchasable && currentTile && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onBuyProperty();
                    }}
                    disabled={activePlayer.money < (currentTile.cost || 0)}
                    className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-black text-xs uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Buy (₹{currentTile.cost})</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onPassTurn();
                    }}
                    className="py-3 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-mono font-bold text-xs uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Pass</span>
                  </button>
                </div>
              )}

              {/* Turn Ready: End Turn button */}
              {phase === 'turn_ready' && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onEndTurn();
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>End Turn & Next Player</span>
                  <ArrowDownLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
