import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { RoomNetwork, type RoomPlayer } from '../../lib/multiplayer/roomNetwork';
import {
  Dices,
  Bot,
  Users,
  Trophy,
  Crown,
  Volume2,
  VolumeX,
  Settings,
  ArrowLeft,
  Copy,
  Check,
  Send,
  UserMinus,
  LogOut,
  Camera,
  Star,
  Link2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type AIDifficulty = 'Easy' | 'Medium' | 'Hard';
export type BoardTheme = 'classic' | 'wood' | 'night';
export type GameMode = 'ai' | 'local' | 'online';

interface Token {
  id: number; // 0, 1, 2, 3
  step: number; // -1: yard base, 0..50: 52 track cells, 51..55: home path, 56: Goal!
}

export interface PlayerSeat {
  seatIndex: number; // 0: Red, 1: Green, 2: Yellow, 3: Blue
  name: string;
  avatar: string; // emoji or data:image URL
  isAi: boolean;
  aiDifficulty: AIDifficulty;
  networkPlayerId?: string;
  mood?: 'happy' | 'sad' | '';
}

interface PlayerDef {
  id: number;
  name: string;
  colorName: string;
  hex: string;
  bgClass: string;
  textClass: string;
  startTrackIdx: number;
  arrowChar: string;
  baseBox: { r: number; c: number };
}

const PLAYERS_DEF: PlayerDef[] = [
  {
    id: 0,
    name: 'Red',
    colorName: 'Red',
    hex: '#ef4444',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-400',
    startTrackIdx: 0,
    arrowChar: '→',
    baseBox: { r: 0, c: 0 },
  },
  {
    id: 1,
    name: 'Green',
    colorName: 'Green',
    hex: '#10b981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    startTrackIdx: 13,
    arrowChar: '↓',
    baseBox: { r: 0, c: 9 },
  },
  {
    id: 2,
    name: 'Yellow',
    colorName: 'Yellow',
    hex: '#f59e0b',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-400',
    startTrackIdx: 26,
    arrowChar: '←',
    baseBox: { r: 9, c: 9 },
  },
  {
    id: 3,
    name: 'Blue',
    colorName: 'Blue',
    hex: '#3b82f6',
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-400',
    startTrackIdx: 39,
    arrowChar: '↑',
    baseBox: { r: 9, c: 0 },
  },
];

// The 52 track cells around cross perimeter (15x15 grid)
const TRACK_CELLS: { r: number; c: number }[] = [
  /* 0 - Red start */ { r: 6, c: 1 },
  { r: 6, c: 2 },
  { r: 6, c: 3 },
  { r: 6, c: 4 },
  { r: 6, c: 5 },
  { r: 5, c: 6 },
  { r: 4, c: 6 },
  { r: 3, c: 6 },
  /* 8 - Star safe */ { r: 2, c: 6 },
  { r: 1, c: 6 },
  { r: 0, c: 6 },
  { r: 0, c: 7 },
  { r: 0, c: 8 },
  /* 13 - Green start */ { r: 1, c: 8 },
  { r: 2, c: 8 },
  { r: 3, c: 8 },
  { r: 4, c: 8 },
  { r: 5, c: 8 },
  { r: 6, c: 9 },
  { r: 6, c: 10 },
  { r: 6, c: 11 },
  /* 21 - Star safe */ { r: 6, c: 12 },
  { r: 6, c: 13 },
  { r: 6, c: 14 },
  { r: 7, c: 14 },
  { r: 8, c: 14 },
  /* 26 - Yellow start */ { r: 8, c: 13 },
  { r: 8, c: 12 },
  { r: 8, c: 11 },
  { r: 8, c: 10 },
  { r: 8, c: 9 },
  { r: 9, c: 8 },
  { r: 10, c: 8 },
  { r: 11, c: 8 },
  /* 34 - Star safe */ { r: 12, c: 8 },
  { r: 13, c: 8 },
  { r: 14, c: 8 },
  { r: 14, c: 7 },
  { r: 14, c: 6 },
  /* 39 - Blue start */ { r: 13, c: 6 },
  { r: 12, c: 6 },
  { r: 11, c: 6 },
  { r: 10, c: 6 },
  { r: 9, c: 6 },
  { r: 8, c: 5 },
  { r: 8, c: 4 },
  { r: 8, c: 3 },
  /* 47 - Star safe */ { r: 8, c: 2 },
  { r: 8, c: 1 },
  { r: 8, c: 0 },
  { r: 7, c: 0 },
  { r: 6, c: 0 },
];

const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const HOME_PATHS: Record<number, { r: number; c: number }[]> = {
  0: [{ r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }],
  1: [{ r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }],
  2: [{ r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }],
  3: [{ r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }],
};

const GOAL_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 6.8, y: 7.5 },
  1: { x: 7.5, y: 6.8 },
  2: { x: 8.2, y: 7.5 },
  3: { x: 7.5, y: 8.2 },
};

const BASE_POCKETS: Record<number, { x: number; y: number }[]> = {
  0: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }],
  1: [{ x: 11, y: 2 }, { x: 13, y: 2 }, { x: 11, y: 4 }, { x: 13, y: 4 }],
  2: [{ x: 11, y: 11 }, { x: 13, y: 11 }, { x: 11, y: 13 }, { x: 13, y: 13 }],
  3: [{ x: 2, y: 11 }, { x: 4, y: 11 }, { x: 2, y: 13 }, { x: 4, y: 13 }],
};

const DEFAULT_EMOJIS = ['😎', '🤠', '🥳', '🦁', '🤖', '👑', '🐯', '🦊', '🐱', '🐼', '🚀', '💎'];

const QUICK_REACTIONS = ['😂', '👏', '😡', '🔥', '❤️', '😎', 'GG', 'Good Game'];

// Compress uploaded photo to 240x240 JPEG (~10-20KB dataUrl)
function compressPhoto(file: File, callback: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      }
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

// 3D Gold Pawn SVG Component
const PawnSvg: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 60 60" className="w-full h-full filter drop-shadow">
    <defs>
      <linearGradient id={`gold-${color}`} x1="0" x2="1">
        <stop offset="0" stopColor="#6e4a00" />
        <stop offset="0.22" stopColor="#ffe680" />
        <stop offset="0.5" stopColor="#c88f16" />
        <stop offset="0.72" stopColor="#fff0a6" />
        <stop offset="1" stopColor="#7a5200" />
      </linearGradient>
      <radialGradient id={`pawnHl-${color}`} cx="0.35" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.4" />
      </radialGradient>
    </defs>
    <circle cx="30" cy="30" r="28" fill="#2a1c00" />
    <circle cx="30" cy="30" r="26" fill={`url(#gold-${color})`} />
    <circle cx="30" cy="30" r="21" fill="#ffffff" />
    <circle cx="30" cy="30" r="19" fill={color} />
    <circle cx="30" cy="30" r="19" fill={`url(#pawnHl-${color})`} />
    {/* Crown shape */}
    <path
      d="M18 40L16 24L24 31L30 19L36 31L44 24L42 40Z"
      fill={`url(#gold-${color})`}
      stroke="#4a3200"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="30" cy="17" r="2.2" fill="#fff" />
    <ellipse cx="21" cy="15" rx="9" ry="4.5" fill="#fff" opacity="0.45" transform="rotate(-35 21 15)" />
  </svg>
);

