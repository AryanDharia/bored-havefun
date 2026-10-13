import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { MultiplayerRoomModal } from '../../components/MultiplayerRoomModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { getRandomWordOptions, type ScribbleWord } from './wordBank';
import { RoomNetwork, type RoomPlayer } from '../../lib/multiplayer/roomNetwork';
import confetti from 'canvas-confetti';
import { Users, Clock, Send, Trash2, Pencil, Eraser, CheckCircle2 } from 'lucide-react';

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
  isClose?: boolean;
}

const TURN_DURATION = 80;
const TOTAL_ROUNDS = 3;

const PALETTE = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#78350f'
];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

function isCloseGuess(guess: string, target: string): boolean {
  const a = guess.trim().toUpperCase();
  const b = target.trim().toUpperCase();
  if (!a || !b || a === b) return false;

  const targetLen = b.length;
  if (Math.abs(a.length - targetLen) > 2) return false;

  const dist = levenshteinDistance(a, b);

  if (targetLen <= 3) {
    return dist === 1;
  }
  if (targetLen === 4) {
    return dist === 1;
  }
  return dist === 1 || dist === 2;
}


export const ScribbleGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'scribble') || {
    id: 'scribble',
    name: 'Scribble',
    subtitle: 'Draw. Guess. Laugh with friends.',
    description: 'Real-time multiplayer drawing and word-guessing party game.',
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
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState<number>(0);

  // Game cycle
  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<'lobby' | 'word_selection' | 'drawing' | 'round_reveal' | 'game_over'>('lobby');
  const [secretWord, setSecretWord] = useState<string>(''); // KNOWN ONLY TO DRAWER & HOST
  const [maskedWordLength, setMaskedWordLength] = useState<number>(0);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState<boolean>(false);
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

  const currentDrawer = players.length > 0 ? players[currentDrawerIndex % players.length] : null;
  const isMyTurnToDraw = Boolean(
    currentDrawer && (network ? currentDrawer.id === network.myId : currentDrawerIndex % Math.max(1, players.length) === 0)
  );

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev.slice(-50), msg]);
  }, []);

  // Clear canvas helper
  const clearCanvasLocal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokeHistoryRef.current = [];
  }, []);

  // Stroke renderer
  const renderStroke = useCallback((stroke: Stroke) => {
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
  }, []);

  // ==========================================================
  // HOST-AUTHORITATIVE NETWORKING & STATE TRANSITIONS
  // ==========================================================
  useEffect(() => {
    if (!network) return;

    const unsubs = [
      // 1. GAME START: All clients transition into Round 1
      network.on('SCRIBBLE_GAME_START', (msg) => {
        const payload = msg.payload as {
          round: number;
          currentDrawerIndex: number;
          players: RoomPlayer[];
        };
        setRound(payload.round);
        setCurrentDrawerIndex(payload.currentDrawerIndex);
        setPlayers(payload.players);
        setChatMessages([]);
        setGuessedPlayerIds(new Set());
        setHasGuessedCorrectly(false);
        setSecretWord('');
        setMaskedWordLength(0);
        clearCanvasLocal();
        setPhase('word_selection');
        setShowRoomModal(false);
        sounds.playMove();

        // If Host, initiate word selection for the drawer
        if (network.isHost) {
          hostStartWordSelection(payload.players, payload.currentDrawerIndex);
        }
      }),

      // 2. WORD SELECTION OFFER: Received by Drawer
      network.on('SCRIBBLE_WORD_SELECTION_OFFER', (msg) => {
        const payload = msg.payload as { choices: ScribbleWord[] };
        setWordChoices(payload.choices);
        setPhase('word_selection');
      }),

      // 3. WORD CHOSEN (GUEST DRAWER -> HOST)
      network.on('SCRIBBLE_WORD_CHOSEN_SUBMISSION', (msg) => {
        if (!network.isHost) return;
        const payload = msg.payload as { word: string; drawerIndex: number };
        hostHandleWordChosen(payload.word, payload.drawerIndex);
      }),

      // 4. ROUND START BROADCAST: Sent by Host to all clients
      network.on('SCRIBBLE_ROUND_START', (msg) => {
        const payload = msg.payload as {
          wordLength: number;
          drawerIndex: number;
          drawerId: string;
          drawerName: string;
        };
        setCurrentDrawerIndex(payload.drawerIndex);
        setMaskedWordLength(payload.wordLength);
        setPhase('drawing');
        setTimeLeft(TURN_DURATION);
        setGuessedPlayerIds(new Set());
        setHasGuessedCorrectly(false);
        clearCanvasLocal();
        sounds.playClick();
      }),

      // 5. SECRET WORD DELIVERY: Delivered ONLY to drawer
      network.on('SCRIBBLE_DRAWER_SECRET_WORD', (msg) => {
        const payload = msg.payload as { secretWord: string };
        setSecretWord(payload.secretWord);
      }),

      // 6. DRAW STROKE
      network.on('SCRIBBLE_DRAW_STROKE', (msg) => {
        const stroke = msg.payload as Stroke;
        renderStroke(stroke);
        strokeHistoryRef.current.push(stroke);
      }),

      // 7. CLEAR CANVAS
      network.on('SCRIBBLE_CLEAR_CANVAS', () => {
        clearCanvasLocal();
      }),

      // 8. GUESS SUBMISSION (GUESSER -> HOST)
      network.on('SCRIBBLE_SUBMIT_GUESS', (msg) => {
        if (!network.isHost) return;
        const payload = msg.payload as { playerId: string; playerName: string; guessText: string };
        hostEvaluateGuess(payload.playerId, payload.playerName, payload.guessText);
      }),

      // 9. CORRECT GUESS (SELF): Sent privately to the guesser who got it right
      network.on('SCRIBBLE_CORRECT_GUESS_SELF', (msg) => {
        const payload = msg.payload as { secretWord: string; points: number };
        setSecretWord(payload.secretWord);
        setHasGuessedCorrectly(true);
        sounds.playScore();
      }),

      // 10. CORRECT GUESS BROADCAST: Sent to everyone (without secret word)
      network.on('SCRIBBLE_CORRECT_GUESS_BROADCAST', (msg) => {
        const payload = msg.payload as {
          playerId: string;
          playerName: string;
          points: number;
          updatedPlayers: RoomPlayer[];
        };
        sounds.playScore();
        setGuessedPlayerIds((prev) => new Set([...prev, payload.playerId]));
        setPlayers(payload.updatedPlayers);
        addChatMessage({
          id: Math.random().toString(),
          sender: 'System',
          text: `🎉 ${payload.playerName} guessed the secret word! (+${payload.points} pts)`,
          isSystem: true,
          isCorrect: true
        });
      }),

      // 11. CLOSE GUESS ALERT (Private)
      network.on('SCRIBBLE_CLOSE_GUESS', () => {
        addChatMessage({
          id: Math.random().toString(),
          sender: 'System',
          text: `👀 You are very close! Check spelling!`,
          isSystem: true,
          isClose: true
        });
      }),

      // 12. ROUND REVEAL
      network.on('SCRIBBLE_ROUND_REVEAL', (msg) => {
        const payload = msg.payload as { secretWord: string; players: RoomPlayer[] };
        setSecretWord(payload.secretWord);
        setPlayers(payload.players);
        setPhase('round_reveal');
        sounds.playDice();
      }),

      // 13. TIME SYNC FROM HOST
      network.on('SCRIBBLE_TIME_SYNC', (msg) => {
        const payload = msg.payload as { timeLeft: number };
        setTimeLeft(payload.timeLeft);
      }),

      // 14. CHAT MESSAGE
      network.on('SCRIBBLE_CHAT', (msg) => {
        const chat = msg.payload as ChatMessage;
        addChatMessage(chat);
      }),

      // 15. GAME OVER
      network.on('SCRIBBLE_GAME_OVER', (msg) => {
        const payload = msg.payload as { finalPlayers: RoomPlayer[] };
        setPlayers(payload.finalPlayers);
        setPhase('game_over');
        sounds.playWin();
        try {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }),

      // 16. KICKED FROM ROOM
      network.on('KICKED_FROM_ROOM', (msg) => {
        const payload = msg.payload as { message?: string; reason?: string };
        const reason = payload?.message || payload?.reason || 'The host removed you from the room.';
        alert(reason);
        setPhase('lobby');
        setPlayers([]);
        setNetwork(null);
      })
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [network, renderStroke, clearCanvasLocal, addChatMessage]);

  // ==========================================================
  // HOST AUTHORITY CONTROLLERS
  // ==========================================================
  const hostSecretWordRef = useRef<string>('');
  const hostGuessedRef = useRef<Set<string>>(new Set());

  const hostStartWordSelection = useCallback((currentRoster: RoomPlayer[], drawerIdx: number) => {
    if (!network || !network.isHost) return;
    const choices = getRandomWordOptions(3);
    const drawer = currentRoster[drawerIdx % currentRoster.length];

    if (drawer.id === network.myId) {
      // Host is drawer
      setWordChoices(choices);
      setPhase('word_selection');
    } else {
      // Send offer privately to guest drawer
      network.sendTo(drawer.id, 'SCRIBBLE_WORD_SELECTION_OFFER', { choices });
    }
  }, [network]);

  const hostHandleWordChosen = useCallback((word: string, drawerIdx: number) => {
    if (!network || !network.isHost) return;
    hostSecretWordRef.current = word;
    hostGuessedRef.current = new Set();

    const drawer = network.players[drawerIdx % network.players.length];

    // 1. Send full secret word ONLY to drawer
    if (drawer.id === network.myId) {
      setSecretWord(word);
    } else {
      network.sendTo(drawer.id, 'SCRIBBLE_DRAWER_SECRET_WORD', { secretWord: word });
    }

    // 2. Broadcast round start to all players with ONLY wordLength
    network.broadcast({
      type: 'SCRIBBLE_ROUND_START',
      senderId: network.myId,
      senderName: network.myName,
      payload: {
        wordLength: word.length,
        drawerIndex: drawerIdx,
        drawerId: drawer.id,
        drawerName: drawer.name
      },
      timestamp: Date.now()
    });

    setMaskedWordLength(word.length);
    setPhase('drawing');
    setTimeLeft(TURN_DURATION);
    setGuessedPlayerIds(new Set());
    setHasGuessedCorrectly(false);
    clearCanvasLocal();
  }, [network, clearCanvasLocal]);

  const hostEvaluateGuess = useCallback((playerId: string, playerName: string, text: string) => {
    if (!network || !network.isHost) return;
    const cleanGuess = text.trim().toUpperCase();
    const correctWord = hostSecretWordRef.current.trim().toUpperCase();

    // Ignore if player already guessed or is drawer
    const drawer = network.players[currentDrawerIndex % network.players.length];
    if (playerId === drawer.id || hostGuessedRef.current.has(playerId)) {
      network.broadcast({
        type: 'SCRIBBLE_CHAT',
        senderId: playerId,
        senderName: playerName,
        payload: { id: Math.random().toString(), sender: playerName, text: cleanGuess },
        timestamp: Date.now()
      });
      return;
    }

    // Check exact match
    if (cleanGuess === correctWord) {
      sounds.playScore();
      const points = Math.max(100, Math.round((timeLeft / TURN_DURATION) * 400) + 50);
      hostGuessedRef.current.add(playerId);

      // Update scores on Host
      const updated = network.players.map((p) => {
        if (p.id === playerId) return { ...p, score: (p.score || 0) + points };
        if (p.id === drawer.id) return { ...p, score: (p.score || 0) + 75 }; // drawer bonus
        return p;
      });
      network.players = updated;

      // Send secret word privately to this guesser
      network.sendTo(playerId, 'SCRIBBLE_CORRECT_GUESS_SELF', {
        secretWord: correctWord,
        points
      });

      // Broadcast correct guess to everyone (without leaking word!)
      network.broadcast({
        type: 'SCRIBBLE_CORRECT_GUESS_BROADCAST',
        senderId: network.myId,
        senderName: network.myName,
        payload: {
          playerId,
          playerName,
          points,
          updatedPlayers: updated
        },
        timestamp: Date.now()
      });

      // If all guessers have guessed, end turn early!
      const totalGuessers = network.players.length - 1;
      if (hostGuessedRef.current.size >= totalGuessers) {
        hostEndTurn();
      }
    } else if (isCloseGuess(cleanGuess, correctWord)) {
      // Send close guess alert privately to sender
      network.sendTo(playerId, 'SCRIBBLE_CLOSE_GUESS', {});
      // Broadcast chat attempt
      network.broadcast({
        type: 'SCRIBBLE_CHAT',
        senderId: playerId,
        senderName: playerName,
        payload: { id: Math.random().toString(), sender: playerName, text: cleanGuess },
        timestamp: Date.now()
      });
    } else {
      // Normal chat
      network.broadcast({
        type: 'SCRIBBLE_CHAT',
        senderId: playerId,
        senderName: playerName,
        payload: { id: Math.random().toString(), sender: playerName, text: cleanGuess },
        timestamp: Date.now()
      });
    }
  }, [network, currentDrawerIndex, timeLeft]);

  // Host clock ticker
  useEffect(() => {
    if (!network || !network.isHost || phase !== 'drawing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          hostEndTurn();
          return 0;
        }

        const next = prev - 1;
        // Sync time to clients every 4 seconds
        if (next % 4 === 0) {
          network.broadcast({
            type: 'SCRIBBLE_TIME_SYNC',
            senderId: network.myId,
            senderName: network.myName,
            payload: { timeLeft: next },
            timestamp: Date.now()
          });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [network, phase]);

  const hostEndTurn = useCallback(() => {
    if (!network || !network.isHost) return;

    // Broadcast reveal
    network.broadcast({
      type: 'SCRIBBLE_ROUND_REVEAL',
      senderId: network.myId,
      senderName: network.myName,
      payload: {
        secretWord: hostSecretWordRef.current,
        players: network.players
      },
      timestamp: Date.now()
    });

    setTimeout(() => {
      const nextDrawerIndex = currentDrawerIndex + 1;
      if (nextDrawerIndex >= network.players.length) {
        // Round complete
        if (round >= TOTAL_ROUNDS) {
          // Game Over!
          network.broadcast({
            type: 'SCRIBBLE_GAME_OVER',
            senderId: network.myId,
            senderName: network.myName,
            payload: { finalPlayers: network.players },
            timestamp: Date.now()
          });
          return;
        }
        const nextRound = round + 1;
        setRound(nextRound);
        setCurrentDrawerIndex(0);
        hostStartWordSelection(network.players, 0);
      } else {
        setCurrentDrawerIndex(nextDrawerIndex);
        hostStartWordSelection(network.players, nextDrawerIndex);
      }
    }, 4500);
  }, [network, currentDrawerIndex, round, hostStartWordSelection]);

  // Word selection by Drawer
  const handleSelectWord = (word: string) => {
    sounds.playMove();
    setSecretWord(word);

    if (network) {
      if (network.isHost) {
        hostHandleWordChosen(word, currentDrawerIndex);
      } else {
        // Send choice to Host
        network.send('SCRIBBLE_WORD_CHOSEN_SUBMISSION', {
          word,
          drawerIndex: currentDrawerIndex
        });
      }
    } else {
      // Local game mode
      setMaskedWordLength(word.length);
      setPhase('drawing');
      setTimeLeft(TURN_DURATION);
      setGuessedPlayerIds(new Set());
      setHasGuessedCorrectly(false);
      clearCanvasLocal();
    }
  };

  // Guess submission
  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guessInput.trim().toUpperCase();
    if (!clean) return;

    setGuessInput('');

    if (isMyTurnToDraw || hasGuessedCorrectly) {
      addChatMessage({
        id: Math.random().toString(),
        sender: network ? network.myName : 'You',
        text: clean
      });
      return;
    }

    if (network) {
      // Send guess to Host for authoritative check
      network.send('SCRIBBLE_SUBMIT_GUESS', {
        playerId: network.myId,
        playerName: network.myName,
        guessText: clean
      });
    } else {
      // Local mode check
      if (clean === secretWord.toUpperCase()) {
        sounds.playScore();
        setHasGuessedCorrectly(true);
        addChatMessage({
          id: Math.random().toString(),
          sender: 'System',
          text: `🎉 You guessed the secret word "${secretWord}"!`,
          isSystem: true,
          isCorrect: true
        });
      } else if (isCloseGuess(clean, secretWord)) {
        addChatMessage({
          id: Math.random().toString(),
          sender: 'System',
          text: `👀 You are very close! Check spelling!`,
          isSystem: true,
          isClose: true
        });
      } else {
        addChatMessage({
          id: Math.random().toString(),
          sender: 'You',
          text: clean
        });
      }
    }
  };

  // Canvas pointer events
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurnToDraw || phase !== 'drawing') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastCoordRef.current = coords;

    const stroke: Stroke = {
      x0: coords.x,
      y0: coords.y,
      x1: coords.x,
      y1: coords.y,
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
    if (!isDrawingRef.current || !lastCoordRef.current || !isMyTurnToDraw || phase !== 'drawing') return;
    e.preventDefault();

    const coords = getCanvasCoords(e);
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

  const handleClearCanvas = () => {
    if (!isMyTurnToDraw) return;
    sounds.playClick();
    clearCanvasLocal();
    if (network) {
      network.send('SCRIBBLE_CLEAR_CANVAS', {});
    }
  };

  // Masked word for guessers (e.g. "_ _ _ _ _ _")
  const renderWordDisplay = () => {
    if (phase === 'lobby') return 'S C R I B B L E';
    if (isMyTurnToDraw || hasGuessedCorrectly || phase === 'round_reveal' || phase === 'game_over') {
      return secretWord || (maskedWordLength > 0 ? '_ '.repeat(maskedWordLength).trim() : '???');
    }
    if (maskedWordLength > 0) {
      return '_ '.repeat(maskedWordLength).trim();
    }
    return '???';
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={() => setShowRoomModal(true)}
      headerControls={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room Lobby {network ? `(${network.roomCode})` : ''}</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-5xl flex flex-col items-center select-none font-display">
        {/* Status Bar */}
        <div className="w-full grid grid-cols-3 items-center bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 mb-3 shadow-sm text-center">
          {/* Round & Drawer info */}
          <div className="flex items-center gap-2 text-left">
            <span className="text-xs font-mono-telemetry font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700">
              Round {round}/{TOTAL_ROUNDS}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold hidden sm:inline">
              Drawing: <strong className="text-slate-900 dark:text-white">{currentDrawer?.name || '—'}</strong>
            </span>
          </div>

          {/* Masked Secret Word */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              {isMyTurnToDraw ? 'Your Secret Word' : hasGuessedCorrectly ? 'Correctly Guessed!' : 'Word Hint'}
            </span>
            <div className="text-base sm:text-2xl font-black font-mono-telemetry tracking-widest text-violet-700 dark:text-violet-300">
              {renderWordDisplay()}
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center justify-end gap-1.5">
            <Clock className={`w-4 h-4 ${timeLeft <= 15 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
            <span className={`text-base sm:text-lg font-black font-mono-telemetry ${timeLeft <= 15 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {phase === 'drawing' ? `${timeLeft}s` : '—'}
            </span>
          </div>
        </div>

        {/* Main Arena */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Left Column: Player Leaderboard */}
          <div className="lg:col-span-1 bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between max-h-[500px]">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Players ({players.length})</span>
                </span>
                {network && (
                  <span className="text-[10px] font-mono-telemetry font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {network.roomCode}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {players.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-4 text-center">
                    No players in room yet. Open the lobby to start!
                  </div>
                ) : (
                  players.map((p, idx) => {
                    const isDrawingNow = currentDrawer?.id === p.id;
                    const hasGuessed = guessedPlayerIds.has(p.id);

                    return (
                      <div
                        key={p.id}
                        className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                          hasGuessed
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : isDrawingNow
                            ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
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
                              {p.name} {network && p.id === network.myId && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {isDrawingNow ? '🎨 Drawing' : hasGuessed ? '✅ Guessed' : 'Thinking...'}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono-telemetry font-black text-violet-600 dark:text-violet-400">
                          {p.score || 0} pts
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Lobby Trigger */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowRoomModal(true)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Room Lobby</span>
              </button>
            </div>
          </div>

          {/* Middle: Canvas & Drawing Tools */}
          <div className="lg:col-span-2 flex flex-col items-center">
            {/* Canvas Container */}
            <div className="relative w-full aspect-[4/3] bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`w-full h-full object-contain ${isMyTurnToDraw ? 'cursor-crosshair' : 'cursor-default'}`}
              />

              {/* Lobby Waiting Overlay */}
              {phase === 'lobby' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center z-20">
                  <div className="w-16 h-16 rounded-2xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-3xl mb-3 shadow-lg">
                    🎨
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-1 font-display">
                    SCRIBBLE
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-5 leading-relaxed">
                    Real-time multiplayer drawing & word guessing. Connect with friends on phone and laptop!
                  </p>
                  <button
                    onClick={() => setShowRoomModal(true)}
                    className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-sm shadow-xl shadow-violet-600/40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Open Room Lobby (2–8 Players)</span>
                  </button>
                </div>
              )}

              {/* Word Selection Drawer Modal */}
              {phase === 'word_selection' && isMyTurnToDraw && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center z-20 animate-fadeIn">
                  <h3 className="text-xl sm:text-2xl font-black mb-1 font-display">
                    Pick a Secret Word to Draw!
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold mb-4">
                    Other players will have to guess your drawing
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-md">
                    {wordChoices.map((item) => (
                      <button
                        key={item.word}
                        onClick={() => handleSelectWord(item.word)}
                        className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 hover:scale-105 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex flex-col items-center"
                      >
                        <span>{item.word}</span>
                        <span className="text-[10px] opacity-75 font-normal">{item.category} • {item.difficulty}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Word Selection Guesser Overlay */}
              {phase === 'word_selection' && !isMyTurnToDraw && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center z-20">
                  <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <h3 className="text-lg font-bold mb-1">
                    {currentDrawer?.name} is choosing a word...
                  </h3>
                  <p className="text-xs text-slate-300">
                    Get ready to guess in the chat!
                  </p>
                </div>
              )}

              {/* Round Reveal Overlay */}
              {phase === 'round_reveal' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center z-20 animate-fadeIn">
                  <span className="text-xs font-mono-telemetry uppercase tracking-wider text-amber-400 font-bold mb-1">
                    Turn Over!
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black mb-2 text-violet-400">
                    The word was: &quot;{secretWord}&quot;
                  </h3>
                  <p className="text-xs text-slate-300">
                    Next turn starting in a few seconds...
                  </p>
                </div>
              )}
            </div>

            {/* Drawing Toolbar (Visible to drawer) */}
            {isMyTurnToDraw && phase === 'drawing' && (
              <div className="w-full mt-2.5 p-2 bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-2">
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
                        !isEraser && color === c ? 'scale-125 border-violet-500 shadow-md ring-2 ring-violet-400' : 'border-slate-300 dark:border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>

                {/* Brush tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setIsEraser(false);
                    }}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                      !isEraser ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                    title="Brush"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setIsEraser(true);
                    }}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isEraser ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  {/* Brush Sizes */}
                  {[4, 8, 14].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBrushSize(sz)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        brushSize === sz ? 'bg-slate-200 dark:bg-slate-700 border-violet-500' : 'border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="rounded-full bg-slate-900 dark:bg-white" style={{ width: sz / 1.5, height: sz / 1.5 }} />
                    </button>
                  ))}

                  <button
                    onClick={handleClearCanvas}
                    className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer"
                    title="Clear Board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Chat & Guess Input */}
          <div className="lg:col-span-1 bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between h-[380px] lg:h-[500px]">
            {/* Chat header */}
            <div className="pb-2 mb-1 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Chat & Guesses
              </span>
              {hasGuessedCorrectly && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Guessed!
                </span>
              )}
            </div>

            {/* Chat message list */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-left text-xs font-mono-telemetry"
            >
              {chatMessages.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-6 text-center">
                  Type your guesses below to score points!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`px-2.5 py-1.5 rounded-xl break-words ${
                      msg.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                        : msg.isClose
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold'
                        : msg.isSystem
                        ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
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
                disabled={isMyTurnToDraw || hasGuessedCorrectly || phase !== 'drawing'}
                placeholder={
                  phase !== 'drawing'
                    ? 'Waiting for turn...'
                    : isMyTurnToDraw
                    ? "You are drawing! Can't guess."
                    : hasGuessedCorrectly
                    ? 'You guessed correctly! 🎉'
                    : 'Type your guess here...'
                }
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-violet-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!guessInput.trim() || isMyTurnToDraw || hasGuessedCorrectly || phase !== 'drawing'}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-40"
                aria-label="Send guess"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Game Over Modal */}
        <GameOverModal
          isOpen={phase === 'game_over'}
          title="🏆 Scribble Match Finished!"
          message={
            players.length > 0
              ? `Winner: ${[...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.name} with ${
                  [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.score || 0
                } points!`
              : 'Great match!'
          }
          score={players.find((p) => (network ? p.id === network.myId : p.id === 'p1'))?.score || 0}
          onRestart={() => setShowRoomModal(true)}
        />

        {/* Room Management Modal */}
        <MultiplayerRoomModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          gameTitle="Scribble: Draw & Guess"
          minPlayers={2}
          maxPlayers={8}
          networkInstance={network || undefined}
          onRoomConnected={(net) => {
            setNetwork(net);
            setPlayers(net.players);
          }}
          onStartLocalGame={(names) => {
            const localPlayers = names.map((name, i) => ({
              id: `p${i + 1}`,
              name,
              isHost: i === 0,
              avatarColor: PALETTE[i % PALETTE.length],
              score: 0
            }));
            setNetwork(null);
            setPlayers(localPlayers);
            setRound(1);
            setCurrentDrawerIndex(0);
            setChatMessages([]);
            setWordChoices(getRandomWordOptions(3));
            setPhase('word_selection');
          }}
          onStartOnlineGame={(net) => {
            setNetwork(net);
            setPlayers(net.players);
            if (net.isHost) {
              // Authoritative host starts game
              net.broadcast({
                type: 'SCRIBBLE_GAME_START',
                senderId: net.myId,
                senderName: net.myName,
                payload: {
                  round: 1,
                  currentDrawerIndex: 0,
                  players: net.players.map((p) => ({ ...p, score: 0 }))
                },
                timestamp: Date.now()
              });
            }
          }}
        />
      </div>
    </GameLayout>
  );
};
