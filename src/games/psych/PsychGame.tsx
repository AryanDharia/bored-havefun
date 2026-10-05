import React, { useState } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Send, ArrowRight } from 'lucide-react';

interface PromptItem {
  question: string;
  realAnswer: string;
}

const PSYCH_PROMPTS: PromptItem[] = [
  {
    question: "What was the original 1996 codename for Google's search engine?",
    realAnswer: "BackRub",
  },
  {
    question: "In 2008, what did Norway officially knight?",
    realAnswer: "A penguin named Nils Olav",
  },
  {
    question: "What is the collective noun for a group of flamingos?",
    realAnswer: "A flamboyance",
  },
  {
    question: "What did British inventor Ron Horn invent in 1965 to keep cows calm?",
    realAnswer: "Artificial cow chewing sounds",
  },
  {
    question: "What is technically illegal to own just one of in Switzerland because they get lonely?",
    realAnswer: "A guinea pig",
  },
  {
    question: "What were the first basketball hoops originally made from?",
    realAnswer: "Peach baskets",
  },
  {
    question: "What color was the original Statue of Liberty before oxidation?",
    realAnswer: "Shiny copper brown",
  },
];

type Phase = 'setup' | 'bluff' | 'voting' | 'reveal' | 'roundOver';

interface Player {
  id: number;
  name: string;
  score: number;
}

interface SubmittedAnswer {
  playerId: number | 'real';
  text: string;
  votes: number[]; // playerIds who voted for this
}

