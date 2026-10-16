import React, { useState } from 'react';
import type { Player, AiDifficulty } from './types';
import { DEFAULT_PLAYERS } from './boardData';
import { Users, Bot, Play } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface SetupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (players: Player[], startingCash: number) => void;
}

export const SetupDrawer: React.FC<SetupDrawerProps> = ({ isOpen, onClose, onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [startingCash, setStartingCash] = useState<number>(1500);

  const [playersConfig, setPlayersConfig] = useState<
    Array<{
      name: string;
      isAi: boolean;
      aiDifficulty: AiDifficulty;
    }>
  >([
    { name: 'You (Tycoon)', isAi: false, aiDifficulty: 'medium' },
    { name: 'Ambani AI', isAi: true, aiDifficulty: 'hard' },
    { name: 'Tata AI', isAi: true, aiDifficulty: 'medium' },
    { name: 'Adani AI', isAi: true, aiDifficulty: 'easy' }
  ]);

  if (!isOpen) return null;

  const updatePlayer = (
    index: number,
    field: 'name' | 'isAi' | 'aiDifficulty',
    value: string | boolean
  ) => {
    setPlayersConfig((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleStart = () => {
    sounds.playClick();
    const active = DEFAULT_PLAYERS.slice(0, playerCount).map((base, idx) => ({
      ...base,
      name: playersConfig[idx].name.trim() || `Player ${idx + 1}`,
      isAi: playersConfig[idx].isAi,
      aiDifficulty: playersConfig[idx].aiDifficulty,
      money: startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      bankrupt: false
    }));

    onStartGame(active, startingCash);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c0e17] border border-white/15 p-5 sm:p-6 shadow-2xl relative select-none max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-2xl mx-auto mb-2 shadow-inner">
            🏛️
          </div>
          <h2 className="text-2xl font-black font-display text-white tracking-tight">
            Business Tycoon Setup
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Configure Indian property board players and AI tycoons
          </p>
        </div>

        {/* 1. Player Count Selection */}
        <div className="mb-5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
            Number of Players:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setPlayerCount(cnt);
                }}
                className={`py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  playerCount === cnt
                    ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md shadow-orange-500/20'
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.07]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{cnt} Players</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Starting Capital */}
        <div className="mb-5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
            Starting Capital:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '₹1,000 (Fast)', val: 1000 },
              { label: '₹1,500 (Standard)', val: 1500 },
              { label: '₹2,000 (Tycoon)', val: 2000 }
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setStartingCash(opt.val);
                }}
                className={`py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer border ${
                  startingCash === opt.val
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.07]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Player Slots List */}
        <div className="mb-6 space-y-2.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
            Player Roster & AI Settings:
          </label>
          {Array.from({ length: playerCount }).map((_, idx) => {
            const base = DEFAULT_PLAYERS[idx];
            const cfg = playersConfig[idx];

            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md shrink-0 border border-white/20"
                    style={{ backgroundColor: base.colorHex }}
                  >
                    <span>{base.tokenEmoji}</span>
                  </div>
                  <input
                    type="text"
                    value={cfg.name}
                    onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                    maxLength={16}
                    placeholder={`Player ${idx + 1}`}
                    className="bg-black/40 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 w-36 sm:w-40"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Human / AI Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      updatePlayer(idx, 'isAi', !cfg.isAi);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                      cfg.isAi
                        ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                        : 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                    }`}
                  >
                    {cfg.isAi ? <Bot className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    <span>{cfg.isAi ? 'AI' : 'Human'}</span>
                  </button>

                  {/* AI Difficulty */}
                  {cfg.isAi && (
                    <select
                      value={cfg.aiDifficulty}
                      onChange={(e) => updatePlayer(idx, 'aiDifficulty', e.target.value)}
                      className="bg-black/60 border border-white/20 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="easy">Casual</option>
                      <option value="medium">Balanced</option>
                      <option value="hard">Master</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Business Tycoon</span>
        </button>
      </div>
    </div>
  );
};
