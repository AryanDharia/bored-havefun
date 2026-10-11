import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Globe, Crown, ArrowRight, LogOut, Sparkles, X, AlertCircle } from 'lucide-react';
import { RoomNetwork, type RoomPlayer, getServerConfig, checkServerHealth } from '../lib/multiplayer/roomNetwork';
import { sounds } from '../lib/audio';

interface MultiplayerRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  minPlayers?: number;
  maxPlayers?: number;
  onStartLocalGame?: (playerNames: string[]) => void;
  onStartOnlineGame?: (network: RoomNetwork) => void;
  onRoomConnected?: (network: RoomNetwork) => void;
  networkInstance?: RoomNetwork;
}

export const MultiplayerRoomModal: React.FC<MultiplayerRoomModalProps> = ({
  isOpen,
  onClose,
  gameTitle,
  minPlayers = 2,
  maxPlayers = 8,
  onStartLocalGame,
  onStartOnlineGame,
  onRoomConnected,
  networkInstance,
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'local'>('online');

  // Local Pass-and-Play state
  const [localCount, setLocalCount] = useState<number>(2);
  const [localNames, setLocalNames] = useState<string[]>(['Player 1', 'Player 2']);

  // Online Room state
  const [mode, setMode] = useState<'menu' | 'in_room'>('menu');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('playbreak_player_name') || 'Player';
  });
  const [roomNetwork, setRoomNetwork] = useState<RoomNetwork | null>(() => networkInstance || null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Server health state
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'unreachable'>('checking');
  const [serverUrl, setServerUrl] = useState<string>(() => getServerConfig().httpUrl);
  const [showServerConfig, setShowServerConfig] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkServerHealth().then((res) => {
        setServerStatus(res.ok ? 'connected' : 'unreachable');
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (localCount !== localNames.length) {
      setLocalNames((prev) => {
        const next = [...prev];
        while (next.length < localCount) {
          next.push(`Player ${next.length + 1}`);
        }
        return next.slice(0, localCount);
      });
    }
  }, [localCount, localNames.length]);

  // Handle URL room code parameter if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.split('?')[1] || window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setRoomCodeInput(urlRoom.toUpperCase());
        setActiveTab('online');
      }
    }
  }, []);

  const handleCreateRoom = async () => {
    sounds.playClick();
    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    setErrorMsg('');
    setIsConnecting(true);

    try {
      localStorage.setItem('playbreak_player_name', displayName.trim());
      const network = new RoomNetwork();
      await network.createRoom('', displayName);

      setRoomNetwork(network);
      setPlayers(network.players);

      if (onRoomConnected) {
        onRoomConnected(network);
      }

      network.onPlayerListChange((updated) => {
        setPlayers(updated);
      });

      setMode('in_room');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not initialize room. Please check your network.';
      setErrorMsg(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    sounds.playClick();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setErrorMsg('Please enter a valid room code (at least 4 characters).');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    setErrorMsg('');
    setIsConnecting(true);

    try {
      localStorage.setItem('playbreak_player_name', displayName.trim());
      const network = new RoomNetwork();
      await network.joinRoom(cleanCode, displayName);

      setRoomNetwork(network);
      setPlayers(network.players);

      if (onRoomConnected) {
        onRoomConnected(network);
      }

      network.onPlayerListChange((updated) => {
        setPlayers(updated);
      });

      // CRITICAL: Listen for Host's game launch broadcast on guest
      network.on('SCRIBBLE_GAME_START', () => {
        if (onStartOnlineGame) {
          onStartOnlineGame(network);
        }
        onClose();
      });

      network.on('GAME_STARTED', () => {
        if (onStartOnlineGame) {
          onStartOnlineGame(network);
        }
        onClose();
      });

      setMode('in_room');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join room. Please verify the code and ensure host is active.';
      setErrorMsg(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyCode = () => {
    if (!roomNetwork) return;
    navigator.clipboard.writeText(roomNetwork.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomNetwork || typeof window === 'undefined') return;
    const base = window.location.href.split('?')[0];
    const link = `${base}?room=${roomNetwork.roomCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeaveRoom = () => {
    sounds.playClick();
    if (roomNetwork) {
      roomNetwork.leaveRoom();
    }
    setRoomNetwork(null);
    setMode('menu');
    setPlayers([]);
  };

  const handleLaunchOnlineGame = async () => {
    sounds.playClick();
    if (!roomNetwork) return;

    if (players.length < minPlayers) {
      setErrorMsg(`Need at least ${minPlayers} players to launch.`);
      return;
    }

    if (roomNetwork.isHost) {
      try {
        await roomNetwork.startGame();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start game';
        setErrorMsg(msg);
        return;
      }
    }

    if (onStartOnlineGame) {
      onStartOnlineGame(roomNetwork);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#12141f] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 text-slate-900 dark:text-white shadow-2xl animate-scaleUp overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with clear title and close icon */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="text-left">
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
              <span>{gameTitle}</span>
              <span className="text-xs font-mono-telemetry font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700">
                Multiplayer
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time room lobby with phone & desktop sync
            </p>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (when in menu) */}
        {mode === 'menu' && (
          <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('online');
              }}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'online'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Online Room</span>
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('local');
              }}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'local'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pass & Play (Local)</span>
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 1: LOCAL PASS-AND-PLAY (Same Device)
           ======================================================== */}
        {activeTab === 'local' && mode === 'menu' && (
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono-telemetry uppercase text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
                Number of Players:
              </label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      sounds.playClick();
                      setLocalCount(num);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                      localCount === num
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {num}P
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-telemetry uppercase text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
                Player Names:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {localNames.map((name, i) => (
                  <input
                    key={i}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const copy = [...localNames];
                      copy[i] = e.target.value;
                      setLocalNames(copy);
                    }}
                    maxLength={15}
                    placeholder={`Player ${i + 1}`}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playMove();
                if (onStartLocalGame) {
                  onStartLocalGame(localNames);
                }
                onClose();
              }}
              className="w-full mt-4 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-display font-bold text-sm shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Start Pass & Play</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 2: ONLINE ROOM (Cross-Device Authoritative Sync)
           ======================================================== */}
        {activeTab === 'online' && mode === 'menu' && (
          <div className="space-y-4 text-left">
            {/* Authoritative Server Connection Banner */}
            <div className={`p-2.5 rounded-xl border text-[11px] font-mono-telemetry transition-all ${
              serverStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : serverStatus === 'checking'
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    serverStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : serverStatus === 'checking'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`} />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {serverStatus === 'connected' ? (
                      <>Server Connected: <span className="font-bold text-emerald-700 dark:text-emerald-400">{serverUrl}</span></>
                    ) : serverStatus === 'checking' ? (
                      <>Connecting to: <span className="font-bold text-amber-700 dark:text-amber-400">{serverUrl || 'Multiplayer Backend'}</span></>
                    ) : serverUrl ? (
                      <>Server Unreachable: <span className="font-bold text-rose-700 dark:text-rose-400">{serverUrl}</span></>
                    ) : (
                      <span className="font-bold text-rose-700 dark:text-rose-400">Multiplayer Server Not Configured</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="text-violet-600 dark:text-violet-400 hover:underline font-bold cursor-pointer shrink-0 ml-2"
                >
                  {showServerConfig ? 'Close' : 'Configure'}
                </button>
              </div>

              {showServerConfig && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Render Web Service URL (e.g. <code>https://your-service.onrender.com</code>):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://your-service.onrender.com"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const trimmed = serverUrl.trim();
                        localStorage.setItem('playbreak_backend_url', trimmed);
                        setServerStatus('checking');
                        const res = await checkServerHealth(trimmed);
                        setServerStatus(res.ok ? 'connected' : 'unreachable');
                        if (!res.ok) {
                          setErrorMsg(res.message);
                        } else {
                          setErrorMsg('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 cursor-pointer"
                    >
                      Save & Test
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono-telemetry uppercase text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
                Your Display Name:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={16}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Create Room */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Host New Room
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Create a room code and invite friends on phone or laptop.
                  </p>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? 'Creating...' : 'Create Room'}
                </button>
              </div>

              {/* Option B: Join Room */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Join Existing Room
                  </h3>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="ENTER CODE"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold uppercase tracking-wider text-center text-slate-900 dark:text-white mb-3"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !roomCodeInput}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Join Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            IN ROOM LOBBY (Live Waiting Room)
           ======================================================== */}
        {mode === 'in_room' && roomNetwork && (
          <div className="space-y-4 text-left">
            {/* Room Code Badge & Share Buttons */}
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-mono-telemetry uppercase tracking-wider font-bold text-violet-700 dark:text-violet-300">
                  Room Code (Share with Friends)
                </span>
                <div className="text-3xl font-black font-mono-telemetry tracking-widest text-violet-700 dark:text-violet-300">
                  {roomNetwork.roomCode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-violet-600/30"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Connected Player Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Players in Lobby ({players.length}/{maxPlayers})
                </span>
                {players.length < minPlayers ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    Need at least {minPlayers} players to start
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Ready to start!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-inner"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                          {p.name} {p.id === roomNetwork.myId && '(You)'}
                        </span>
                        {p.isHost && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Crown className="w-3 h-3" /> Host
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-mono-telemetry font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      READY
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Controls & Leave Room */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Room</span>
              </button>

              {roomNetwork.isHost ? (
                <button
                  onClick={handleLaunchOnlineGame}
                  disabled={players.length < minPlayers}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {players.length < minPlayers
                      ? `Waiting for Players (${players.length}/${minPlayers})`
                      : `Start Game (${players.length} Players)`}
                  </span>
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Waiting for host to launch the game...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
