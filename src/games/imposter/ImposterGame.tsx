import React, { useState } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { getRandomWord, IMPOSTER_CATEGORIES } from './wordBank';
import confetti from 'canvas-confetti';
import {
  Eye,
  EyeOff,
  Send,
  Vote,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { navigate } from '../../lib/router';

type GamePhase =
  | 'setup'
  | 'roleReveal'
  | 'clueRound'
  | 'voting'
  | 'voteResults'
  | 'imposterGuess'
  | 'winner';

interface Player {
  id: number;
  name: string;
  isImposter: boolean;
  clue?: string;
  votedForId?: number;
}

export const ImposterGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'imposter') || {
    id: 'imposter',
    name: 'Imposter',
    description: 'Social deduction party game. Find who doesn’t know the secret word!',
    icon: '🕵️‍♂️',
    category: 'Party',
    playerCount: '3–8 Players',
    difficulty: 'Casual',
    tier: 3,
    howToPlay: [
      'Everyone knows the secret word except ONE Imposter.',
      'Take turns giving a 1-word or short clue about the secret word.',
      'Discuss and privately vote for who you think is the Imposter.',
      'If caught, the Imposter gets one final chance to guess the secret word!'
    ],
    controls: [{ key: 'Pass & Play', action: 'Private reveal & voting' }],
    tags: ['imposter', 'party', 'social', 'words']
  };

  // Setup state
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Aryan',
    'Rahul',
    'Sam',
    'Alex',
    'Maya',
    'Leo',
    'Zack',
    'Elena'
  ]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('random');

  // Round game state
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [secretCategory, setSecretCategory] = useState<{ name: string; icon: string }>({
    name: 'Food',
    icon: '🍕'
  });
  const [secretWord, setSecretWord] = useState<string>('');

  // Phase sub-states
  const [revealPlayerIdx, setRevealPlayerIdx] = useState<number>(0);
  const [isRoleRevealed, setIsRoleRevealed] = useState<boolean>(false);

  // Clue phase
  const [cluePlayerIdx, setCluePlayerIdx] = useState<number>(0);
  const [currentClueInput, setCurrentClueInput] = useState<string>('');

  // Voting phase
  const [votingPlayerIdx, setVotingPlayerIdx] = useState<number>(0);
  const [isVoteScreenRevealed, setIsVoteScreenRevealed] = useState<boolean>(false);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<number | null>(null);

  // Vote Results & Tie state
  const [voteCounts, setVoteCounts] = useState<{ [playerId: number]: number }>({});
  const [accusedPlayer, setAccusedPlayer] = useState<Player | null>(null);
  const [tiedPlayerIds, setTiedPlayerIds] = useState<number[]>([]);

  // Imposter Guess state
  const [imposterGuessInput, setImposterGuessInput] = useState<string>('');
  const [isImposterGuessRevealed, setIsImposterGuessRevealed] = useState<boolean>(false);

  // Winner state
  const [winnerTeam, setWinnerTeam] = useState<'citizens' | 'imposter'>('citizens');
  const [winReason, setWinReason] = useState<string>('');

  // -------------------------------------------------------------
  // START GAME LOGIC
  // -------------------------------------------------------------
  const startNewRound = (customNames?: string[]) => {
    sounds.playClick();

    // 1. Pick Category & Secret Word
    let chosenCategory = { name: '', icon: '' };
    let chosenWord = '';

    if (selectedCategoryName === 'random') {
      const generated = getRandomWord();
      chosenCategory = { name: generated.category, icon: generated.icon };
      chosenWord = generated.word;
    } else {
      const foundCat = IMPOSTER_CATEGORIES.find((c) => c.name === selectedCategoryName) || IMPOSTER_CATEGORIES[0];
      const randomWord = foundCat.words[Math.floor(Math.random() * foundCat.words.length)];
      chosenCategory = { name: foundCat.name, icon: foundCat.icon };
      chosenWord = randomWord;
    }

    setSecretCategory(chosenCategory);
    setSecretWord(chosenWord);

    // 2. Setup Players & Pick Random Imposter
    const activeNames = (customNames || playerNames).slice(0, playerCount);
    const chosenImposterId = Math.floor(Math.random() * playerCount);

    const initialPlayers: Player[] = activeNames.map((name, idx) => ({
      id: idx,
      name: name.trim() || `Player ${idx + 1}`,
      isImposter: idx === chosenImposterId,
      clue: '',
      votedForId: undefined
    }));

    setPlayers(initialPlayers);

    // Reset sub-states
    setRevealPlayerIdx(0);
    setIsRoleRevealed(false);
    setCluePlayerIdx(0);
    setCurrentClueInput('');
    setVotingPlayerIdx(0);
    setIsVoteScreenRevealed(false);
    setSelectedVoteTargetId(null);
    setAccusedPlayer(null);
    setTiedPlayerIds([]);
    setImposterGuessInput('');
    setIsImposterGuessRevealed(false);

    setPhase('roleReveal');
  };

  // -------------------------------------------------------------
  // ROLE REVEAL STEP
  // -------------------------------------------------------------
  const handleRevealRole = () => {
    sounds.playClick();
    setIsRoleRevealed(true);
  };

  const handleNextPlayerRole = () => {
    sounds.playClick();
    if (revealPlayerIdx + 1 < players.length) {
      setRevealPlayerIdx(revealPlayerIdx + 1);
      setIsRoleRevealed(false);
    } else {
      // All players have viewed their role -> move to clue phase
      setPhase('clueRound');
      setCluePlayerIdx(0);
      setCurrentClueInput('');
    }
  };

  // -------------------------------------------------------------
  // CLUE PHASE STEP
  // -------------------------------------------------------------
  const handleSubmitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClueInput.trim()) return;

    sounds.playClick();
    const updated = [...players];
    updated[cluePlayerIdx].clue = currentClueInput.trim();
    setPlayers(updated);
    setCurrentClueInput('');

    if (cluePlayerIdx + 1 < players.length) {
      setCluePlayerIdx(cluePlayerIdx + 1);
    } else {
      // All clues submitted -> proceed to voting setup
      setPhase('voting');
      setVotingPlayerIdx(0);
      setIsVoteScreenRevealed(false);
      setSelectedVoteTargetId(null);
    }
  };

  // -------------------------------------------------------------
  // VOTING PHASE STEP
  // -------------------------------------------------------------
  const handleRevealVotingScreen = () => {
    sounds.playClick();
    setIsVoteScreenRevealed(true);
    setSelectedVoteTargetId(null);
  };

  const handleCastVote = () => {
    if (selectedVoteTargetId === null) return;
    sounds.playClick();

    const updated = [...players];
    updated[votingPlayerIdx].votedForId = selectedVoteTargetId;
    setPlayers(updated);

    if (votingPlayerIdx + 1 < players.length) {
      setVotingPlayerIdx(votingPlayerIdx + 1);
      setIsVoteScreenRevealed(false);
      setSelectedVoteTargetId(null);
    } else {
      // All votes cast -> calculate results!
      tallyVotes(updated);
    }
  };

  const tallyVotes = (finalPlayers: Player[]) => {
    const counts: { [id: number]: number } = {};
    finalPlayers.forEach((p) => {
      counts[p.id] = 0;
    });

    finalPlayers.forEach((p) => {
      if (p.votedForId !== undefined) {
        counts[p.votedForId] = (counts[p.votedForId] || 0) + 1;
      }
    });

    setVoteCounts(counts);

    // Find highest votes
    let maxVotes = -1;
    let leaders: number[] = [];

    Object.entries(counts).forEach(([idStr, votes]) => {
      const id = Number(idStr);
      if (votes > maxVotes) {
        maxVotes = votes;
        leaders = [id];
      } else if (votes === maxVotes) {
        leaders.push(id);
      }
    });

    if (leaders.length > 1) {
      // Tie detected
      setTiedPlayerIds(leaders);
      setAccusedPlayer(null);
      setPhase('voteResults');
    } else {
      const topAccused = finalPlayers.find((p) => p.id === leaders[0])!;
      setAccusedPlayer(topAccused);
      setTiedPlayerIds([]);
      setPhase('voteResults');
    }
  };

  const handleBreakTieRandomly = () => {
    sounds.playClick();
    const luckyId = tiedPlayerIds[Math.floor(Math.random() * tiedPlayerIds.length)];
    const chosen = players.find((p) => p.id === luckyId)!;
    setAccusedPlayer(chosen);
    setTiedPlayerIds([]);
  };

  // -------------------------------------------------------------
  // POST-VOTING ACTION (Imposter Caught vs Innocent Executed)
  // -------------------------------------------------------------
  const handleProceedAfterResults = () => {
    sounds.playClick();
    if (!accusedPlayer) return;

    if (accusedPlayer.isImposter) {
      // Imposter was caught! Transition to final guess
      setPhase('imposterGuess');
      setIsImposterGuessRevealed(false);
      setImposterGuessInput('');
    } else {
      // Innocent player was wrongfully voted out -> Imposter wins!
      const actualImposter = players.find((p) => p.isImposter)!;
      setWinnerTeam('imposter');
      setWinReason(
        `The citizens falsely accused ${accusedPlayer.name}! The real Imposter was ${actualImposter.name}.`
      );
      sounds.playGameOver();
      setPhase('winner');
    }
  };

  // -------------------------------------------------------------
  // IMPOSTER FINAL GUESS STEP
  // -------------------------------------------------------------
  const handleSubmitImposterGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imposterGuessInput.trim()) return;

    sounds.playClick();
    const cleanGuess = imposterGuessInput.trim().toLowerCase().replace(/^the\s+/, '');
    const cleanWord = secretWord.trim().toLowerCase().replace(/^the\s+/, '');

    const isCorrect =
      cleanGuess === cleanWord ||
      cleanGuess + 's' === cleanWord ||
      cleanGuess === cleanWord + 's';

    const actualImposter = players.find((p) => p.isImposter)!;

    if (isCorrect) {
      // Imposter wins by guessing the word!
      setWinnerTeam('imposter');
      setWinReason(
        `${actualImposter.name} was caught, but correctly guessed the secret word "${secretWord}"!`
      );
      sounds.playWin();
      setPhase('winner');
    } else {
      // Citizens win!
      setWinnerTeam('citizens');
      setWinReason(
        `Citizens successfully caught the Imposter (${actualImposter.name})! Imposter's guess "${imposterGuessInput}" was incorrect.`
      );
      sounds.playWin();
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setPhase('winner');
    }
  };

  // =============================================================
  // RENDER: Current Player Helpers
  // =============================================================
  const currentRevealPlayer = players[revealPlayerIdx];
  const currentCluePlayer = players[cluePlayerIdx];
  const currentVotingPlayer = players[votingPlayerIdx];
  const imposterPlayer = players.find((p) => p.isImposter);

  return (
    <GameLayout game={gameInfo} onRestart={() => setPhase('setup')}>
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4 py-6 select-none font-body">
        {/* ========================================================= */}
        {/* PHASE 1: SETUP PHASE                                      */}
        {/* ========================================================= */}
        {phase === 'setup' && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-4xl mb-2 inline-block">🕵️‍♂️</span>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
                IMPOSTER
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                One player doesn't know the secret word. Give subtle clues, interrogate, and catch the spy!
              </p>
            </div>

            {/* Player Count Selector */}
            <div className="mb-6">
              <label className="block text-xs font-mono-telemetry uppercase text-slate-400 mb-2 flex items-center justify-between">
                <span>Select Number of Players:</span>
                <span className="text-violet-400 font-bold">{playerCount} PLAYERS</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[3, 4, 5, 6, 7, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      sounds.playClick();
                      setPlayerCount(count);
                    }}
                    className={`py-2.5 rounded-xl text-sm font-display font-bold transition-all cursor-pointer ${
                      playerCount === count
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-105'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
                    }`}
                  >
                    {count}P
                  </button>
                ))}
              </div>
            </div>

            {/* Player Names Configuration */}
            <div className="mb-6">
              <label className="block text-xs font-mono-telemetry uppercase text-slate-400 mb-2">
                Customize Player Names:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {Array.from({ length: playerCount }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-mono-telemetry text-slate-500 text-right">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      maxLength={18}
                      value={playerNames[idx] || ''}
                      onChange={(e) => {
                        const copy = [...playerNames];
                        copy[idx] = e.target.value;
                        setPlayerNames(copy);
                      }}
                      placeholder={`Player ${idx + 1}`}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div className="mb-8">
              <label className="block text-xs font-mono-telemetry uppercase text-slate-400 mb-2 flex items-center justify-between">
                <span>Select Word Category:</span>
                <span className="text-amber-400 text-xs">12 Categories Available</span>
              </label>
              <select
                value={selectedCategoryName}
                onChange={(e) => setSelectedCategoryName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-200 text-sm focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="random">🎲 Random Category (Recommended)</option>
                {IMPOSTER_CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Button */}
            <button
              onClick={() => startNewRound()}
              className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Secret Round</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 2: PRIVATE ROLE REVEAL                              */}
        {/* ========================================================= */}
        {phase === 'roleReveal' && currentRevealPlayer && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 text-center border border-slate-800 shadow-2xl">
            <div className="text-xs font-mono-telemetry text-slate-400 uppercase tracking-wider mb-2">
              Private Role Reveal • Player {revealPlayerIdx + 1} of {players.length}
            </div>

            {!isRoleRevealed ? (
              /* Privacy Barrier Screen */
              <div className="py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-violet-950/50 border border-violet-500/30 flex items-center justify-center text-4xl shadow-inner animate-pulse">
                  📱
                </div>
                <h3 className="text-sm font-mono-telemetry uppercase text-slate-400 mb-1">
                  Pass the device to:
                </h3>
                <h2 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
                  {currentRevealPlayer.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-8">
                  Keep the screen hidden from everyone else before tapping reveal!
                </p>

                <button
                  onClick={handleRevealRole}
                  className="px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2.5 mx-auto cursor-pointer transition-all"
                >
                  <Eye className="w-5 h-5" />
                  <span>Reveal My Secret Role</span>
                </button>
              </div>
            ) : (
              /* Role is Revealed */
              <div className="py-4 animate-fadeIn">
                <h3 className="text-xs font-mono-telemetry uppercase text-slate-400 mb-1">
                  Role for {currentRevealPlayer.name}
                </h3>

                {currentRevealPlayer.isImposter ? (
                  /* Imposter View */
                  <div className="my-6 p-6 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 shadow-xl">
                    <span className="text-5xl inline-block mb-3 animate-bounce">🕵️‍♂️</span>
                    <h2 className="font-display text-3xl sm:text-4xl font-black text-rose-300 tracking-tight mb-2">
                      YOU ARE THE IMPOSTER!
                    </h2>
                    <p className="text-xs font-mono-telemetry uppercase text-rose-400 font-bold mb-4">
                      Category: {secretCategory.icon} {secretCategory.name}
                    </p>
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                      <p className="font-bold text-white mb-1">⚠️ You do NOT know the secret word.</p>
                      <p>
                        Listen to others' clues, fake confidence, and blend in. If you are caught, you can still win by guessing the secret word!
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Citizen / Innocent View */
                  <div className="my-6 p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/60 shadow-xl">
                    <span className="text-5xl inline-block mb-3">🛡️</span>
                    <h2 className="font-display text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight mb-1">
                      YOU ARE INNOCENT
                    </h2>
                    <p className="text-xs font-mono-telemetry uppercase text-emerald-400 font-bold mb-4">
                      Category: {secretCategory.icon} {secretCategory.name}
                    </p>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 mb-4 inline-block min-w-[240px]">
                      <span className="text-[11px] font-mono-telemetry text-slate-400 uppercase tracking-widest block mb-1">
                        SECRET WORD
                      </span>
                      <span className="font-display text-3xl sm:text-4xl font-black text-white tracking-wider">
                        {secretWord}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                      Give a subtle clue that proves to fellow citizens you know the word, without giving it away to the Imposter!
                    </p>
                  </div>
                )}

                <button
                  onClick={handleNextPlayerRole}
                  className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-display font-bold text-sm shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
                >
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  <span>
                    {revealPlayerIdx + 1 < players.length
                      ? 'Hide & Pass to Next Player'
                      : 'Done! Proceed to Clue Round'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 3: CLUE ROUND                                       */}
        {/* ========================================================= */}
        {phase === 'clueRound' && currentCluePlayer && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <span className="text-xs font-mono-telemetry text-slate-400 uppercase">
                  CLUE PHASE • TURN {cluePlayerIdx + 1} OF {players.length}
                </span>
                <h2 className="font-display text-2xl font-black text-white mt-0.5">
                  {currentCluePlayer.name}'s Turn
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono-telemetry text-amber-400 block">
                  Category: {secretCategory.icon} {secretCategory.name}
                </span>
                <span className="text-[11px] text-slate-500">Secret word is hidden</span>
              </div>
            </div>

            {/* Clue Input Form */}
            <form onSubmit={handleSubmitClue} className="mb-8">
              <label className="block text-xs font-mono-telemetry uppercase text-slate-300 mb-2">
                Type your clue (1–50 characters):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={50}
                  value={currentClueInput}
                  onChange={(e) => setCurrentClueInput(e.target.value)}
                  placeholder="e.g. Delicious, Round, Italian, Crust..."
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={!currentClueInput.trim()}
                  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Submit</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[11px] font-mono-telemetry text-slate-500 mt-1 block">
                {currentClueInput.length}/50 characters
              </span>
            </form>

            {/* Public Clue Board */}
            <div>
              <h3 className="text-xs font-mono-telemetry uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Public Clue Board:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      idx === cluePlayerIdx
                        ? 'bg-violet-950/30 border-violet-500/50 text-white'
                        : p.clue
                        ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                        : 'bg-slate-950/40 border-slate-850/40 text-slate-500'
                    }`}
                  >
                    <span className="font-display font-bold text-sm">{p.name}</span>
                    <span className="text-xs font-mono-telemetry italic">
                      {p.clue ? `"${p.clue}"` : idx === cluePlayerIdx ? 'Typing clue...' : 'Waiting...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 4: PRIVATE VOTING                                    */}
        {/* ========================================================= */}
        {phase === 'voting' && currentVotingPlayer && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 text-center border border-slate-800 shadow-2xl">
            <div className="text-xs font-mono-telemetry text-slate-400 uppercase tracking-wider mb-2">
              Private Voting • Voter {votingPlayerIdx + 1} of {players.length}
            </div>

            {!isVoteScreenRevealed ? (
              /* Phone Pass Screen for Voter */
              <div className="py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-violet-950/50 border border-violet-500/30 flex items-center justify-center text-4xl shadow-inner animate-pulse">
                  🗳️
                </div>
                <h3 className="text-sm font-mono-telemetry uppercase text-slate-400 mb-1">
                  Pass the device to:
                </h3>
                <h2 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
                  {currentVotingPlayer.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-8">
                  Vote privately! No one else will see who you suspect.
                </p>

                <button
                  onClick={handleRevealVotingScreen}
                  className="px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2.5 mx-auto cursor-pointer transition-all"
                >
                  <Vote className="w-5 h-5" />
                  <span>Vote Privately</span>
                </button>
              </div>
            ) : (
              /* Active Voting Screen */
              <div className="py-4 animate-fadeIn">
                <h2 className="font-display text-2xl font-black text-white mb-1">
                  Who is the Imposter?
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  {currentVotingPlayer.name}, tap the player you suspect the most:
                </p>

                {/* Candidate Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {players.map((candidate) => {
                    const isSelf = candidate.id === currentVotingPlayer.id;
                    const isSelected = selectedVoteTargetId === candidate.id;

                    return (
                      <button
                        key={candidate.id}
                        disabled={isSelf}
                        onClick={() => {
                          sounds.playClick();
                          setSelectedVoteTargetId(candidate.id);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelf
                            ? 'opacity-40 bg-slate-950 border-slate-900 cursor-not-allowed'
                            : isSelected
                            ? 'bg-violet-600/25 border-violet-500 ring-2 ring-violet-500/50 shadow-lg text-white scale-102 cursor-pointer'
                            : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-base">
                            {candidate.name} {isSelf && '(You)'}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
                        </div>
                        <p className="text-xs text-slate-400 italic">
                          Clue: "{candidate.clue || 'None'}"
                        </p>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleCastVote}
                  disabled={selectedVoteTargetId === null}
                  className="px-8 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white font-display font-bold text-sm shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {votingPlayerIdx + 1 < players.length
                      ? 'Confirm Vote & Pass Device'
                      : 'Submit Final Vote & Reveal Results'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 5: VOTING RESULTS & TIE RESOLUTION                  */}
        {/* ========================================================= */}
        {phase === 'voteResults' && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 text-center border border-slate-800 shadow-2xl">
            <span className="text-4xl mb-2 inline-block">🗳️</span>
            <h2 className="font-display text-3xl font-black text-white tracking-tight mb-2">
              VOTING RESULTS
            </h2>
            <p className="text-xs font-mono-telemetry text-slate-400 uppercase tracking-wider mb-6">
              Category was: {secretCategory.icon} {secretCategory.name}
            </p>

            {/* Vote Tally List */}
            <div className="space-y-3 mb-8 max-w-md mx-auto">
              {players.map((p) => {
                const votes = voteCounts[p.id] || 0;
                const isAccused = accusedPlayer?.id === p.id;
                const isTied = tiedPlayerIds.includes(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isAccused
                        ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg'
                        : isTied
                        ? 'bg-amber-950/30 border-amber-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-left">
                      <span className="font-display font-bold text-base block">{p.name}</span>
                      <span className="text-xs text-slate-400 italic">Clue: "{p.clue}"</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono-telemetry font-bold text-sm px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                        {votes} {votes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tie Resolution vs Winner Confirmation */}
            {tiedPlayerIds.length > 1 ? (
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 mb-6 max-w-md mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="font-display font-bold text-amber-300 text-lg mb-1">
                  Tie Detected!
                </h3>
                <p className="text-xs text-slate-300 mb-4">
                  {tiedPlayerIds.map((id) => players.find((p) => p.id === id)?.name).join(' & ')} tied for the highest votes.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleBreakTieRandomly}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-display font-bold text-xs shadow-md cursor-pointer transition-all"
                  >
                    ⚡ Sudden-Death Tiebreaker
                  </button>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setPhase('voting');
                      setVotingPlayerIdx(0);
                      setIsVoteScreenRevealed(false);
                      setSelectedVoteTargetId(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-xs cursor-pointer transition-all"
                  >
                    🔄 Run Full Revote
                  </button>
                </div>
              </div>
            ) : accusedPlayer ? (
              <div>
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6 max-w-md mx-auto">
                  <span className="text-xs font-mono-telemetry text-slate-400 uppercase tracking-widest block mb-1">
                    MOST ACCUSED PLAYER
                  </span>
                  <span className="font-display text-3xl font-black text-rose-400 tracking-tight block">
                    {accusedPlayer.name}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Received {voteCounts[accusedPlayer.id] || 0} votes
                  </span>
                </div>

                <button
                  onClick={handleProceedAfterResults}
                  className="px-8 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
                >
                  <span>Reveal If {accusedPlayer.name} Is The Imposter</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 6: IMPOSTER'S FINAL GUESS CHANCE                   */}
        {/* ========================================================= */}
        {phase === 'imposterGuess' && imposterPlayer && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 text-center border-2 border-rose-500/60 shadow-2xl">
            <div className="text-xs font-mono-telemetry text-rose-400 uppercase tracking-wider mb-2">
              🚨 IMPOSTER CAUGHT! FINAL RECKONING
            </div>

            {!isImposterGuessRevealed ? (
              /* Pass device to caught Imposter */
              <div className="py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-4xl shadow-inner animate-pulse">
                  🕵️‍♂️
                </div>
                <h3 className="text-sm font-mono-telemetry uppercase text-slate-400 mb-1">
                  Pass the device to the Imposter:
                </h3>
                <h2 className="font-display text-4xl sm:text-5xl font-black text-rose-300 tracking-tight mb-4">
                  {imposterPlayer.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto mb-8">
                  You were caught! But you get ONE final chance to steal the victory.
                </p>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setIsImposterGuessRevealed(true);
                  }}
                  className="px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
                >
                  <span>I Am Ready to Guess</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* Final Guess Form */
              <div className="py-4 animate-fadeIn">
                <h2 className="font-display text-3xl font-black text-white mb-2">
                  Guess the Secret Word!
                </h2>
                <p className="text-xs font-mono-telemetry text-amber-400 uppercase tracking-widest mb-6">
                  Category: {secretCategory.icon} {secretCategory.name}
                </p>

                <form onSubmit={handleSubmitImposterGuess} className="max-w-md mx-auto mb-6">
                  <div className="mb-4">
                    <input
                      type="text"
                      maxLength={40}
                      value={imposterGuessInput}
                      onChange={(e) => setImposterGuessInput(e.target.value)}
                      placeholder="Enter secret word..."
                      autoFocus
                      className="w-full px-5 py-4 rounded-2xl bg-slate-900 border-2 border-slate-700 text-white text-lg font-display font-bold text-center focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!imposterGuessInput.trim()}
                    className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white font-display font-bold text-base shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Submit Final Guess & Reveal Winner</span>
                  </button>
                </form>

                <p className="text-[11px] text-slate-500">
                  Tip: Minor plural differences are accepted. Make your best deduction based on clues!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 7: WINNER SCREEN                                    */}
        {/* ========================================================= */}
        {phase === 'winner' && (
          <div className="w-full arcade-card rounded-3xl p-6 sm:p-8 text-center border border-slate-800 shadow-2xl animate-fadeIn">
            {winnerTeam === 'citizens' ? (
              <div className="mb-6">
                <span className="text-6xl inline-block mb-3 animate-bounce">🎉</span>
                <h1 className="font-display text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight mb-2">
                  CITIZENS WIN!
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
                  {winReason}
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <span className="text-6xl inline-block mb-3 animate-pulse">😈</span>
                <h1 className="font-display text-4xl sm:text-5xl font-black text-rose-400 tracking-tight mb-2">
                  IMPOSTER WINS!
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
                  {winReason}
                </p>
              </div>
            )}

            {/* Secret Word Showcase */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-8 max-w-sm mx-auto">
              <span className="text-[11px] font-mono-telemetry text-slate-400 uppercase tracking-widest block mb-1">
                SECRET WORD ({secretCategory.icon} {secretCategory.name})
              </span>
              <span className="font-display text-3xl font-black text-white tracking-wider block">
                {secretWord}
              </span>
              <span className="text-xs text-slate-400 mt-2 block">
                Imposter was: <strong className="text-rose-400">{imposterPlayer?.name}</strong>
              </span>
            </div>

            {/* Round Clue Recap */}
            <div className="mb-8 max-w-md mx-auto text-left">
              <span className="text-xs font-mono-telemetry text-slate-400 uppercase tracking-wider block mb-2">
                Round Clue Recap:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between text-xs"
                  >
                    <span className="font-display font-bold text-slate-200">
                      {p.name} {p.isImposter && '🕵️‍♂️ (Imposter)'}
                    </span>
                    <span className="font-mono-telemetry text-slate-400 italic">
                      "{p.clue || 'No clue'}"
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={() => startNewRound()}
                className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-display font-bold text-sm shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again (Same Players)</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setPhase('setup');
                }}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-display font-bold text-sm cursor-pointer transition-all"
              >
                Change Players
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  navigate('/');
                }}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-display font-bold text-sm cursor-pointer transition-all"
              >
                Back to Games
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};