// Ludo Avatar Component with Ludo King animated moods
export const LudoAvatar: React.FC<{
  avatar: string;
  color: string;
  name?: string;
  mood?: 'happy' | 'sad' | '';
  size?: number;
  isActiveTurn?: boolean;
}> = ({ avatar, color, name, mood = '', size = 52, isActiveTurn = false }) => {
  const isImage = avatar && avatar.startsWith('data:image/');

  return (
    <div
      className={`ludo-aw relative inline-flex items-center justify-center rounded-full select-none ${mood}`}
      style={{
        width: size,
        height: size,
        boxShadow: isActiveTurn ? `0 0 0 3px #ffffff, 0 0 16px 4px ${color}` : undefined,
      }}
    >
      <div
        className="ludo-av relative overflow-hidden rounded-full grid place-items-center"
        style={{
          width: '100%',
          height: '100%',
          border: `3px solid ${color}`,
          backgroundColor: '#334155',
        }}
      >
        {isImage ? (
          <img src={avatar} alt={name || 'Avatar'} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.52 }} className="leading-none">
            {avatar || '😎'}
          </span>
        )}
      </div>

      {/* Mood Animations */}
      {mood === 'happy' && (
        <>
          <span className="ludo-fx happy-crown">👑</span>
          <span className="ludo-fx happy-fire">🔥</span>
          <span className="ludo-fx happy-sparkle">✨</span>
          <div className="ludo-ring" style={{ borderColor: '#ffd54f' }} />
        </>
      )}

      {mood === 'sad' && (
        <>
          <span className="ludo-fx sad-cloud">⛈️</span>
          <span className="ludo-fx sad-heart">💔</span>
          <span className="ludo-tear t1" />
          <span className="ludo-tear t2" />
        </>
      )}
    </div>
  );
};

