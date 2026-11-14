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
  canSellBuilding,
  canMortgageProperty,
  canUnmortgageProperty,
  calculateNetWorth,
  rollDice,
  getNearestStation,
  evaluateAiAction,
  initAuction,
  placeAuctionBid,
  passAuctionBid,
  evaluateAiAuctionBid,
  executeAiFinancialRecovery,
  generateAiTradeProposal,
  evaluateAiTradeOffer
} from './businessLogic';
import type {
  Player,
  PropertyState,
  Card,
  GamePhase,
  GameLog,
  AuctionState,
  PendingDebt,
  IncomingTradeOffer
} from './types';
import { BoardView } from './BoardView';
import { PropertyModal } from './PropertyModal';
import { TradeModal } from './TradeModal';
import { CardModal } from './CardModal';
import { SetupDrawer } from './SetupDrawer';
import { AuctionModal } from './AuctionModal';
import { DebtRecoveryModal } from './DebtRecoveryModal';
import { PlayerPortfolioModal } from './PlayerPortfolioModal';
import { IncomingTradeModal } from './IncomingTradeModal';
import { Settings, Activity, Handshake, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'playbreak_business_tycoon_session_v1';

export const BusinessTycoon: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'business-tycoon')!;

  // ---------------------------------------------------------------------------
  // Session Persistence Loader
  // ---------------------------------------------------------------------------
  const loadSavedSession = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.players) && parsed.properties) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved Business Tycoon session:', e);
    }
    return null;
  };

  const initialSession = loadSavedSession();

  // ---------------------------------------------------------------------------
  // Game State
  // ---------------------------------------------------------------------------
  const [players, setPlayers] = useState<Player[]>(
    initialSession ? initialSession.players : DEFAULT_PLAYERS
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(
    initialSession ? initialSession.activePlayerIndex : 0
  );
  const [properties, setProperties] = useState<Record<number, PropertyState>>(() => {
    if (initialSession && initialSession.properties) {
      return initialSession.properties;
    }
    const initial: Record<number, PropertyState> = {};
    TILES.forEach((t) => {
      initial[t.id] = { ownerId: null, houses: 0, isMortgaged: false };
    });
    return initial;
  });

  const [dice, setDice] = useState<[number, number]>(
    initialSession ? initialSession.dice : [1, 1]
  );
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [doublesCount, setDoublesCount] = useState<number>(
    initialSession ? initialSession.doublesCount : 0
  );
  const [isDoublesTurn, setIsDoublesTurn] = useState<boolean>(false);
  const [phase, setPhase] = useState<GamePhase>(
    initialSession ? initialSession.phase : 'roll'
  );
  const [actionMessage, setActionMessage] = useState<string>(
    initialSession
      ? initialSession.actionMessage
      : 'Roll the dice to start your turn!'
  );
  const [auctionState, setAuctionState] = useState<AuctionState | null>(() => {
    if (initialSession && initialSession.auctionState) {
      return initialSession.auctionState;
    }
    return null;
  });

  // Financial Debt Recovery State
  const [pendingDebt, setPendingDebt] = useState<PendingDebt | null>(null);

  // Proactive Trade States
  const [incomingTradeOffer, setIncomingTradeOffer] = useState<IncomingTradeOffer | null>(null);

  // Selected Player for Portfolio Inspection
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Modals & Drawers
  const [inspectedTileId, setInspectedTileId] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [isTradeOpen, setIsTradeOpen] = useState<boolean>(false);
  const [tradeTargetPlayerId, setTradeTargetPlayerId] = useState<number | undefined>(undefined);
  const [tradeTargetPropId, setTradeTargetPropId] = useState<number | undefined>(undefined);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Collapsible Game Events Feed (collapsed by default on mobile)
  const [isEventsExpanded, setIsEventsExpanded] = useState<boolean>(false);

  // Chronological Game Events Feed
  const [logs, setLogs] = useState<GameLog[]>(() => {
    if (initialSession && Array.isArray(initialSession.logs) && initialSession.logs.length > 0) {
      return initialSession.logs;
    }
    return [
      {
        id: 'init-1',
        text: '🎲 Match started! Roll the dice to claim properties across India.',
        time: '00:00',
        type: 'move'
      }
    ];
  });

  const activePlayer = players[activePlayerIndex] || players[0];

  // ---------------------------------------------------------------------------
  // Automatic State Persistence to localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const sessionData = {
        players,
        activePlayerIndex,
        properties,
        dice,
        doublesCount,
        phase,
        actionMessage,
        auctionState,
        logs: logs.slice(-50)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Failed to save Business Tycoon session to localStorage:', e);
    }
  }, [players, activePlayerIndex, properties, dice, doublesCount, phase, actionMessage, auctionState, logs]);

  // ---------------------------------------------------------------------------
  // Event Logger (Never scrolls browser window)
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
  const checkVictory = useCallback(
    (currentPlayers: Player[]) => {
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
    },
    [addLog]
  );

  // ---------------------------------------------------------------------------
  // Handle Bankruptcy
  // ---------------------------------------------------------------------------
  const bankruptPlayer = useCallback(
    (player: Player, creditorId?: number) => {
      sounds.playGameOver();
      addLog(`💸 ${player.name} went bankrupt and is eliminated from the game!`, 'bankrupt', player.id);

      // Release or transfer properties
      setProperties((prev) => {
        const next = { ...prev };
        TILES.forEach((t) => {
          if (next[t.id]?.ownerId === player.id) {
            if (creditorId !== undefined) {
              // Transfer to creditor
              next[t.id] = {
                ...next[t.id],
                ownerId: creditorId,
                houses: 0
              };
            } else {
              // Bank debt: property becomes unowned, mortgages cleared
              next[t.id] = {
                ownerId: null,
                houses: 0,
                isMortgaged: false
              };
            }
          }
        });
        return next;
      });

      setPlayers((prev) => {
        const updated = prev.map((p) => {
          if (p.id === player.id) {
            return { ...p, bankrupt: true, money: 0 };
          }
          if (creditorId !== undefined && p.id === creditorId) {
            return { ...p, money: p.money + Math.max(0, player.money) };
          }
          return p;
        });
        checkVictory(updated);
        return updated;
      });

      setPendingDebt(null);
      setPhase('turn_ready');
    },
    [checkVictory, addLog]
  );

  // ---------------------------------------------------------------------------
  // Unified Payment Processing Engine with Financial Recovery
  // ---------------------------------------------------------------------------
  const processPayment = (
    payer: Player,
    recipientId: number | null,
    amount: number,
    reason: string,
    onSuccess: () => void
  ) => {
    // Case 1: Player can pay directly with cash
    if (payer.money >= amount) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === payer.id) return { ...p, money: p.money - amount };
          if (recipientId !== null && p.id === recipientId) return { ...p, money: p.money + amount };
          return p;
        })
      );
      onSuccess();
      return;
    }

    // Case 2: Insufficient cash!
    if (payer.isAi) {
      // AI executes automated financial recovery
      const recovery = executeAiFinancialRecovery(payer, amount, properties);
      if (recovery.isSolvent) {
        setProperties((prev) => {
          const next = { ...prev };
          recovery.housesToSell.forEach((hId) => {
            if (next[hId]) next[hId].houses -= 1;
          });
          recovery.propertiesToMortgage.forEach((mId) => {
            if (next[mId]) next[mId].isMortgaged = true;
          });
          return next;
        });

        const newCash = payer.money + recovery.cashRaised - amount;
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === payer.id) return { ...p, money: newCash };
            if (recipientId !== null && p.id === recipientId) return { ...p, money: p.money + amount };
            return p;
          })
        );

        addLog(
          `💼 ${payer.name} raised ₹${recovery.cashRaised} (sold ${recovery.housesToSell.length} buildings, mortgaged ${recovery.propertiesToMortgage.length} properties) to settle ₹${amount} debt.`,
          'debt',
          payer.id
        );
        onSuccess();
      } else {
        // Genuinely unable to pay even after liquidating everything
        bankruptPlayer(payer, recipientId !== null ? recipientId : undefined);
      }
    } else {
      // Human player: enter Debt Recovery mode
      setPendingDebt({
        debtorId: payer.id,
        creditorId: recipientId,
        amountDue: amount,
        originalAmount: amount,
        reason
      });
      setPhase('debt_recovery');
      setActionMessage(
        `⚠️ Insufficient cash! You owe ₹${amount} for ${reason}. Mortgage properties or sell buildings to raise funds.`
      );
      addLog(
        `⚠️ ${payer.name} owes ₹${amount} (${reason}) and has entered financial recovery.`,
        'debt',
        payer.id
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Settle Debt Action for Human Player
  // ---------------------------------------------------------------------------
  const handlePayDebt = () => {
    if (!pendingDebt) return;
    const debtor = players.find((p) => p.id === pendingDebt.debtorId);
    if (!debtor || debtor.money < pendingDebt.amountDue) return;

    sounds.playScore();
    const amount = pendingDebt.amountDue;
    const creditorId = pendingDebt.creditorId;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === debtor.id) return { ...p, money: p.money - amount };
        if (creditorId !== null && p.id === creditorId) return { ...p, money: p.money + amount };
        return p;
      })
    );

    addLog(
      `✅ ${debtor.name} settled ₹${amount} debt for ${pendingDebt.reason}!`,
      'debt',
      debtor.id
    );
    setActionMessage('Debt successfully settled! You may now continue your turn.');
    setPendingDebt(null);
    resolveTileTurnEnd(isDoublesTurn);
  };

  // ---------------------------------------------------------------------------
  // Resolve Turn End / Next Action (Respects Doubles Extra Roll)
  // ---------------------------------------------------------------------------
  const resolveTileTurnEnd = (isDoubles: boolean) => {
    if (isDoubles && !activePlayer.inJail) {
      setPhase('roll');
      setActionMessage(`🎲 DOUBLES! You earned an extra turn! Roll the dice to continue.`);
      addLog(`🎲 ${activePlayer.name} rolled doubles and gets an extra roll!`, 'move', activePlayer.id);
    } else {
      setPhase('turn_ready');
    }
  };

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
          setDoublesCount(0);
          setIsDoublesTurn(false);
          advancePlayerStepByStep(total, rolled, false);
        } else {
          const nextJailTurns = activePlayer.jailTurns + 1;
          if (nextJailTurns >= 3) {
            sounds.playClick();
            addLog(
              `${activePlayer.name} served 3 turns in Jail. Paid ₹50 fine to exit.`,
              'jail',
              activePlayer.id
            );
            processPayment(activePlayer, null, 50, 'Jail Exit Fine', () => {
              setPlayers((prev) =>
                prev.map((p, idx) =>
                  idx === activePlayerIndex ? { ...p, inJail: false, jailTurns: 0 } : p
                )
              );
              setDoublesCount(0);
              setIsDoublesTurn(false);
              advancePlayerStepByStep(total, rolled, false);
            });
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
            setDoublesCount(0);
            setIsDoublesTurn(false);
            setPhase('turn_ready');
          }
        }
        return;
      }

      // Consecutive Doubles Check
      if (isDoubles) {
        const nextDoubles = doublesCount + 1;
        setDoublesCount(nextDoubles);
        setIsDoublesTurn(true);

        if (nextDoubles >= 3) {
          sendToJail(activePlayer);
          addLog(
            `🚨 ${activePlayer.name} rolled 3 consecutive doubles! Sent to Jail for speeding.`,
            'jail',
            activePlayer.id
          );
          setActionMessage('Caught speeding with 3 consecutive doubles! Sent to Jail.');
          setDoublesCount(0);
          setIsDoublesTurn(false);
          setPhase('turn_ready');
          return;
        }
      } else {
        setDoublesCount(0);
        setIsDoublesTurn(false);
      }

      advancePlayerStepByStep(total, rolled, isDoubles);
    }, 450);
  };

  // ---------------------------------------------------------------------------
  // Animated Step-by-Step Movement
  // ---------------------------------------------------------------------------
  const advancePlayerStepByStep = (
    steps: number,
    rolledDice: [number, number],
    isDoubles: boolean
  ) => {
    setIsMoving(true);
    setPhase('moving');

    let currentStep = 0;
    let currentPosition = activePlayer.position;

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
      handleLandedTile(landedTile, rolledDice[0] + rolledDice[1], isDoubles);
      return;
    }

    const intervalId = setInterval(() => {
      currentStep++;
      currentPosition = (currentPosition + 1) % 40;
      sounds.playMove();

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
        handleLandedTile(landedTile, rolledDice[0] + rolledDice[1], isDoubles);
      }
    }, 120);
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
  const handleLandedTile = (tile: typeof TILES[0], diceSum: number, isDoubles: boolean) => {
    // 1. Go to Jail space
    if (tile.id === 30) {
      sendToJail(activePlayer);
      addLog(`${activePlayer.name} was sent to Jail.`, 'jail', activePlayer.id);
      setActionMessage('Landed on Go to Jail! You have been sent straight to Jail.');
      setDoublesCount(0);
      setIsDoublesTurn(false);
      setPhase('turn_ready');
      return;
    }

    // 2. Start / Just Visiting / Free Parking
    if (tile.id === 0) {
      setActionMessage('Landed on START (GO)! Collect ₹200.');
      resolveTileTurnEnd(isDoubles);
      return;
    }
    if (tile.id === 10 || tile.id === 20) {
      setActionMessage(`Landed on ${tile.name}. Safe rest zone!`);
      resolveTileTurnEnd(isDoubles);
      return;
    }

    // 3. Taxes (Protected with Financial Recovery)
    if (tile.type === 'tax' && tile.taxAmount) {
      sounds.playClick();
      const taxDue = tile.taxAmount;
      processPayment(activePlayer, null, taxDue, tile.name, () => {
        addLog(`${activePlayer.name} paid ₹${taxDue} in ${tile.name}.`, 'rent', activePlayer.id);
        setActionMessage(`Paid ₹${taxDue} in ${tile.name}.`);
        resolveTileTurnEnd(isDoubles);
      });
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
        resolveTileTurnEnd(isDoubles);
        return;
      }

      // Owned by another player: Pay Rent
      const owner = players.find((p) => p.id === propState.ownerId);
      if (owner && !owner.bankrupt) {
        if (propState.isMortgaged) {
          setActionMessage(`${tile.name} is mortgaged by ${owner.name}. Rent is suspended (₹0).`);
          addLog(
            `${activePlayer.name} landed on ${tile.name} (Mortgaged by ${owner.name} - ₹0 rent).`,
            'mortgage',
            activePlayer.id
          );
          resolveTileTurnEnd(isDoubles);
          return;
        }

        const { rent } = calculateRent(tile.id, diceSum, properties);
        sounds.playClick();

        processPayment(activePlayer, owner.id, rent, `${tile.name} Rent to ${owner.name}`, () => {
          addLog(
            `${activePlayer.name} paid ₹${rent} rent to ${owner.name} (${tile.name}).`,
            'rent',
            activePlayer.id
          );
          setActionMessage(`Paid ₹${rent} rent to ${owner.name} for ${tile.name}.`);
          resolveTileTurnEnd(isDoubles);
        });
        return;
      }
    }

    resolveTileTurnEnd(isDoubles);
  };

  // ---------------------------------------------------------------------------
  // Player Actions: Buy Property
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
    resolveTileTurnEnd(isDoublesTurn);
  };

  // ---------------------------------------------------------------------------
  // Property Auction Engine Handlers
  // ---------------------------------------------------------------------------
  const startAuction = (tileId: number, declinerId: number) => {
    const tile = TILES.find((t) => t.id === tileId);
    if (!tile) return;
    sounds.playClick();
    const newAuction = initAuction(tileId, declinerId, players);
    setAuctionState(newAuction);
    setPhase('auction');
    addLog(
      `🔨 Public auction started for ${tile.name}! (Original: ₹${tile.cost || 100})`,
      'auction',
      declinerId
    );
    setActionMessage(`Auction started for ${tile.name}! Bidding begins at ₹10.`);
  };

  const handlePassTurn = () => {
    sounds.playClick();
    const tile = TILES.find((t) => t.id === activePlayer.position);
    if (
      tile &&
      (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') &&
      properties[tile.id]?.ownerId === null
    ) {
      addLog(
        `${activePlayer.name} declined to purchase ${tile.name}. Starting auction!`,
        'auction',
        activePlayer.id
      );
      startAuction(tile.id, activePlayer.id);
      return;
    }
    if (tile) {
      addLog(`${activePlayer.name} passed on ${tile.name}.`, 'move', activePlayer.id);
    }
    setActionMessage('Passed on action.');
    resolveTileTurnEnd(isDoublesTurn);
  };

  const handleAuctionBid = (bidAmount: number, playerId?: number) => {
    if (!auctionState || auctionState.isCompleted) return;
    const currentBidderId =
      playerId !== undefined
        ? playerId
        : auctionState.activeBidderIds[auctionState.currentBidderIndex];
    const bidder = players.find((p) => p.id === currentBidderId);
    if (!bidder) return;

    const result = placeAuctionBid(auctionState, bidder.id, bidAmount, players);
    if (!result.success) {
      if (!bidder.isAi) {
        setActionMessage(result.error || 'Invalid bid.');
      }
      return;
    }

    sounds.playScore();
    const tile = TILES.find((t) => t.id === auctionState.tileId);
    addLog(
      `🔨 ${bidder.name} bid ₹${bidAmount} for ${tile?.name || 'property'}.`,
      'auction',
      bidder.id
    );
    setActionMessage(`${bidder.name} is the highest bidder at ₹${bidAmount}!`);

    setAuctionState(result.nextState);

    if (result.nextState.isCompleted) {
      finalizeAuction(result.nextState);
    }
  };

  const handleAuctionPass = (playerId?: number) => {
    if (!auctionState || auctionState.isCompleted) return;
    const currentBidderId =
      playerId !== undefined
        ? playerId
        : auctionState.activeBidderIds[auctionState.currentBidderIndex];
    const bidder = players.find((p) => p.id === currentBidderId);
    if (!bidder) return;

    sounds.playClick();
    const result = passAuctionBid(auctionState, bidder.id);
    addLog(`🔨 ${bidder.name} passed in the auction.`, 'auction', bidder.id);

    setAuctionState(result.nextState);

    if (result.auctionOver) {
      finalizeAuction(result.nextState);
    }
  };

  const finalizeAuction = (finalState: AuctionState) => {
    const tile = TILES.find((t) => t.id === finalState.tileId);
    if (!tile) return;

    if (finalState.highestBidderId !== null) {
      const winnerPlayer = players.find((p) => p.id === finalState.highestBidderId);
      if (winnerPlayer) {
        sounds.playWin();
        // Deduct cash and transfer deed
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === winnerPlayer.id
              ? { ...p, money: Math.max(0, p.money - finalState.currentBid) }
              : p
          )
        );

        setProperties((prev) => ({
          ...prev,
          [tile.id]: { ownerId: winnerPlayer.id, houses: 0, isMortgaged: false }
        }));

        addLog(
          `🏆 SOLD! ${winnerPlayer.name} won ${tile.name} for ₹${finalState.currentBid}!`,
          'buy',
          winnerPlayer.id
        );
        setActionMessage(
          `Auction Won! ${winnerPlayer.name} purchased ${tile.name} for ₹${finalState.currentBid}.`
        );
      }
    } else {
      sounds.playHit();
      addLog(`🔨 Auction ended with no bids. ${tile.name} remains unowned.`, 'auction');
      setActionMessage(`No bids placed for ${tile.name}. Property remains unowned.`);
    }
  };

  const handleAcknowledgeAuctionCompletion = () => {
    setAuctionState(null);
    resolveTileTurnEnd(isDoublesTurn);
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
    setPhase('roll');
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
    addLog(`${activePlayer.name} redeemed a "Get Out of Jail Free" card!`, 'jail', activePlayer.id);
    setActionMessage('Redeemed Jail Card! You are now free.');
    setPhase('roll');
  };

  const handleEndTurn = () => {
    sounds.playClick();
    setDoublesCount(0);
    setIsDoublesTurn(false);

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
  // Property Upgrades (Build House / Hotel)
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
  // Sell Building (50% Refund)
  // ---------------------------------------------------------------------------
  const handleSellBuilding = (tileId: number) => {
    const tile = TILES.find((t) => t.id === tileId);
    if (!tile) return;

    const check = canSellBuilding(tileId, properties, activePlayer);
    if (!check.canSell) return;

    const refund = Math.floor((tile.houseCost || 100) * 0.5);
    sounds.playClick();

    setProperties((prev) => ({
      ...prev,
      [tileId]: {
        ...prev[tileId],
        houses: prev[tileId].houses - 1
      }
    }));

    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, money: p.money + refund } : p
      )
    );

    addLog(
      `${activePlayer.name} sold 1 building on ${tile.name} for ₹${refund} refund.`,
      'upgrade',
      activePlayer.id
    );
    setActionMessage(`Sold 1 building on ${tile.name} for ₹${refund}.`);
  };

  // ---------------------------------------------------------------------------
  // Mortgage Property (50% Value Credit, 0 Rent)
  // ---------------------------------------------------------------------------
  const handleMortgageProperty = (tileId: number) => {
    const tile = TILES.find((t) => t.id === tileId);
    if (!tile || !tile.cost) return;

    const check = canMortgageProperty(tileId, properties, activePlayer);
    if (!check.canMortgage) return;

    const mortgageValue = Math.floor(tile.cost * 0.5);
    sounds.playClick();

    setProperties((prev) => ({
      ...prev,
      [tileId]: {
        ...prev[tileId],
        isMortgaged: true
      }
    }));

    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, money: p.money + mortgageValue } : p
      )
    );

    addLog(
      `${activePlayer.name} mortgaged ${tile.name} for ₹${mortgageValue}.`,
      'mortgage',
      activePlayer.id
    );
    setActionMessage(`Mortgaged ${tile.name} for ₹${mortgageValue}. Rent is suspended.`);
  };

  // ---------------------------------------------------------------------------
  // Unmortgage Property (Pay Mortgage Value + 10% Interest)
  // ---------------------------------------------------------------------------
  const handleUnmortgageProperty = (tileId: number) => {
    const tile = TILES.find((t) => t.id === tileId);
    if (!tile || !tile.cost) return;

    const check = canUnmortgageProperty(tileId, properties, activePlayer);
    if (!check.canUnmortgage) return;

    const mortgageValue = Math.floor(tile.cost * 0.5);
    const redeemCost = Math.ceil(mortgageValue * 1.1);
    sounds.playScore();

    setProperties((prev) => ({
      ...prev,
      [tileId]: {
        ...prev[tileId],
        isMortgaged: false
      }
    }));

    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndex ? { ...p, money: p.money - redeemCost } : p
      )
    );

    addLog(
      `${activePlayer.name} redeemed mortgage on ${tile.name} for ₹${redeemCost}.`,
      'unmortgage',
      activePlayer.id
    );
    setActionMessage(`Unmortgaged ${tile.name} for ₹${redeemCost}. Normal rent resumed.`);
  };

  // ---------------------------------------------------------------------------
  // Atomic Trade Execution
  // ---------------------------------------------------------------------------
  const handleExecuteTrade = (trade: {
    fromPlayerId: number;
    toPlayerId: number;
    offeredPropertyIds: number[];
    requestedPropertyIds: number[];
    offeredCash: number;
    requestedCash: number;
  }): { success: boolean; message: string } => {
    const sender = players.find((p) => p.id === trade.fromPlayerId);
    const receiver = players.find((p) => p.id === trade.toPlayerId);
    if (!sender || !receiver) {
      return { success: false, message: 'Invalid player selection.' };
    }

    if (sender.money < trade.offeredCash || receiver.money < trade.requestedCash) {
      setActionMessage('Trade cancelled: insufficient cash balances.');
      return { success: false, message: 'Insufficient cash balances.' };
    }

    sounds.playScore();

    // 1. Transfer Cash
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === sender.id) {
          return { ...p, money: p.money - trade.offeredCash + trade.requestedCash };
        }
        if (p.id === receiver.id) {
          return { ...p, money: p.money - trade.requestedCash + trade.offeredCash };
        }
        return p;
      })
    );

    // 2. Transfer Deeds
    setProperties((prev) => {
      const next = { ...prev };
      trade.offeredPropertyIds.forEach((propId) => {
        if (next[propId]) {
          next[propId] = { ...next[propId], ownerId: receiver.id };
        }
      });
      trade.requestedPropertyIds.forEach((propId) => {
        if (next[propId]) {
          next[propId] = { ...next[propId], ownerId: sender.id };
        }
      });
      return next;
    });

    const offeredNames =
      trade.offeredPropertyIds.map((id) => TILES[id]?.name).join(', ') || 'no properties';
    const reqNames =
      trade.requestedPropertyIds.map((id) => TILES[id]?.name).join(', ') || 'no properties';

    addLog(
      `🤝 Deal executed! ${sender.name} traded [${offeredNames} + ₹${trade.offeredCash}] with ${receiver.name} for [${reqNames} + ₹${trade.requestedCash}].`,
      'trade',
      sender.id
    );
    setActionMessage(`Trade agreed and successfully sealed with ${receiver.name}!`);
    setIsTradeOpen(false);
    return { success: true, message: 'Trade accepted and executed!' };
  };

  // ---------------------------------------------------------------------------
  // Card Dismiss & Real Effect Application (Protected by processPayment)
  // ---------------------------------------------------------------------------
  const handleDismissCard = () => {
    if (!activeCard) return;
    const card = activeCard;
    setActiveCard(null);

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
        processPayment(activePlayer, null, due, card.title, () => {
          addLog(
            `${activePlayer.name} paid ₹${due} for "${card.title}".`,
            'card',
            activePlayer.id
          );
        });
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
      handleLandedTile(landed, dice[0] + dice[1], isDoublesTurn);
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
      handleLandedTile(landed, dice[0] + dice[1], isDoublesTurn);
      return;
    }

    if (card.sendToJail) {
      sendToJail(activePlayer);
      addLog(`${activePlayer.name} was sent to Jail by card warrant.`, 'jail', activePlayer.id);
      setActionMessage('Sent to Jail by card warrant!');
      setDoublesCount(0);
      setIsDoublesTurn(false);
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
        processPayment(activePlayer, null, repairTotal, 'Property Renovation Expenses', () => {
          addLog(
            `${activePlayer.name} paid ₹${repairTotal} property renovation expenses.`,
            'card',
            activePlayer.id
          );
        });
      }
    }

    resolveTileTurnEnd(isDoublesTurn);
  };

  // AI Auto-Dismiss Card
  useEffect(() => {
    if (activeCard && activePlayer.isAi) {
      const cardTimer = setTimeout(() => {
        handleDismissCard();
      }, 2000);
      return () => clearTimeout(cardTimer);
    }
  }, [activeCard, activePlayer.isAi]);

  // ---------------------------------------------------------------------------
  // AI Turn Automation (Purchasing, Upgrades & Proactive Trading)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      gameOver ||
      !activePlayer.isAi ||
      activePlayer.bankrupt ||
      isMoving ||
      isRolling ||
      phase === 'auction' ||
      phase === 'debt_recovery' ||
      incomingTradeOffer !== null
    ) {
      return;
    }

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
      }, 650);
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
      }, 550);
    } else if (phase === 'turn_ready') {
      timer = setTimeout(() => {
        // 1. AI checks for property upgrades
        const tile = TILES.find((t) => t.id === activePlayer.position);
        if (tile) {
          const aiDecision = evaluateAiAction(activePlayer, tile, properties);
          if (aiDecision.upgradeCandidateId !== null) {
            handleUpgradeProperty(aiDecision.upgradeCandidateId);
          }
        }

        // 2. AI proactively checks for strategic trade proposals!
        const tradeProposal = generateAiTradeProposal(activePlayer, players, properties);
        if (tradeProposal) {
          const targetPlayer = players.find((p) => p.id === tradeProposal.targetPlayerId);

          if (targetPlayer && !targetPlayer.isAi) {
            // Proposing trade to Human player -> pop up IncomingTradeModal!
            setIncomingTradeOffer({
              fromAiPlayerId: activePlayer.id,
              targetPlayerId: targetPlayer.id,
              offeredPropertyIds: tradeProposal.offeredPropertyIds,
              requestedPropertyIds: tradeProposal.requestedPropertyIds,
              offeredCash: tradeProposal.offeredCash,
              requestedCash: tradeProposal.requestedCash,
              fairnessScore: tradeProposal.fairnessScore,
              strategicReason: tradeProposal.strategicReason
            });
            addLog(
              `🤝 ${activePlayer.name} proposed a trade deal to you!`,
              'trade',
              activePlayer.id
            );
            return; // Pause AI turn until human responds
          } else if (targetPlayer && targetPlayer.isAi) {
            // AI to AI trade evaluation
            const evaluation = evaluateAiTradeOffer(
              activePlayer,
              targetPlayer,
              tradeProposal.offeredPropertyIds,
              tradeProposal.requestedPropertyIds,
              tradeProposal.offeredCash,
              tradeProposal.requestedCash,
              properties
            );

            if (evaluation.accept) {
              handleExecuteTrade({
                fromPlayerId: activePlayer.id,
                toPlayerId: targetPlayer.id,
                offeredPropertyIds: tradeProposal.offeredPropertyIds,
                requestedPropertyIds: tradeProposal.requestedPropertyIds,
                offeredCash: tradeProposal.offeredCash,
                requestedCash: tradeProposal.requestedCash
              });
            } else {
              addLog(
                `❌ ${targetPlayer.name} declined trade offer from ${activePlayer.name}.`,
                'trade',
                targetPlayer.id
              );
            }
          }
        }

        // 3. Complete AI Turn
        handleEndTurn();
      }, 700);
    }

    return () => clearTimeout(timer);
  }, [
    phase,
    activePlayer,
    gameOver,
    properties,
    isMoving,
    isRolling,
    incomingTradeOffer,
    isDoublesTurn
  ]);

  // ---------------------------------------------------------------------------
  // AI Auction Turn Automation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (gameOver || phase !== 'auction' || !auctionState) return;

    if (auctionState.isCompleted) {
      const allAiOrBankrupt = players.every((p) => p.isAi || p.bankrupt);
      if (allAiOrBankrupt) {
        const timer = setTimeout(() => {
          handleAcknowledgeAuctionCompletion();
        }, 2200);
        return () => clearTimeout(timer);
      }
      return;
    }

    const currentBidderId = auctionState.activeBidderIds[auctionState.currentBidderIndex];
    const currentBidder = players.find((p) => p.id === currentBidderId);

    if (currentBidder && currentBidder.isAi && !currentBidder.bankrupt) {
      const tile = TILES.find((t) => t.id === auctionState.tileId);
      if (!tile) return;

      const aiTimer = setTimeout(() => {
        const decision = evaluateAiAuctionBid(
          currentBidder,
          tile,
          auctionState.currentBid,
          auctionState.minIncrement,
          properties,
          players
        );

        if (decision.shouldBid && decision.bidAmount > auctionState.currentBid) {
          handleAuctionBid(decision.bidAmount, currentBidder.id);
        } else {
          handleAuctionPass(currentBidder.id);
        }
      }, 700);

      return () => clearTimeout(aiTimer);
    }
  }, [auctionState, phase, gameOver, players, properties]);

  // ---------------------------------------------------------------------------
  // Reset Game / Clean Storage
  // ---------------------------------------------------------------------------
  const resetGame = (customPlayers?: Player[], startingCash: number = 1500) => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }

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
    setIsDoublesTurn(false);
    setPhase('roll');
    setAuctionState(null);
    setPendingDebt(null);
    setIncomingTradeOffer(null);
    setSelectedPlayerId(null);
    setGameOver(false);
    setWinner(null);
    setInspectedTileId(null);
    setActiveCard(null);
    setIsTradeOpen(false);
    setShowResetConfirm(false);
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

  const inspectedTile =
    inspectedTileId !== null ? TILES.find((t) => t.id === inspectedTileId) : null;
  const inspectedPlayer =
    selectedPlayerId !== null ? players.find((p) => p.id === selectedPlayerId) : null;
  const debtDebtor = pendingDebt ? players.find((p) => p.id === pendingDebt.debtorId) : null;
  const debtCreditor =
    pendingDebt && pendingDebt.creditorId !== null
      ? players.find((p) => p.id === pendingDebt.creditorId)
      : undefined;

  return (
    <GameLayout
      game={gameInfo}
      onRestart={() => setShowResetConfirm(true)}
      headerControls={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Trade Trigger Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setTradeTargetPlayerId(undefined);
              setTradeTargetPropId(undefined);
              setIsTradeOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-mono font-bold transition-all cursor-pointer"
            title="Open Trade Center"
          >
            <Handshake className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Trade</span>
          </button>

          {/* Setup Trigger Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowSetup(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden xs:inline">Setup</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3 sm:gap-4 select-none pb-6">
        {/* Main Board View */}
        <BoardView
          properties={properties}
          players={players}
          activePlayerIndex={activePlayerIndex}
          dice={dice}
          isRolling={isRolling}
          isMoving={isMoving}
          phase={phase}
          doublesCount={doublesCount}
          onRollDice={handleRollDice}
          onBuyProperty={handleBuyProperty}
          onPassTurn={handlePassTurn}
          onPayJailBail={handlePayJailBail}
          onUseJailCard={handleUseJailCard}
          onEndTurn={handleEndTurn}
          onInspectTile={(tId) => setInspectedTileId(tId)}
          onInspectPlayer={(pId) => setSelectedPlayerId(pId)}
          actionMessage={actionMessage}
        />

        {/* Player Ledger Portfolio Cards - INTERACTIVE */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {players.map((p, idx) => {
            const isTurn = idx === activePlayerIndex;
            const netWorth = calculateNetWorth(p, properties);
            const ownedCount = TILES.filter((t) => properties[t.id]?.ownerId === p.id).length;

            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playClick();
                  setSelectedPlayerId(p.id);
                }}
                className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer hover:border-amber-400/60 hover:scale-[1.02] ${
                  p.bankrupt
                    ? 'opacity-40 bg-slate-900/40 border-slate-800'
                    : isTurn
                    ? 'bg-[#121422] border-orange-500 shadow-md shadow-orange-500/10 ring-1 ring-orange-400/50'
                    : 'bg-[#0f111c] border-white/10 hover:border-white/20'
                }`}
                title={`Click to view ${p.name}'s property portfolio & financial stats`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <strong className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[70px] sm:max-w-[85px]">
                      {p.name}
                    </strong>
                  </div>
                  <span className="text-xs sm:text-sm shrink-0">{p.tokenEmoji}</span>
                </div>

                <div className="flex items-baseline justify-between mb-0.5 sm:mb-1 font-mono">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase">Cash:</span>
                  <strong
                    className={`text-[11px] sm:text-xs font-bold ${
                      p.bankrupt ? 'text-slate-500 line-through' : 'text-emerald-400'
                    }`}
                  >
                    ₹{p.money}
                  </strong>
                </div>

                <div className="flex items-baseline justify-between font-mono text-[9px] sm:text-[10px] text-slate-400">
                  <span>Net Worth:</span>
                  <span className="text-slate-200 font-semibold">₹{netWorth}</span>
                </div>

                <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
                  <span className="text-amber-400 font-bold">{ownedCount} Deeds</span>
                  {p.inJail && <span className="text-rose-400 font-bold">In Jail</span>}
                  {p.bankrupt && <span className="text-rose-500 font-bold">Bankrupt</span>}
                  {!p.inJail && !p.bankrupt && p.isAi && (
                    <span className="text-blue-400 uppercase text-[8.5px]">
                      {p.personality || 'AI'}
                    </span>
                  )}
                  {!p.inJail && !p.bankrupt && !p.isAi && (
                    <span className="text-emerald-400 text-[8.5px]">YOU</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* GAME EVENTS PANEL (Collapsible by default on mobile) */}
        {/* ================================================================= */}
        <div className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0c14] border border-white/10 shadow-lg flex flex-col gap-2">
          {/* Header with Mobile Collapse Toggle */}
          <div
            onClick={() => setIsEventsExpanded(!isEventsExpanded)}
            className="flex items-center justify-between pb-1.5 border-b border-white/10 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
              <h2 className="text-xs sm:text-sm font-display font-black text-white uppercase tracking-wider">
                Game Events
              </h2>
              <span className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400">
                {logs.length} Actions
              </span>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                aria-label={isEventsExpanded ? 'Collapse Events' : 'Expand Events'}
              >
                {isEventsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* When collapsed on mobile, show only the latest 1 action */}
          {!isEventsExpanded && logs.length > 0 && (
            <div className="text-[11px] text-zinc-300 font-mono flex items-center justify-between gap-2 p-1.5 bg-zinc-900/60 rounded-lg">
              <span className="truncate">{logs[logs.length - 1].text}</span>
              <span className="text-[9.5px] text-zinc-500 shrink-0 font-mono">
                {logs[logs.length - 1].time}
              </span>
            </div>
          )}

          {/* Scrollable Feed when expanded */}
          {isEventsExpanded && (
            <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {logs.map((lg) => {
                const logPlayer =
                  lg.playerId !== undefined ? players.find((p) => p.id === lg.playerId) : null;

                return (
                  <div
                    key={lg.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg sm:rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {logPlayer ? (
                        <span
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] shrink-0 mt-0.5 shadow-xs"
                          style={{ backgroundColor: logPlayer.colorHex }}
                          title={logPlayer.name}
                        >
                          {logPlayer.tokenEmoji}
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] sm:text-[9px] shrink-0 mt-0.5">
                          🎲
                        </span>
                      )}

                      <p className="text-slate-200 text-[11px] sm:text-[12.5px] leading-snug break-words">
                        {lg.text}
                      </p>
                    </div>

                    <span className="text-[9px] text-slate-500 shrink-0 font-mono mt-0.5">
                      {lg.time}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Property Deed Modal */}
      {inspectedTile && (
        <PropertyModal
          tile={inspectedTile}
          propertyState={properties[inspectedTile.id]}
          owner={players.find((p) => p.id === properties[inspectedTile.id]?.ownerId)}
          currentPlayer={activePlayer}
          allPropertyStates={properties}
          onClose={() => setInspectedTileId(null)}
          onBuy={
            activePlayer.position === inspectedTile.id && phase === 'action_needed'
              ? handleBuyProperty
              : undefined
          }
          onBuildHouse={() => handleUpgradeProperty(inspectedTile.id)}
          onSellBuilding={() => handleSellBuilding(inspectedTile.id)}
          onMortgage={() => handleMortgageProperty(inspectedTile.id)}
          onUnmortgage={() => handleUnmortgageProperty(inspectedTile.id)}
          onInitiateTrade={(targetPlayerId, propId) => {
            setTradeTargetPlayerId(targetPlayerId);
            setTradeTargetPropId(propId);
            setIsTradeOpen(true);
          }}
        />
      )}

      {/* Player Portfolio & Properties Modal (Priority 2) */}
      <PlayerPortfolioModal
        isOpen={selectedPlayerId !== null}
        onClose={() => setSelectedPlayerId(null)}
        player={inspectedPlayer || null}
        currentPlayer={activePlayer}
        properties={properties}
        onInspectProperty={(tileId) => setInspectedTileId(tileId)}
        onInitiateTrade={(targetPlayerId) => {
          setTradeTargetPlayerId(targetPlayerId);
          setIsTradeOpen(true);
        }}
      />

      {/* Debt Recovery Modal (Priority 1) */}
      {debtDebtor && (
        <DebtRecoveryModal
          isOpen={phase === 'debt_recovery' && pendingDebt !== null}
          debt={pendingDebt}
          debtor={debtDebtor}
          creditor={debtCreditor}
          properties={properties}
          onMortgageProperty={handleMortgageProperty}
          onSellBuilding={handleSellBuilding}
          onOpenTrade={() => setIsTradeOpen(true)}
          onPayDebt={handlePayDebt}
          onDeclareBankruptcy={() =>
            bankruptPlayer(debtDebtor, pendingDebt?.creditorId !== null ? pendingDebt?.creditorId : undefined)
          }
        />
      )}

      {/* Incoming Trade Proposal from AI (Priority 4) */}
      <IncomingTradeModal
        isOpen={incomingTradeOffer !== null}
        offer={incomingTradeOffer}
        players={players}
        onAccept={() => {
          if (!incomingTradeOffer) return;
          handleExecuteTrade({
            fromPlayerId: incomingTradeOffer.fromAiPlayerId,
            toPlayerId: incomingTradeOffer.targetPlayerId,
            offeredPropertyIds: incomingTradeOffer.offeredPropertyIds,
            requestedPropertyIds: incomingTradeOffer.requestedPropertyIds,
            offeredCash: incomingTradeOffer.offeredCash,
            requestedCash: incomingTradeOffer.requestedCash
          });
          setIncomingTradeOffer(null);
        }}
        onReject={() => {
          if (!incomingTradeOffer) return;
          const ai = players.find((p) => p.id === incomingTradeOffer.fromAiPlayerId);
          addLog(`❌ You declined trade offer from ${ai?.name || 'AI'}.`, 'trade', activePlayer.id);
          setIncomingTradeOffer(null);
        }}
        onCounteroffer={() => {
          if (!incomingTradeOffer) return;
          setTradeTargetPlayerId(incomingTradeOffer.fromAiPlayerId);
          setTradeTargetPropId(incomingTradeOffer.offeredPropertyIds[0]);
          setIsTradeOpen(true);
          setIncomingTradeOffer(null);
        }}
      />

      {/* Trade Modal */}
      <TradeModal
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        activePlayer={activePlayer}
        players={players}
        properties={properties}
        onExecuteTrade={handleExecuteTrade}
        initialTargetPlayerId={tradeTargetPlayerId}
        initialRequestedPropertyId={tradeTargetPropId}
      />

      {/* Public Land Auction Modal */}
      <AuctionModal
        isOpen={phase === 'auction' && auctionState !== null}
        auction={auctionState}
        tile={auctionState ? TILES.find((t) => t.id === auctionState.tileId) || null : null}
        players={players}
        onBid={(amount) => handleAuctionBid(amount)}
        onPass={() => handleAuctionPass()}
        onAcknowledgeCompletion={handleAcknowledgeAuctionCompletion}
      />

      {/* Chance / Community Chest Card Modal */}
      <CardModal card={activeCard} onDismiss={handleDismissCard} />

      {/* Player Setup Drawer */}
      <SetupDrawer
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onStartGame={(cfg, cash) => resetGame(cfg, cash)}
      />

      {/* Reset Game Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto text-xl">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Start New Game?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Your current session progress will be wiped and a fresh match will begin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Continue Playing
              </button>
              <button
                onClick={() => resetGame()}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-colors cursor-pointer"
              >
                Reset Match
              </button>
            </div>
          </div>
        </div>
      )}

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
