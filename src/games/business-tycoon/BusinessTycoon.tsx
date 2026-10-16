import React, { useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { TILES, CHANCE_CARDS, CHEST_CARDS, DEFAULT_PLAYERS } from './boardData';
import {
  calculateRent,
  canUpgradeProperty,
  calculateNetWorth,
  rollDice,
  getNearestStation,
  evaluateAiAction
} from './businessLogic';
import type { Player, PropertyState, Card, GamePhase, GameLog } from './types';
import { BoardView } from './BoardView';
import { PropertyModal } from './PropertyModal';
import { CardModal } from './CardModal';
import { SetupDrawer } from './SetupDrawer';
import { Settings, History } from 'lucide-react';

export const BusinessTycoon: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'business-tycoon') || {
    id: 'business-tycoon',
    name: 'Business Tycoon',
    description: 'Classic Indian property trading board game with cities, stations, utilities, and tycoons.',
    icon: '🏛️',
    category: 'Board',
    playerCount: '2–4 Players',
    difficulty: 'Medium',
    tier: 1,
    howToPlay: [
      'Roll 2 dice to travel clockwise around the Indian metropolitan property board.',
      'Purchase unowned cities, railway junctions, and utilities to build your business empire.',
      'Collect rent when other tycoons land on your properties. Monopolies double unimproved rent!',
      'Build houses and skyscraper hotels to maximize rent and bankrupt your rivals to win.'
    ],
    controls: [
      { key: 'Roll Dice', action: 'Roll 2 dice and advance your token' },
      { key: 'Tap Tile', action: 'Inspect title deed & upgrade houses' }
    ],
    tags: ['business', 'board', 'multiplayer', 'property', 'monopoly']
  };

  // Players & Property states
  const [players, setPlayers] = useState<Player[]>(() => [...DEFAULT_PLAYERS]);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [properties, setProperties] = useState<Record<number, PropertyState>>(() => {
    const initial: Record<number, PropertyState> = {};
    TILES.forEach((t) => {
      initial[t.id] = { ownerId: null, houses: 0, isMortgaged: false };
    });
    return initial;
  });

  // Turn Sub-States
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [doublesCount, setDoublesCount] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>('roll');
  const [actionMessage, setActionMessage] = useState<string>('Welcome to Business Tycoon! Roll the dice to start.');

  // Modals
  const [inspectedTileId, setInspectedTileId] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // History Log
  const [logs, setLogs] = useState<GameLog[]>([
    {
      id: 'init',
      text: 'Game started. All tycoons funded with initial capital.',
      time: '00:00',
      type: 'move'
    }
  ]);

  const activePlayer = players[activePlayerIndex];

  const addLog = (text: string, type: GameLog['type'] = 'move', playerId?: number) => {
    const newLog: GameLog = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      type,
      playerId
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 40)]);
  };

  // ---------------------------------------------------------------------------
  // Check Victory
  // ---------------------------------------------------------------------------
  const checkVictory = useCallback((currentPlayers: Player[]) => {
    const solvent = currentPlayers.filter((p) => !p.bankrupt);
    if (solvent.length === 1) {
      setWinner(solvent[0]);
      setGameOver(true);
      sounds.playWin();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      addLog(`🏆 ${solvent[0].name} has bankrupted all rivals and won the Tycoon Crown!`, 'bankrupt');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handle Bankruptcy
  // ---------------------------------------------------------------------------
  const bankruptPlayer = useCallback((player: Player, creditorId?: number) => {
    sounds.playGameOver();
    addLog(`💸 ${player.name} went bankrupt and is eliminated!`, 'bankrupt', player.id);

    // Release or transfer properties
    setProperties((prev) => {
      const next = { ...prev };
      TILES.forEach((t) => {
        if (next[t.id]?.ownerId === player.id) {
          next[t.id] = {
            ownerId: creditorId !== undefined ? creditorId : null,
            houses: 0,
            isMortgaged: false
          };
        }
      });
      return next;
    });

    setPlayers((prev) => {
      const updated = prev.map((p) => (p.id === player.id ? { ...p, bankrupt: true, money: 0 } : p));
      checkVictory(updated);
      return updated;
    });
  }, [checkVictory]);

  // ---------------------------------------------------------------------------
  // Roll Dice & Movement
  // ---------------------------------------------------------------------------
  const handleRollDice = () => {
    if (phase !== 'roll' || isRolling) return;
    setIsRolling(true);
    sounds.playMove();

    setTimeout(() => {
      const rolled = rollDice();
      setDice(rolled);
      setIsRolling(false);
      const total = rolled[0] + rolled[1];
      const isDoubles = rolled[0] === rolled[1];

      // Handle Jail Release via Doubles
      if (activePlayer.inJail) {
        if (isDoubles) {
          sounds.playScore();
          addLog(`${activePlayer.name} rolled doubles (${rolled[0]}-${rolled[1]}) and escaped Jail!`, 'jail', activePlayer.id);
          setPlayers((prev) =>
            prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0 } : p))
          );
          advancePlayer(total, rolled);
        } else {
          const nextJailTurns = activePlayer.jailTurns + 1;
          if (nextJailTurns >= 3) {
            // Must pay ₹50 and leave
            sounds.playClick();
            addLog(`${activePlayer.name} served 3 turns in Jail. Paid ₹50 fine to exit.`, 'jail', activePlayer.id);
            setPlayers((prev) =>
              prev.map((p, idx) =>
                idx === activePlayerIndex
                  ? { ...p, inJail: false, jailTurns: 0, money: Math.max(0, p.money - 50) }
                  : p
              )
            );
            advancePlayer(total, rolled);
          } else {
            addLog(`${activePlayer.name} rolled ${rolled[0]}-${rolled[1]}. No doubles. Stays in Jail.`, 'jail', activePlayer.id);
            setPlayers((prev) =>
              prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, jailTurns: nextJailTurns } : p))
            );
            setActionMessage(`No doubles rolled (${rolled[0]} & ${rolled[1]}). You stay in Jail.`);
            setPhase('turn_ready');
          }
        }
        return;
      }

      // 3 Consecutive Doubles = Go To Jail
      if (isDoubles) {
        const nextDoubles = doublesCount + 1;
        setDoublesCount(nextDoubles);
        if (nextDoubles >= 3) {
          sendToJail(activePlayer);
          addLog(`🚨 ${activePlayer.name} rolled 3 consecutive doubles! Sent to Jail for speeding.`, 'jail', activePlayer.id);
          setActionMessage('Caught speeding with 3 consecutive doubles! Sent to Jail.');
          setPhase('turn_ready');
          return;
        }
      } else {
        setDoublesCount(0);
      }

      advancePlayer(total, rolled);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // Advance Player Position
  // ---------------------------------------------------------------------------
  const advancePlayer = (steps: number, rolledDice: [number, number]) => {
    const oldPos = activePlayer.position;
    const newPos = (oldPos + steps) % 40;
    const passedGo = newPos < oldPos && oldPos !== 0;

    let updatedMoney = activePlayer.money;
    if (passedGo) {
      updatedMoney += 200;
      sounds.playScore();
      addLog(`${activePlayer.name} passed START (GO) and collected ₹200 bonus!`, 'move', activePlayer.id);
    }

    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, position: newPos, money: updatedMoney } : p))
    );

    const landedTile = TILES.find((t) => t.id === newPos)!;
    handleLandedTile(landedTile, rolledDice[0] + rolledDice[1]);
  };

  // ---------------------------------------------------------------------------
  // Send Player to Jail
  // ---------------------------------------------------------------------------
  const sendToJail = (player: Player) => {
    sounds.playHit();
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p))
    );
  };

  // ---------------------------------------------------------------------------
  // Handle Landed Tile Action
  // ---------------------------------------------------------------------------
  const handleLandedTile = (tile: typeof TILES[0], diceSum: number) => {
    // 1. Go to Jail space
    if (tile.id === 30) {
      sendToJail(activePlayer);
      addLog(`🚨 ${activePlayer.name} landed on GO TO JAIL!`, 'jail', activePlayer.id);
      setActionMessage('Landed on Go to Jail! You have been sent straight to Jail.');
      setPhase('turn_ready');
      return;
    }

    // 2. Start / Just Visiting / Free Parking
    if (tile.id === 0) {
      setActionMessage('Landed on START (GO)! Collect ₹200.');
      setPhase('turn_ready');
      return;
    }
    if (tile.id === 10 || tile.id === 20) {
      setActionMessage(`Landed on ${tile.name}. Safe rest zone!`);
      setPhase('turn_ready');
      return;
    }

    // 3. Taxes
    if (tile.type === 'tax' && tile.taxAmount) {
      sounds.playClick();
      const taxDue = tile.taxAmount;
      addLog(`${activePlayer.name} paid ₹${taxDue} in ${tile.name}.`, 'rent', activePlayer.id);

      if (activePlayer.money < taxDue) {
        bankruptPlayer(activePlayer);
        setActionMessage(`Could not afford ₹${taxDue} in ${tile.name}! Bankrupted.`);
        setPhase('turn_ready');
        return;
      }

      setPlayers((prev) =>
        prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money - taxDue } : p))
      );
      setActionMessage(`Paid ₹${taxDue} in ${tile.name}.`);
      setPhase('turn_ready');
      return;
    }

    // 4. Chance
    if (tile.type === 'chance') {
      sounds.playScore();
      const randomCard = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
      setActiveCard(randomCard);
      setActionMessage(`Drew Chance Card: ${randomCard.title}`);
      return;
    }

    // 5. Community Chest
    if (tile.type === 'chest') {
      sounds.playScore();
      const randomCard = CHEST_CARDS[Math.floor(Math.random() * CHEST_CARDS.length)];
      setActiveCard(randomCard);
      setActionMessage(`Drew Community Chest: ${randomCard.title}`);
      return;
    }

    // 6. Property / Station / Utility
    const propState = properties[tile.id];
    if (propState) {
      // Unowned: Offer purchase
      if (propState.ownerId === null) {
        setActionMessage(`${tile.name} is available for ₹${tile.cost}. Would you like to buy?`);
        setPhase('action_needed');
        return;
      }

      // Owned by active player
      if (propState.ownerId === activePlayer.id) {
        setActionMessage(`You landed on your own property, ${tile.name}.`);
        setPhase('turn_ready');
        return;
      }

      // Owned by another player: Pay Rent
      const owner = players.find((p) => p.id === propState.ownerId);
      if (owner && !owner.bankrupt) {
        const { rent, breakdown } = calculateRent(tile.id, diceSum, properties);
        sounds.playClick();
        addLog(
          `${activePlayer.name} paid ₹${rent} rent to ${owner.name} for landing on ${tile.name} (${breakdown}).`,
          'rent',
          activePlayer.id
        );

        if (activePlayer.money < rent) {
          // Bankrupt
          bankruptPlayer(activePlayer, owner.id);
          setActionMessage(`Cannot afford ₹${rent} rent to ${owner.name}! Bankrupted.`);
          setPhase('turn_ready');
          return;
        }

        // Transfer rent
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === activePlayer.id) return { ...p, money: p.money - rent };
            if (p.id === owner.id) return { ...p, money: p.money + rent };
            return p;
          })
        );
        setActionMessage(`Paid ₹${rent} rent to ${owner.name} for ${tile.name}.`);
        setPhase('turn_ready');
        return;
      }
    }

    setPhase('turn_ready');
  };

  // ---------------------------------------------------------------------------
  // Player Actions: Buy / Pass / Jail Bail
  // ---------------------------------------------------------------------------
  const handleBuyProperty = () => {
    const tile = TILES.find((t) => t.id === activePlayer.position);
    if (!tile || !tile.cost || activePlayer.money < tile.cost) return;

    sounds.playScore();
    setProperties((prev) => ({
      ...prev,
      [tile.id]: { ownerId: activePlayer.id, houses: 0, isMortgaged: false }
    }));

    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money - tile.cost! } : p))
    );

    addLog(`🏢 ${activePlayer.name} purchased ${tile.name} for ₹${tile.cost}.`, 'buy', activePlayer.id);
    setActionMessage(`Successfully purchased ${tile.name} for ₹${tile.cost}!`);
    setPhase('turn_ready');
  };

  const handlePassTurn = () => {
    sounds.playClick();
    setActionMessage(`${activePlayer.name} passed on purchasing.`);
    setPhase('turn_ready');
  };

  const handlePayJailBail = () => {
    if (activePlayer.money < 50) return;
    sounds.playClick();
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0, money: p.money - 50 } : p))
    );
    addLog(`${activePlayer.name} paid ₹50 bail and is released from Jail.`, 'jail', activePlayer.id);
    setActionMessage('Paid ₹50 bail! You are now free to roll on your next turn.');
    setPhase('turn_ready');
  };

  const handleUseJailCard = () => {
    if (activePlayer.jailCards <= 0) return;
    sounds.playScore();
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0, jailCards: p.jailCards - 1 } : p))
    );
    addLog(`${activePlayer.name} used a Get Out of Jail Free card!`, 'jail', activePlayer.id);
    setActionMessage('Used your Get Out of Jail Free card! You are free.');
    setPhase('turn_ready');
  };

  // ---------------------------------------------------------------------------
  // Property Upgrades
  // ---------------------------------------------------------------------------
  const handleUpgradeProperty = (tileId: number) => {
    const tile = TILES.find((t) => t.id === tileId);
    if (!tile || !tile.houseCost || activePlayer.money < tile.houseCost) return;

    const check = canUpgradeProperty(tileId, properties, activePlayer);
    if (!check.canUpgrade) return;

    sounds.playScore();
    setProperties((prev) => ({
      ...prev,
      [tileId]: {
        ...prev[tileId],
        houses: prev[tileId].houses + 1
      }
    }));

    setPlayers((prev) =>
      prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money - tile.houseCost! } : p))
    );

    const levelName = properties[tileId].houses + 1 === 5 ? 'Skyscraper Hotel' : `House #${properties[tileId].houses + 1}`;
    addLog(`🏗️ ${activePlayer.name} built a ${levelName} on ${tile.name} for ₹${tile.houseCost}.`, 'upgrade', activePlayer.id);
    setActionMessage(`Constructed ${levelName} on ${tile.name}!`);
  };

  // ---------------------------------------------------------------------------
  // Card Dismiss Action
  // ---------------------------------------------------------------------------
  const handleDismissCard = () => {
    if (!activeCard) return;
    const card = activeCard;
    setActiveCard(null);

    // Apply card effects
    if (card.amount) {
      if (card.amount > 0) {
        sounds.playScore();
        setPlayers((prev) =>
          prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money + card.amount! } : p))
        );
      } else {
        sounds.playClick();
        const due = Math.abs(card.amount);
        if (activePlayer.money < due) {
          bankruptPlayer(activePlayer);
          setActionMessage(`Cannot afford card fee of ₹${due}! Bankrupted.`);
          setPhase('turn_ready');
          return;
        }
        setPlayers((prev) =>
          prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money - due } : p))
        );
      }
    }

    if (card.moveTo !== undefined) {
      const oldPos = activePlayer.position;
      const target = card.moveTo;
      const passed = target < oldPos;
      setPlayers((prev) =>
        prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, position: target, money: p.money + (passed ? 200 : 0) } : p))
      );
      const landed = TILES.find((t) => t.id === target)!;
      handleLandedTile(landed, dice[0] + dice[1]);
      return;
    }

    if (card.nearestStation) {
      const stationId = getNearestStation(activePlayer.position);
      const passed = stationId < activePlayer.position;
      setPlayers((prev) =>
        prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, position: stationId, money: p.money + (passed ? 200 : 0) } : p))
      );
      const landed = TILES.find((t) => t.id === stationId)!;
      handleLandedTile(landed, dice[0] + dice[1]);
      return;
    }

    if (card.sendToJail) {
      sendToJail(activePlayer);
      setActionMessage('Sent to Jail by card order!');
      setPhase('turn_ready');
      return;
    }

    if (card.getOutOfJail) {
      setPlayers((prev) =>
        prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, jailCards: p.jailCards + 1 } : p))
      );
    }

    if (card.collectFromAll) {
      const fee = card.collectFromAll;
      let totalCollected = 0;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === activePlayer.id) return p;
          if (p.bankrupt) return p;
          const deducted = Math.min(p.money, fee);
          totalCollected += deducted;
          return { ...p, money: p.money - deducted };
        }).map((p) => (p.id === activePlayer.id ? { ...p, money: p.money + totalCollected } : p))
      );
    }

    if (card.repairHouseFee || card.repairHotelFee) {
      let repairTotal = 0;
      TILES.forEach((t) => {
        const p = properties[t.id];
        if (p && p.ownerId === activePlayer.id) {
          if (p.houses === 5) repairTotal += card.repairHotelFee || 100;
          else if (p.houses > 0) repairTotal += p.houses * (card.repairHouseFee || 25);
        }
      });

      if (repairTotal > 0) {
        if (activePlayer.money < repairTotal) {
          bankruptPlayer(activePlayer);
          setPhase('turn_ready');
          return;
        }
        setPlayers((prev) =>
          prev.map((p, idx) => (idx === activePlayerIndex ? { ...p, money: p.money - repairTotal } : p))
        );
        addLog(`${activePlayer.name} paid ₹${repairTotal} in real estate maintenance repairs.`, 'rent', activePlayer.id);
      }
    }

    setPhase('turn_ready');
  };

  // ---------------------------------------------------------------------------
  // End Turn & Pass to Next Player
  // ---------------------------------------------------------------------------
  const handleEndTurn = () => {
    sounds.playClick();
    // Roll again if doubles and not in jail
    if (dice[0] === dice[1] && doublesCount > 0 && !activePlayer.inJail && !activePlayer.bankrupt) {
      setActionMessage(`Rolled doubles (${dice[0]}-${dice[1]})! ${activePlayer.name} gets another roll.`);
      setPhase('roll');
      return;
    }

    setDoublesCount(0);

    // Advance to next solvent player
    let nextIdx = (activePlayerIndex + 1) % players.length;
    let attempts = 0;
    while (players[nextIdx].bankrupt && attempts < players.length) {
      nextIdx = (nextIdx + 1) % players.length;
      attempts++;
    }

    setActivePlayerIndex(nextIdx);
    setActionMessage(`${players[nextIdx].name}'s turn. Roll the dice!`);
    setPhase('roll');
  };

  // ---------------------------------------------------------------------------
  // AI Turn Automation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (gameOver || !activePlayer.isAi || activePlayer.bankrupt) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'roll') {
      timer = setTimeout(() => {
        if (activePlayer.inJail) {
          // If in jail, hard AI pays bail if rich, otherwise rolls
          if (activePlayer.money >= 350) {
            handlePayJailBail();
          } else {
            handleRollDice();
          }
        } else {
          handleRollDice();
        }
      }, 700);
    } else if (phase === 'action_needed') {
      timer = setTimeout(() => {
        const tile = TILES.find((t) => t.id === activePlayer.position);
        if (tile) {
          const aiDecision = evaluateAiAction(activePlayer, tile, properties);
          if (aiDecision.shouldBuy) {
            handleBuyProperty();
          } else {
            handlePassTurn();
          }
        } else {
          handlePassTurn();
        }
      }, 600);
    } else if (phase === 'turn_ready') {
      timer = setTimeout(() => {
        // AI checks for possible property upgrades before ending turn
        const tile = TILES.find((t) => t.id === activePlayer.position);
        if (tile) {
          const aiDecision = evaluateAiAction(activePlayer, tile, properties);
          if (aiDecision.upgradeCandidateId !== null) {
            handleUpgradeProperty(aiDecision.upgradeCandidateId);
          }
        }
        handleEndTurn();
      }, 650);
    }

    return () => clearTimeout(timer);
  }, [phase, activePlayer, gameOver, properties]);

  // ---------------------------------------------------------------------------
  // Reset Game
  // ---------------------------------------------------------------------------
  const resetGame = (customPlayers?: Player[], startingCash: number = 1500) => {
    const list = customPlayers || DEFAULT_PLAYERS.map((p) => ({
      ...p,
      money: startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      bankrupt: false
    }));

    setPlayers(list);
    setActivePlayerIndex(0);
    setDice([1, 1]);
    setDoublesCount(0);
    setPhase('roll');
    setGameOver(false);
    setWinner(null);
    setInspectedTileId(null);
    setActiveCard(null);
    setActionMessage('Match restarted! Roll the dice to begin.');

    const initialProps: Record<number, PropertyState> = {};
    TILES.forEach((t) => {
      initialProps[t.id] = { ownerId: null, houses: 0, isMortgaged: false };
    });
    setProperties(initialProps);

    setLogs([
      {
        id: 'reset',
        text: 'New Business Tycoon game started.',
        time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        type: 'move'
      }
    ]);
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={() => resetGame()}
      headerControls={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              setShowSetup(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Configure players and AI"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 select-none">
        {/* Main Board View */}
        <BoardView
          properties={properties}
          players={players}
          activePlayerIndex={activePlayerIndex}
          dice={dice}
          isRolling={isRolling}
          phase={phase}
          onRollDice={handleRollDice}
          onBuyProperty={handleBuyProperty}
          onPassTurn={handlePassTurn}
          onPayJailBail={handlePayJailBail}
          onUseJailCard={handleUseJailCard}
          onEndTurn={handleEndTurn}
          onInspectTile={(tId) => setInspectedTileId(tId)}
          actionMessage={actionMessage}
        />

        {/* Player Ledger Portfolio Cards */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {players.map((p, idx) => {
            const isTurn = idx === activePlayerIndex;
            const netWorth = calculateNetWorth(p, properties);
            const ownedCount = TILES.filter((t) => properties[t.id]?.ownerId === p.id).length;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border transition-all ${
                  p.bankrupt
                    ? 'opacity-40 bg-slate-900/40 border-slate-800'
                    : isTurn
                    ? 'bg-[#121422] border-orange-500 shadow-md shadow-orange-500/10 scale-102 ring-1 ring-orange-400/50'
                    : 'bg-[#0f111c] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <strong className="text-xs font-bold text-white truncate max-w-[80px]">
                      {p.name}
                    </strong>
                  </div>
                  <span className="text-sm shrink-0">{p.tokenEmoji}</span>
                </div>

                <div className="flex items-baseline justify-between mb-1 font-mono">
                  <span className="text-[10px] text-slate-400 uppercase">Cash:</span>
                  <strong className={`text-xs font-bold ${p.bankrupt ? 'text-slate-500 line-through' : 'text-emerald-400'}`}>
                    ₹{p.money}
                  </strong>
                </div>

                <div className="flex items-baseline justify-between font-mono text-[10px] text-slate-400">
                  <span>Net Worth:</span>
                  <span className="text-slate-200 font-semibold">₹{netWorth}</span>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{ownedCount} Properties</span>
                  {p.inJail && <span className="text-rose-400 font-bold">In Jail</span>}
                  {p.bankrupt && <span className="text-rose-500 font-bold">Bankrupt</span>}
                  {!p.inJail && !p.bankrupt && p.isAi && <span className="text-blue-400">AI</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Transaction Feed / Rules Guidance */}
        <div className="w-full p-3.5 rounded-2xl bg-[#0c0e17] border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-white/5">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-orange-400" />
              <span>Live Tycoon Transaction Ledger</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Tap any space to inspect deed</span>
          </div>

          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
            {logs.slice(0, 5).map((lg) => (
              <div key={lg.id} className="flex items-center justify-between text-slate-300">
                <span className="truncate pr-2">{lg.text}</span>
                <span className="text-[9px] text-slate-500 shrink-0">{lg.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Deed Modal */}
      <PropertyModal
        tileId={inspectedTileId}
        onClose={() => setInspectedTileId(null)}
        properties={properties}
        players={players}
        activePlayer={activePlayer}
        onUpgrade={handleUpgradeProperty}
      />

      {/* Chance / Community Chest Card Modal */}
      <CardModal card={activeCard} onDismiss={handleDismissCard} />

      {/* Player Setup Drawer */}
      <SetupDrawer
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onStartGame={(cfg, cash) => resetGame(cfg, cash)}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOver}
        title={winner ? `👑 ${winner.name} Wins!` : 'Game Over!'}
        message="All rival tycoons have been bankrupted. You reign supreme as the ultimate Business Tycoon!"
        onRestart={() => resetGame()}
      />
    </GameLayout>
  );
};
