import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { MultiplayerRoomModal } from '../../components/MultiplayerRoomModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { getRandomWordOptions, type ScribbleWord } from './wordBank';
import { RoomNetwork, type RoomPlayer } from '../../lib/multiplayer/roomNetwork';
import { 
  Paintbrush, 
  Eraser, 
  Trash2, 
  Send, 
  Clock, 
  Trophy, 
  Users 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  isEraser: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isSystem?: boolean;
  isCorrect?: boolean;
}

const PALETTE = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#78350f', '#64748b', '#10b981', '#6366f1'
];

const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 7 },
  { label: 'L', size: 14 },
  { label: 'XL', size: 28 },
];

const TURN_DURATION = 75; // seconds
const TOTAL_ROUNDS = 3;

export const ScribbleGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'scribble') || {
    id: 'scribble',
    name: 'Scribble',
    subtitle: 'Draw a word. Make your friends guess.',
    description: 'Real-time social drawing and guessing multiplayer party game.',
    icon: '🎨',
    category: 'Party',
    additionalCategories: ['Multiplayer'],
    playerCount: '2–8 Players',
    difficulty: 'Easy',
    tier: 4,
    howToPlay: [
      'One player draws the secret word on the shared canvas.',
      'All other players type guesses in the live chat.',
      'The faster you guess the word, the more points you score!',
      'The drawer also scores bonus points when players guess correctly.',
      'Take turns drawing across 3 rounds to crown the Scribble Champion!'
    ],
    controls: [
      { key: 'Mouse / Touch', action: 'Draw on canvas' },
      { key: 'Chat input', action: 'Type your word guess' },
      { key: 'Enter', action: 'Submit guess' }
    ],
    tags: ['scribble', 'draw', 'guess', 'party', 'multiplayer', 'skribbl']
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Multiplayer room state
  const [network, setNetwork] = useState<RoomNetwork | null>(null);
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([
    { id: 'p1', name: 'You', isHost: true, avatarColor: '#8b5cf6', score: 0 },
    { id: 'p2', name: 'Friend', isHost: false, avatarColor: '#ec4899', score: 0 }
  ]);
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState<number>(0);

  // Game cycle
  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<'lobby' | 'word_selection' | 'drawing' | 'round_reveal' | 'game_over'>('lobby');
  const [secretWord, setSecretWord] = useState<string>('');
  const [wordChoices, setWordChoices] = useState<ScribbleWord[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(TURN_DURATION);
  const [guessedPlayerIds, setGuessedPlayerIds] = useState<Set<string>>(new Set());

  // Drawing tools
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(7);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const isDrawingRef = useRef<boolean>(false);
  const lastCoordRef = useRef<{ x: number; y: number } | null>(null);
  const strokeHistoryRef = useRef<Stroke[]>([]);

  // Chat & Guessing
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [guessInput, setGuessInput] = useState<string>('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const currentDrawer = players[currentDrawerIndex % players.length];
  const isMyTurnToDraw = network ? currentDrawer?.id === network.myId : currentDrawerIndex % players.length === 0;

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Masked word hint (e.g. "C _ T" or "_ _ _ _")
  const getMaskedWord = useCallback(() => {
    if (!secretWord) return '';
    if (isMyTurnToDraw || phase === 'round_reveal' || phase === 'game_over') {
      return secretWord;
    }

    const len = secretWord.length;
    // Reveal 1 letter at 45s, 2 letters at 20s
    const chars = secretWord.split('');
    const revealedIndices = new Set<number>();

    if (timeLeft <= 45 && len > 3) {
      revealedIndices.add(0);
    }
    if (timeLeft <= 20 && len > 4) {
      revealedIndices.add(Math.floor(len / 2));
    }

    return chars
      .map((c, i) => {
        if (c === ' ') return '  ';
        if (revealedIndices.has(i)) return c;
        return '_';
      })
      .join(' ');
  }, [secretWord, isMyTurnToDraw, phase, timeLeft]);

  // Handle incoming network messages
  useEffect(() => {
    if (!network) return;

    const unsubs = [
      network.on('SCRIBBLE_DRAW_STROKE', (msg) => {
        const stroke = msg.payload as Stroke;
        renderStroke(stroke);
        strokeHistoryRef.current.push(stroke);
      }),

      network.on('SCRIBBLE_CLEAR_CANVAS', () => {
        clearCanvasLocal();
      }),

      network.on('SCRIBBLE_WORD_CHOSEN', (msg) => {
        const payload = msg.payload as { wordLength: number; drawerIndex: number };
        setCurrentDrawerIndex(payload.drawerIndex);
        setSecretWord('?'.repeat(payload.wordLength)); // Masked placeholder for client
        setPhase('drawing');
        setTimeLeft(TURN_DURATION);
        setGuessedPlayerIds(new Set());
        clearCanvasLocal();
      }),

      network.on('SCRIBBLE_CORRECT_GUESS', (msg) => {
        const payload = msg.payload as { playerId: string; playerName: string; points: number };
        sounds.playScore();
        setGuessedPlayerIds((prev) => new Set([...prev, payload.playerId]));
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.playerId ? { ...p, score: (p.score || 0) + payload.points } : p))
        );
        addChatMessage({
          id: Math.random().toString(),
          sender: 'System',
          text: `🎉 ${payload.playerName} guessed the secret word! (+${payload.points} pts)`,
          isSystem: true,
          isCorrect: true
        });
      }),

      network.on('SCRIBBLE_ROUND_REVEAL', (msg) => {
        const payload = msg.payload as { secretWord: string; players: RoomPlayer[] };
        setSecretWord(payload.secretWord);
        setPlayers(payload.players);
        setPhase('round_reveal');
        sounds.playDice();
      }),

      network.on('SCRIBBLE_CHAT', (msg) => {
        const chat = msg.payload as ChatMessage;
        addChatMessage(chat);
      })
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [network]);

  const addChatMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev.slice(-40), msg]);
  };

  // Canvas Drawing Logic
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const renderStroke = (stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurnToDraw || phase !== 'drawing') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastCoordRef.current = coords;

    // Dot on single tap
    const stroke: Stroke = {
      x0: coords.x,
      y0: coords.y,
      x1: coords.x + 0.1,
      y1: coords.y + 0.1,
      color,
      size: brushSize,
      isEraser,
    };
    renderStroke(stroke);
    strokeHistoryRef.current.push(stroke);

    if (network) {
      network.send('SCRIBBLE_DRAW_STROKE', stroke);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isMyTurnToDraw || phase !== 'drawing') return;
    e.preventDefault();

    const coords = getCanvasCoords(e);
    if (!lastCoordRef.current) {
      lastCoordRef.current = coords;
      return;
    }

    const stroke: Stroke = {
      x0: lastCoordRef.current.x,
      y0: lastCoordRef.current.y,
      x1: coords.x,
      y1: coords.y,
      color,
      size: brushSize,
      isEraser,
    };

    renderStroke(stroke);
    strokeHistoryRef.current.push(stroke);
    lastCoordRef.current = coords;

    if (network) {
      network.send('SCRIBBLE_DRAW_STROKE', stroke);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastCoordRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokeHistoryRef.current = [];
  };

  const handleClearCanvas = () => {
    if (!isMyTurnToDraw) return;
    sounds.playClick();
    clearCanvasLocal();
    if (network) {
      network.send('SCRIBBLE_CLEAR_CANVAS', {});
    }
  };

  // Start Turn: Drawer picks word
  const startWordSelection = useCallback(() => {
    const choices = getRandomWordOptions(3);
    setWordChoices(choices);
    setPhase('word_selection');
  }, []);

  const handleSelectWord = (word: string) => {
    sounds.playMove();
    setSecretWord(word);
    setPhase('drawing');
    setTimeLeft(TURN_DURATION);
    setGuessedPlayerIds(new Set());
    clearCanvasLocal();

    if (network && network.isHost) {
      network.broadcast({
        type: 'SCRIBBLE_WORD_CHOSEN',
        senderId: network.myId,
        senderName: network.myName,
        payload: { wordLength: word.length, drawerIndex: currentDrawerIndex },
        timestamp: Date.now()
      });
    }
  };

  // Guess submission
  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guessInput.trim().toUpperCase();
    if (!clean) return;

    setGuessInput('');

    // If player already guessed or is the drawer
    if (isMyTurnToDraw) {
      addChatMessage({
        id: Math.random().toString(),
        sender: 'You',
        text: clean,
      });
      return;
    }

    const myPlayerId = network ? network.myId : 'p2';
    if (guessedPlayerIds.has(myPlayerId)) {
      addChatMessage({
        id: Math.random().toString(),
        sender: 'You',
        text: clean,
      });
      return;
    }

    // Check guess against secret word
    const isCorrect = clean === secretWord.toUpperCase();

    if (isCorrect) {
      sounds.playScore();
      const earnedPoints = Math.max(100, Math.round((timeLeft / TURN_DURATION) * 450));

      setGuessedPlayerIds((prev) => new Set([...prev, myPlayerId]));
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === myPlayerId) {
            return { ...p, score: (p.score || 0) + earnedPoints };
          }
          if (p.id === currentDrawer?.id) {
            return { ...p, score: (p.score || 0) + 75 }; // drawer bonus
          }
          return p;
        })
      );

      const successMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'System',
        text: `🎉 You guessed the secret word! (+${earnedPoints} pts)`,
        isSystem: true,
        isCorrect: true
      };
      addChatMessage(successMsg);

      if (network) {
        network.send('SCRIBBLE_CORRECT_GUESS', {
          playerId: network.myId,
          playerName: network.myName,
          points: earnedPoints
        });
      }
    } else {
      sounds.playClick();
      const msg: ChatMessage = {
        id: Math.random().toString(),
        sender: network ? network.myName : 'Player',
        text: clean
      };
      addChatMessage(msg);
      if (network) {
        network.send('SCRIBBLE_CHAT', msg);
      }
    }
  };

  // Round Timer Countdown
  useEffect(() => {
    if (phase !== 'drawing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up! End turn
          clearInterval(timer);
          endTurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, secretWord]);

  const endTurn = () => {
    setPhase('round_reveal');
    sounds.playDice();

    if (network && network.isHost) {
      network.broadcast({
        type: 'SCRIBBLE_ROUND_REVEAL',
        senderId: network.myId,
        senderName: network.myName,
        payload: { secretWord, players },
        timestamp: Date.now()
      });
    }

    setTimeout(() => {
      // Advance to next drawer
      const nextIndex = currentDrawerIndex + 1;
      if (nextIndex >= players.length) {
        // Complete 1 round
        if (round >= TOTAL_ROUNDS) {
          // Game Over!
          setPhase('game_over');
          sounds.playWin();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
          return;
        }
        setRound((r) => r + 1);
        setCurrentDrawerIndex(0);
      } else {
        setCurrentDrawerIndex(nextIndex);
      }

      startWordSelection();
    }, 4000);
  };

  // Start new game session
  const handleStartGame = () => {
    sounds.playMove();
    setRound(1);
    setCurrentDrawerIndex(0);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setChatMessages([]);
    startWordSelection();
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={handleStartGame}
      headerControls={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room Lobby</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-5xl flex flex-col items-center select-none font-display">
        {/* Game Top Status Bar */}
        <div className="w-full grid grid-cols-3 items-center bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 mb-4 shadow-sm text-center">
          {/* Round & Drawer info */}
          <div className="flex items-center gap-2 text-left">
            <span className="text-xs font-mono-telemetry font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700">
              Round {round}/{TOTAL_ROUNDS}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold hidden sm:inline">
              Drawing: <strong className="text-slate-900 dark:text-white">{currentDrawer?.name}</strong>
            </span>
          </div>

          {/* Masked Secret Word Slots */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              {isMyTurnToDraw ? 'Your Secret Word' : 'Guess the Word'}
            </span>
            <div className="text-lg sm:text-2xl font-black font-mono-telemetry tracking-widest text-violet-700 dark:text-violet-300">
              {phase === 'drawing' ? getMaskedWord() : phase === 'round_reveal' ? secretWord : '???'}
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center justify-end gap-1.5">
            <Clock className={`w-4 h-4 ${timeLeft <= 15 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
            <span className={`text-base sm:text-lg font-black font-mono-telemetry ${timeLeft <= 15 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Main Arena: Left = Players & Canvas, Right = Live Chat & Guess Input */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Left Column: Player Leaderboard (1 Col on Desktop) */}
          <div className="lg:col-span-1 bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm order-2 lg:order-1">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Scoreboard
              </span>
              <span className="text-[11px] font-mono-telemetry text-slate-500">
                {players.length}P
              </span>
            </div>

            <div className="space-y-1.5">
              {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, idx) => {
                const isDrawingNow = p.id === currentDrawer?.id;
                const hasGuessed = guessedPlayerIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                      hasGuessed
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : isDrawingNow
                        ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-xs"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                          {p.name}
                        </span>
                        {isDrawingNow && (
                          <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
                            <Paintbrush className="w-2.5 h-2.5" /> Drawing
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                        {p.score || 0}
                      </span>
                      <span className="text-[9px] text-slate-500 block">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Shared Canvas & Drawing Toolbar (2 Cols on Desktop) */}
          <div className="lg:col-span-2 flex flex-col items-center order-1 lg:order-2">
            {/* The Drawing Canvas */}
            <div className="relative w-full aspect-[4/3] bg-white rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={600}
                height={450}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`w-full h-full object-contain ${isMyTurnToDraw ? 'cursor-crosshair' : 'cursor-default'}`}
              />

              {/* Word Picker Overlay for Current Drawer */}
              {phase === 'word_selection' && isMyTurnToDraw && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white animate-fadeIn">
                  <h3 className="text-xl font-black mb-1">Pick a Secret Word to Draw!</h3>
                  <p className="text-xs text-slate-300 mb-4">Choose from the options below:</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {wordChoices.map((item) => (
                      <button
                        key={item.word}
                        onClick={() => handleSelectWord(item.word)}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                      >
                        <span>{item.word}</span>
                        <span className="text-[10px] block opacity-75 font-normal">{item.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting for Drawer Overlay for Guessers */}
              {phase === 'word_selection' && !isMyTurnToDraw && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white animate-fadeIn">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/50 flex items-center justify-center mb-2 animate-spin">
                    <Paintbrush className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{currentDrawer?.name} is choosing a word...</h3>
                  <p className="text-xs text-slate-400">Get ready to type your guess!</p>
                </div>
              )}

              {/* Round Reveal Banner */}
              {phase === 'round_reveal' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white animate-fadeIn">
                  <span className="text-xs uppercase tracking-wider font-bold text-amber-400 mb-1">
                    Turn Finished! The Word Was:
                  </span>
                  <div className="text-3xl font-black font-mono-telemetry tracking-wider text-white mb-2">
                    {secretWord}
                  </div>
                  <p className="text-xs text-slate-300">Preparing next player&apos;s turn...</p>
                </div>
              )}

              {/* Lobby Start Overlay */}
              {phase === 'lobby' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-3xl mb-3 shadow-lg">
                    🎨
                  </div>
                  <h3 className="text-2xl font-black font-display mb-1">Scribble Arena</h3>
                  <p className="text-xs text-slate-300 max-w-xs mb-5">
                    Draw words, guess in real-time, and score big! Play with friends locally or join an online room.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleStartGame}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                    >
                      Start Game
                    </button>
                    <button
                      onClick={() => setShowRoomModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                    >
                      Online Room
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawing Toolbar (Visible only when it is your turn to draw) */}
            {isMyTurnToDraw && phase === 'drawing' && (
              <div className="w-full mt-3 p-3 rounded-2xl bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                {/* Palette */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        sounds.playClick();
                        setColor(c);
                        setIsEraser(false);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c && !isEraser ? 'scale-120 border-violet-500 ring-2 ring-violet-500/30' : 'border-slate-300 dark:border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>

                {/* Brush Sizes */}
                <div className="flex items-center gap-1">
                  {BRUSH_SIZES.map((b) => (
                    <button
                      key={b.label}
                      onClick={() => {
                        sounds.playClick();
                        setBrushSize(b.size);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        brushSize === b.size && !isEraser
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Eraser & Clear Tools */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setIsEraser(!isEraser);
                    }}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isEraser
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title="Eraser tool"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleClearCanvas}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    title="Clear canvas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Guess Chat Log & Submission Form (1 Col on Desktop) */}
          <div className="lg:col-span-1 bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col h-[460px] order-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Guess Chat
              </span>
              <span className="text-[10px] text-slate-400">
                Type guesses below
              </span>
            </div>

            {/* Chat message stream */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-slate-400 italic text-center py-8 text-[11px]">
                  No guesses yet. Be the first to guess the word!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-1.5 rounded-lg leading-relaxed ${
                      msg.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                        : msg.isSystem
                        ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {!msg.isSystem && (
                      <span className="font-bold text-slate-500 dark:text-slate-400 mr-1.5">
                        {msg.sender}:
                      </span>
                    )}
                    <span>{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Guess input form */}
            <form onSubmit={handleSendGuess} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                disabled={isMyTurnToDraw || guessedPlayerIds.has(network ? network.myId : 'p2')}
                placeholder={
                  isMyTurnToDraw
                    ? "You are drawing! Can't guess."
                    : guessedPlayerIds.has(network ? network.myId : 'p2')
                    ? 'You guessed correctly! 🎉'
                    : 'Type your guess here...'
                }
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!guessInput.trim() || isMyTurnToDraw}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Final Game Over Podium Modal */}
        <GameOverModal
          isOpen={phase === 'game_over'}
          title="SCRIBBLE CHAMPION!"
          message={`Final scores after ${TOTAL_ROUNDS} rounds of competitive drawing & guessing!`}
          score={[...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.score || 0}
          onRestart={handleStartGame}
        />

        {/* Room Management Modal */}
        <MultiplayerRoomModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          gameTitle="Scribble: Draw & Guess"
          minPlayers={2}
          maxPlayers={8}
          networkInstance={network || undefined}
          onStartLocalGame={(names) => {
            setPlayers(
              names.map((name, i) => ({
                id: `p${i + 1}`,
                name,
                isHost: i === 0,
                avatarColor: PALETTE[i % PALETTE.length],
                score: 0
              }))
            );
            handleStartGame();
          }}
          onStartOnlineGame={(net) => {
            setNetwork(net);
            setPlayers(net.players);
            handleStartGame();
          }}
        />
      </div>
    </GameLayout>
  );
};
