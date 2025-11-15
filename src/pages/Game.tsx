import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess, Square, Move } from "chess.js";
import Chessboard from "chessboardjsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ArrowLeft } from "lucide-react";

import MoveExplanation from "@/components/MoveExplanation";
import GameResult from "@/components/GameResult";
import MoveHistory from "@/components/MoveHistory";
import EvaluationBar from "@/components/EvaluationBar";
import GameControls from "@/components/GameControls";
import PromotionDialog from "@/components/PromotionDialog";
import PlayerCard from "@/components/PlayerCard";
import CapturedPieces from "@/components/CapturedPieces";
import GameTimer from "@/components/GameTimer";
import ArenaMonitoring from "@/components/ArenaMonitoring";
import ArenaNotification from "@/components/ArenaNotification";
import MilestoneAnimations from "@/components/MilestoneAnimations";
import MilestoneFeed from "@/components/MilestoneFeed";
import PerkUI from "@/components/PerkUI";
import FreezeOverlay from "@/components/FreezeOverlay";
import { useStockfish } from "@/hooks/useStockfish";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { usePointsMilestone } from "@/hooks/usePointsMilestone";
import { usePerkSystem } from "@/hooks/usePerkSystem";
import { ArenaGameService } from "@/lib/arenaGameService";

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [game, setGame] = useState<any | null>(null);
  const [chess] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [lastMove, setLastMove] = useState<any>(null);
  const [gameOver, setGameOver] = useState(false);
  const [position, setPosition] = useState(chess.fen());
  const [moves, setMoves] = useState<any[]>([]);
  const [evaluation, setEvaluation] = useState(0);
  const [mateIn, setMateIn] = useState<number | undefined>(undefined);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<Square[]>([]);
  const [pendingMove, setPendingMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showPromotion, setShowPromotion] = useState(false);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [whiteCaptured, setWhiteCaptured] = useState<string[]>([]);
  const [blackCaptured, setBlackCaptured] = useState<string[]>([]);
  const { isReady: stockfishReady, evaluatePosition, getBestMove } = useStockfish();
  const { playSound } = useSoundEffects();
  const [isAbandoning, setIsAbandoning] = useState(false);
  const isNavigatingRef = useRef(false);
  
  // Perk system
  const {
    activePerks,
    hintToken,
    fireTrailMoves,
    shieldUses,
    bestMoveHighlight,
    timeBonus,
    freezeOpponent,
    activatePerk,
    useHintToken,
    useFireTrail,
    useShield,
    consumeTimeBonus,
  } = usePerkSystem();
  
  // Perk-related state
  const [hintSquares, setHintSquares] = useState<Square[]>([]);
  const [bestMoveSquares, setBestMoveSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [fireTrailActive, setFireTrailActive] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Array<{ fen: string; move: any }>>([]);
  const [isFrozen, setIsFrozen] = useState(false);

  // Arena Game Service
  const arenaServiceRef = useRef<ArenaGameService | null>(null);
  const [arenaGameState, setArenaGameState] = useState<any | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [statusLabel, setStatusLabel] = useState<"pending" | "live" | "completed" | "stopped" | null>(null);
  const [monitorCountdown, setMonitorCountdown] = useState<number | null>(null);
  const [monitorArenaActive, setMonitorArenaActive] = useState(false);
  const [monitorEvents, setMonitorEvents] = useState<Array<{ type: string; data: any; timestamp: Date }>>([]);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [lastBoost, setLastBoost] = useState<any>(null);
  const [lastDrop, setLastDrop] = useState<any>(null);
  const [lastBoostCycleUpdate, setLastBoostCycleUpdate] = useState<any>(null);
  const [arenaLoader, setArenaLoader] = useState(false);
  const [notification, setNotification] = useState<
    | { type: "boost"; boosterName: string; boostAmount: number }
    | { type: "item"; itemName: string; cost: number; targetPlayerName: string; purchaserName: string }
    | null
  >(null);
  const [isGameCreator, setIsGameCreator] = useState(false);
  const [sharedArenaState, setSharedArenaState] = useState<any>(null);

  // Points milestone system with perk activation
  const {
    addPoints,
    totalPoints,
    milestoneEvents,
    activeMilestone,
    activePerk,
    auraActive,
    auraTimeLeft,
    celestialActive,
    displayName: milestoneDisplayName,
  } = usePointsMilestone("Viewer", activatePerk);

  const handleAbandonGame = useCallback(async () => {
    if (!playerColor || !gameId) return;
    
    setIsAbandoning(true);
    
    try {
      const winner = playerColor === 'w' ? 'black' : 'white';
      
      await supabase
        .from('games')
        .update({
          game_status: 'finished',
          winner: winner,
          resignation_by: playerColor === 'w' ? 'white' : 'black',
        })
        .eq('id', gameId);
    } catch (error: any) {
      console.error('Error abandoning game:', error);
    }
  }, [playerColor, gameId]);

  // Handle game abandonment when tab is closed
  useEffect(() => {
    if (!gameId || !game) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always show prompt if game exists and we're not already navigating away
      // Works for both waiting and playing games
      if (!isAbandoning && !isNavigatingRef.current) {
        // Try to execute abandon/delete (fire and forget - may not complete)
        (async () => {
          try {
            if (game.game_status === 'waiting') {
              // Delete waiting game
              await supabase
                .from('games')
                .delete()
                .eq('id', gameId);
            } else if (game.game_status === 'playing' && playerColor) {
              // Abandon playing game
              const winner = playerColor === 'w' ? 'black' : 'white';
              await supabase
                .from('games')
                .update({
                  game_status: 'finished',
                  winner: winner,
                  resignation_by: playerColor === 'w' ? 'white' : 'black',
                })
                .eq('id', gameId);
            }
          } catch (err) {
            console.error('Error handling game on unload:', err);
          }
        })();
        
        e.preventDefault();
        e.returnValue = game.game_status === 'waiting' 
          ? 'Are you sure you want to leave? The waiting game will be cancelled.'
          : 'Are you sure you want to leave? The game will be ended.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId, game, isAbandoning, playerColor]);

  // Initialize Arena Service and load from localStorage
  useEffect(() => {
    // Only initialize arena service if user is the creator
    if (isGameCreator) {
      arenaServiceRef.current = new ArenaGameService();

      // Load from localStorage (set by Home.tsx from URL params)
      const existingStream = localStorage.getItem("streamUrl") || "";
      setStreamUrl(existingStream);
    }

    return () => {
      if (arenaServiceRef.current) {
        arenaServiceRef.current?.disconnect();
        arenaServiceRef.current = null;
      }
    };
  }, [isGameCreator]);

  // Function to sync arena state to database
  const syncArenaStateToDB = useCallback(async (updates: any) => {
    if (!gameId) return;
    
    try {
      const currentState = sharedArenaState || {};
      const newState = { ...currentState, ...updates };
      
      await supabase
        .from('games')
        .update({ arena_state: JSON.stringify(newState) })
        .eq('id', gameId);
      
      setSharedArenaState(newState);
    } catch (error) {
      console.error('Error syncing arena state:', error);
    }
  }, [gameId, sharedArenaState]);

  // Attach socket event handlers (only for creator)
  useEffect(() => {
    const arena = arenaServiceRef.current;
    if (!arena || !isGameCreator) return;

    // Arena Events
    arena.onArenaCountdownStarted = (data) => {
      setStatusLabel("pending");
      setMonitorCountdown(60);
      const newEvent = { type: "arena_countdown_started", data, timestamp: new Date() };
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          statusLabel: "pending",
          monitorCountdown: 60,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    arena.onCountdownUpdate = (data) => {
      setMonitorCountdown(data.secondsRemaining);
      const newEvent = { type: "countdown_update", data, timestamp: new Date() };
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          monitorCountdown: data.secondsRemaining,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    arena.onArenaBegins = (data) => {
      setStatusLabel("live");
      setMonitorArenaActive(true);
      const newEvent = { type: "arena_begins", data, timestamp: new Date() };
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          statusLabel: "live",
          monitorArenaActive: true,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    // Boost Events
    arena.onPlayerBoostActivated = (data) => {
      setLastBoost(data);
      const newEvent = { type: "player_boost_activated", data, timestamp: new Date() };
      setMonitorEvents((prev) => [...prev, newEvent]);
      
      // Show boost notification
      const boostAmount =
        Number(data?.boostAmount) || Number(data?.currentCyclePoints) || 0;
      const boosterName = data?.boosterUsername || data?.playerName || "Viewer";
      
      setNotification({
        type: "boost",
        boosterName,
        boostAmount,
      });

      // Add points to milestone system (both players will get this via sync)
      addPoints(boostAmount);

      // Get current total points to sync
      const currentTotal = totalPoints;

      // Sync to database (use functional update to get latest monitorEvents)
      setMonitorEvents((prevEvents) => {
        const updatedEvents = [...prevEvents, newEvent];
        syncArenaStateToDB({
          lastBoost: data,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          })),
          lastBoostAmount: boostAmount,
          lastBoosterName: boosterName,
          totalPoints: currentTotal + boostAmount
        });
        return updatedEvents;
      });
    };

    arena.onBoostCycleUpdate = (data) => {
      const cycle = data?.currentCycle || data?.cycle || null;
      setCurrentCycle(cycle);
      setLastBoostCycleUpdate(data);
      const newEvent = { type: "boost_cycle_update", data, timestamp: new Date() };
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          currentCycle: cycle,
          lastBoostCycleUpdate: data,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    arena.onBoostCycleComplete = (data) => {
      setMonitorEvents((prev) => [
        ...prev,
        { type: "boost_cycle_complete", data, timestamp: new Date() },
      ]);
    };

    // Package Events
    arena.onPackageDrop = (data) => {
      const playerPackageDrops = data?.playerPackageDrops || [];
      if (playerPackageDrops.length === 0) return;

      const playerWithPackage = playerPackageDrops.find(
        (p: any) => p.eligiblePackages && p.eligiblePackages.length > 0
      );

      if (!playerWithPackage) return;

      const packageData = playerWithPackage.eligiblePackages[0];
      const packageName = packageData?.name || "Unknown Package";
      const packageImage = packageData?.image;
      const playerName = playerWithPackage?.playerName || "Unknown";
      const playerPoints = playerWithPackage?.playerPoints || 0;
      const cost = packageData?.cost || 0;
      const stats = packageData?.stats || [];

      let moveCount = 0;
      const moveMatch = packageName.match(/(\d+)x?\s*moves?/i);
      if (moveMatch) {
        moveCount = parseInt(moveMatch[1], 10);
      }

      const dropInfo = {
        type: "package_drop",
        packageName,
        packageImage,
        playerName,
        playerPoints,
        cost,
        stats,
        moveCount,
        currentCycle: data?.currentCycle,
        gameId: data?.gameId,
        ...data,
      };

      setLastDrop(dropInfo);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "package_drop", data: dropInfo, timestamp: new Date() },
      ]);
    };

    arena.onImmediateItemDrop = (data) => {
      const itemData = data?.item || data;
      const packageData = data?.package || data;
      const itemName =
        itemData?.name || packageData?.name || data?.itemName || "Unknown Item";
      const itemImage =
        itemData?.image || packageData?.image || data?.item?.image;
      const purchaserUsername = data?.purchaserUsername || "Unknown";
      const targetPlayerName = data?.targetPlayerName || "Unknown";
      const stats =
        itemData?.stats || packageData?.stats || data?.item?.stats || [];
      const cost = data?.cost || packageData?.cost || itemData?.cost || 0;

      const dropInfo = {
        type: "immediate_item_drop",
        itemName,
        itemImage,
        purchaserUsername,
        targetPlayerName,
        cost,
        stats,
        ...data,
      };

      setLastDrop(dropInfo);
      const newEvent = { type: "immediate_item_drop", data: dropInfo, timestamp: new Date() };
      setMonitorEvents((prev) => [...prev, newEvent]);
      
      // Show item drop notification
      setNotification({
        type: "item",
        itemName,
        cost,
        targetPlayerName,
        purchaserName: purchaserUsername,
      });

      // Sync to database
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          lastDrop: dropInfo,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    // Game Events
    arena.onEventTriggered = (data) => {
      setMonitorEvents((prev) => [
        ...prev,
        { type: "event_triggered", data, timestamp: new Date() },
      ]);
    };

    arena.onPlayerJoined = (data) => {
      setMonitorEvents((prev) => [
        ...prev,
        { type: "player_joined", data, timestamp: new Date() },
      ]);
    };

    arena.onGameCompleted = (data) => {
      setStatusLabel("completed");
      setMonitorArenaActive(false);
      const newEvent = { type: "game_completed", data, timestamp: new Date() };
      setMonitorEvents((prev) => [...prev, newEvent]);
      // Reset all monitoring state
      setMonitorCountdown(null);
      setCurrentCycle(null);
      setLastBoost(null);
      setLastDrop(null);
      setLastBoostCycleUpdate(null);
      
      // Sync to database
      setMonitorEvents((prev) => {
        const updatedEvents = [...prev, newEvent];
        syncArenaStateToDB({
          statusLabel: "completed",
          monitorArenaActive: false,
          monitorCountdown: null,
          currentCycle: null,
          lastBoost: null,
          lastDrop: null,
          lastBoostCycleUpdate: null,
          monitorEvents: updatedEvents.map(e => ({
            ...e,
            timestamp: e.timestamp.toISOString()
          }))
        });
        return updatedEvents;
      });
    };

    arena.onGameStopped = (data) => {
      setStatusLabel("stopped");
      setMonitorArenaActive(false);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "game_stopped", data, timestamp: new Date() },
      ]);
    };

    return () => {
      // Clean up: remove all handlers
      if (arena) {
        arena.onArenaCountdownStarted = undefined;
        arena.onCountdownUpdate = undefined;
        arena.onArenaBegins = undefined;
        arena.onPlayerBoostActivated = undefined;
        arena.onBoostCycleUpdate = undefined;
        arena.onBoostCycleComplete = undefined;
        arena.onPackageDrop = undefined;
        arena.onImmediateItemDrop = undefined;
        arena.onEventTriggered = undefined;
        arena.onPlayerJoined = undefined;
        arena.onGameCompleted = undefined;
        arena.onGameStopped = undefined;
      }
    };
  }, [isGameCreator, syncArenaStateToDB]);

  // Disconnect Arena when game ends
  useEffect(() => {
    if (gameOver && arenaServiceRef.current && arenaGameState) {
      arenaServiceRef.current.disconnect();
      setArenaGameState(null);
      setMonitorArenaActive(false);
      toast({
        title: "Arena Disconnected",
        description: "Arena connection closed after game ended.",
      });
    }
  }, [gameOver, arenaGameState, toast]);

  useEffect(() => {
    if (!gameId) return;

    // Load game
    loadGame();
    loadMoves();

    // Subscribe to game updates
    const channel = supabase
      .channel('game-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game update:', payload);
            if (payload.new && typeof payload.new === 'object') {
              const newGame = payload.new as any;
              setGame(newGame);
              if (newGame.board_state) {
                // Check if opponent made a move (and if they're frozen, reject it)
                if (freezeOpponent && newGame.current_turn === playerColor && chess.turn() !== playerColor) {
                  // Opponent tried to move while frozen - revert the board state
                  toast({
                    title: "Opponent Frozen!",
                    description: "Opponent's move was blocked due to freeze effect",
                  });
                  return; // Don't update the board
                }
                
                chess.load(newGame.board_state);
                setPosition(newGame.board_state);
              }
              
              // Sync arena state from database (for non-creator players)
              if (newGame.arena_state && !isGameCreator) {
                try {
                  const arenaState = typeof newGame.arena_state === 'string' 
                    ? JSON.parse(newGame.arena_state) 
                    : newGame.arena_state;
                  
                  if (arenaState.arenaGameState) {
                    setArenaGameState(arenaState.arenaGameState);
                  }
                  if (arenaState.statusLabel) {
                    setStatusLabel(arenaState.statusLabel);
                  }
                  if (arenaState.monitorCountdown !== undefined) {
                    setMonitorCountdown(arenaState.monitorCountdown);
                  }
                  if (arenaState.monitorArenaActive !== undefined) {
                    setMonitorArenaActive(arenaState.monitorArenaActive);
                  }
                  if (arenaState.monitorEvents) {
                    setMonitorEvents(arenaState.monitorEvents.map((e: any) => ({
                      ...e,
                      timestamp: new Date(e.timestamp)
                    })));
                  }
                  if (arenaState.currentCycle) {
                    setCurrentCycle(arenaState.currentCycle);
                  }
                  if (arenaState.lastBoost) {
                    setLastBoost(arenaState.lastBoost);
                  }
                  if (arenaState.lastDrop) {
                    setLastDrop(arenaState.lastDrop);
                  }
                  if (arenaState.streamUrl) {
                    setStreamUrl(arenaState.streamUrl);
                  }
                  
                  // Sync points and trigger notifications
                  if (arenaState.lastBoostAmount && arenaState.lastBoostAmount > 0) {
                    // Only add points if not already added (prevent duplicates)
                    const currentTotal = totalPoints;
                    if (arenaState.totalPoints && arenaState.totalPoints > currentTotal) {
                      const pointsToAdd = arenaState.totalPoints - currentTotal;
                      addPoints(pointsToAdd);
                    } else if (!arenaState.totalPoints) {
                      addPoints(arenaState.lastBoostAmount);
                    }
                    
                    // Show notification
                    setNotification({
                      type: "boost",
                      boosterName: arenaState.lastBoosterName || "Viewer",
                      boostAmount: arenaState.lastBoostAmount,
                    });
                  }
                  
                  setSharedArenaState(arenaState);
                } catch (e) {
                  console.error('Error parsing arena state:', e);
                }
              }
              
              if (newGame.game_status === 'finished') {
                setGameOver(true);
                
                // Check if opponent abandoned the game
                if (newGame.resignation_by && newGame.resignation_by !== (playerColor === 'w' ? 'white' : 'black')) {
                  toast({
                    title: "Opponent Left",
                    description: "Your opponent has left the game. You win!",
                  });
                  
                  // Navigate to home after showing result
                  setTimeout(() => {
                    navigate('/');
                  }, 3000);
                }
              }
            }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moves',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadMoves();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const loadGame = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Game not found",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setGame(data);
    chess.load(data.board_state);
    setPosition(data.board_state);

    // Get or create player ID
    const storageKey = `player_${gameId}`;
    let playerId = localStorage.getItem(storageKey);
    
    const hasWhite = !!data.white_player_id;
    const hasBlack = !!data.black_player_id;
    
    if (!hasWhite) {
      await joinAsWhite(data, storageKey);
      setIsGameCreator(true); // White player is the creator
    } else if (!hasBlack) {
      await joinAsBlack(data, storageKey);
      setIsGameCreator(false); // Black player is not the creator
    } else {
      // Both players already in game - determine color from stored player ID
      if (playerId === data.white_player_id) {
        setPlayerColor('w');
        setIsGameCreator(true); // White player is the creator
      } else if (playerId === data.black_player_id) {
        setPlayerColor('b');
        setIsGameCreator(false); // Black player is not the creator
      } else {
        // Spectator - set to white for viewing
        setPlayerColor('w');
        setIsGameCreator(false);
      }
    }

    // Load shared arena state from database
    if (data.arena_state) {
      try {
        const arenaState = typeof data.arena_state === 'string' 
          ? JSON.parse(data.arena_state) 
          : data.arena_state;
        setSharedArenaState(arenaState);
        
        // Sync arena state to local state
        if (arenaState.arenaGameState) {
          setArenaGameState(arenaState.arenaGameState);
        }
        if (arenaState.statusLabel) {
          setStatusLabel(arenaState.statusLabel);
        }
        if (arenaState.monitorCountdown !== undefined) {
          setMonitorCountdown(arenaState.monitorCountdown);
        }
        if (arenaState.monitorArenaActive !== undefined) {
          setMonitorArenaActive(arenaState.monitorArenaActive);
        }
        if (arenaState.monitorEvents) {
          setMonitorEvents(arenaState.monitorEvents.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })));
        }
        if (arenaState.currentCycle) {
          setCurrentCycle(arenaState.currentCycle);
        }
        if (arenaState.lastBoost) {
          setLastBoost(arenaState.lastBoost);
        }
        if (arenaState.lastDrop) {
          setLastDrop(arenaState.lastDrop);
        }
        if (arenaState.streamUrl) {
          setStreamUrl(arenaState.streamUrl);
        }
        // Sync points if available
        if (arenaState.totalPoints !== undefined) {
          // Points will be synced via the milestone system
        }
      } catch (e) {
        console.error('Error parsing arena state:', e);
      }
    }
  };

  const loadMoves = async () => {
    const { data } = await supabase
      .from('moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    if (data) {
      setMoves(data);
      
      // Calculate captured pieces correctly
      const startingPieces = {
        'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1
      };
      
      const currentPieces = chess.board().flat().filter(p => p !== null);
      const whitePieces = currentPieces.filter(p => p?.color === 'w');
      const blackPieces = currentPieces.filter(p => p?.color === 'b');
      
      // Count current pieces
      const whiteCount: Record<string, number> = {};
      const blackCount: Record<string, number> = {};
      
      whitePieces.forEach(p => {
        if (p?.type) whiteCount[p.type] = (whiteCount[p.type] || 0) + 1;
      });
      
      blackPieces.forEach(p => {
        if (p?.type) blackCount[p.type] = (blackCount[p.type] || 0) + 1;
      });
      
      // Calculate captured (what white captured from black)
      const whiteCapturedPieces: string[] = [];
      const blackCapturedPieces: string[] = [];
      
      Object.entries(startingPieces).forEach(([piece, startCount]) => {
        if (piece === 'k') return; // Skip king
        
        const blackRemaining = blackCount[piece] || 0;
        const whiteRemaining = whiteCount[piece] || 0;
        
        const blackCaptured = startCount - blackRemaining;
        const whiteCaptured = startCount - whiteRemaining;
        
        for (let i = 0; i < blackCaptured; i++) {
          whiteCapturedPieces.push(piece);
        }
        
        for (let i = 0; i < whiteCaptured; i++) {
          blackCapturedPieces.push(piece);
        }
      });
      
      setWhiteCaptured(whiteCapturedPieces);
      setBlackCaptured(blackCapturedPieces);
    }
  };

  const joinAsWhite = async (gameData: any, storageKey: string) => {
    const playerId = crypto.randomUUID();
    localStorage.setItem(storageKey, playerId);
    
    await supabase
      .from('games')
      .update({ white_player_id: playerId })
      .eq('id', gameId);
    
    setPlayerColor('w');
  };

  const joinAsBlack = async (gameData: any, storageKey: string) => {
    const playerId = crypto.randomUUID();
    localStorage.setItem(storageKey, playerId);
    
    await supabase
      .from('games')
      .update({ 
        black_player_id: playerId,
        game_status: 'playing'
      })
      .eq('id', gameId);
    
    setPlayerColor('b');
  };


  // Handle freeze opponent - prevents opponent from moving
  useEffect(() => {
    if (freezeOpponent && game && playerColor) {
      // Freeze is handled by checking isFrozen in move validation
      // The freeze effect is visual only - actual blocking happens in makeMove
      const timeout = setTimeout(() => {
        // Freeze ends after 1 second
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [freezeOpponent, game, playerColor]);

  // Handle best move highlight (100 points perk)
  useEffect(() => {
    if (bestMoveHighlight && stockfishReady && chess && playerColor && chess.turn() === playerColor) {
      getBestMove(chess.fen(), (bestMove) => {
        if (bestMove && bestMove.length >= 4) {
          const from = bestMove.substring(0, 2) as Square;
          const to = bestMove.substring(2, 4) as Square;
          setBestMoveSquares({ from, to });
          toast({
            title: "Best Move Highlighted!",
            description: "The engine's recommended move is highlighted in green",
          });
          setTimeout(() => {
            setBestMoveSquares(null);
          }, 1000);
        }
      }, 10);
    }
  }, [bestMoveHighlight, stockfishReady, chess, playerColor, getBestMove, toast]);

  // Apply time bonus
  useEffect(() => {
    if (timeBonus > 0 && game && gameId) {
      const bonus = consumeTimeBonus();
      if (bonus > 0 && playerColor) {
        const timeField = playerColor === 'w' ? 'white_time_remaining' : 'black_time_remaining';
        supabase
          .from('games')
          .update({
            [timeField]: (game[timeField] || 0) + bonus,
          })
          .eq('id', gameId);
        
        toast({
          title: "Time Bonus!",
          description: `+${bonus} seconds added to your clock`,
        });
      }
    }
  }, [timeBonus, game, gameId, playerColor, consumeTimeBonus, toast]);

  const handleSquareClick = useCallback((square: Square) => {
    if (!game || !playerColor) return;
    
    // Check if frozen
    if (isFrozen && chess.turn() !== playerColor) {
      toast({
        title: "Opponent Frozen",
        description: "Your opponent is temporarily frozen!",
      });
      return;
    }
    
    const currentTurn = chess.turn();
    if (currentTurn !== playerColor) return;

    const piece = chess.get(square);

    // If clicking on own piece, select it and show legal moves
    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true }) as Move[];
      setHighlightedSquares(moves.map(m => m.to as Square));
      
      // Show hint if hint token is active (only when clicking on a piece)
      if (hintToken && piece && piece.color === playerColor) {
        getBestMove(chess.fen(), (bestMove) => {
          if (bestMove && bestMove.length >= 4) {
            const from = bestMove.substring(0, 2) as Square;
            const to = bestMove.substring(2, 4) as Square;
            setHintSquares([from, to]);
            useHintToken();
            toast({
              title: "Hint Used",
              description: "Best move highlighted in blue!",
            });
            // Clear hint after 10 seconds
            setTimeout(() => {
              setHintSquares([]);
            }, 10000);
          }
        }, 10);
      }
    } 
    // If a square is already selected, try to move
    else if (selectedSquare) {
      attemptMove(selectedSquare, square);
    }
  }, [game, playerColor, selectedSquare, chess, isFrozen, hintToken, getBestMove, useHintToken, toast]);

  const attemptMove = (from: Square, to: Square) => {
    // Clear highlights
    setSelectedSquare(null);
    setHighlightedSquares([]);

    // Check if this is a pawn promotion
    const piece = chess.get(from);
    if (piece && piece.type === 'p') {
      const toRank = to[1];
      if ((piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')) {
        // Show promotion dialog
        setPendingMove({ from, to });
        setShowPromotion(true);
        return;
      }
    }

    // Try regular move
    makeMove(from, to, 'q');
  };

  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    setShowPromotion(false);
    if (pendingMove) {
      makeMove(pendingMove.from, pendingMove.to, piece);
      setPendingMove(null);
    }
  };

  const makeMove = (sourceSquare: Square, targetSquare: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q') => {
    if (!game || !playerColor) {
      console.log('Cannot move: game or playerColor not set', { game: !!game, playerColor });
      return;
    }
    
    const currentTurn = chess.turn();
    console.log('Move attempt:', { currentTurn, playerColor, sourceSquare, targetSquare });
    
    // Check if it's player's turn
    if (currentTurn !== playerColor) {
      // If opponent is frozen, show message but still prevent their move
      if (freezeOpponent) {
        toast({
          title: "Opponent Frozen!",
          description: "Your opponent cannot move for 1 second",
        });
      } else {
        toast({
          title: "Not your turn",
          description: "Please wait for your opponent",
        });
      }
      return;
    }

    // Save current position to history for undo (before making move)
    const currentFen = chess.fen();
    setMoveHistory((prev) => [
      ...prev,
      { fen: currentFen, move: null },
    ]);

    const move = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: promotion,
    });

    if (!move) {
      console.log('Invalid move attempted');
      // Reset position to prevent piece from disappearing
      setPosition(chess.fen());
      playSound('illegal');
      toast({
        title: "Illegal Move",
        description: "That move is not allowed",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Move successful:', move.san);
    const newFen = chess.fen();
    setPosition(newFen);
    setLastMoveSquares({ from: sourceSquare, to: targetSquare });

    // Apply fire-trail effect if available
    if (useFireTrail()) {
      setFireTrailActive(true);
      setTimeout(() => setFireTrailActive(false), 2000);
    }

    // Play appropriate sound
    if (promotion !== 'q' && move.san.includes('=')) {
      playSound('promote');
    } else if (move.san.includes('O-O')) {
      playSound('castle');
    } else if (move.san.includes('+')) {
      playSound('check');
    } else if (move.captured) {
      playSound('capture');
    } else {
      playSound('move');
    }

    // Evaluate new position with Stockfish
    if (stockfishReady) {
      evaluatePosition(newFen, (evalData) => {
        setEvaluation(evalData.score);
        setMateIn(evalData.mate);
      });
    }

    // Update game state async
    (async () => {
      try {
        const { error } = await supabase
          .from('games')
          .update({
            board_state: newFen,
            current_turn: chess.turn(),
          })
          .eq('id', gameId);

        if (error) throw error;

        // Save move to database
        const { data: moveData } = await supabase
          .from('moves')
          .insert({
            game_id: gameId,
            move_number: chess.moveNumber(),
            move_notation: move.san,
            board_state_after: newFen,
            player_color: playerColor,
          })
          .select()
          .single();

        // Get AI explanation
        if (moveData) {
          const { data: explanation } = await supabase.functions.invoke('explain-move', {
            body: {
              move: move.san,
              fen: newFen,
              playerColor: playerColor,
            }
          });

          if (explanation?.explanation) {
            await supabase
              .from('moves')
              .update({ explanation: explanation.explanation })
              .eq('id', moveData.id);
            
            setLastMove({
              notation: move.san,
              explanation: explanation.explanation,
            });
          }
        }

        // Check for game over
        if (chess.isGameOver()) {
          let winner = null;
          if (chess.isCheckmate()) {
            winner = chess.turn() === 'w' ? 'black' : 'white';
          }
          
          // Get all moves for analysis
          const { data: allMoves } = await supabase
            .from('moves')
            .select('move_notation, player_color')
            .eq('game_id', gameId)
            .order('move_number', { ascending: true });

          if (allMoves && allMoves.length > 0) {
            const moves = allMoves.map(m => m.move_notation);
            
            // Analyze the game
            const { data: analysis } = await supabase.functions.invoke('analyze-game', {
              body: {
                moves: moves,
              }
            });

            if (analysis) {
              await supabase
                .from('games')
                .update({
                  game_status: 'finished',
                  winner: winner,
                  white_accuracy: analysis.whiteAccuracy,
                  black_accuracy: analysis.blackAccuracy,
                  white_playstyle: analysis.whitePlaystyle,
                  black_playstyle: analysis.blackPlaystyle,
                  game_analysis: analysis.summary,
                })
                .eq('id', gameId);
            } else {
              await supabase
                .from('games')
                .update({
                  game_status: 'finished',
                  winner: winner,
                })
                .eq('id', gameId);
            }
          } else {
            await supabase
              .from('games')
              .update({
                game_status: 'finished',
                winner: winner,
              })
              .eq('id', gameId);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    })();
  };

  const handleUndo = useCallback(async () => {
    if (shieldUses === 0 || !game || !playerColor || moveHistory.length === 0) {
      toast({
        title: "Cannot Undo",
        description: "No shield available or no moves to undo",
        variant: "destructive",
      });
      return;
    }

    // Check if we can undo (must be player's turn and have made a move)
    if (chess.turn() !== playerColor || chess.history().length === 0) {
      toast({
        title: "Cannot Undo",
        description: "You can only undo your own moves",
        variant: "destructive",
      });
      return;
    }

    // Use shield
    useShield();

    // Get the previous position from history
    const previousState = moveHistory[moveHistory.length - 1];
    if (!previousState) return;

    // Undo the last move
    chess.undo();
    const previousFen = chess.fen();
    setPosition(previousFen);
    setMoveHistory((prev) => prev.slice(0, -1));

    // Update database
    await supabase
      .from('games')
      .update({
        board_state: previousFen,
        current_turn: chess.turn(),
      })
      .eq('id', gameId);

    // Remove last move from database
    const { data: lastMove } = await supabase
      .from('moves')
      .select('id')
      .eq('game_id', gameId)
      .order('move_number', { ascending: false })
      .limit(1)
      .single();

    if (lastMove) {
      await supabase.from('moves').delete().eq('id', lastMove.id);
    }

    // Reload moves list
    const { data: movesData } = await supabase
      .from('moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });
    
    if (movesData) {
      setMoves(movesData);
    }

    toast({
      title: "Move Undone",
      description: "Last move has been undone",
    });
  }, [shieldUses, useShield, game, playerColor, moveHistory, chess, gameId, toast]);

  const handleResign = async () => {
    if (!playerColor) return;
    
    const winner = playerColor === 'w' ? 'black' : 'white';
    
    await supabase
      .from('games')
      .update({
        game_status: 'finished',
        winner: winner,
        resignation_by: playerColor === 'w' ? 'white' : 'black',
      })
      .eq('id', gameId);

    toast({
      title: "Game Over",
      description: "You resigned",
    });
  };

  const handleAbandonGameConfirm = async () => {
    if (!gameId || !game) return;
    
    setIsAbandoning(true);
    
    try {
      // If game is still waiting, delete it
      if (game.game_status === 'waiting') {
        await supabase
          .from('games')
          .delete()
          .eq('id', gameId);

        toast({
          title: "Game Cancelled",
          description: "The waiting game has been removed",
        });
      } else if (game.game_status === 'playing' && playerColor) {
        // If game is playing, mark as finished
        const winner = playerColor === 'w' ? 'black' : 'white';
        
        await supabase
          .from('games')
          .update({
            game_status: 'finished',
            winner: winner,
            resignation_by: playerColor === 'w' ? 'white' : 'black',
          })
          .eq('id', gameId);

        toast({
          title: "Game Abandoned",
          description: "The game has been ended",
        });
      }

      // Navigate to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error abandoning game:', error);
      toast({
        title: "Error",
        description: "Failed to abandon game",
        variant: "destructive",
      });
      setIsAbandoning(false);
    }
  };

  const handleOfferDraw = async () => {
    if (!playerColor) return;
    
    await supabase
      .from('games')
      .update({
        draw_offered_by: playerColor === 'w' ? 'white' : 'black',
      })
      .eq('id', gameId);

    toast({
      title: "Draw Offered",
      description: "Waiting for opponent response",
    });
  };

  const handleAcceptDraw = async () => {
    await supabase
      .from('games')
      .update({
        game_status: 'finished',
        winner: 'draw',
      })
      .eq('id', gameId);

    toast({
      title: "Draw Accepted",
      description: "Game ended in a draw",
    });
  };

  const copyJoinCode = () => {
    if (game?.join_code) {
      navigator.clipboard.writeText(game.join_code);
      toast({
        title: "Copied!",
        description: "Join code copied to clipboard",
      });
    }
  };

  // Arena handlers (only for creator)
  const handleStartArena = async () => {
    if (!isGameCreator) {
      toast({
        title: "Access Denied",
        description: "Only the game creator can start the arena",
        variant: "destructive",
      });
      return;
    }

    const arena = arenaServiceRef.current;
    if (!arena) return;

    if (!streamUrl) {
      toast({
        title: "Error",
        description: "Please enter a stream URL",
        variant: "destructive",
      });
      return;
    }

    setArenaLoader(true);
    try {
      // Get token from localStorage (set by Home.tsx from URL params)
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        "";

      console.log("Token:", token ? "Present" : "Missing");
      const result = await arena.initializeGame(streamUrl, token);
      setArenaLoader(false);

      if (result.success && result.data) {
        setArenaGameState(result.data);
        
        // Sync arena state to database
        await syncArenaStateToDB({
          arenaGameState: result.data,
          streamUrl: streamUrl,
          statusLabel: "pending"
        });
        
        toast({
          title: "Arena Ready",
          description: `Game ID: ${result.data.gameId}`,
        });
      } else {
        toast({
          title: "Arena Init Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setArenaLoader(false);
      toast({
        title: "Arena Init Error",
        description: e?.message || "Failed to initialize",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    if (!isGameCreator) {
      toast({
        title: "Access Denied",
        description: "Only the game creator can disconnect the arena",
        variant: "destructive",
      });
      return;
    }

    const arena = arenaServiceRef.current;
    if (arena && arenaGameState) {
      arena.disconnect();
      setArenaGameState(null);
      setMonitorArenaActive(false);
      setMonitorCountdown(null);
      setMonitorEvents([]);
      setStatusLabel(null);
      setCurrentCycle(null);
      setLastBoost(null);
      setLastDrop(null);
      setLastBoostCycleUpdate(null);
      
      // Sync to database
      syncArenaStateToDB({
        arenaGameState: null,
        monitorArenaActive: false,
        monitorCountdown: null,
        monitorEvents: [],
        statusLabel: null,
        currentCycle: null,
        lastBoost: null,
        lastDrop: null,
        lastBoostCycleUpdate: null
      });
      
      toast({
        title: "Arena Disconnected",
        description: "Arena connection has been closed.",
      });
    }
  };

  const showDisconnect = arenaGameState && statusLabel !== "completed" && statusLabel !== "stopped";

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <GameResult 
        game={game} 
        moves={moves} 
        onPlayAgain={() => navigate('/')}
        playerColor={playerColor}
        totalPoints={totalPoints}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated chess board pattern background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:60px_60px] [background-position:0_0,30px_30px]" />
      </div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Decorative corner elements */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-white/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Arena Monitoring at Top */}
          <div className="mb-6">
            <ArenaMonitoring
              arenaGameState={arenaGameState}
              statusLabel={statusLabel}
              monitorCountdown={monitorCountdown}
              monitorArenaActive={monitorArenaActive}
              monitorEvents={monitorEvents}
              currentCycle={currentCycle}
              lastBoost={lastBoost}
              lastDrop={lastDrop}
              streamUrl={streamUrl}
              onStreamUrlChange={setStreamUrl}
              onConnect={handleStartArena}
              onDisconnect={handleDisconnect}
              isLoading={arenaLoader}
              showDisconnect={showDisconnect}
              isGameCreator={isGameCreator}
            />
          </div>

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                const message = game.game_status === 'waiting'
                  ? 'Are you sure you want to leave? The waiting game will be cancelled.'
                  : 'Are you sure you want to leave? This will end the game.';
                
                if (window.confirm(message)) {
                  isNavigatingRef.current = true;
                  handleAbandonGameConfirm();
                }
              }}
              className="gap-2 text-white/60 hover:text-white border border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold tracking-wide">Back</span>
            </Button>
            
            {game.game_status === 'waiting' && (
              <Card className="px-6 py-3 border-2 border-white/10 bg-gradient-to-r from-black/80 to-gray-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold tracking-widest uppercase text-white/70">Join Code</span>
                  <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <Badge className="text-xl font-black font-mono tracking-wider bg-white text-black border-2 border-white/30 px-4 py-2">
                    {game.join_code}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyJoinCode}
                    className="h-9 w-9 p-0 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300"
                  >
                    <Copy className="w-4 h-4 text-white/70" />
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            {/* Main game area */}
            <div className="space-y-6">
              {/* Opponent Card */}
              <PlayerCard
                color={playerColor === 'b' ? 'white' : 'black'}
                timeRemaining={playerColor === 'b' ? game.white_time_remaining : game.black_time_remaining}
                isActive={game.current_turn !== playerColor}
                capturedPieces={playerColor === 'w' ? whiteCaptured : blackCaptured}
              />

              {/* Chess Board */}
              <div className="relative">
                {/* Board container with elegant frame */}
                <div className="relative p-8 bg-gradient-to-br from-black/90 to-gray-900/90 border-2 border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Corner decorations */}
                  <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-white/20" />
                  <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-white/20" />
                  <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-white/20" />
                  <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-white/20" />
                  
                  <div className="relative" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <Chessboard
                  position={position}
                  draggable={true}
                  onDrop={({ sourceSquare, targetSquare }) => {
                    // Prevent flicker (snap back then forward) and disappearing on illegal drops
                    // 1) Only allow moves on player's turn
                    const isPlayersTurn = chess.turn() === playerColor;
                    if (!isPlayersTurn) {
                      playSound('illegal');
                      return 'snapback';
                    }

                    // 2) Check move legality without mutating the live game first
                    const tentative = new Chess(chess.fen());
                    const tentativeMove = tentative.move({
                      from: sourceSquare as Square,
                      to: targetSquare as Square,
                      promotion: 'q',
                    });

                    if (!tentativeMove) {
                      // Illegal: tell board to snap back; do NOT change position state
                      playSound('illegal');
                      return 'snapback';
                    }

                    // Legal: perform the real move which updates state and DB
                    attemptMove(sourceSquare as Square, targetSquare as Square);
                    // Return undefined to let chessboard keep the piece where dropped without extra snap animation
                    return undefined;
                  }}
                  onSquareClick={handleSquareClick}
                  orientation={playerColor === 'b' ? 'black' : 'white'}
                  lightSquareStyle={{ backgroundColor: '#eeeed2' }}
                  darkSquareStyle={{ backgroundColor: '#769656' }}
                  squareStyles={{
                    ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.5)' } } : {}),
                    ...(lastMoveSquares ? {
                      [lastMoveSquares.from]: { backgroundColor: 'rgba(155, 199, 0, 0.41)' },
                      [lastMoveSquares.to]: { backgroundColor: 'rgba(155, 199, 0, 0.41)' }
                    } : {}),
                    ...highlightedSquares.reduce((acc, square) => {
                      const piece = chess.get(square);
                      if (piece) {
                        acc[square] = { 
                          background: 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 85%, transparent 85%)',
                        };
                      } else {
                        acc[square] = { 
                          background: 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 25%, transparent 25%)',
                        };
                      }
                      return acc;
                    }, {} as Record<string, any>),
                    // Hint squares (blue glow)
                    ...hintSquares.reduce((acc, square) => {
                      acc[square] = {
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                      };
                      return acc;
                    }, {} as Record<string, any>),
                    // Best move squares (green glow)
                    ...(bestMoveSquares ? {
                      [bestMoveSquares.from]: {
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        boxShadow: '0 0 15px rgba(34, 197, 94, 1)',
                        border: '2px solid rgba(34, 197, 94, 1)',
                      },
                      [bestMoveSquares.to]: {
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        boxShadow: '0 0 15px rgba(34, 197, 94, 1)',
                        border: '2px solid rgba(34, 197, 94, 1)',
                      },
                    } : {}),
                    // Fire-trail effect on last move
                    ...(fireTrailActive && lastMoveSquares ? {
                      [lastMoveSquares.from]: {
                        background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.3), rgba(255, 140, 0, 0.3))',
                        boxShadow: '0 0 20px rgba(255, 69, 0, 0.6)',
                      },
                      [lastMoveSquares.to]: {
                        background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.3), rgba(255, 140, 0, 0.3))',
                        boxShadow: '0 0 20px rgba(255, 69, 0, 0.6)',
                        animation: 'fire-trail 2s ease-out',
                      },
                    } : {}),
                  }}
                  transitionDuration={120}
                />
                  </div>
                </div>
              </div>

              {/* Player Card */}
              <PlayerCard
                color={playerColor === 'w' ? 'white' : 'black'}
                timeRemaining={playerColor === 'w' ? game.white_time_remaining : game.black_time_remaining}
                isActive={game.current_turn === playerColor}
                capturedPieces={playerColor === 'b' ? whiteCaptured : blackCaptured}
              />
              
              {/* Game Timer (hidden, updates in background) */}
              {game.game_status === 'playing' && gameId && (
                <div className="hidden">
                  <GameTimer
                    gameId={gameId}
                    timeLimit={game.time_limit}
                    whiteTime={game.white_time_remaining}
                    blackTime={game.black_time_remaining}
                    currentTurn={game.current_turn}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-2">
            <EvaluationBar evaluation={evaluation} mate={mateIn} />
            
            {game.game_status === 'playing' && (
              <>
                <GameControls
                  onResign={handleResign}
                  onOfferDraw={handleOfferDraw}
                  drawOfferedBy={game.draw_offered_by}
                  playerColor={playerColor}
                  onAcceptDraw={handleAcceptDraw}
                  onUndo={handleUndo}
                  shieldUses={shieldUses}
                />
                <PerkUI
                  hintToken={hintToken}
                  fireTrailMoves={fireTrailMoves}
                  shieldUses={shieldUses}
                  timeBonus={timeBonus}
                  freezeOpponent={freezeOpponent}
                />
              </>
            )}

            {game.game_status === 'waiting' && (
              <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%)] bg-[length:30px_30px] opacity-50" />
                <div className="relative p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-white/40 animate-pulse text-5xl">⏳</div>
                  <h3 className="text-lg font-black tracking-widest uppercase mb-2 text-white">Waiting</h3>
                  <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />
                  <p className="text-sm text-white/60 font-light">
                    Share the join code with your friend
                  </p>
                </div>
              </Card>
            )}

            {lastMove && (
              <MoveExplanation
                move={lastMove.notation}
                explanation={lastMove.explanation}
              />
            )}

            {moves.length > 0 && (
              <MoveHistory moves={moves} />
            )}
            </div>
          </div>
        </div>
      </div>
      
      <PromotionDialog
        isOpen={showPromotion}
        onSelect={handlePromotion}
        color={playerColor || 'w'}
      />
      
      <ArenaNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <MilestoneAnimations
        activeMilestone={activeMilestone}
        activePerk={activePerk}
        auraActive={auraActive}
        auraTimeLeft={auraTimeLeft}
        celestialActive={celestialActive}
        displayName={milestoneDisplayName}
      />

      <MilestoneFeed events={milestoneEvents} />

      <FreezeOverlay active={freezeOpponent} />
    </div>
  );
};

export default Game;