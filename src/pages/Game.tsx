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
  // Enhanced move history with full game snapshots
  interface GameSnapshot {
    fen: string;
    activeColor: 'w' | 'b';
    capturedPieces: { whiteCaptured: string[]; blackCaptured: string[] };
    castlingRights: string;
    enPassant: string | null;
    moveNumber: number;
    halfMoveClock: number;
    playerWhoMoved?: 'w' | 'b'; // Track which player made the move that led to this state
    moveNotation?: string; // Track the move notation
    metadata?: any;
  }
  const [moveHistory, setMoveHistory] = useState<GameSnapshot[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [shieldRewindActive, setShieldRewindActive] = useState(false);
  const [showTurnRewound, setShowTurnRewound] = useState(false);
  const [whiteShields, setWhiteShields] = useState(0);
  const [blackShields, setBlackShields] = useState(0);
  const [chronoChipActive, setChronoChipActive] = useState(false);
  const [chronoChipTarget, setChronoChipTarget] = useState<'w' | 'b' | null>(null);
  const [showTimeBonus, setShowTimeBonus] = useState(false);
  const [freezeClockActive, setFreezeClockActive] = useState(false);
  const [freezeClockTarget, setFreezeClockTarget] = useState<'w' | 'b' | null>(null);
  const [showTimeDrain, setShowTimeDrain] = useState(false);
  const [pieceSwapActive, setPieceSwapActive] = useState(false);
  const [pieceSwapTarget, setPieceSwapTarget] = useState<'w' | 'b' | null>(null);
  const [swapSelectedPieces, setSwapSelectedPieces] = useState<{ first: Square | null; second: Square | null }>({ first: null, second: null });
  const [swapAnimationActive, setSwapAnimationActive] = useState(false);
  const isSwappingRef = useRef(false);
  const [pieceSwapNonce, setPieceSwapNonce] = useState(0);
  const [pieceSwapActivatedNonce, setPieceSwapActivatedNonce] = useState<number | null>(null);
  const [doubleMoveActive, setDoubleMoveActive] = useState(false);
  const [doubleMoveTarget, setDoubleMoveTarget] = useState<'w' | 'b' | null>(null);
  const [doubleMoveCount, setDoubleMoveCount] = useState(0);
  const [doubleMoveActivated, setDoubleMoveActivated] = useState(false);
  const [empoweredPiece, setEmpoweredPiece] = useState<{ square: Square; player: 'w' | 'b'; pieceType?: string } | null>(null);
  const [showPowerCapture, setShowPowerCapture] = useState(false);
  const [powerCaptureSquare, setPowerCaptureSquare] = useState<Square | null>(null);
  const [showEmpowerNotification, setShowEmpowerNotification] = useState(false);

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
        { type: "package_drop", data: dropInfo , timestamp: new Date() },
      ]);
    };

    arena.onImmediateItemDrop = (data) => {
      console.log("Immediate item drop:", data);
      const itemData = data?.item || data;
      const packageData = data?.package || data;
      const itemName =
        itemData?.name || packageData?.name || data?.itemName || "Unknown Item";
      const itemImage =
        itemData?.image || packageData?.image || data?.item?.image;
      const purchaserUsername = data?.purchaserUsername || "Unknown";
      const targetPlayerName = data?.targetPlayerName || "Unknown";
      const targetNameLower = targetPlayerName.toLowerCase?.() || targetPlayerName;
      const isTargetWhite = targetNameLower === "white" || targetNameLower === "w";
      const isTargetBlack = targetNameLower === "black" || targetNameLower === "b";
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

      // Add Shield to the target player if item is "Shield Move"
      if (itemName === "Shield Move") {
        let updatedWhite = whiteShields;
        let updatedBlack = blackShields;
        
        if (isTargetWhite) {
          updatedWhite = whiteShields + 1;
          setWhiteShields(updatedWhite);
          // Also activate perk if current player is white
          if (playerColor === 'w') {
            activatePerk("1 shield (undo)");
          }
        } else if (isTargetBlack) {
          updatedBlack = blackShields + 1;
          setBlackShields(updatedBlack);
          // Also activate perk if current player is black
          if (playerColor === 'b') {
            activatePerk("1 shield (undo)");
          }
        }
        
        // Sync shield counts so both players see the button/notification
        syncArenaStateToDB({
          whiteShields: updatedWhite,
          blackShields: updatedBlack,
        });
        
        toast({
          title: "Shield Received!",
          description: `${targetPlayerName} received a Shield Move power-up`,
        });
      }

      // Handle Chrono Chip - adds +10 seconds to target player's timer
      if (itemName === "Chrono Chip" && gameId && game) {
        const targetColor = targetPlayerName === "White" ? 'w' : 'b';
        
        // Activate visual effects
        setChronoChipActive(true);
        setChronoChipTarget(targetColor);
        setShowTimeBonus(true);
        
        // Add 10 seconds to the target player's timer
        const timeField = targetColor === 'w' ? 'white_time_remaining' : 'black_time_remaining';
        const currentTime = game[timeField] || 0;
        const newTime = currentTime + 10;
        
        // Update database
        supabase
          .from('games')
          .update({
            [timeField]: newTime,
          })
          .eq('id', gameId)
          .then(() => {
            // Update local game state
            setGame((prev: any) => ({
              ...prev,
              [timeField]: newTime,
            }));
          });
        
        // Hide visual effects after animation
        setTimeout(() => {
          setChronoChipActive(false);
          setChronoChipTarget(null);
        }, 2000);
        
        setTimeout(() => {
          setShowTimeBonus(false);
        }, 1500);
      }

      // Handle Freeze Enemy Clock - drains 10 seconds from target player's timer
      if (itemName === "Freeze Enemy Clock" && gameId && game) {
        const targetColor = targetPlayerName === "White" ? 'w' : 'b';
        
        // Activate visual effects
        setFreezeClockActive(true);
        setFreezeClockTarget(targetColor);
        setShowTimeDrain(true);
        
        // Drain 10 seconds from the target player's timer (minimum 0)
        const timeField = targetColor === 'w' ? 'white_time_remaining' : 'black_time_remaining';
        const currentTime = game[timeField] || 0;
        const newTime = Math.max(0, currentTime - 10);
        
        // Update database
        supabase
          .from('games')
          .update({
            [timeField]: newTime,
          })
          .eq('id', gameId)
          .then(() => {
            // Update local game state
            setGame((prev: any) => ({
              ...prev,
              [timeField]: newTime,
            }));
          });
        
        // Hide visual effects after animation
        setTimeout(() => {
          setFreezeClockActive(false);
          setFreezeClockTarget(null);
        }, 2000);
        
        setTimeout(() => {
          setShowTimeDrain(false);
        }, 1500);
      }

      // Handle Piece Swap - allows target player to swap two of their pieces
      if (itemName === "Piece Swap" && gameId && game) {
        const targetColor = isTargetWhite ? 'w' : 'b';
        const newNonce = pieceSwapNonce + 1;
        const currentTurn = (game && game.current_turn) ? (game.current_turn as 'w' | 'b') : chess.turn();
        const shouldActivateNow = currentTurn === targetColor;
        
        // Reset any previous swap state before arming a new one
        isSwappingRef.current = false;
        setSwapSelectedPieces({ first: null, second: null });
        setPieceSwapActive(shouldActivateNow);
        setPieceSwapTarget(targetColor);
        setPieceSwapNonce(newNonce);
        setPieceSwapActivatedNonce(null);
        
        // Persist so both players see pending swap
        syncArenaStateToDB({
          pieceSwapTarget: targetColor,
          pieceSwapActive: shouldActivateNow, // if active immediately
          pieceSwapNonce: newNonce,
          pieceSwapActivatedNonce: shouldActivateNow ? newNonce : null,
        });
        
        // If it's already the target player's turn, activate swap mode immediately
        if (shouldActivateNow) {
          toast({
            title: "Piece Swap Active!",
            description: "Click on two of your pieces to swap their positions",
          });
        } else {
          toast({
            title: "Piece Swap Ready",
            description: `Piece swap will activate when ${targetPlayerName}'s turn begins`,
          });
        }
      }

      // Handle Double Move - allows target player to make 2 moves back-to-back
      if (itemName === "Double Move" && gameId && game) {
        const targetColor = targetPlayerName === "White" ? 'w' : 'b';
        
        // Set up double move for when it's the target player's turn
        setDoubleMoveTarget(targetColor);
        setDoubleMoveCount(0);
        
        // If it's already the target player's turn, activate immediately
        if (chess.turn() === targetColor) {
          setDoubleMoveActive(true);
          setDoubleMoveActivated(true);
          toast({
            title: "Double Move Activated!",
            description: "You can now make 2 moves in a row",
          });
        } else {
          toast({
            title: "Double Move Ready",
            description: `Double move will activate when ${targetPlayerName}'s turn begins`,
          });
        }
      }

      // Handle Piece Empower - empowers a random piece of OPPONENT (so target player can capture it)
      if (itemName === "Piece Empower" && gameId && game) {
        const targetColor = targetPlayerName === "White" ? 'w' : 'b';
        const opponentColor = targetColor === 'w' ? 'b' : 'w'; // Empower opponent's piece so target can capture it
        
        // Find all pieces of the OPPONENT (so target player can capture them)
        const board = chess.board();
        const opponentPieces: Array<{ square: Square; pieceType: string }> = [];
        
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece && piece.color === opponentColor) {
              // Convert rank/file to square notation (a1-h8)
              const square = `${String.fromCharCode(97 + file)}${8 - rank}` as Square;
              opponentPieces.push({ square, pieceType: piece.type });
            }
          }
        }
        
        if (opponentPieces.length > 0) {
          // Select a random piece from opponent
          const randomIndex = Math.floor(Math.random() * opponentPieces.length);
          const selectedPiece = opponentPieces[randomIndex];
          
          setEmpoweredPiece({ 
            square: selectedPiece.square, 
            player: opponentColor,
            pieceType: selectedPiece.pieceType 
          });
          
          // Show notification for 2 seconds
          setShowEmpowerNotification(true);
          setTimeout(() => {
            setShowEmpowerNotification(false);
          }, 2000);
          
          // Sync empowered piece to database so both players can see it
          syncArenaStateToDB({
            empoweredPiece: { 
              square: selectedPiece.square, 
              player: opponentColor,
              pieceType: selectedPiece.pieceType 
            },
          });
          
          toast({
            title: "Piece Empowered!",
            description: `${targetPlayerName === "White" ? "Black" : "White"}'s piece is empowered. Capture it to gain +20 seconds!`,
          });
        } else {
          toast({
            title: "No Pieces Available",
            description: "Cannot empower - no opponent pieces found",
            variant: "destructive",
          });
        }
      }

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
                // Skip update if we're currently performing a swap
                if (isSwappingRef.current) {
                  return;
                }
                
                // Skip update if double move is active and it's the target player's turn
                // (they're making consecutive moves, handled locally)
                if (doubleMoveActive && doubleMoveTarget && newGame.current_turn === doubleMoveTarget) {
                  // This is the player making their second move in double move mode
                  // We handle this locally, so skip the real-time update to avoid conflicts
                  return;
                }
                
                // Check if opponent made a move (and if they're frozen, reject it)
                if (freezeOpponent && newGame.current_turn === playerColor && chess.turn() !== playerColor) {
                  // Opponent tried to move while frozen - revert the board state
                  toast({
                    title: "Opponent Frozen!",
                    description: "Opponent's move was blocked due to freeze effect",
                  });
                  return; // Don't update the board
                }
                
                // Check if this is a new move (board state changed)
                const previousFen = chess.fen();
                
                // Only create snapshot if board actually changed (opponent made a move)
                if (previousFen !== newGame.board_state) {
                  // Create snapshot BEFORE opponent's move (using current state)
                  const opponentColor = chess.turn(); // Current turn is the opponent's color
                  const preMoveSnapshot = createGameSnapshot(chess, opponentColor);
                  
                  // Now load the new board state (after opponent's move)
                  chess.load(newGame.board_state);
                  const newFen = chess.fen();
                  
                  // Update captured pieces after move
                  const captured = calculateCapturedPieces(chess);
                  setWhiteCaptured(captured.whiteCaptured);
                  setBlackCaptured(captured.blackCaptured);
                  
                  // Update empowered piece if opponent moved it (for ALL players)
                  // First, sync from database state to ensure both players see the same empowered piece
                  if (newGame.arena_state) {
                    try {
                      const arenaState = typeof newGame.arena_state === 'string' 
                        ? JSON.parse(newGame.arena_state) 
                        : newGame.arena_state;
                      
                      if (arenaState.empoweredPiece !== undefined) {
                        // Sync empowered piece from database (this ensures both players see it)
                        setEmpoweredPiece(arenaState.empoweredPiece);
                      }
                    } catch (e) {
                      console.error('Error parsing arena state for empowered piece:', e);
                    }
                  }
                  
                  // Also try to find the piece if we have local state but it's not at the square
                  // This is a fallback to ensure the piece is tracked correctly
                  if (empoweredPiece) {
                    const pieceAtSquare = chess.get(empoweredPiece.square);
                    if (!pieceAtSquare || 
                        pieceAtSquare.color !== empoweredPiece.player ||
                        (empoweredPiece.pieceType && pieceAtSquare.type !== empoweredPiece.pieceType)) {
                      // Piece is no longer at that square - find it on the board
                      const board = chess.board();
                      let foundSquare: Square | null = null;
                      
                      for (let rank = 0; rank < 8; rank++) {
                        for (let file = 0; file < 8; file++) {
                          const piece = board[rank][file];
                          if (piece && 
                              piece.color === empoweredPiece.player && 
                              (!empoweredPiece.pieceType || piece.type === empoweredPiece.pieceType)) {
                            const square = `${String.fromCharCode(97 + file)}${8 - rank}` as Square;
                            foundSquare = square;
                            break;
                          }
                        }
                        if (foundSquare) break;
                      }
                      
                      if (foundSquare && foundSquare !== empoweredPiece.square) {
                        // Update to new square
                        const updatedEmpoweredPiece = { 
                          square: foundSquare, 
                          player: empoweredPiece.player,
                          pieceType: empoweredPiece.pieceType 
                        };
                        setEmpoweredPiece(updatedEmpoweredPiece);
                        syncArenaStateToDB({
                          empoweredPiece: updatedEmpoweredPiece,
                        });
                      } else if (!foundSquare) {
                        // Piece not found - it was captured
                        setEmpoweredPiece(null);
                        syncArenaStateToDB({
                          empoweredPiece: null,
                        });
                      }
                    }
                  }
                  
                  // Save pre-move snapshot (this is what we'll restore to when undoing)
                  setMoveHistory((prev) => {
                    const updated = [...prev, preMoveSnapshot];
                    console.log('Added opponent move snapshot to history:', {
                      opponentColor: opponentColor,
                      historyLength: updated.length,
                      snapshots: updated.map((s, i) => ({
                        index: i,
                        player: s.playerWhoMoved,
                        move: s.moveNotation
                      }))
                    });
                    // Store in localStorage as backup
                    const historyKey = `moveHistory_${gameId}`;
                    try {
                      localStorage.setItem(historyKey, JSON.stringify(updated));
                    } catch (e) {
                      console.error('Error storing history in localStorage:', e);
                    }
                    return updated;
                  });
                  
                  setPosition(newFen);
                }
              }
              
              // Sync arena state from database (for ALL players, not just non-creator)
              if (newGame.arena_state) {
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
                  if (arenaState.pieceSwapTarget !== undefined) {
                    setPieceSwapTarget(arenaState.pieceSwapTarget);
                  }
                  if (arenaState.pieceSwapActive !== undefined) {
                    setPieceSwapActive(arenaState.pieceSwapActive);
                  }
                  // If a swap is armed for the target color and it's now that turn, auto-activate
                  const liveTurn = newGame.current_turn || chess.turn();
                  if (
                    arenaState.pieceSwapTarget &&
                    liveTurn === arenaState.pieceSwapTarget &&
                    !pieceSwapActive
                  ) {
                    setPieceSwapActive(true);
                  }
                  if (arenaState.currentCycle) {
                    setCurrentCycle(arenaState.currentCycle);
                  }
                  if (arenaState.lastBoost) {
                    setLastBoost(arenaState.lastBoost);
                  }
                  if (arenaState.lastDrop) {
                    setLastDrop(arenaState.lastDrop);
                    // If shield counts are missing but lastDrop is Shield Move, ensure we mirror counts
                    const drop = arenaState.lastDrop;
                    const dropName = drop?.itemName?.toLowerCase?.() || drop?.itemName;
                    const dropTarget = drop?.targetPlayerName?.toLowerCase?.() || drop?.targetPlayerName;
                    if (dropName === "shield move") {
                      if (dropTarget === "white" || dropTarget === "w") {
                        if (arenaState.whiteShields !== undefined) {
                          setWhiteShields(arenaState.whiteShields);
                        } else {
                          setWhiteShields((prev) => Math.max(prev, 1));
                        }
                      } else if (dropTarget === "black" || dropTarget === "b") {
                        if (arenaState.blackShields !== undefined) {
                          setBlackShields(arenaState.blackShields);
                        } else {
                          setBlackShields((prev) => Math.max(prev, 1));
                        }
                      }
                    }
          // If last drop was Piece Swap, also hydrate swap state so both sides see it
          if (dropName === "piece swap") {
            if (arenaState.pieceSwapTarget !== undefined) {
              setPieceSwapTarget(arenaState.pieceSwapTarget);
            }
            if (arenaState.pieceSwapActive !== undefined) {
              setPieceSwapActive(arenaState.pieceSwapActive);
            }
          }
                  }
                  if (arenaState.whiteShields !== undefined) {
                    setWhiteShields(arenaState.whiteShields);
                  }
                  if (arenaState.blackShields !== undefined) {
                    setBlackShields(arenaState.blackShields);
                  }
                  if (arenaState.streamUrl) {
                    setStreamUrl(arenaState.streamUrl);
                  }
                  // Sync empowered piece state (for ALL players)
                  if (arenaState.empoweredPiece !== undefined) {
                    setEmpoweredPiece(arenaState.empoweredPiece);
                  }
                  
                  // Ensure item drop notifications show for both players
                  if (arenaState.lastDrop && arenaState.lastDrop.type === "immediate_item_drop") {
                    const drop = arenaState.lastDrop;
                    setNotification({
                      type: "item",
                      itemName: drop.itemName || "Unknown Item",
                      cost: drop.cost || 0,
                      targetPlayerName: drop.targetPlayerName || "Unknown",
                      purchaserName: drop.purchaserUsername || drop.purchaserName || "Viewer",
                    });
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

    // Calculate captured pieces for current position
    const captured = calculateCapturedPieces(chess);
    setWhiteCaptured(captured.whiteCaptured);
    setBlackCaptured(captured.blackCaptured);

    // Load move history from localStorage if available, otherwise create initial snapshot
    const historyKey = `moveHistory_${gameId}`;
    try {
      const storedHistory = localStorage.getItem(historyKey);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as GameSnapshot[];
        // Ensure we have at least the initial snapshot
        if (parsedHistory.length > 0) {
          setMoveHistory(parsedHistory);
          console.log('Loaded move history from localStorage:', parsedHistory.length, 'snapshots');
        } else {
          // Empty array - create initial snapshot
          const initialSnapshot = createGameSnapshot(chess);
          setMoveHistory([initialSnapshot]);
          localStorage.setItem(historyKey, JSON.stringify([initialSnapshot]));
          console.log('Created initial snapshot (empty history found)');
        }
      } else {
        // Create initial snapshot (starting position)
        const initialSnapshot = createGameSnapshot(chess);
        setMoveHistory([initialSnapshot]);
        localStorage.setItem(historyKey, JSON.stringify([initialSnapshot]));
        console.log('Created initial snapshot (no history found)');
      }
    } catch (e) {
      console.error('Error loading move history from localStorage:', e);
      // Create initial snapshot as fallback
      const initialSnapshot = createGameSnapshot(chess);
      setMoveHistory([initialSnapshot]);
      try {
        localStorage.setItem(historyKey, JSON.stringify([initialSnapshot]));
      } catch (e2) {
        console.error('Error saving initial snapshot:', e2);
      }
    }

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
        if (arenaState.pieceSwapTarget !== undefined) {
          setPieceSwapTarget(arenaState.pieceSwapTarget);
        }
        if (arenaState.pieceSwapActive !== undefined) {
          setPieceSwapActive(arenaState.pieceSwapActive);
        }
        if (arenaState.pieceSwapNonce !== undefined) {
          setPieceSwapNonce(arenaState.pieceSwapNonce);
        }
        if (arenaState.pieceSwapActivatedNonce !== undefined) {
          setPieceSwapActivatedNonce(arenaState.pieceSwapActivatedNonce);
        }
        if (arenaState.pieceSwapActivatedNonce !== undefined) {
          setPieceSwapActivatedNonce(arenaState.pieceSwapActivatedNonce);
        }
        // If swap is armed and it's currently that turn, activate it
        const liveTurn = data.current_turn || chess.turn();
        if (
          arenaState.pieceSwapTarget &&
          liveTurn === arenaState.pieceSwapTarget &&
          !pieceSwapActive
        ) {
          setPieceSwapActive(true);
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
        if (arenaState.whiteShields !== undefined) {
          setWhiteShields(arenaState.whiteShields);
        }
        if (arenaState.blackShields !== undefined) {
          setBlackShields(arenaState.blackShields);
        }
        if (arenaState.streamUrl) {
          setStreamUrl(arenaState.streamUrl);
        }
        // Sync empowered piece state
        if (arenaState.empoweredPiece !== undefined) {
          setEmpoweredPiece(arenaState.empoweredPiece);
        }
        // Show item drop notification for both players when syncing state
        if (arenaState.lastDrop && arenaState.lastDrop.type === "immediate_item_drop") {
          const drop = arenaState.lastDrop;
          setNotification({
            type: "item",
            itemName: drop.itemName || "Unknown Item",
            cost: drop.cost || 0,
            targetPlayerName: drop.targetPlayerName || "Unknown",
            purchaserName: drop.purchaserUsername || drop.purchaserName || "Viewer",
          });
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
      
      // Calculate captured pieces
      const captured = calculateCapturedPieces(chess);
      setWhiteCaptured(captured.whiteCaptured);
      setBlackCaptured(captured.blackCaptured);
    }
  };

  // Calculate captured pieces for a given chess instance
  const calculateCapturedPieces = (gameInstance: Chess) => {
    const startingPieces = {
      'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1
    };
    
    const currentPieces = gameInstance.board().flat().filter(p => p !== null);
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
    
    return {
      whiteCaptured: whiteCapturedPieces,
      blackCaptured: blackCapturedPieces,
    };
  };

  // Create a full game snapshot for Shield power-up
  const createGameSnapshot = (gameInstance: Chess, playerWhoMoved?: 'w' | 'b', moveNotation?: string): GameSnapshot => {
    const fen = gameInstance.fen();
    const fenParts = fen.split(' ');
    
    // Parse captured pieces
    const captured = calculateCapturedPieces(gameInstance);
    
    return {
      fen: fen,
      activeColor: fenParts[1] === 'w' ? 'w' : 'b',
      capturedPieces: {
        whiteCaptured: captured.whiteCaptured,
        blackCaptured: captured.blackCaptured,
      },
      castlingRights: fenParts[2] || '-',
      enPassant: fenParts[3] === '-' ? null : fenParts[3],
      moveNumber: parseInt(fenParts[5]) || 1,
      halfMoveClock: parseInt(fenParts[4]) || 0,
      playerWhoMoved: playerWhoMoved,
      moveNotation: moveNotation,
      metadata: {
        timestamp: Date.now(),
      },
    };
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

  // Activate piece swap when it's the target player's turn (for both colors)
  useEffect(() => {
    const currentTurn = (game && game.current_turn) ? (game.current_turn as 'w' | 'b') : chess.turn();
    if (pieceSwapTarget && currentTurn === pieceSwapTarget) {
      // Only activate once per drop (nonce)
      if (!pieceSwapActive || pieceSwapActivatedNonce !== pieceSwapNonce) {
        setPieceSwapActive(true);
        setPieceSwapActivatedNonce(pieceSwapNonce);
        syncArenaStateToDB({ pieceSwapActive: true, pieceSwapTarget, pieceSwapActivatedNonce: pieceSwapNonce });
        toast({
          title: "Piece Swap Active!",
          description: "Click on two of your pieces to swap their positions",
        });
      }
    }
  }, [game?.current_turn, pieceSwapTarget, pieceSwapActive, pieceSwapNonce, pieceSwapActivatedNonce, syncArenaStateToDB, chess]);

  // Activate double move when it's the target player's turn
  useEffect(() => {
    if (doubleMoveTarget && !doubleMoveActive && chess.turn() === doubleMoveTarget && doubleMoveCount === 0) {
      // It's now the target player's turn, activate double move
      setDoubleMoveActive(true);
      setDoubleMoveActivated(true);
      toast({
        title: "Double Move Activated!",
        description: "You can now make 2 moves in a row",
      });
    }
  }, [chess.turn(), doubleMoveTarget, doubleMoveActive, doubleMoveCount]);

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
    
    // Handle piece swap selection
    if (pieceSwapActive && pieceSwapTarget === playerColor && currentTurn === playerColor) {
      const piece = chess.get(square);
      
      // Only allow selecting own pieces
      if (!piece || piece.color !== playerColor) {
        toast({
          title: "Invalid Selection",
          description: "You can only swap your own pieces",
          variant: "destructive",
        });
        return;
      }
      // Disallow swapping kings
      if ((piece.type as string) === 'k') {
        toast({
          title: "Cannot Swap King",
          description: "Kings cannot be swapped",
          variant: "destructive",
        });
        return;
      }
      
      // First piece selection
      if (!swapSelectedPieces.first) {
        setSwapSelectedPieces({ first: square, second: null });
        toast({
          title: "First Piece Selected",
          description: "Now click on another piece to swap",
        });
        return;
      }
      
      // Second piece selection
      if (swapSelectedPieces.first === square) {
        // Clicked the same piece, deselect
        setSwapSelectedPieces({ first: null, second: null });
        return;
      }
      // Disallow swapping with a king on the second selection
      if ((piece.type as string) === 'k') {
        toast({
          title: "Cannot Swap King",
          description: "Kings cannot be swapped",
          variant: "destructive",
        });
        return;
      }
      
      // Both pieces selected, perform swap
      setSwapSelectedPieces({ first: swapSelectedPieces.first, second: square });
      performPieceSwap(swapSelectedPieces.first, square);
      return;
    }
    
    // Normal move logic - prevent if swap is active
    if (pieceSwapActive && pieceSwapTarget === playerColor) {
      toast({
        title: "Complete Piece Swap First",
        description: "You must swap two pieces before making a move",
        variant: "destructive",
      });
      return;
    }
    
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

  const performPieceSwap = useCallback(async (square1: Square, square2: Square) => {
    if (!game || !gameId) return;
    
    const piece1 = chess.get(square1);
    const piece2 = chess.get(square2);
    
    if (!piece1 || !piece2) return;
    // Disallow swapping kings (guard in case selection check missed)
    if ((piece1.type as string) === 'k' || (piece2.type as string) === 'k') {
      toast({
        title: "Cannot Swap King",
        description: "Kings cannot be swapped",
        variant: "destructive",
      });
      setPieceSwapActive(false);
      setPieceSwapTarget(null);
      setSwapSelectedPieces({ first: null, second: null });
      return;
    }
    
    // Set flag to prevent real-time updates from overwriting
    isSwappingRef.current = true;
    
    // Activate swap animation
    setSwapAnimationActive(true);
    
    // Wait for animation, then perform swap
    setTimeout(async () => {
      try {
        // Get current FEN and board state
        const currentFen = chess.fen();
        const fenParts = currentFen.split(' ');
        const boardFen = fenParts[0];
        
        // Convert board FEN to 2D array representation
        const ranks = boardFen.split('/');
        const board: (string | null)[][] = [];
        
        // Parse FEN ranks (from rank 8 to rank 1)
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          const rankStr = ranks[rankIdx];
          const row: (string | null)[] = [];
          
          for (let i = 0; i < rankStr.length; i++) {
            const char = rankStr[i];
            if (char >= '1' && char <= '8') {
              // Empty squares
              const count = parseInt(char);
              for (let j = 0; j < count; j++) {
                row.push(null);
              }
            } else {
              // Piece (uppercase = white, lowercase = black)
              row.push(char);
            }
          }
          
          // Ensure row has exactly 8 squares
          while (row.length < 8) {
            row.push(null);
          }
          board.push(row);
        }
        
        // Convert squares to board coordinates
        // FEN rank 8 is board[0], rank 1 is board[7]
        const file1 = square1.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank1 = 8 - parseInt(square1[1]); // rank 8 = 0, rank 1 = 7
        const file2 = square2.charCodeAt(0) - 97;
        const rank2 = 8 - parseInt(square2[1]);
        
        // Swap pieces on the board
        const temp = board[rank1][file1];
        board[rank1][file1] = board[rank2][file2];
        board[rank2][file2] = temp;
        
        // Convert board back to FEN notation
        let newBoardFen = '';
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          let emptyCount = 0;
          for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
            const piece = board[rankIdx][fileIdx];
            if (piece === null) {
              emptyCount++;
            } else {
              if (emptyCount > 0) {
                newBoardFen += emptyCount.toString();
                emptyCount = 0;
              }
              newBoardFen += piece;
            }
          }
          if (emptyCount > 0) {
            newBoardFen += emptyCount.toString();
          }
          if (rankIdx < 7) {
            newBoardFen += '/';
          }
        }
        
        // After a swap, the swapping player's turn is consumed
        const swapperColor = pieceSwapTarget || playerColor || (fenParts[1] === 'w' ? 'w' : 'b');
        const nextTurn = swapperColor === 'w' ? 'b' : 'w';
        
        // Construct new FEN with turn handed to the opponent
        const newFen = `${newBoardFen} ${nextTurn} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
        
        console.log('Performing piece swap:', {
          square1,
          square2,
          piece1: `${piece1.color}${piece1.type}`,
          piece2: `${piece2.color}${piece2.type}`,
          oldFen: currentFen,
          newFen,
        });
        
        // Validate FEN before loading
        try {
          const testChess = new Chess(newFen);
          // If validation passes, use the new FEN
          
          // Load the new position into main chess instance
          chess.load(newFen);
          setPosition(newFen);
          
          // Update database immediately - this will trigger real-time update, but flag prevents overwrite
          const { error: updateError } = await supabase
            .from('games')
            .update({
              board_state: newFen,
              current_turn: nextTurn,
            })
            .eq('id', gameId);
          
          if (updateError) {
            console.error('Error updating board state:', updateError);
            toast({
              title: "Error",
              description: "Failed to save swap to database",
              variant: "destructive",
            });
            // Revert on error
            chess.load(currentFen);
            setPosition(currentFen);
            isSwappingRef.current = false;
          } else {
            console.log('Swap saved successfully to database');
            
            // Update local game state to match
            setGame((prev: any) => ({
              ...prev,
              board_state: newFen,
              current_turn: nextTurn,
            }));
            
            // Clear swap state
            setPieceSwapActive(false);
            setPieceSwapTarget(null);
            setSwapSelectedPieces({ first: null, second: null });
            // Sync cleared swap state so both players stop seeing the prompt
            syncArenaStateToDB({
              pieceSwapActive: false,
              pieceSwapTarget: null,
            });
            isSwappingRef.current = false;
            
            toast({
              title: "Pieces Swapped!",
              description: "You can now make your move",
            });
            
            // Keep flag set for a bit longer to prevent real-time overwrite
            setTimeout(() => {
              isSwappingRef.current = false;
              console.log('Swap flag cleared, real-time updates re-enabled');
            }, 2000);
          }
        } catch (fenError) {
          console.error('Invalid FEN after swap:', fenError, { newFen });
          toast({
            title: "Swap Failed",
            description: "Invalid board state after swap",
            variant: "destructive",
          });
          // Revert on error
          chess.load(currentFen);
          setPosition(currentFen);
          isSwappingRef.current = false;
        }
      } catch (error) {
        console.error('Error performing swap:', error);
        toast({
          title: "Swap Failed",
          description: "An error occurred during swap",
          variant: "destructive",
        });
        isSwappingRef.current = false;
      } finally {
        // Animation cleanup
        setTimeout(() => {
          setSwapAnimationActive(false);
        }, 500);
      }
    }, 1500); // Wait for animation to complete
  }, [chess, game, gameId, toast, setGame]);

  const makeMove = (sourceSquare: Square, targetSquare: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q') => {
    if (!game || !playerColor) {
      console.log('Cannot move: game or playerColor not set', { game: !!game, playerColor });
      return;
    }
    
    // Prevent moves if piece swap is active
    if (pieceSwapActive && pieceSwapTarget === playerColor) {
      toast({
        title: "Complete Piece Swap First",
        description: "You must swap two pieces before making a move",
        variant: "destructive",
      });
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

    // Create snapshot BEFORE the move (so we can undo to this state)
    // This snapshot represents the state before the current player's move
    const preMoveSnapshot = createGameSnapshot(chess, playerColor);

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
    let newFen = chess.fen();
    
    // Handle double move - keep turn the same after first move
    const isDoubleMoveActive = doubleMoveActive && doubleMoveTarget === playerColor;
    if (isDoubleMoveActive && doubleMoveCount === 0) {
      // First move of double move - modify FEN to keep turn the same
      const fenParts = newFen.split(' ');
      // Keep the active color as the same player
      newFen = `${fenParts[0]} ${playerColor} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
      // Reload chess with modified FEN to keep turn
      chess.load(newFen);
    }
    
    // Check if empowered piece was CAPTURED
    // We check if the captured piece matches the empowered piece (by type and color)
    if (empoweredPiece && move.captured) {
      const capturedPieceType = move.captured; // Type of captured piece
      const capturedPieceColor = move.color === 'w' ? 'b' : 'w'; // Captured piece is opposite color
      
      // Check if this matches our empowered piece
      if (capturedPieceColor === empoweredPiece.player && 
          (!empoweredPiece.pieceType || capturedPieceType === empoweredPiece.pieceType)) {
        // Empowered piece was captured - grant time bonus to the capturing player
        const timeField = playerColor === 'w' ? 'white_time_remaining' : 'black_time_remaining';
        const currentTime = game[timeField] || 0;
        const newTime = currentTime + 20; // +20 seconds as specified
        
        // Show power capture effect
        setShowPowerCapture(true);
        setPowerCaptureSquare(targetSquare);
        
        // Show +20s notification on clock (similar to Chrono Chip)
        setChronoChipActive(true);
        setChronoChipTarget(playerColor);
        setShowTimeBonus(true);
        
        // Update database
        supabase
          .from('games')
          .update({
            [timeField]: newTime,
          })
          .eq('id', gameId)
          .then(() => {
            // Update local game state
            setGame((prev: any) => ({
              ...prev,
              [timeField]: newTime,
            }));
          });
        
        // Clear empowered piece after capture (effect consumed)
        setEmpoweredPiece(null);
        
        // Sync cleared empowered piece to database
        syncArenaStateToDB({
          empoweredPiece: null,
        });
        
        // Hide effects after animation
        setTimeout(() => {
          setShowPowerCapture(false);
          setPowerCaptureSquare(null);
          setChronoChipActive(false);
          setChronoChipTarget(null);
        }, 2000);
        
        setTimeout(() => {
          setShowTimeBonus(false);
        }, 1500);
        
        toast({
          title: "Power Capture!",
          description: "+20 seconds added to your clock!",
        });
      }
    }
    
    // Update empowered piece square if it moved (not captured)
    // Track the piece by finding it on the board after the move
    if (empoweredPiece && !move.captured) {
      // Check if the empowered piece moved from its square
      if (sourceSquare === empoweredPiece.square) {
        // Piece moved to a new square - update the empowered square
        const updatedEmpoweredPiece = { 
          square: targetSquare, 
          player: empoweredPiece.player,
          pieceType: empoweredPiece.pieceType 
        };
        setEmpoweredPiece(updatedEmpoweredPiece);
        
        // Sync updated empowered piece to database
        syncArenaStateToDB({
          empoweredPiece: updatedEmpoweredPiece,
        });
      } else {
        // Check if empowered piece still exists at its square
        // If not, find it on the board by type and color
        setTimeout(() => {
          const pieceAtSquare = chess.get(empoweredPiece.square);
          if (!pieceAtSquare || 
              pieceAtSquare.color !== empoweredPiece.player ||
              (empoweredPiece.pieceType && pieceAtSquare.type !== empoweredPiece.pieceType)) {
            // Piece is no longer at that square - find it on the board
            const board = chess.board();
            let foundSquare: Square | null = null;
            
            for (let rank = 0; rank < 8; rank++) {
              for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece && 
                    piece.color === empoweredPiece.player && 
                    (!empoweredPiece.pieceType || piece.type === empoweredPiece.pieceType)) {
                  const square = `${String.fromCharCode(97 + file)}${8 - rank}` as Square;
                  foundSquare = square;
                  break;
                }
              }
              if (foundSquare) break;
            }
            
            if (foundSquare) {
              // Update to new square
              const updatedEmpoweredPiece = { 
                square: foundSquare, 
                player: empoweredPiece.player,
                pieceType: empoweredPiece.pieceType 
              };
              setEmpoweredPiece(updatedEmpoweredPiece);
              syncArenaStateToDB({
                empoweredPiece: updatedEmpoweredPiece,
              });
            } else {
              // Piece not found - it was captured
              setEmpoweredPiece(null);
              syncArenaStateToDB({
                empoweredPiece: null,
              });
            }
          }
        }, 100);
      }
    }
    
    setPosition(newFen);
    setLastMoveSquares({ from: sourceSquare, to: targetSquare });

    // Update captured pieces after move
    const captured = calculateCapturedPieces(chess);
    setWhiteCaptured(captured.whiteCaptured);
    setBlackCaptured(captured.blackCaptured);

    // Save pre-move snapshot (this is what we'll restore to when undoing)
    // Store it with player info and move notation for tracking
    const snapshotWithMove = {
      ...preMoveSnapshot,
      moveNotation: move.san,
    };
    setMoveHistory((prev) => {
      const updated = [...prev, snapshotWithMove];
      console.log('Added snapshot to history:', {
        move: move.san,
        player: playerColor,
        historyLength: updated.length,
        snapshots: updated.map((s, i) => ({
          index: i,
          player: s.playerWhoMoved,
          move: s.moveNotation
        }))
      });
      // Store in localStorage as backup
      const historyKey = `moveHistory_${gameId}`;
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Error storing history in localStorage:', e);
      }
      return updated;
    });

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

    // Handle double move logic
    let turnAfterMove = chess.turn(); // Default: normal turn change
    
    if (isDoubleMoveActive) {
      // Increment move count
      const newMoveCount = doubleMoveCount + 1;
      
      if (newMoveCount < 2) {
        // First move of double move - keep the turn the same
        turnAfterMove = playerColor; // Keep it as the same player's turn
        setDoubleMoveCount(newMoveCount);
        // Show flame effect
        setDoubleMoveActivated(true);
        setTimeout(() => {
          setDoubleMoveActivated(false);
        }, 2000);
      } else {
        // Second move completed - deactivate double move and change turn normally
        setDoubleMoveActive(false);
        setDoubleMoveTarget(null);
        setDoubleMoveCount(0);
        setDoubleMoveActivated(false);
        turnAfterMove = chess.turn(); // Normal turn change (opponent's turn)
      }
    }

    // Update game state async
    (async () => {
      try {
        const { error } = await supabase
          .from('games')
          .update({
            board_state: newFen,
            current_turn: turnAfterMove,
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

  const handleUndo = useCallback(async (clickedByColor?: 'w' | 'b') => {
    // Determine which player clicked the shield
    const shieldPlayerColor = clickedByColor || playerColor;
    
    if (!shieldPlayerColor || !game || !gameId) {
      toast({
        title: "Cannot Undo",
        description: "Unable to determine player",
        variant: "destructive",
      });
      return;
    }

    // Check if the player has shields available
    const playerShields = shieldPlayerColor === 'w' ? whiteShields : blackShields;
    if (playerShields === 0) {
      toast({
        title: "Cannot Undo",
        description: "No shield available",
        variant: "destructive",
      });
      return;
    }

    // Debug: Log current state
    console.log('Shield undo attempt:', {
      moveHistoryLength: moveHistory.length,
      chessHistoryLength: chess.history().length,
      currentTurn: chess.turn(),
      shieldPlayerColor,
      moveHistory: moveHistory.map((s, i) => ({
        index: i,
        player: s.playerWhoMoved,
        move: s.moveNotation,
        fen: s.fen.substring(0, 20) + '...'
      }))
    });

    // Edge case: Can't undo if no moves made
    // moveHistory should have at least 2 items: [initial, preMove1] to undo 1 move
    if (moveHistory.length <= 1) {
      toast({
        title: "Cannot Undo",
        description: `No moves to undo (history length: ${moveHistory.length})`,
        variant: "destructive",
      });
      return;
    }

    // Determine how many moves to undo based on activeColor (whose turn it is now)
    const activeColor = chess.turn();
    let movesToUndo: number;

    if (activeColor === 'b') {
      // Black's turn: White just moved, Black hasn't moved yet this turn
      // Undo exactly 1 move (White's last move)
      movesToUndo = 1;
    } else {
      // White's turn: Both players already moved this turn (White then Black)
      // Undo exactly 2 moves (both players' moves)
      movesToUndo = 2;
    }
    
    // After undo, it should be the turn of the player who clicked the shield
    const finalTurnColor = shieldPlayerColor;

    // Structure: [initial(0), preMove1(1), preMove2(2), ...]
    // Each snapshot is a pre-move snapshot, so to undo N moves, we go back N snapshots
    // But we need to keep the initial snapshot (index 0)
    const targetIndex = moveHistory.length - movesToUndo - 1; // -1 because we want the snapshot BEFORE the moves

    // Check if we have enough snapshots
    // Need: initial(1) + movesToUndo snapshots = movesToUndo + 1 total
    if (moveHistory.length < movesToUndo + 1) {
      toast({
        title: "Cannot Undo",
        description: `Not enough moves to undo. Need ${movesToUndo + 1} snapshots, have ${moveHistory.length}`,
        variant: "destructive",
      });
      return;
    }

    // Find the target snapshot
    // If targetIndex is less than 0, use initial snapshot (index 0)
    const targetSnapshot = moveHistory[Math.max(0, targetIndex)];

    // Decrease shield count for the player who clicked
    let updatedWhite = whiteShields;
    let updatedBlack = blackShields;
    if (shieldPlayerColor === 'w') {
      updatedWhite = Math.max(0, whiteShields - 1);
      setWhiteShields(updatedWhite);
    } else {
      updatedBlack = Math.max(0, blackShields - 1);
      setBlackShields(updatedBlack);
    }
    // Sync shield counts after use so both players stay in sync
    syncArenaStateToDB({
      whiteShields: updatedWhite,
      blackShields: updatedBlack,
    });

    // Also use shield from perk system if available
    if (shieldUses > 0) {
      useShield();
    }

    // Activate rewind animation
    setShieldRewindActive(true);
    setShowTurnRewound(true);

    // Restore game state from snapshot
    chess.load(targetSnapshot.fen);
    
    // Ensure the turn is set correctly (should be the turn of the player who clicked shield)
    // Create a new FEN with the correct turn
    const fenParts = targetSnapshot.fen.split(' ');
    const adjustedFen = `${fenParts[0]} ${finalTurnColor} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
    chess.load(adjustedFen);
    setPosition(adjustedFen);
    
    // Restore captured pieces
    setWhiteCaptured(targetSnapshot.capturedPieces.whiteCaptured);
    setBlackCaptured(targetSnapshot.capturedPieces.blackCaptured);

    // Update move history (remove undone snapshots)
    setMoveHistory((prev) => {
      // Keep everything up to and including the target snapshot
      const updated = prev.slice(0, Math.max(0, targetIndex) + 1);
      // Update localStorage
      const historyKey = `moveHistory_${gameId}`;
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Error storing history in localStorage:', e);
      }
      return updated;
    });

    // Update database - remove undone moves
    const { data: movesToDelete } = await supabase
      .from('moves')
      .select('id')
      .eq('game_id', gameId)
      .order('move_number', { ascending: false })
      .limit(movesToUndo);

    if (movesToDelete && movesToDelete.length > 0) {
      for (const move of movesToDelete) {
        await supabase.from('moves').delete().eq('id', move.id);
      }
    }

    // Update board state in database with correct turn
    await supabase
      .from('games')
      .update({
        board_state: adjustedFen,
        current_turn: finalTurnColor,
      })
      .eq('id', gameId);

    // Reload moves list
    const { data: movesData } = await supabase
      .from('moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });
    
    if (movesData) {
      setMoves(movesData);
    }

    // Hide "TURN REWOUND" text after 0.5s
    setTimeout(() => {
      setShowTurnRewound(false);
    }, 500);

    // Hide rewind animation after 1s
    setTimeout(() => {
      setShieldRewindActive(false);
    }, 1000);

    toast({
      title: "Turn Rewound",
      description: `${movesToUndo} move${movesToUndo > 1 ? 's' : ''} undone. ${shieldPlayerColor === 'w' ? 'White' : 'Black'}'s turn.`,
    });
  }, [whiteShields, blackShields, shieldUses, useShield, game, playerColor, gameId, moveHistory, chess, toast]);

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

  // Show disconnect button when arena is connected (regardless of status, except completed/stopped)
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
              <div className={`relative ${
                chronoChipActive && chronoChipTarget === (playerColor === 'b' ? 'w' : 'b') ? 'animate-[clockPulse_0.5s_ease-in-out_2]' : ''
              } ${
                freezeClockActive && freezeClockTarget === (playerColor === 'b' ? 'w' : 'b') ? 'animate-[clockFreeze_1s_ease-in-out]' : ''
              }`}>
                <PlayerCard
                  color={playerColor === 'b' ? 'white' : 'black'}
                  timeRemaining={playerColor === 'b' ? game.white_time_remaining : game.black_time_remaining}
                  isActive={game.current_turn !== playerColor}
                  capturedPieces={playerColor === 'w' ? whiteCaptured : blackCaptured}
                  shieldCount={playerColor === 'b' ? whiteShields : blackShields}
                  onShieldClick={undefined} // Opponent cannot trigger your shield
                />
                {/* Double Move ×2 Badge for opponent */}
                {doubleMoveActive && doubleMoveTarget === (playerColor === 'b' ? 'w' : 'b') && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-xl px-3 py-1.5 rounded-lg border-2 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.8)] animate-pulse">
                      ×2
                    </div>
                  </div>
                )}
                {/* +10s notification for opponent */}
                {showTimeBonus && chronoChipTarget === (playerColor === 'b' ? 'w' : 'b') && (
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 translate-x-full z-[60] pointer-events-none">
                    <div className="animate-[timeBonusPop_1.5s_ease-out_forwards] ml-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-2xl tracking-wider px-4 py-2 rounded-lg border-2 border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.8)]">
                        +10s
                      </div>
                    </div>
                  </div>
                )}
                {/* -10s notification for opponent */}
                {showTimeDrain && freezeClockTarget === (playerColor === 'b' ? 'w' : 'b') && (
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 translate-x-full z-[60] pointer-events-none">
                    <div className="animate-[timeDrainPop_1.5s_ease-out_forwards] ml-4">
                      <div 
                        className="text-2xl font-black tracking-wider px-4 py-2 rounded-lg border-2 shadow-[0_0_20px_rgba(135,206,250,0.8)]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(176, 224, 230, 0.9), rgba(135, 206, 250, 0.9))',
                          borderColor: 'rgba(135, 206, 250, 0.8)',
                          color: 'rgba(255, 255, 255, 0.95)',
                          textShadow: '0 0 10px rgba(135, 206, 250, 1), 0 0 20px rgba(176, 224, 230, 0.8)',
                          filter: 'drop-shadow(0 0 5px rgba(135, 206, 250, 0.6))',
                        }}
                      >
                        –10s
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chess Board */}
              <div className="relative">
                {/* Board container with elegant frame */}
                <div className="relative p-8 bg-gradient-to-br from-black/90 to-gray-900/90 border-2 border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                  {/* Piece Swap Visual Effects - positioned relative to board */}
                  {swapAnimationActive && swapSelectedPieces.first && swapSelectedPieces.second && (
                    <>
                      <style>{`
                        @keyframes swapPulse {
                          0%, 100% { 
                            transform: scale(1);
                            box-shadow: 0 0 20px rgba(147, 51, 234, 0.8);
                          }
                          50% { 
                            transform: scale(1.1);
                            box-shadow: 0 0 40px rgba(147, 51, 234, 1);
                          }
                        }
                        @keyframes empoweredPulse {
                          0%, 100% { 
                            box-shadow: 0 0 25px rgba(6, 182, 212, 1), 0 0 50px rgba(6, 182, 212, 0.6);
                            border-color: rgba(6, 182, 212, 1);
                          }
                          50% { 
                            box-shadow: 0 0 40px rgba(6, 182, 212, 1), 0 0 80px rgba(6, 182, 212, 0.8);
                            border-color: rgba(34, 211, 238, 1);
                          }
                        }
                        @keyframes powerCaptureExplosion {
                          0% {
                            transform: scale(0);
                            opacity: 1;
                          }
                          50% {
                            transform: scale(1.5);
                            opacity: 0.9;
                          }
                          100% {
                            transform: scale(2.5);
                            opacity: 0;
                          }
                        }
                        @keyframes powerCaptureText {
                          0% {
                            opacity: 0;
                            transform: translateY(0) scale(0.5);
                          }
                          20% {
                            opacity: 1;
                            transform: translateY(-30px) scale(1.2);
                          }
                          100% {
                            opacity: 0;
                            transform: translateY(-80px) scale(1);
                          }
                        }
                        @keyframes purpleSwirl {
                          0% {
                            transform: translate(-50%, -50%) rotate(0deg) scale(0.8);
                            opacity: 1;
                          }
                          50% {
                            transform: translate(-50%, -50%) rotate(180deg) scale(1.2);
                            opacity: 0.9;
                          }
                          100% {
                            transform: translate(-50%, -50%) rotate(360deg) scale(1.5);
                            opacity: 0;
                          }
                        }
                        @keyframes poofBurst {
                          0% {
                            transform: translate(-50%, -50%) scale(0);
                            opacity: 1;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.5);
                            opacity: 0.8;
                          }
                          100% {
                            transform: translate(-50%, -50%) scale(2);
                            opacity: 0;
                          }
                        }
                      `}</style>
                      {[swapSelectedPieces.first, swapSelectedPieces.second].map((square, idx) => {
                        const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
                        const rank = parseInt(square[1]) - 1; // 1=0, 2=1, etc.
                        // Calculate position within the board (600px max width, 8 squares)
                        const squareSize = 75; // Approximate square size
                        const leftOffset = file * squareSize + squareSize / 2;
                        const topOffset = (7 - rank) * squareSize + squareSize / 2; // Reverse for board orientation
                        
                        return (
                          <div key={idx} className="absolute pointer-events-none" style={{ left: `${leftOffset}px`, top: `${topOffset}px` }}>
                            {/* Purple swirl */}
                            <div className="w-20 h-20 border-4 border-purple-500 rounded-full animate-[purpleSwirl_1.5s_ease-out_forwards]"
                              style={{
                                boxShadow: '0 0 30px rgba(147, 51, 234, 0.8), inset 0 0 20px rgba(168, 85, 247, 0.6)',
                              }}
                            />
                            {/* Poof particle burst */}
                            <div className="absolute inset-0 w-16 h-16 rounded-full animate-[poofBurst_1s_ease-out_forwards]"
                              style={{
                                animationDelay: `${idx * 0.1}s`,
                                background: 'radial-gradient(circle, rgba(168,85,247,0.9) 0%, rgba(147,51,234,0.7) 50%, transparent 100%)',
                              }}
                            />
                          </div>
                        );
                      })}
                    </>
                  )}
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
                    // Empowered piece highlighting (bright cyan glow)
                    ...(empoweredPiece ? {
                      [empoweredPiece.square]: {
                        backgroundColor: 'rgba(6, 182, 212, 0.4)',
                        boxShadow: '0 0 25px rgba(6, 182, 212, 1), 0 0 50px rgba(6, 182, 212, 0.6)',
                        border: '3px solid rgba(6, 182, 212, 1)',
                        animation: 'empoweredPulse 1.5s ease-in-out infinite',
                        position: 'relative',
                      }
                    } : {}),
                    // Piece swap selection highlighting
                    ...(pieceSwapActive && swapSelectedPieces.first ? {
                      [swapSelectedPieces.first]: {
                        backgroundColor: 'rgba(147, 51, 234, 0.6)',
                        boxShadow: '0 0 20px rgba(147, 51, 234, 0.8)',
                        border: '3px solid rgba(147, 51, 234, 1)',
                        animation: 'swapPulse 1s ease-in-out infinite',
                      }
                    } : {}),
                    ...(pieceSwapActive && swapSelectedPieces.second ? {
                      [swapSelectedPieces.second]: {
                        backgroundColor: 'rgba(147, 51, 234, 0.6)',
                        boxShadow: '0 0 20px rgba(147, 51, 234, 0.8)',
                        border: '3px solid rgba(147, 51, 234, 1)',
                        animation: 'swapPulse 1s ease-in-out infinite',
                      }
                    } : {}),
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
              <div className={`relative ${
                chronoChipActive && chronoChipTarget === playerColor ? 'animate-[clockPulse_0.5s_ease-in-out_2]' : ''
              } ${
                freezeClockActive && freezeClockTarget === playerColor ? 'animate-[clockFreeze_1s_ease-in-out]' : ''
              }`}>
                <PlayerCard
                  color={playerColor === 'w' ? 'white' : 'black'}
                  timeRemaining={playerColor === 'w' ? game.white_time_remaining : game.black_time_remaining}
                  isActive={game.current_turn === playerColor}
                  capturedPieces={playerColor === 'b' ? whiteCaptured : blackCaptured}
                  shieldCount={playerColor === 'w' ? whiteShields : blackShields}
                  onShieldClick={() => {
                    handleUndo(playerColor);
                  }}
                />
                {/* Double Move ×2 Badge for current player */}
                {doubleMoveActive && doubleMoveTarget === playerColor && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-xl px-3 py-1.5 rounded-lg border-2 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.8)] animate-pulse">
                      ×2
                    </div>
                  </div>
                )}
                {/* +10s notification for current player */}
                {showTimeBonus && chronoChipTarget === playerColor && (
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 translate-x-full z-[60] pointer-events-none">
                    <div className="animate-[timeBonusPop_1.5s_ease-out_forwards] ml-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-2xl tracking-wider px-4 py-2 rounded-lg border-2 border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.8)]">
                        +10s
                      </div>
                    </div>
                  </div>
                )}
                {/* -10s notification for current player */}
                {showTimeDrain && freezeClockTarget === playerColor && (
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 translate-x-full z-[60] pointer-events-none">
                    <div className="animate-[timeDrainPop_1.5s_ease-out_forwards] ml-4">
                      <div 
                        className="text-2xl font-black tracking-wider px-4 py-2 rounded-lg border-2 shadow-[0_0_20px_rgba(135,206,250,0.8)]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(176, 224, 230, 0.9), rgba(135, 206, 250, 0.9))',
                          borderColor: 'rgba(135, 206, 250, 0.8)',
                          color: 'rgba(255, 255, 255, 0.95)',
                          textShadow: '0 0 10px rgba(135, 206, 250, 1), 0 0 20px rgba(176, 224, 230, 0.8)',
                          filter: 'drop-shadow(0 0 5px rgba(135, 206, 250, 0.6))',
                        }}
                      >
                        –10s
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
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
                  onUndo={() => handleUndo(playerColor || undefined)}
                  shieldUses={playerColor === 'w' ? whiteShields : blackShields}
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

      {/* Shield Rewind Animation Overlay */}
      {shieldRewindActive && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse" />
        </div>
      )}

      {/* TURN REWOUND Text */}
      {showTurnRewound && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-4xl tracking-widest uppercase px-8 py-4 rounded-lg border-4 border-white/50 shadow-2xl animate-pulse">
            TURN REWOUND
          </div>
        </div>
      )}


      {/* Piece Empower Notification */}
      {showEmpowerNotification && empoweredPiece && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 text-white font-black text-lg tracking-wider uppercase px-6 py-3 rounded-lg border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse">
            ⚡ PIECE EMPOWERED - On Capture +20s
          </div>
        </div>
      )}

      {/* Piece Swap Active Indicator */}
      {pieceSwapActive && pieceSwapTarget === playerColor && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white font-black text-lg tracking-wider uppercase px-6 py-3 rounded-lg border-2 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.8)] animate-pulse">
            🔄 PIECE SWAP ACTIVE - Select 2 pieces to swap
          </div>
        </div>
      )}

      {/* Double Move Activated Message */}
      {doubleMoveActivated && doubleMoveTarget === playerColor && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none">
          <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white font-black text-3xl tracking-widest uppercase px-8 py-4 rounded-lg border-4 border-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.9)] animate-pulse">
            DOUBLE MOVE ACTIVATED!
          </div>
        </div>
      )}

      {/* Double Move Flame Effect on Board */}
      {doubleMoveActivated && doubleMoveTarget === playerColor && (
        <div className="fixed inset-0 z-[55] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent animate-pulse" 
            style={{
              background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.4) 0%, transparent 70%)',
              animation: 'doubleMoveFlame 2s ease-out forwards',
            }}
          />
          <style>{`
            @keyframes doubleMoveFlame {
              0% {
                opacity: 0;
                transform: scale(0.8);
              }
              50% {
                opacity: 1;
                transform: scale(1.1);
              }
              100% {
                opacity: 0;
                transform: scale(1.2);
              }
            }
          `}</style>
        </div>
      )}


      {/* Chrono Chip Visual Effects */}
      {chronoChipActive && chronoChipTarget && (
        <>
          {/* Glowing gold chip flying animation */}
          <div className="fixed inset-0 z-[55] pointer-events-none">
            <div 
              className={`absolute ${
                chronoChipTarget === 'w' 
                  ? (playerColor === 'w' ? 'top-[20%] left-[50%]' : 'top-[80%] left-[50%]')
                  : (playerColor === 'w' ? 'top-[80%] left-[50%]' : 'top-[20%] left-[50%]')
              } animate-[chronoChipFly_1.5s_ease-out_forwards]`}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.8),0_0_60px_rgba(255,215,0,0.6)] border-4 border-yellow-300 flex items-center justify-center transform -translate-x-1/2">
                <div className="w-8 h-8 bg-yellow-200 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Clock pulse effect */}
          <style>{`
            @keyframes chronoChipFly {
              0% {
                transform: translate(-50%, 0) scale(1) rotate(0deg);
                opacity: 1;
              }
              50% {
                transform: translate(calc(-50% + ${chronoChipTarget === 'w' ? '-150px' : '150px'}), ${chronoChipTarget === 'w' ? '-100px' : '100px'}) scale(0.8) rotate(180deg);
                opacity: 0.9;
              }
              100% {
                transform: translate(calc(-50% + ${chronoChipTarget === 'w' ? '-300px' : '300px'}), ${chronoChipTarget === 'w' ? '-200px' : '200px'}) scale(0.4) rotate(360deg);
                opacity: 0;
              }
            }
            @keyframes clockPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes timeBonusPop {
              0% {
                opacity: 0;
                transform: translateY(0) scale(0.5);
              }
              20% {
                opacity: 1;
                transform: translateY(-20px) scale(1.2);
              }
              100% {
                opacity: 0;
                transform: translateY(-60px) scale(1);
              }
            }
            @keyframes clockFreeze {
              0%, 100% { 
                filter: brightness(1);
              }
              10%, 30%, 50%, 70%, 90% {
                filter: brightness(1.5) hue-rotate(180deg);
                box-shadow: 0 0 20px rgba(135, 206, 250, 0.8), 0 0 40px rgba(135, 206, 250, 0.6);
              }
              20%, 40%, 60%, 80% {
                filter: brightness(1);
              }
            }
            @keyframes clockShake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotate(-1deg); }
              20%, 40%, 60%, 80% { transform: translateX(3px) rotate(1deg); }
            }
            @keyframes timeDrainPop {
              0% {
                opacity: 0;
                transform: translateY(0) scale(0.5);
                filter: blur(5px);
              }
              20% {
                opacity: 1;
                transform: translateY(-20px) scale(1.2);
                filter: blur(0px);
              }
              100% {
                opacity: 0;
                transform: translateY(-60px) scale(1);
                filter: blur(3px);
              }
            }
          `}</style>
        </>
      )}

      {/* Freeze Enemy Clock Visual Effects */}
      {freezeClockActive && freezeClockTarget && (
        <>
          {/* Icy blue flicker overlay on clock with shake effect */}
          <div 
            className={`fixed z-[55] pointer-events-none ${
              freezeClockTarget === 'w'
                ? (playerColor === 'w' ? 'top-[calc(20%+80px)] right-[calc(25%+20px)]' : 'top-[calc(80%-80px)] right-[calc(25%+20px)]')
                : (playerColor === 'w' ? 'top-[calc(80%-80px)] right-[calc(25%+20px)]' : 'top-[calc(20%+80px)] right-[calc(25%+20px)]')
            } w-32 h-16 rounded-lg animate-[clockFreeze_1s_ease-in-out,clockShake_0.5s_ease-in-out_2]`}
            style={{
              background: 'linear-gradient(135deg, rgba(135, 206, 250, 0.4), rgba(176, 224, 230, 0.4))',
              boxShadow: '0 0 30px rgba(135, 206, 250, 0.8), inset 0 0 20px rgba(176, 224, 230, 0.5)',
              backdropFilter: 'blur(2px)',
            }}
          />
        </>
      )}


    </div>
  );
};

export default Game;