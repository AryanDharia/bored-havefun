import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Settings, Activity } from 'lucide-react';

export const BusinessTycoon: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'business-tycoon')!;

  // ---------------------------------------------------------------------------
  // Game State
  // ---------------------------------------------------------------------------
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [properties, setProperties] = useState<Record<number, PropertyState>>(() => {
    const initial: Record<number, PropertyState> = {};
    TILES.forEach((t) => {
      initial[t.id] = { ownerId: null, houses: 0, isMortgaged: false };
    });
    return initial;
  });

  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [doublesCount, setDoublesCount] = useState<number>(0);
  const [phase, setPhase] = useState<GamePhase>('roll');
  const [actionMessage, setActionMessage] = useState<string>('Roll the dice to start your turn!');

  // Modals & Drawers
  const [inspectedTileId, setInspectedTileId] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Chronological Game Events Feed
  const [logs, setLogs] = useState<GameLog[]>([
    {
      id: 'init-1',
      text: '🎲 Match started! Roll the dice to claim properties across India.',
      time: '00:00',
      type: 'move'
    }
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll Game Events to latest entry
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const activePlayer = players[activePlayerIndex];

  // ---------------------------------------------------------------------------
  // Event Logger
  // ---------------------------------------------------------------------------
  const addLog = useCallback(
    (text: string, type: GameLog['type'] = 'move', playerId?: number) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const newEntry: GameLog = {
        id: `${Date.now()}-${Math.random()}`,
        text,
        time: timeStr,
        type,
        playerId
      };
      setLogs((prev) => [...prev.slice(-99), newEntry]);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Check Victory Condition
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
      addLog(
        `🏆 ${solvent[0].name} has bankrupted all rivals and won the Tycoon Crown!`,
        'bankrupt'
      );
    }
  }, [addLog]);

  // ---------------------------------------------------------------------------
  // Handle Bankruptcy
  // ---------------------------------------------------------------------------
  const bankruptPlayer = useCallback(
    (player: Player, creditorId?: number) => {
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
        const updated = prev.map((p) =>
          p.id === player.id ? { ...p, bankrupt: true, money: 0 } : p
        );
        checkVictory(updated);
        return updated;
      });
    },
    [checkVictory, addLog]
  );

  // ---------------------------------------------------------------------------
  // Roll Dice & Animated Movement
  // ---------------------------------------------------------------------------
  const handleRollDice = () => {
    if (phase !== 'roll' || isRolling || isMoving) return;
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
          addLog(
            `${activePlayer.name} rolled doubles (${rolled[0]}-${rolled[1]}) and escaped Jail!`,
            'jail',
            activePlayer.id
          );
          setPlayers((prev) =>
            prev.map((p, idx) =>
              idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0 } : p
            )
          );
          advancePlayerStepByStep(total, rolled);
        } else {
          const nextJailTurns = activePlayer.jailTurns + 1;
          if (nextJailTurns >= 3) {
            // Must pay ₹50 fine and exit
            sounds.playClick();
            addLog(
              `${activePlayer.name} served 3 turns in Jail. Paid ₹50 fine to exit.`,
              'jail',
              activePlayer.id
            );
            setPlayers((prev) =>
              prev.map((p, idx) =>
                idx === activePlayerIndex
                  ? { ...p, inJail: false, jailTurns: 0, money: Math.max(0, p.money - 50) }
                  : p
              )
            );
            advancePlayerStepByStep(total, rolled);
          } else {
            addLog(
              `${activePlayer.name} rolled ${rolled[0]}-${rolled[1]}. No doubles. Stays in Jail.`,
              'jail',
              activePlayer.id
            );
            setPlayers((prev) =>
              prev.map((p, idx) =>
                idx === activePlayerIndex ? { ...p, jailTurns: nextJailTurns } : p
              )
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
          addLog(
            `🚨 ${activePlayer.name} rolled 3 consecutive doubles! Sent to Jail for speeding.`,
            'jail',
            activePlayer.id
          );
          setActionMessage('Caught speeding with 3 consecutive doubles! Sent to Jail.');
          setPhase('turn_ready');
          return;
        }
      } else {
        setDoublesCount(0);
      }

      advancePlayerStepByStep(total, rolled);
    }, 500);
  };

  // ---------------------------------------------------------------------------
  // Animated Step-by-Step Movement
  // ---------------------------------------------------------------------------
  const advancePlayerStepByStep = (steps: number, rolledDice: [number, number]) => {
    setIsMoving(true);
    setPhase('moving');

    let currentStep = 0;
    let currentPosition = activePlayer.position;

    // Respect user's reduced-motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const targetPos = (currentPosition + steps) % 40;
      const passedGo = targetPos < currentPosition && currentPosition !== 0;
      let newMoney = activePlayer.money;
      if (passedGo) {
        newMoney += 200;
        sounds.playScore();
        addLog(
          `${activePlayer.name} passed START (GO) and collected ₹200 bonus!`,
          'move',
          activePlayer.id
        );
      }
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === activePlayerIndex ? { ...p, position: targetPos, money: newMoney } : p
        )
      );
      setIsMoving(false);
      const landedTile = TILES.find((t) => t.id === targetPos)!;
      addLog(
        `${activePlayer.name} rolled ${steps} and landed on ${landedTile.name}.`,
        'move',
        activePlayer.id
      );
      handleLandedTile(landedTile, rolledDice[0] + rolledDice[1]);
      return;
    }

    const intervalId = setInterval(() => {
      currentStep++;
      currentPosition = (currentPosition + 1) % 40;
      sounds.playMove();

      // Check if passed GO
      let bonusEarned = false;
      if (currentPosition === 0) {
        bonusEarned = true;
        sounds.playScore();
        addLog(
          `${activePlayer.name} passed START (GO) and collected ₹200 bonus!`,
          'move',
          activePlayer.id
        );
      }

      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === activePlayerIndex
            ? {
                ...p,
                position: currentPosition,
                money: p.money + (bonusEarned ? 200 : 0)
              }
            : p
        )
      );

      if (currentStep >= steps) {
        clearInterval(intervalId);
        setIsMoving(false);
        const landedTile = TILES.find((t) => t.id === currentPosition)!;
        addLog(
          `${activePlayer.name} rolled ${steps} and landed on ${landedTile.name}.`,
          'move',
          activePlayer.id
        );
        handleLandedTile(landedTile, rolledDice[0] + rolledDice[1]);
      }
    }, 130);
  };

  // ---------------------------------------------------------------------------
  // Send Player to Jail
  // ---------------------------------------------------------------------------
  const sendToJail = (player: Player) => {
    sounds.playHit();
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
      )
    );
  };

  // ---------------------------------------------------------------------------
  // Handle Landed Tile Action
  // ---------------------------------------------------------------------------
  const handleLandedTile = (tile: typeof TILES[0], diceSum: number) => {
    // 1. Go to Jail space
    if (tile.id === 30) {
      sendToJail(activePlayer);
      addLog(`${activePlayer.name} was sent to Jail.`, 'jail', activePlayer.id);
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
        prev.map((p, idx) =>
          idx === activePlayerIndex ? { ...p, money: p.money - taxDue } : p
        )
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
      addLog(`${activePlayer.name} drew a Chance card.`, 'card', activePlayer.id);
      setActionMessage(`Drew Chance Card: "${randomCard.title}"`);
      return;
    }

    // 5. Community Chest
    if (tile.type === 'chest') {
      sounds.playScore();
      const randomCard = CHEST_CARDS[Math.floor(Math.random() * CHEST_CARDS.length)];
      setActiveCard(randomCard);
      addLog(`${activePlayer.name} drew a Community Chest card.`, 'card', activePlayer.id);
      setActionMessage(`Drew Community Chest: "${randomCard.title}"`);
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
        const { rent } = calculateRent(tile.id, diceSum, properties);
        sounds.playClick();
        addLog(
          `${activePlayer.name} paid ₹${rent} rent to ${owner.name} (${tile.name}).`,
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
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, money: p.money - tile.cost! } : p
      )
    );

    addLog(
      `${activePlayer.name} purchased ${tile.name} for ₹${tile.cost}.`,
      'buy',
      activePlayer.id
    );
    setActionMessage(`Successfully purchased ${tile.name} for ₹${tile.cost}!`);
    setPhase('turn_ready');
  };

  const handlePassTurn = () => {
    sounds.playClick();
    const tile = TILES.find((t) => t.id === activePlayer.position);
    if (tile) {
      addLog(`${activePlayer.name} passed on buying ${tile.name}.`, 'move', activePlayer.id);
    }
    setActionMessage('Passed on property purchase.');
    setPhase('turn_ready');
  };

  const handlePayJailBail = () => {
    if (activePlayer.money < 50) return;
    sounds.playClick();
    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0, money: p.money - 50 } : p
      )
    );
    addLog(`${activePlayer.name} paid ₹50 bail to exit Jail.`, 'jail', activePlayer.id);
    setActionMessage('Paid ₹50 bail! You are now free to roll on your turn.');
    setPhase('turn_ready');
  };

  const handleUseJailCard = () => {
    if (activePlayer.jailCards <= 0) return;
    sounds.playScore();
    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndex
          ? { ...p, inJail: false, jailTurns: 0, jailCards: p.jailCards - 1 }
          : p
      )
    );
    addLog(
      `${activePlayer.name} redeemed a "Get Out of Jail Free" card!`,
      'jail',
      activePlayer.id
    );
    setActionMessage('Redeemed Jail Card! You are now free.');
    setPhase('turn_ready');
  };

  const handleEndTurn = () => {
    sounds.playClick();
    // Move to next non-bankrupt player
    let nextIdx = (activePlayerIndex + 1) % players.length;
    let loopCount = 0;
    while (players[nextIdx].bankrupt && loopCount < players.length) {
      nextIdx = (nextIdx + 1) % players.length;
      loopCount++;
    }

    setActivePlayerIndex(nextIdx);
    setPhase('roll');
    setActionMessage(`It is now ${players[nextIdx].name}'s turn! Roll dice to move.`);
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
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, money: p.money - tile.houseCost! } : p
      )
    );

    const levelName =
      properties[tileId].houses + 1 === 5
        ? 'Skyscraper Hotel'
        : `House #${properties[tileId].houses + 1}`;
    addLog(
      `${activePlayer.name} upgraded ${tile.name} with ${levelName} for ₹${tile.houseCost}.`,
      'upgrade',
      activePlayer.id
    );
    setActionMessage(`Constructed ${levelName} on ${tile.name}!`);
  };

  // ---------------------------------------------------------------------------
  // Card Dismiss & Real Effect Application
  // ---------------------------------------------------------------------------
  const handleDismissCard = () => {
    if (!activeCard) return;
    const card = activeCard;
    setActiveCard(null);

    // Apply card effects to real game state
    if (card.amount) {
      if (card.amount > 0) {
        sounds.playScore();
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === activePlayerIndex ? { ...p, money: p.money + card.amount! } : p
          )
        );
        addLog(
          `${activePlayer.name} received ₹${card.amount} from "${card.title}".`,
          'card',
          activePlayer.id
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
          prev.map((p, idx) =>
            idx === activePlayerIndex ? { ...p, money: p.money - due } : p
          )
        );
        addLog(
          `${activePlayer.name} paid ₹${due} for "${card.title}".`,
          'card',
          activePlayer.id
        );
      }
    }

    if (card.moveTo !== undefined) {
      const oldPos = activePlayer.position;
      const target = card.moveTo;
      const passed = target < oldPos;
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === activePlayerIndex
            ? { ...p, position: target, money: p.money + (passed ? 200 : 0) }
            : p
        )
      );
      if (passed) {
        addLog(
          `${activePlayer.name} passed START (GO) and collected ₹200 bonus!`,
          'move',
          activePlayer.id
        );
      }
      const landed = TILES.find((t) => t.id === target)!;
      addLog(
        `${activePlayer.name} advanced to ${landed.name} via card instruction.`,
        'card',
        activePlayer.id
      );
      handleLandedTile(landed, dice[0] + dice[1]);
      return;
    }

    if (card.nearestStation) {
      const stationId = getNearestStation(activePlayer.position);
      const passed = stationId < activePlayer.position;
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === activePlayerIndex
            ? { ...p, position: stationId, money: p.money + (passed ? 200 : 0) }
            : p
        )
      );
      if (passed) {
        addLog(
          `${activePlayer.name} passed START (GO) and collected ₹200 bonus!`,
          'move',
          activePlayer.id
        );
      }
      const landed = TILES.find((t) => t.id === stationId)!;
      addLog(
        `${activePlayer.name} traveled to ${landed.name} via Bullet Train Ticket.`,
        'card',
        activePlayer.id
      );
      handleLandedTile(landed, dice[0] + dice[1]);
      return;
    }

    if (card.sendToJail) {
      sendToJail(activePlayer);
      addLog(`${activePlayer.name} was sent to Jail by card warrant.`, 'jail', activePlayer.id);
      setActionMessage('Sent to Jail by card warrant!');
      setPhase('turn_ready');
      return;
    }

    if (card.getOutOfJail) {
      setPlayers((prev) =>
        prev.map((p, idx) =>
          idx === activePlayerIndex ? { ...p, jailCards: p.jailCards + 1 } : p
        )
      );
      addLog(
        `${activePlayer.name} received a "Get Out of Jail Free" card!`,
        'card',
        activePlayer.id
      );
    }

    if (card.collectFromAll) {
      const fee = card.collectFromAll;
      let totalCollected = 0;
      setPlayers((prev) =>
        prev
          .map((p) => {
            if (p.id === activePlayer.id) return p;
            if (p.bankrupt) return p;
            const deducted = Math.min(p.money, fee);
            totalCollected += deducted;
            return { ...p, money: p.money - deducted };
          })
          .map((p) => (p.id === activePlayer.id ? { ...p, money: p.money + totalCollected } : p))
      );
      addLog(
        `${activePlayer.name} collected ₹${fee} from each player!`,
        'card',
        activePlayer.id
      );
    }

    if (card.repairHouseFee || card.repairHotelFee) {
      let repairTotal = 0;
      TILES.forEach((t) => {
        const ps = properties[t.id];
        if (ps && ps.ownerId === activePlayer.id) {
          if (ps.houses === 5 && card.repairHotelFee) {
            repairTotal += card.repairHotelFee;
          } else if (ps.houses > 0 && card.repairHouseFee) {
            repairTotal += ps.houses * card.repairHouseFee;
          }
        }
      });

      if (repairTotal > 0) {
        if (activePlayer.money < repairTotal) {
          bankruptPlayer(activePlayer);
          setActionMessage(`Cannot afford ₹${repairTotal} property renovation fee! Bankrupted.`);
          setPhase('turn_ready');
          return;
        }
        setPlayers((prev) =>
          prev.map((p, idx) =>
            idx === activePlayerIndex ? { ...p, money: p.money - repairTotal } : p
          )
        );
        addLog(
          `${activePlayer.name} paid ₹${repairTotal} property renovation expenses.`,
          'card',
          activePlayer.id
        );
      }
    }

    setPhase('turn_ready');
  };

  // AI Auto-Dismiss Card
  useEffect(() => {
    if (activeCard && activePlayer.isAi) {
      const cardTimer = setTimeout(() => {
        handleDismissCard();
      }, 2200);
      return () => clearTimeout(cardTimer);
    }
  }, [activeCard, activePlayer.isAi]);

  // ---------------------------------------------------------------------------
  // AI Turn Automation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (gameOver || !activePlayer.isAi || activePlayer.bankrupt || isMoving || isRolling) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'roll') {
      timer = setTimeout(() => {
        if (activePlayer.inJail) {
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
  }, [phase, activePlayer, gameOver, properties, isMoving, isRolling]);

  // ---------------------------------------------------------------------------
  // Reset Game
  // ---------------------------------------------------------------------------
  const resetGame = (customPlayers?: Player[], startingCash: number = 1500) => {
    const list =
      customPlayers ||
      DEFAULT_PLAYERS.map((p) => ({
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400" />
            <span>Setup</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 select-none pb-8">
        {/* Main Board View */}
        <BoardView
          properties={properties}
          players={players}
          activePlayerIndex={activePlayerIndex}
          dice={dice}
          isRolling={isRolling}
          isMoving={isMoving}
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
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
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
                  <strong
                    className={`text-xs font-bold ${
                      p.bankrupt ? 'text-slate-500 line-through' : 'text-emerald-400'
                    }`}
                  >
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

        {/* ================================================================= */}
        {/* GAME EVENTS PANEL (Live Event Feed Below Board) */}
        {/* ================================================================= */}
        <div className="w-full p-4 rounded-2xl bg-[#0a0c14] border border-white/10 shadow-lg flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <h2 className="text-xs sm:text-sm font-display font-black text-white uppercase tracking-wider">
                Game Events
              </h2>
              <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {logs.length} Actions Logged
            </span>
          </div>

          {/* Chronological Scrollable Feed */}
          <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {logs.map((lg) => {
              const logPlayer =
                lg.playerId !== undefined ? players.find((p) => p.id === lg.playerId) : null;

              return (
                <div
                  key={lg.id}
                  className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {/* Player color avatar dot */}
                    {logPlayer ? (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 mt-0.5 shadow-xs"
                        style={{ backgroundColor: logPlayer.colorHex }}
                        title={logPlayer.name}
                      >
                        {logPlayer.tokenEmoji}
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                        🎲
                      </span>
                    )}

                    {/* Event Message */}
                    <p className="text-slate-200 text-xs sm:text-[12.5px] leading-snug break-words">
                      {lg.text}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9.5px] text-slate-500 shrink-0 font-mono mt-0.5">
                    {lg.time}
                  </span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
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

      {/* Chance / Community Chest Card Modal with 3D Flip */}
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