export const PsychGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'psych')!;

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['Alice', 'Bob', 'Charlie']);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPromptIdx, setCurrentPromptIdx] = useState<number>(0);

  // Bluff submission step
  const [bluffingPlayerIdx, setBluffingPlayerIdx] = useState<number>(0);
  const [bluffInput, setBluffInput] = useState<string>('');
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  // Voting step
  const [votingPlayerIdx, setVotingPlayerIdx] = useState<number>(0);
  const [roundVotes, setRoundVotes] = useState<{ [playerId: number]: number }>({}); // voterId -> answerIdx

  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winnerName, setWinnerName] = useState<string>('');

  const currentPrompt = PSYCH_PROMPTS[currentPromptIdx % PSYCH_PROMPTS.length];

  const handleStartGame = () => {
    const list = playerNames
      .filter((n) => n.trim().length > 0)
      .map((name, idx) => ({ id: idx, name: name.trim(), score: 0 }));

    if (list.length < 2) return;

    setPlayers(list);
    setBluffingPlayerIdx(0);
    setBluffInput('');
    setAnswers([]);
    setPhase('bluff');
    sounds.playScore();
  };

  const handleSubmitBluff = () => {
    if (!bluffInput.trim()) return;
    sounds.playClick();

    const newAnswer: SubmittedAnswer = {
      playerId: players[bluffingPlayerIdx].id,
      text: bluffInput.trim(),
      votes: [],
    };

    const nextAnswers = [...answers, newAnswer];
    setAnswers(nextAnswers);
    setBluffInput('');

    if (bluffingPlayerIdx + 1 < players.length) {
      setBluffingPlayerIdx((prev) => prev + 1);
    } else {
      const realAnswerItem: SubmittedAnswer = {
        playerId: 'real',
        text: currentPrompt.realAnswer,
        votes: [],
      };
      const fullList: SubmittedAnswer[] = [...nextAnswers, realAnswerItem].sort(() => Math.random() - 0.5);

      setAnswers(fullList);
      setVotingPlayerIdx(0);
      setRoundVotes({});
      setPhase('voting');
    }
  };

  const handleCastVote = (answerIdx: number) => {
    sounds.playClick();
    const voter = players[votingPlayerIdx];

    const nextVotes = { ...roundVotes, [voter.id]: answerIdx };
    setRoundVotes(nextVotes);

    if (votingPlayerIdx + 1 < players.length) {
      setVotingPlayerIdx((prev) => prev + 1);
    } else {
      // Everyone voted! Calculate points
      calculateScores(nextVotes);
      setPhase('reveal');
      sounds.playWin();
    }
  };

  const calculateScores = (allVotes: { [playerId: number]: number }) => {
    const nextPlayers = [...players];

    Object.entries(allVotes).forEach(([voterIdStr, ansIdx]) => {
      const voterId = Number(voterIdStr);
      const chosen = answers[ansIdx];

      if (chosen.playerId === 'real') {
        // Correct answer! 100 points
        const voter = nextPlayers.find((p) => p.id === voterId);
        if (voter) voter.score += 100;
      } else {
        // Fooled! 50 points to the bluffer
        const bluffer = nextPlayers.find((p) => p.id === chosen.playerId);
        if (bluffer && bluffer.id !== voterId) {
          bluffer.score += 50;
        }
      }
    });

    setPlayers(nextPlayers);
  };

  const nextRound = () => {
    if (currentPromptIdx + 1 >= 5) {
      // Game Over after 5 rounds
      const sorted = [...players].sort((a, b) => b.score - a.score);
      setWinnerName(sorted[0].name);
      setGameOver(true);
      return;
    }

    setCurrentPromptIdx((prev) => prev + 1);
    setBluffingPlayerIdx(0);
    setBluffInput('');
    setAnswers([]);
    setRoundVotes({});
    setPhase('bluff');
  };

  const resetAll = () => {
    setPhase('setup');
    setCurrentPromptIdx(0);
    setGameOver(false);
  };

  return (
    <GameLayout game={gameInfo} onRestart={resetAll}>
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* PHASE 1: SETUP PLAYERS */}
        {phase === 'setup' && (
          <div className="w-full bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <span className="text-4xl mb-2 block">🎭</span>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Psych! Bluffing Party</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Gather 2 to 6 friends. Write convincing lies to trick everyone!
            </p>

            <div className="space-y-3 mb-6 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Player Names (Pass & Play)
              </label>
              {playerNames.map((name, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const updated = [...playerNames];
                      updated[idx] = e.target.value;
                      setPlayerNames(updated);
                    }}
                    placeholder={`Player ${idx + 1}`}
                    className="flex-1 bg-[#181a29] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                  {playerNames.length > 2 && (
                    <button
                      onClick={() => setPlayerNames(playerNames.filter((_, i) => i !== idx))}
                      className="px-3 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {playerNames.length < 6 && (
                <button
                  onClick={() => setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`])}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 py-1"
                >
                  + Add another player
                </button>
              )}
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/30 transition-all"
            >
              Start Game ({playerNames.length} Players)
            </button>
          </div>
        )}

        {/* PHASE 2: WRITE BLUFF */}
        {phase === 'bluff' && (
          <div className="w-full bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                Round {currentPromptIdx + 1} of 5
              </span>
              <span className="text-xs text-slate-400">
                Turn {bluffingPlayerIdx + 1} of {players.length}
              </span>
            </div>

            {/* Prompt Question */}
            <div className="bg-[#181a29] border border-slate-700 rounded-2xl p-5 mb-6 text-center">
              <span className="text-[11px] uppercase font-bold text-slate-400">Trivia Question</span>
              <p className="text-base sm:text-lg font-bold text-white mt-1">
                {currentPrompt.question}
              </p>
            </div>

            {/* Current Player Bluff Input */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-bold mb-3">
                <span>Pass device to</span>
                <span className="underline">{players[bluffingPlayerIdx].name}</span>
              </div>
              <p className="text-xs text-slate-400">
                Write a believable fake answer that will fool your friends!
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={bluffInput}
                onChange={(e) => setBluffInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitBluff();
                }}
                placeholder="Type your clever fake answer..."
                className="flex-1 bg-[#181a29] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleSubmitBluff}
                disabled={!bluffInput.trim()}
                className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-sm shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: VOTING */}
        {phase === 'voting' && (
          <div className="w-full bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-1">
                Voting Phase
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {players[votingPlayerIdx].name}: Pick the REAL answer!
              </h3>
            </div>

            <p className="text-xs text-slate-400 text-center mb-5 italic">
              &quot;{currentPrompt.question}&quot;
            </p>

            <div className="space-y-3">
              {answers.map((item, idx) => {
                // Cannot vote for your own submitted bluff!
                const isOwn = item.playerId === players[votingPlayerIdx].id;

                return (
                  <button
                    key={idx}
                    onClick={() => handleCastVote(idx)}
                    disabled={isOwn}
                    className={`w-full p-4 rounded-2xl text-left border text-sm font-semibold transition-all ${
                      isOwn
                        ? 'bg-[#151724] border-slate-800/40 text-slate-600 cursor-not-allowed'
                        : 'bg-[#181a2a] hover:bg-[#20243b] border-slate-700/80 hover:border-violet-500/60 text-white active:scale-98'
                    }`}
                  >
                    <span>{item.text}</span>
                    {isOwn && <span className="text-[10px] ml-2 text-slate-500">(Your bluff)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 4: REVEAL & SCORES */}
        {phase === 'reveal' && (
          <div className="w-full bg-[#121422] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <span className="text-4xl mb-2 block">🎉</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              The Truth Revealed!
            </span>
            <h3 className="text-xl font-black text-white mt-1 mb-5">
              {currentPrompt.realAnswer}
            </h3>

            {/* Answer breakdown */}
            <div className="space-y-3 text-left mb-6">
              {answers.map((item, idx) => {
                const isReal = item.playerId === 'real';
                const authorName = isReal
                  ? 'Real Answer 🏆'
                  : players.find((p) => p.id === item.playerId)?.name;

                // Who voted for this answer?
                const voters = Object.entries(roundVotes)
                  .filter(([_, ansIdx]) => ansIdx === idx)
                  .map(([voterId]) => players.find((p) => p.id === Number(voterId))?.name);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border ${
                      isReal
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-[#181a29] border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-bold text-white">{item.text}</span>
                      <span
                        className={`font-semibold ${
                          isReal ? 'text-emerald-400' : 'text-violet-400'
                        }`}
                      >
                        by {authorName}
                      </span>
                    </div>

                    {voters.length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Fooled: <span className="text-slate-300 font-semibold">{voters.join(', ')}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leaderboard snippet */}
            <div className="bg-[#181a29] rounded-2xl p-4 border border-slate-800 mb-6">
              <span className="text-xs font-bold uppercase text-slate-400 mb-2 block">
                Current Standings
              </span>
              <div className="flex justify-around">
                {players.map((p) => (
                  <div key={p.id}>
                    <span className="text-xs text-slate-400">{p.name}</span>
                    <div className="text-lg font-black text-white">{p.score}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={nextRound}
              className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Next Round</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="🏆 Match Winner!"
        message={`Congratulations ${winnerName}! Master of deception!`}
        onRestart={resetAll}
      />
    </GameLayout>
  );
};