export interface ChatMessage {
  id: string;
  sender: string;
  color: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export const Ludo: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'ludo')!;

  // Game Setup & Mode
  const [gameState, setGameState] = useState<'setup' | 'lobby' | 'playing'>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('classic');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Player seats (Red=0, Green=1, Yellow=2, Blue=3)
  const [seats, setSeats] = useState<PlayerSeat[]>([
    { seatIndex: 0, name: 'Player 1', avatar: '😎', isAi: false, aiDifficulty: 'Medium' },
    { seatIndex: 1, name: 'AI Green', avatar: '🦁', isAi: true, aiDifficulty: 'Medium' },
    { seatIndex: 2, name: 'AI Yellow', avatar: '🤠', isAi: true, aiDifficulty: 'Medium' },
    { seatIndex: 3, name: 'AI Blue', avatar: '🤖', isAi: true, aiDifficulty: 'Medium' },
  ]);

  // Online Multiplayer State
  const [roomNetwork, setRoomNetwork] = useState<RoomNetwork | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roster, setRoster] = useState<RoomPlayer[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [onlineError, setOnlineError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [playerToKick, setPlayerToKick] = useState<RoomPlayer | null>(null);

  // Auto-detect room code from URL parameters (e.g., #/games/ludo?room=ABC123 or ?room=ABC123)
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      let roomParam: string | null = null;
      if (queryIdx !== -1) {
        const searchParams = new URLSearchParams(hash.substring(queryIdx));
        roomParam = searchParams.get('room');
      }
      if (!roomParam) {
        const searchParams = new URLSearchParams(window.location.search);
        roomParam = searchParams.get('room');
      }
      if (roomParam) {
        const cleanCode = roomParam.trim().toUpperCase().slice(0, 6);
        if (cleanCode) {
          setJoinCodeInput(cleanCode);
          setGameMode('online');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // In-Game Tokens (4 tokens per player seat)
  const [tokens, setTokens] = useState<Record<number, Token[]>>({
    0: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    1: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    2: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    3: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
  });

  // Active seats in play
  const activeSeats = playerCount === 2 ? [0, 2] : playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3];

  // Turn state
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const currentSeatIdx = activeSeats[currentTurnIdx] ?? 0;
  const currentSeat = seats[currentSeatIdx] || seats[0];

  const [turnPhase, setTurnPhase] = useState<'roll' | 'select' | 'moving'>('roll');
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [bonusRollActive, setBonusRollActive] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('Roll the 3D dice to start!');

  // Game over state
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winnerSeatIdx, setWinnerSeatIdx] = useState<number | null>(null);

  // In-Game Chat & Reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const lockRef = useRef<boolean>(false);
  const aiTimerRef = useRef<any>(null);
  const watchdogTimerRef = useRef<any>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Trigger avatar mood temporarily
  const triggerMood = useCallback((seatIndex: number, mood: 'happy' | 'sad') => {
    setSeats((prev) =>
      prev.map((s) => (s.seatIndex === seatIndex ? { ...s, mood } : s))
    );
    setTimeout(() => {
      setSeats((prev) =>
        prev.map((s) => (s.seatIndex === seatIndex ? { ...s, mood: '' } : s))
      );
    }, 2800);
  }, []);

  // Post chat message (local and online sync)
  const addChatMessage = useCallback(
    (sender: string, color: string, text: string, isSystem = false) => {
      const msg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender,
        color,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem,
      };
      setChatMessages((prev) => [...prev.slice(-40), msg]);
    },
    []
  );

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Check if current seat is AI controlled
  const isCurrentSeatAI = useCallback(() => {
    if (gameMode === 'online') return false;
    return currentSeat.isAi;
  }, [gameMode, currentSeat]);

  // Check if current turn belongs to local user in Online mode
  const isMyTurnOnline = useCallback(() => {
    if (gameMode !== 'online' || !roomNetwork) return true;
    return currentSeat.networkPlayerId === roomNetwork.myId;
  }, [gameMode, roomNetwork, currentSeat]);

  // Coordinates calculation for token rendering
  const getTokenCoords = useCallback((seatIdx: number, token: Token): { x: number; y: number } => {
    if (token.step === -1) {
      return BASE_POCKETS[seatIdx][token.id];
    }
    if (token.step >= 0 && token.step <= 50) {
      const trackIdx = (PLAYERS_DEF[seatIdx].startTrackIdx + token.step) % 52;
      const cell = TRACK_CELLS[trackIdx];
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    }
    if (token.step >= 51 && token.step <= 55) {
      const homeStep = token.step - 51;
      const cell = HOME_PATHS[seatIdx][homeStep];
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    }
    // Goal center (step 56)
    const goal = GOAL_POSITIONS[seatIdx];
    const offsets = [
      { dx: -0.22, dy: -0.22 },
      { dx: 0.22, dy: -0.22 },
      { dx: -0.22, dy: 0.22 },
      { dx: 0.22, dy: 0.22 },
    ];
    return { x: goal.x + offsets[token.id].dx, y: goal.y + offsets[token.id].dy };
  }, []);

  // Legal move check
  const canMoveToken = useCallback((token: Token, roll: number): boolean => {
    if (token.step === -1) {
      return roll === 6;
    }
    if (token.step === 56) {
      return false;
    }
    return token.step + roll <= 56;
  }, []);

  const getMovableTokens = useCallback(
    (seatIdx: number, roll: number): number[] => {
      return (tokens[seatIdx] || []).filter((t) => canMoveToken(t, roll)).map((t) => t.id);
    },
    [tokens, canMoveToken]
  );

  // Advance turn to next active player
  const passTurn = useCallback(() => {
    setDice(null);
    setBonusRollActive(false);
    setTurnPhase('roll');
    setCurrentTurnIdx((prev) => (prev + 1) % activeSeats.length);
    lockRef.current = false;
  }, [activeSeats.length]);

  // Execute token move step-by-step
  const executeMove = useCallback(
    async (seatIdx: number, tokenId: number, roll: number) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setTurnPhase('moving');

      const seat = seats[seatIdx];
      const curToken = tokens[seatIdx][tokenId];
      let earnedBonus = roll === 6;

      // 1. Spawning out of yard on 6
      if (curToken.step === -1) {
        if (soundEnabled) sounds.playMove();
        setTokens((prev) => ({
          ...prev,
          [seatIdx]: prev[seatIdx].map((t) => (t.id === tokenId ? { ...t, step: 0 } : t)),
        }));
        addChatMessage(seat.name, PLAYERS_DEF[seatIdx].hex, 'spawned a pawn on the track!', true);
        await delay(350);

        // Check capture on starting square
        const startTrackIdx = PLAYERS_DEF[seatIdx].startTrackIdx;
        const captured = await checkAndExecuteCapture(seatIdx, startTrackIdx);
        if (captured) earnedBonus = true;
      } else {
        // 2. Advancing cell by cell
        const stepsToTake = roll;
        let currStep = curToken.step;

        for (let s = 0; s < stepsToTake; s++) {
          currStep++;
          setTokens((prev) => ({
            ...prev,
            [seatIdx]: prev[seatIdx].map((t) => (t.id === tokenId ? { ...t, step: currStep } : t)),
          }));
          if (soundEnabled) sounds.playMove();
          await delay(120);
        }

        // Check reaching Home Goal (56)
        if (currStep === 56) {
          if (soundEnabled) sounds.playScore();
          triggerMood(seatIdx, 'happy');
          addChatMessage(seat.name, PLAYERS_DEF[seatIdx].hex, 'reached Home! 🏠', true);
          earnedBonus = true;
          await delay(400);

          // Check Victory
          const allHome = tokens[seatIdx].every((t) => (t.id === tokenId ? true : t.step === 56));
          if (allHome) {
            setGameOver(true);
            setWinnerSeatIdx(seatIdx);
            if (soundEnabled) sounds.playWin();
            try {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            } catch {
              // fallback
            }
            if (gameMode === 'online' && roomNetwork && isHost) {
              roomNetwork.broadcast('LUDO_STATE_SYNC', {
                tokens,
                turnIdx: currentTurnIdx,
                phase: 'select',
                dice: roll,
                winnerSeatIdx: seatIdx,
              });
            }
            lockRef.current = false;
            return;
          }
        } else if (currStep <= 50) {
          // Landed on main track: check for capture!
          const landTrackIdx = (PLAYERS_DEF[seatIdx].startTrackIdx + currStep) % 52;
          const captured = await checkAndExecuteCapture(seatIdx, landTrackIdx);
          if (captured) earnedBonus = true;
        }
      }

      // Sync state if online host
      if (gameMode === 'online' && roomNetwork && isHost) {
        roomNetwork.broadcast('LUDO_STATE_SYNC', {
          tokens,
          turnIdx: earnedBonus ? currentTurnIdx : (currentTurnIdx + 1) % activeSeats.length,
          phase: 'roll',
          dice: null,
          winnerSeatIdx: null,
        });
      }

      // Bonus roll or pass turn
      if (earnedBonus) {
        setStatusMsg(`⭐ Bonus Roll! ${seat.name} gets another turn!`);
        setDice(null);
        setBonusRollActive(true);
        setTurnPhase('roll');
        lockRef.current = false;
      } else {
        await delay(350);
        passTurn();
      }
    },
    [tokens, seats, soundEnabled, addChatMessage, triggerMood, gameMode, roomNetwork, isHost, currentTurnIdx, activeSeats.length, passTurn]
  );

  // Check and execute capture
  const checkAndExecuteCapture = async (activeSeatIdx: number, landTrackIdx: number): Promise<boolean> => {
    if (SAFE_TRACK_INDICES.includes(landTrackIdx)) return false;

    let captured = false;
    let victimSeatIdx = -1;
    let victimTokenId = -1;

    for (const otherSeatIdx of activeSeats) {
      if (otherSeatIdx === activeSeatIdx) continue;
      const otherTokens = tokens[otherSeatIdx] || [];
      for (const t of otherTokens) {
        if (t.step >= 0 && t.step <= 50) {
          const otherTrackIdx = (PLAYERS_DEF[otherSeatIdx].startTrackIdx + t.step) % 52;
          if (otherTrackIdx === landTrackIdx) {
            captured = true;
            victimSeatIdx = otherSeatIdx;
            victimTokenId = t.id;
            break;
          }
        }
      }
      if (captured) break;
    }

    if (captured && victimSeatIdx !== -1) {
      if (soundEnabled) sounds.playCapture();
      triggerMood(activeSeatIdx, 'happy');
      triggerMood(victimSeatIdx, 'sad');

      setTokens((prev) => ({
        ...prev,
        [victimSeatIdx]: prev[victimSeatIdx].map((t) => (t.id === victimTokenId ? { ...t, step: -1 } : t)),
      }));

      addChatMessage(
        seats[activeSeatIdx].name,
        PLAYERS_DEF[activeSeatIdx].hex,
        `captured ${seats[victimSeatIdx].name}'s pawn! ✂️`,
        true
      );
      await delay(400);
      return true;
    }

    return false;
  };

  // Roll dice action
  const handleRollDice = useCallback(() => {
    if (turnPhase !== 'roll' || isRolling || lockRef.current || gameOver) return;
    if (gameMode === 'online' && !isMyTurnOnline()) return;

    if (gameMode === 'online' && !isHost && roomNetwork) {
      // Guest requests roll from host
      roomNetwork.send('LUDO_ROLL_DICE', { seatIdx: currentSeatIdx });
      setIsRolling(true);
      return;
    }

    setIsRolling(true);
    if (soundEnabled) sounds.playDice();

    // Roll random 1..6
    const rollResult = Math.floor(Math.random() * 6) + 1;

    if (gameMode === 'online' && roomNetwork && isHost) {
      roomNetwork.broadcast('LUDO_SPIN', { dice: rollResult });
    }

    setTimeout(() => {
      setIsRolling(false);
      setDice(rollResult);

      const seat = seats[currentSeatIdx];
      addChatMessage(seat.name, PLAYERS_DEF[currentSeatIdx].hex, `rolled a ${rollResult}! 🎲`, true);

      if (rollResult === 6) {
        triggerMood(currentSeatIdx, 'happy');
      }

      const movable = getMovableTokens(currentSeatIdx, rollResult);

      if (movable.length === 0) {
        setStatusMsg(`No moves possible for ${seat.name} 😕`);
        setTimeout(() => {
          passTurn();
        }, 900);
      } else if (movable.length === 1) {
        // Auto-move single legal pawn
        setTurnPhase('moving');
        setStatusMsg(`${seat.name} moving pawn...`);
        setTimeout(() => {
          executeMove(currentSeatIdx, movable[0], rollResult);
        }, 500);
      } else {
        setTurnPhase('select');
        setStatusMsg(`Choose a pawn to move (+${rollResult})`);
      }
    }, 750);
  }, [
    turnPhase,
    isRolling,
    gameOver,
    gameMode,
    isMyTurnOnline,
    isHost,
    roomNetwork,
    currentSeatIdx,
    soundEnabled,
    seats,
    addChatMessage,
    triggerMood,
    getMovableTokens,
    passTurn,
    executeMove,
  ]);

  // Click pawn action
  const handleTokenClick = useCallback(
    (seatIdx: number, tokenId: number) => {
      if (gameOver || lockRef.current) return;
      if (turnPhase !== 'select' || dice === null) return;
      if (seatIdx !== currentSeatIdx) return;
      if (gameMode === 'online' && !isMyTurnOnline()) return;

      const movable = getMovableTokens(seatIdx, dice);
      if (!movable.includes(tokenId)) return;

      if (gameMode === 'online' && !isHost && roomNetwork) {
        roomNetwork.send('LUDO_MOVE_TOKEN', { seatIdx, tokenId, roll: dice });
        setTurnPhase('moving');
        return;
      }

      executeMove(seatIdx, tokenId, dice);
    },
    [gameOver, turnPhase, dice, currentSeatIdx, gameMode, isMyTurnOnline, getMovableTokens, isHost, roomNetwork, executeMove]
  );

  // AI Turn handling
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    if (isCurrentSeatAI()) {
      if (turnPhase === 'roll' && !isRolling && dice === null) {
        aiTimerRef.current = setTimeout(() => {
          handleRollDice();
        }, 700);
      } else if (turnPhase === 'select' && dice !== null) {
        aiTimerRef.current = setTimeout(() => {
          const movable = getMovableTokens(currentSeatIdx, dice);
          if (movable.length > 0) {
            // Pick move based on difficulty
            const diff = currentSeat.aiDifficulty;
            let chosen = movable[0];

            if (diff === 'Hard') {
              // Prioritize: 1. captures, 2. home finish, 3. entering track, 4. furthest
              let bestScore = -999;
              for (const tid of movable) {
                const tok = tokens[currentSeatIdx][tid];
                let score = tok.step;
                if (tok.step === -1 && dice === 6) score = 40;
                if (tok.step + dice === 56) score = 100;
                // Capture check
                if (tok.step >= 0 && tok.step <= 50) {
                  const targetTrack = (PLAYERS_DEF[currentSeatIdx].startTrackIdx + tok.step + dice) % 52;
                  if (!SAFE_TRACK_INDICES.includes(targetTrack)) {
                    score += 50;
                  }
                }
                if (score > bestScore) {
                  bestScore = score;
                  chosen = tid;
                }
              }
            } else if (diff === 'Medium') {
              // Prioritize spawning or random
              const spawnTid = movable.find((id) => tokens[currentSeatIdx][id].step === -1);
              chosen = spawnTid !== undefined ? spawnTid : movable[Math.floor(Math.random() * movable.length)];
            } else {
              // Easy: purely random
              chosen = movable[Math.floor(Math.random() * movable.length)];
            }

            executeMove(currentSeatIdx, chosen, dice);
          }
        }, 600);
      }
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [gameState, gameOver, isCurrentSeatAI, turnPhase, isRolling, dice, currentSeatIdx, currentSeat.aiDifficulty, getMovableTokens, tokens, handleRollDice, executeMove]);

  // Turn Watchdog: auto-skip if stuck
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    watchdogTimerRef.current = setInterval(() => {
      if (lockRef.current && turnPhase === 'moving') {
        // Recovery mechanism
        setTimeout(() => {
          lockRef.current = false;
        }, 5000);
      }
    }, 4000);

    return () => {
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current);
    };
  }, [gameState, gameOver, turnPhase]);

  // Setup Online Listeners
  useEffect(() => {
    if (!roomNetwork) return;

    const unregRoster = roomNetwork.onPlayerListChange((players: RoomPlayer[]) => {
      setRoster(players);
      // Synchronize player seats in online room
      setSeats((prev) => {
        return prev.map((seat, idx) => {
          const netPlayer = players[idx];
          if (netPlayer) {
            return {
              ...seat,
              name: netPlayer.name,
              avatar: netPlayer.avatar || DEFAULT_EMOJIS[idx],
              networkPlayerId: netPlayer.id,
              isAi: false,
            };
          }
          return seat;
        });
      });
    });

    const unregStart = roomNetwork.on('LUDO_GAME_START', (msg) => {
      const payload = msg.payload as { players: RoomPlayer[] };
      if (payload?.players) {
        setPlayerCount(payload.players.length);
      }
      setGameState('playing');
      setTurnPhase('roll');
      setDice(null);
      setGameOver(false);
      setWinnerSeatIdx(null);
      addChatMessage('Game', '#10b981', 'Game started! 🎲 Roll a 6 to bring pawns onto the board.', true);
    });

    const unregSync = roomNetwork.on('LUDO_STATE_SYNC', (msg) => {
      const payload = msg.payload as {
        tokens: Record<number, Token[]>;
        turnIdx: number;
        phase: 'roll' | 'select' | 'moving';
        dice: number | null;
        winnerSeatIdx: number | null;
      };
      if (payload) {
        if (payload.tokens) setTokens(payload.tokens);
        if (typeof payload.turnIdx === 'number') setCurrentTurnIdx(payload.turnIdx);
        if (payload.phase) setTurnPhase(payload.phase);
        setDice(payload.dice);
        if (payload.winnerSeatIdx !== null && payload.winnerSeatIdx !== undefined) {
          setGameOver(true);
          setWinnerSeatIdx(payload.winnerSeatIdx);
        }
      }
    });

    const unregSpin = roomNetwork.on('LUDO_SPIN', (msg) => {
      const payload = msg.payload as { dice: number };
      if (payload?.dice) {
        setIsRolling(true);
        if (soundEnabled) sounds.playDice();
        setTimeout(() => {
          setIsRolling(false);
          setDice(payload.dice);
        }, 750);
      }
    });

    const unregRollReq = roomNetwork.on('LUDO_ROLL_DICE', () => {
      if (isHost) {
        handleRollDice();
      }
    });

    const unregMoveReq = roomNetwork.on('LUDO_MOVE_TOKEN', (msg) => {
      if (isHost) {
        const payload = msg.payload as { seatIdx: number; tokenId: number; roll: number };
        if (payload) {
          executeMove(payload.seatIdx, payload.tokenId, payload.roll);
        }
      }
    });

    const unregChat = roomNetwork.on('LUDO_CHAT', (msg) => {
      const payload = msg.payload as { sender: string; color: string; text: string; mood?: 'happy' | 'sad' };
      if (payload) {
        addChatMessage(payload.sender, payload.color, payload.text);
        if (payload.mood) {
          const matchedSeat = seats.findIndex((s) => s.name === payload.sender);
          if (matchedSeat >= 0) triggerMood(matchedSeat, payload.mood);
        }
      }
    });

    const unregKick = roomNetwork.on('KICKED_FROM_ROOM', () => {
      alert('The host removed you from the room.');
      setGameState('setup');
      setRoomNetwork(null);
    });

    return () => {
      unregRoster();
      unregStart();
      unregSync();
      unregSpin();
      unregRollReq();
      unregMoveReq();
      unregChat();
      unregKick();
    };
  }, [roomNetwork, isHost, soundEnabled, seats, addChatMessage, triggerMood, handleRollDice, executeMove]);

  // Handle local Quick Reaction
  const handleSendReaction = (emojiText: string) => {
    sounds.playClick();
    const mySeat = seats[currentSeatIdx] || seats[0];
    const isSad = emojiText === '😡';
    const isHappy = emojiText === '👏' || emojiText === '🔥' || emojiText === '❤️' || emojiText === 'GG' || emojiText === 'Good Game';
    const mood: 'happy' | 'sad' | '' = isSad ? 'sad' : isHappy ? 'happy' : '';

    if (mood) triggerMood(currentSeatIdx, mood);
    addChatMessage(mySeat.name, PLAYERS_DEF[currentSeatIdx].hex, emojiText);

    if (gameMode === 'online' && roomNetwork) {
      roomNetwork.broadcast('LUDO_CHAT', {
        sender: mySeat.name,
        color: PLAYERS_DEF[currentSeatIdx].hex,
        text: emojiText,
        mood,
      });
    }
  };

  // Handle chat submission
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim().slice(0, 180);
    if (!clean) return;

    const mySeat = seats[currentSeatIdx] || seats[0];
    addChatMessage(mySeat.name, PLAYERS_DEF[currentSeatIdx].hex, clean);
    setChatInput('');

    if (gameMode === 'online' && roomNetwork) {
      roomNetwork.broadcast('LUDO_CHAT', {
        sender: mySeat.name,
        color: PLAYERS_DEF[currentSeatIdx].hex,
        text: clean,
      });
    }
  };

  // Start Local Game
  const startLocalGame = (mode: 'ai' | 'local') => {
    sounds.playClick();
    setGameMode(mode);
    setGameState('playing');
    setTurnPhase('roll');
    setDice(null);
    setGameOver(false);
    setWinnerSeatIdx(null);
    setTokens({
      0: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      1: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      2: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      3: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    });
    addChatMessage('Game', '#10b981', 'Game started! 🎲 Roll a 6 to bring pawns onto the board.', true);
  };

  // Create Online Room
  const handleCreateOnlineRoom = async () => {
    sounds.playClick();
    setOnlineError('');
    setIsConnecting(true);

    try {
      const net = new RoomNetwork('ludo');
      setRoomNetwork(net);

      const hostSeat = seats[0];
      const code = await net.createRoom('', hostSeat.name, {
        avatar: hostSeat.avatar,
        avatarColor: PLAYERS_DEF[0].hex,
        gameId: 'ludo',
        maxPlayers: playerCount,
      });

      setRoomCode(code);
      setIsHost(true);
      setGameMode('online');
      setGameState('lobby');
      setRoster(net.players);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Join Online Room
  const handleJoinOnlineRoom = async () => {
    sounds.playClick();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setOnlineError('Please enter a valid room code.');
      return;
    }
    setOnlineError('');
    setIsConnecting(true);

    try {
      const net = new RoomNetwork('ludo');
      setRoomNetwork(net);

      const guestSeat = seats[0];
      await net.joinRoom(cleanCode, guestSeat.name, {
        avatar: guestSeat.avatar,
        avatarColor: PLAYERS_DEF[1].hex,
        gameId: 'ludo',
      });

      setRoomCode(cleanCode);
      setIsHost(false);
      setGameMode('online');
      setGameState('lobby');
      setRoster(net.players);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Could not join room.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Start Online Game (Host)
  const handleStartOnlineGame = async () => {
    if (!roomNetwork || !isHost) return;
    sounds.playClick();
    try {
      await roomNetwork.startGame();
      setGameState('playing');
      setTurnPhase('roll');
      setDice(null);
      setGameOver(false);
      setWinnerSeatIdx(null);
      addChatMessage('Game', '#10b981', 'Game started! 🎲 Roll a 6 to bring pawns onto the board.', true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start game.');
    }
  };

  // Kick Player (Host)
  const handleKickPlayer = async (playerId: string) => {
    if (!roomNetwork || !isHost) return;
    try {
      await roomNetwork.kickPlayer(playerId);
      setPlayerToKick(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove player.');
    }
  };

  // Copy Room Link / Code
  const handleCopyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    sounds.playClick();
    const origin = window.location.origin;
    const inviteUrl = `${origin}/#/games/ludo?room=${encodeURIComponent(roomCode)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Return to Setup
  const handleExitToSetup = () => {
    if (gameState === 'playing' && !gameOver) {
      if (!confirm('Are you sure you want to leave the current game?')) return;
    }
    if (roomNetwork) {
      roomNetwork.cleanup();
      setRoomNetwork(null);
    }
    setGameState('setup');
    setShowSettingsModal(false);
  };

  return (
    <GameLayout game={gameInfo}>
      <div className="w-full max-w-xl mx-auto flex flex-col items-center select-none text-slate-100">
        {/* CSS Embedded Styles for Ludo King pawns, 3D dice, and mood animations */}
        <style>{`
          .ludo-aw {
            --s: 50px;
          }
          .ludo-aw.happy .ludo-av {
            animation: ludoJump 0.55s ease-in-out 4;
            box-shadow: 0 0 0 3px #ffd54f, 0 0 20px 7px rgba(255, 202, 40, 0.6);
          }
          @keyframes ludoJump {
            50% { transform: translateY(-7px) scale(1.1); }
          }
          .ludo-ring {
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 3px solid #ffd54f;
            animation: ludoRingPulse 1.2s ease-out infinite;
            pointer-events: none;
          }
          @keyframes ludoRingPulse {
            from { transform: scale(0.9); opacity: 1; }
            to { transform: scale(1.8); opacity: 0; }
          }
          .ludo-fx {
            position: absolute;
            pointer-events: none;
            z-index: 10;
            line-height: 1;
          }
          .happy-crown {
            left: 50%;
            top: -24px;
            font-size: 22px;
            margin-left: -11px;
            animation: dropCrown 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) both;
          }
          @keyframes dropCrown {
            from { transform: translateY(-24px) rotate(-25deg); opacity: 0; }
            to { transform: none; opacity: 1; }
          }
          .happy-fire {
            right: -12px;
            top: -6px;
            font-size: 20px;
            animation: stickFire 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both;
          }
          @keyframes stickFire {
            from { transform: scale(0) rotate(-40deg); }
            to { transform: scale(1) rotate(8deg); }
          }
          .happy-sparkle {
            left: -10px;
            top: 10px;
            font-size: 18px;
            animation: riseSparkle 1.1s ease-out infinite;
          }
          @keyframes riseSparkle {
            0% { transform: translateY(6px) scale(0.5); opacity: 0; }
            40% { opacity: 1; }
            100% { transform: translateY(-12px) scale(1.2); opacity: 0; }
          }
          .ludo-aw.sad .ludo-av {
            animation: ludoShake 0.4s 2, ludoDroop 1.2s 0.8s ease-in-out infinite alternate;
            filter: grayscale(0.7) brightness(0.85);
          }
          @keyframes ludoShake {
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
          }
          @keyframes ludoDroop {
            from { transform: translateY(0) rotate(0); }
            to { transform: translateY(3px) rotate(-5deg); }
          }
          .sad-cloud {
            left: 50%;
            top: -24px;
            font-size: 22px;
            margin-left: -11px;
            animation: swayCloud 1.4s ease-in-out infinite alternate;
          }
          @keyframes swayCloud {
            to { transform: translateX(6px); }
          }
          .sad-heart {
            right: -12px;
            top: -6px;
            font-size: 20px;
            animation: stickFire 0.5s both;
          }
          .ludo-tear {
            position: absolute;
            width: 7px;
            height: 13px;
            top: 42%;
            background: linear-gradient(#e1f5fe, #29b6f6);
            border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
            animation: tearFall 1s ease-in infinite;
            z-index: 10;
          }
          .ludo-tear.t1 { left: 28%; }
          .ludo-tear.t2 { left: 62%; animation-delay: 0.4s; }
          @keyframes tearFall {
            0% { transform: translateY(-4px) scaleY(0.4); opacity: 0; }
            25% { opacity: 1; }
            100% { transform: translateY(22px); opacity: 0; }
          }
          .pawn-can-move {
            animation: pawnBounce 0.5s infinite alternate;
            filter: drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 10px #ffd700);
            cursor: pointer;
            z-index: 40 !important;
          }
          @keyframes pawnBounce {
            to { transform: translateY(-6px); }
          }
          .dice-box {
            perspective: 380px;
          }
          .dice-box.dice-ready {
            animation: diceBounce 0.7s infinite alternate ease-in-out;
          }
          @keyframes diceBounce {
            to { transform: translateY(-6px); }
          }
          .dice-cube {
            position: relative;
            width: 58px;
            height: 58px;
            transform-style: preserve-3d;
            transition: transform 0.45s cubic-bezier(0.2, 1.4, 0.4, 1);
          }
          .dice-cube.rolling {
            animation: diceSpin 0.75s linear;
          }
          @keyframes diceSpin {
            0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
            100% { transform: rotateX(720deg) rotateY(720deg) rotateZ(360deg); }
          }
          .dice-face {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 35% 30%, #ffffff, #f1f5f9 65%, #cbd5e1);
            border: 2px solid #94a3b8;
            border-radius: 12px;
            box-shadow: inset 0 0 8px rgba(0,0,0,0.25), 0 4px 6px rgba(0,0,0,0.3);
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            padding: 6px;
          }
          .dice-pip {
            border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #475569, #0f172a 70%);
            box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.5);
            margin: auto;
            width: 10px;
            height: 10px;
          }
          .dice-face.f-1 .dice-pip {
            background: radial-gradient(circle at 35% 30%, #f87171, #dc2626 70%);
            width: 14px;
            height: 14px;
          }
          .board-wood {
            --bd-bg: #f5ecd7;
            --bd-line: #a98b55;
            --bd-cell: #faebd7;
          }
          .board-night {
            --bd-bg: #1e293b;
            --bd-line: #475569;
            --bd-cell: #334155;
          }
          .board-classic {
            --bd-bg: #ffffff;
            --bd-line: #cbd5e1;
            --bd-cell: #ffffff;
          }
        `}</style>

        {/* --------------------------------------------------------------------- */}
        {/* VIEW 1: GAME SETUP SCREEN */}
        {/* --------------------------------------------------------------------- */}
        {gameState === 'setup' && (
          <div className="w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👑</span>
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                    Ludo King Experience
                  </h1>
                  <p className="text-xs text-slate-400">Play vs AI, Pass & Play, or Online Multiplayer</p>
                </div>
              </div>
            </div>

            {/* Mode Selection Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/60 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setGameMode('ai')}
                className={`py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  gameMode === 'ai'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Bot className="w-4 h-4" />
                Play vs AI
              </button>
              <button
                type="button"
                onClick={() => setGameMode('local')}
                className={`py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  gameMode === 'local'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Pass & Play
              </button>
              <button
                type="button"
                onClick={() => setGameMode('online')}
                className={`py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  gameMode === 'online'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Crown className="w-4 h-4" />
                Play Online
              </button>
            </div>

            {/* Player Count Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setPlayerCount(count);
                    }}
                    className={`py-3 rounded-xl font-black text-base border transition-all ${
                      playerCount === count
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md ring-2 ring-amber-500/30'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    {count} Players
                    <span className="block text-[10px] font-normal text-slate-400">
                      {count === 2 ? 'Red vs Yellow' : count === 3 ? 'Red, Green, Yellow' : '4 Colors Cross'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SEAT CONFIGURATIONS */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {gameMode === 'ai' ? 'Customize Your Player & Opponents' : 'Configure Players & Avatars'}
              </label>

              {(playerCount === 2 ? [0, 2] : playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3]).map((seatIdx) => {
                const seat = seats[seatIdx];
                const def = PLAYERS_DEF[seatIdx];

                return (
                  <div
                    key={seatIdx}
                    className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    {/* Color badge & Avatar */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: def.hex, boxShadow: `0 0 10px ${def.hex}` }}
                      />
                      <LudoAvatar avatar={seat.avatar} color={def.hex} name={seat.name} size={44} />
                    </div>

                    {/* Name input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={seat.name}
                        maxLength={16}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSeats((prev) =>
                            prev.map((s) => (s.seatIndex === seatIdx ? { ...s, name: val } : s))
                          );
                        }}
                        placeholder={`${def.colorName} Player`}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Avatar picker / Camera Upload */}
                    <div className="flex items-center gap-2">
                      {/* Photo / Camera upload */}
                      <label className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer text-slate-300 hover:text-white transition-colors title='Upload photo'">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              compressPhoto(file, (dataUrl) => {
                                setSeats((prev) =>
                                  prev.map((s) => (s.seatIndex === seatIdx ? { ...s, avatar: dataUrl } : s))
                                );
                              });
                            }
                          }}
                        />
                      </label>

                      {/* Emoji Selector Dropdown */}
                      <select
                        value={DEFAULT_EMOJIS.includes(seat.avatar) ? seat.avatar : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== 'custom') {
                            setSeats((prev) =>
                              prev.map((s) => (s.seatIndex === seatIdx ? { ...s, avatar: val } : s))
                            );
                          }
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none"
                      >
                        {DEFAULT_EMOJIS.map((em) => (
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                        {!DEFAULT_EMOJIS.includes(seat.avatar) && <option value="custom">📷 Photo</option>}
                      </select>

                      {/* Player Type (Human vs AI) */}
                      {gameMode === 'local' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSeats((prev) =>
                              prev.map((s) => (s.seatIndex === seatIdx ? { ...s, isAi: !s.isAi } : s))
                            );
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            seat.isAi
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {seat.isAi ? '🤖 AI' : '👤 Human'}
                        </button>
                      )}

                      {/* AI Difficulty */}
                      {((gameMode === 'ai' && seatIdx !== 0) || (gameMode === 'local' && seat.isAi)) && (
                        <select
                          value={seat.aiDifficulty}
                          onChange={(e) => {
                            const val = e.target.value as AIDifficulty;
                            setSeats((prev) =>
                              prev.map((s) => (s.seatIndex === seatIdx ? { ...s, aiDifficulty: val } : s))
                            );
                          }}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-300 focus:outline-none"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS */}
            {gameMode === 'ai' && (
              <button
                type="button"
                onClick={() => startLocalGame('ai')}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg rounded-xl shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2"
              >
                <Dices className="w-6 h-6" />
                Start Game vs AI
              </button>
            )}

            {gameMode === 'local' && (
              <button
                type="button"
                onClick={() => startLocalGame('local')}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg rounded-xl shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2"
              >
                <Dices className="w-6 h-6" />
                Start Pass & Play Game
              </button>
            )}

            {gameMode === 'online' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  💡 Zero-configuration cross-network WebRTC enabled. Create a room or enter your friend's 6-character room code.
                </div>

                {onlineError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl">
                    {onlineError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleCreateOnlineRoom}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Crown className="w-5 h-5" />
                    {isConnecting ? 'Creating...' : 'Create Room (Host)'}
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Room Code"
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono font-bold tracking-widest text-amber-300 uppercase focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={handleJoinOnlineRoom}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isConnecting ? 'Joining...' : 'Join Room'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* VIEW 2: ONLINE WAITING LOBBY */}
        {/* --------------------------------------------------------------------- */}
        {gameState === 'lobby' && (
          <div className="w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-6">
              <span className="text-xs uppercase tracking-wider text-slate-400">Share this Room Code</span>
              <div className="flex items-center justify-center gap-3 my-2">
                <span className="text-4xl font-black font-mono tracking-widest bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 transition-colors"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 border border-amber-500/30 rounded-lg text-xs font-semibold text-amber-300 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Invite Link Copied!' : 'Copy Direct Invite Link'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {isHost ? 'Waiting for friends to join before starting...' : 'Waiting for host to start the game...'}
              </p>
            </div>

            {/* Lobby Roster */}
            <div className="space-y-3 mb-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Joined Players ({roster.length} / 4)
              </div>
              {roster.map((player, idx) => {
                const colorDef = PLAYERS_DEF[idx] || PLAYERS_DEF[0];
                return (
                  <div
                    key={player.id}
                    className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <LudoAvatar avatar={player.avatar || DEFAULT_EMOJIS[idx]} color={colorDef.hex} size={42} />
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                          {player.name}
                          {player.isHost && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
                              Host 👑
                            </span>
                          )}
                          {player.id === roomNetwork?.myId && (
                            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: colorDef.hex }}>
                          {colorDef.colorName} Color
                        </span>
                      </div>
                    </div>

                    {/* Host kick control */}
                    {isHost && !player.isHost && (
                      <button
                        type="button"
                        onClick={() => setPlayerToKick(player)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors title='Remove player'"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Host Kick Confirmation Modal */}
            {playerToKick && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full text-center">
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Remove Player?</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to remove <b className="text-white">{playerToKick.name}</b> from this room?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPlayerToKick(null)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKickPlayer(playerToKick.id)}
                      className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lobby Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExitToSetup}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>

              {isHost ? (
                <button
                  type="button"
                  disabled={roster.length < 2}
                  onClick={handleStartOnlineGame}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Dices className="w-5 h-5" />
                  Start Game ({roster.length} Players)
                </button>
              ) : (
                <div className="flex-1 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-center text-sm text-slate-300 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Waiting for host to start...
                </div>
              )}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* VIEW 3: IN-GAME PLAYING SCREEN */}
        {/* --------------------------------------------------------------------- */}
        {gameState === 'playing' && (
          <div className="w-full flex flex-col items-center">
            {/* Top Bar with Settings & Room info */}
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExitToSetup}
                  className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-black bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                  👑 Ludo King
                </h2>
              </div>

              {gameMode === 'online' && (
                <div
                  onClick={handleCopyCode}
                  className="cursor-pointer px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5"
                >
                  <span>{roomCode}</span>
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PLAYER AVATARS ROSTER BAR */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {activeSeats.map((seatIdx) => {
                const seat = seats[seatIdx];
                const def = PLAYERS_DEF[seatIdx];
                const isTurn = seatIdx === currentSeatIdx;
                const homeTokensCount = (tokens[seatIdx] || []).filter((t) => t.step === 56).length;

                return (
                  <div
                    key={seatIdx}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                      isTurn
                        ? 'bg-slate-800/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <LudoAvatar
                      avatar={seat.avatar}
                      color={def.hex}
                      name={seat.name}
                      mood={seat.mood}
                      size={40}
                      isActiveTurn={isTurn}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate text-slate-100 flex items-center gap-1">
                        {seat.name}
                        {seat.isAi && <span className="text-[9px] text-blue-400">AI</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span style={{ color: def.hex }} className="font-semibold">
                          {def.colorName}
                        </span>
                        <span className="font-mono text-amber-300">🏠 {homeTokensCount}/4</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 15x15 LUDO BOARD */}
            <div
              className={`relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-950 mb-3 board-${boardTheme}`}
              style={{
                backgroundColor: 'var(--bd-bg, #ffffff)',
                display: 'grid',
                gridTemplateColumns: 'repeat(15, 1fr)',
                gridTemplateRows: 'repeat(15, 1fr)',
              }}
            >
              {/* Grid cell generation */}
              {Array.from({ length: 15 }).map((_, r) =>
                Array.from({ length: 15 }).map((__, c) => {
                  // Check quadrant color (Base yards 6x6)
                  const isRedYard = r < 6 && c < 6;
                  const isGreenYard = r < 6 && c > 8;
                  const isYellowYard = r > 8 && c > 8;
                  const isBlueYard = r > 8 && c < 6;
                  const isCenterGoal = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                  let cellBg = 'var(--bd-cell, #ffffff)';
                  if (isRedYard) cellBg = '#ef4444';
                  if (isGreenYard) cellBg = '#10b981';
                  if (isYellowYard) cellBg = '#f59e0b';
                  if (isBlueYard) cellBg = '#3b82f6';

                  // Home path check
                  let homePathColor = '';
                  if (r === 7 && c >= 1 && c <= 5) homePathColor = '#ef4444';
                  if (c === 7 && r >= 1 && r <= 5) homePathColor = '#10b981';
                  if (r === 7 && c >= 9 && c <= 13) homePathColor = '#f59e0b';
                  if (c === 7 && r >= 9 && r <= 13) homePathColor = '#3b82f6';
                  if (homePathColor) cellBg = homePathColor;

                  // Track Index check
                  const trackIdx = TRACK_CELLS.findIndex((tc) => tc.r === r && tc.c === c);
                  const isSafe = trackIdx >= 0 && SAFE_TRACK_INDICES.includes(trackIdx);

                  // Starting cells
                  if (r === 6 && c === 1) cellBg = '#ef4444';
                  if (r === 1 && c === 8) cellBg = '#10b981';
                  if (r === 8 && c === 13) cellBg = '#f59e0b';
                  if (r === 13 && c === 6) cellBg = '#3b82f6';

                  return (
                    <div
                      key={`${r}-${c}`}
                      className="relative border flex items-center justify-center font-bold text-[10px]"
                      style={{
                        backgroundColor: isCenterGoal ? 'transparent' : cellBg,
                        borderColor: isRedYard || isGreenYard || isYellowYard || isBlueYard ? 'transparent' : 'var(--bd-line, #cbd5e1)',
                      }}
                    >
                      {/* Star on safe square */}
                      {isSafe && trackIdx % 13 !== 0 && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 drop-shadow" />
                      )}

                      {/* Direction arrow on track entrance */}
                      {r === 7 && c === 0 && <span className="text-rose-500 text-sm font-black">→</span>}
                      {r === 0 && c === 7 && <span className="text-emerald-500 text-sm font-black">↓</span>}
                      {r === 7 && c === 14 && <span className="text-amber-500 text-sm font-black">←</span>}
                      {r === 14 && c === 7 && <span className="text-sky-500 text-sm font-black">↑</span>}
                    </div>
                  );
                })
              )}

              {/* 4 Player White Base Yards */}
              {[
                { r: 0, c: 0, color: '#ef4444' },
                { r: 0, c: 9, color: '#10b981' },
                { r: 9, c: 9, color: '#f59e0b' },
                { r: 9, c: 0, color: '#3b82f6' },
              ].map((yd, idx) => (
                <div
                  key={idx}
                  className="absolute bg-white/95 rounded-2xl shadow-inner border-2 border-black/20 grid grid-cols-2 grid-rows-2 p-2"
                  style={{
                    left: `${(yd.c + 1) * (100 / 15)}%`,
                    top: `${(yd.r + 1) * (100 / 15)}%`,
                    width: `${4 * (100 / 15)}%`,
                    height: `${4 * (100 / 15)}%`,
                  }}
                >
                  {[0, 1, 2, 3].map((pock) => (
                    <div key={pock} className="grid place-items-center">
                      <div
                        className="w-5 h-5 rounded-full shadow-inner border border-white"
                        style={{ backgroundColor: yd.color }}
                      />
                    </div>
                  ))}
                </div>
              ))}

              {/* Center Goal Triangle (40% to 60%) */}
              <div
                className="absolute shadow-lg border border-white/60 pointer-events-none"
                style={{
                  left: '40%',
                  top: '40%',
                  width: '20%',
                  height: '20%',
                  background:
                    'conic-gradient(from -45deg, #10b981 0 25%, #f59e0b 0 50%, #3b82f6 0 75%, #ef4444 0)',
                }}
              />

              {/* PAWN TOKENS RENDERING */}
              {activeSeats.flatMap((seatIdx) => {
                const seatTokens = tokens[seatIdx] || [];
                const movableTokens =
                  seatIdx === currentSeatIdx && turnPhase === 'select' && dice !== null
                    ? getMovableTokens(seatIdx, dice)
                    : [];

                return seatTokens.map((token) => {
                  const coords = getTokenCoords(seatIdx, token);
                  const isMovable = movableTokens.includes(token.id);

                  return (
                    <div
                      key={`${seatIdx}-${token.id}`}
                      onClick={() => handleTokenClick(seatIdx, token.id)}
                      className={`absolute select-none transition-all duration-300 ${
                        isMovable ? 'pawn-can-move' : ''
                      }`}
                      style={{
                        left: `${(coords.x - 0.45) * (100 / 15)}%`,
                        top: `${(coords.y - 0.45) * (100 / 15)}%`,
                        width: `${0.9 * (100 / 15)}%`,
                        height: `${0.9 * (100 / 15)}%`,
                        zIndex: 20 + token.id,
                      }}
                    >
                      <PawnSvg color={PLAYERS_DEF[seatIdx].hex} />
                    </div>
                  );
                });
              })}
            </div>

            {/* CONTROLS & 3D DICE BAR */}
            <div className="w-full max-w-[500px] bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xl mb-3">
              {/* 3D Dice Widget */}
              <div
                onClick={handleRollDice}
                className={`dice-box cursor-pointer flex-shrink-0 ${
                  turnPhase === 'roll' && (!gameMode.includes('online') || isMyTurnOnline())
                    ? 'dice-ready'
                    : ''
                }`}
                title="Tap to roll"
              >
                <div
                  className={`dice-cube ${isRolling ? 'rolling' : ''}`}
                  style={{
                    transform:
                      dice === 1
                        ? 'rotateX(0deg)'
                        : dice === 2
                        ? 'rotateX(-90deg)'
                        : dice === 3
                        ? 'rotateY(-90deg)'
                        : dice === 4
                        ? 'rotateY(90deg)'
                        : dice === 5
                        ? 'rotateX(90deg)'
                        : dice === 6
                        ? 'rotateY(180deg)'
                        : 'rotateX(0deg)',
                  }}
                >
                  {/* Face 1 */}
                  <div className="dice-face f-1" style={{ transform: 'rotateX(0deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '2 / 2' }} className="dice-pip" />
                  </div>
                  {/* Face 2 */}
                  <div className="dice-face" style={{ transform: 'rotateX(90deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '1 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 3' }} className="dice-pip" />
                  </div>
                  {/* Face 3 */}
                  <div className="dice-face" style={{ transform: 'rotateY(90deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '1 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '2 / 2' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 3' }} className="dice-pip" />
                  </div>
                  {/* Face 4 */}
                  <div className="dice-face" style={{ transform: 'rotateY(-90deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '1 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '1 / 3' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 3' }} className="dice-pip" />
                  </div>
                  {/* Face 5 */}
                  <div className="dice-face" style={{ transform: 'rotateX(-90deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '1 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '1 / 3' }} className="dice-pip" />
                    <div style={{ gridArea: '2 / 2' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 3' }} className="dice-pip" />
                  </div>
                  {/* Face 6 */}
                  <div className="dice-face" style={{ transform: 'rotateY(180deg) translateZ(28px)' }}>
                    <div style={{ gridArea: '1 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '2 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 1' }} className="dice-pip" />
                    <div style={{ gridArea: '1 / 3' }} className="dice-pip" />
                    <div style={{ gridArea: '2 / 3' }} className="dice-pip" />
                    <div style={{ gridArea: '3 / 3' }} className="dice-pip" />
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span style={{ color: PLAYERS_DEF[currentSeatIdx].hex }}>{currentSeat.name}</span>'s Turn
                  {bonusRollActive && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded">
                      Bonus Roll! ⭐
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {statusMsg ||
                    (gameMode === 'online' && !isMyTurnOnline()
                      ? `Waiting for ${currentSeat.name}...`
                      : turnPhase === 'roll'
                      ? 'Tap the 3D dice to roll! 👈'
                      : turnPhase === 'select'
                      ? `Tap a glowing pawn (+${dice})`
                      : 'Moving pawn...')}
                </div>
              </div>

              {/* Skip Button (Local or Host) */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Skip current player turn?')) passTurn();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
              >
                Skip
              </button>
            </div>

            {/* IN-GAME CHAT & QUICK REACTIONS */}
            <div className="w-full max-w-[500px] bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl">
              {/* Quick Reactions Bar */}
              <div className="grid grid-cols-8 gap-1 mb-2.5">
                {QUICK_REACTIONS.map((re) => (
                  <button
                    key={re}
                    type="button"
                    onClick={() => handleSendReaction(re)}
                    className="py-1.5 bg-slate-950/40 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-sm text-center transition-colors active:scale-95"
                  >
                    {re}
                  </button>
                ))}
              </div>

              {/* Chat Message Box */}
              <div
                ref={chatScrollRef}
                className="h-28 overflow-y-auto bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1.5 mb-2.5 scroll-smooth"
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 my-auto">
                    Chat and system messages will appear here.
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-xs rounded-lg px-2.5 py-1 ${
                        msg.isSystem
                          ? 'bg-amber-500/10 text-amber-200 text-center font-semibold'
                          : 'bg-slate-900 text-slate-200'
                      }`}
                    >
                      {!msg.isSystem && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span style={{ color: msg.color }} className="font-bold">
                            {msg.sender}
                          </span>
                          <span>{msg.time}</span>
                        </div>
                      )}
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  maxLength={180}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODAL: IN-GAME SETTINGS */}
        {/* --------------------------------------------------------------------- */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
              <h3 className="text-lg font-black text-slate-100 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                Game Settings
              </h3>

              {/* Board Theme */}
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Board Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['classic', 'wood', 'night'] as BoardTheme[]).map((thm) => (
                    <button
                      key={thm}
                      type="button"
                      onClick={() => setBoardTheme(thm)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold capitalize border transition-all ${
                        boardTheme === thm
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {thm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-slate-800 mb-4">
                <span className="text-sm font-semibold text-slate-300">Sound Effects</span>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    soundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleExitToSetup}
                  className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-sm font-bold transition-colors"
                >
                  Quit to Setup Menu
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODAL: WINNER / GAME OVER */}
        {/* --------------------------------------------------------------------- */}
        {gameOver && winnerSeatIdx !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
              <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 animate-bounce" />
              <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-1">
                Winner!
              </h2>
              <div className="my-4 flex flex-col items-center">
                <LudoAvatar
                  avatar={seats[winnerSeatIdx].avatar}
                  color={PLAYERS_DEF[winnerSeatIdx].hex}
                  name={seats[winnerSeatIdx].name}
                  mood="happy"
                  size={64}
                />
                <span className="text-lg font-bold text-white mt-2">{seats[winnerSeatIdx].name}</span>
                <span className="text-xs" style={{ color: PLAYERS_DEF[winnerSeatIdx].hex }}>
                  {PLAYERS_DEF[winnerSeatIdx].colorName} Champion
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                All 4 tokens reached home safely!
              </p>
              <button
                type="button"
                onClick={handleExitToSetup}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-base rounded-xl shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all"
              >
                Play Again 🎲
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};
