import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import Chessboard from "chessboardjsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Swords, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crown, TrendingUp, TrendingDown } from "lucide-react";
import { useStockfish } from "@/hooks/useStockfish";

interface GameResultProps {
  game: any;
  moves: any[];
  onPlayAgain: () => void;
  playerColor?: 'w' | 'b' | null;
  totalPoints?: number;
}

const GameResult = ({ game, moves, onPlayAgain, playerColor, totalPoints = 0 }: GameResultProps) => {
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(moves.length - 1);
  const [chess] = useState(new Chess());
  const [moveEvaluations, setMoveEvaluations] = useState<Array<{ score: number; mate?: number }>>([]);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [hasUpdatedPoints, setHasUpdatedPoints] = useState(false);
  const { evaluatePosition, isReady } = useStockfish();
  const playerWon = playerColor
    ? game.winner === (playerColor === 'w' ? 'white' : 'black')
    : false;
  
  // Calculate evaluations for all moves

  console.log("moves", moves);
  
  // Show redirect dialog after 2 seconds
  useEffect(() => {
    const dialogTimer = setTimeout(() => {
      setShowRedirectDialog(true);
    }, 2000);

    return () => clearTimeout(dialogTimer);
  }, []);

  // Countdown and redirect
  useEffect(() => {
    if (showRedirectDialog && redirectCountdown > 0) {
      const countdownTimer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(countdownTimer);
    } else if (showRedirectDialog && redirectCountdown === 0) {
      const pointsEarned = totalPoints || 0;
      
      // Redirect to game center
      const redirectUrl = `https://empireofbits.fun/?gameWon=${playerWon}&gameName=ChessMaster&pointsEarned=${200}`;
      window.location.href = redirectUrl;
    }
  }, [showRedirectDialog, redirectCountdown, playerColor, game.winner, totalPoints]);

  // Award points to backend when player wins (once)
  useEffect(() => {
    if (!playerWon || hasUpdatedPoints) return;

    const wallet = localStorage.getItem("wallet");
    if (!wallet) {
      console.warn("Wallet not found; skipping points update");
      return;
    }

    const pointsToAward = totalPoints || 200; // fallback to 200 if totalPoints not provided
    const operation = "add";

    (async () => {
      try {
        const response = await fetch(
          `https://backend.empireofbits.fun/api/v1/users/${wallet}/points`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              points: pointsToAward,
              operation,
            }),
          }
        );

        const data = await response.json();
        console.log(data);

        if (!data.success) {
          throw new Error(data.error || "Failed to update points in backend");
        }

        setHasUpdatedPoints(true);
      } catch (err) {
        console.error("Error updating points in backend:", err);
      }
    })();
  }, [playerWon, totalPoints, hasUpdatedPoints]);
  useEffect(() => {
    if (!isReady || moves.length === 0) return;
    
    const evaluations: Array<{ score: number; mate?: number }> = [];
    const tempChess = new Chess();
    
    // Initial position evaluation
    evaluatePosition(tempChess.fen(), (evalData) => {
      evaluations.push({ score: evalData.score, mate: evalData.mate });
    }, 12); // Lower depth for faster analysis
    
    // Evaluate each move position
    moves.forEach((move, index) => {
      if (move.board_state_after) {
        tempChess.load(move.board_state_after);
        evaluatePosition(tempChess.fen(), (evalData) => {
          evaluations[index + 1] = { score: evalData.score, mate: evalData.mate };
          if (index === moves.length - 1) {
            setMoveEvaluations([...evaluations]);
          }
        }, 12);
      }
    });
  }, [isReady, moves, evaluatePosition]);
  
  const getResultText = () => {
    if (!game.winner) return "It's a draw!";
    return `${game.winner.charAt(0).toUpperCase() + game.winner.slice(1)} wins!`;
  };
  
  const calculateEloChange = (won: boolean, accuracy: number) => {
    const baseChange = won ? 10 : -10;
    const accuracyBonus = Math.round((accuracy - 50) / 10);
    return baseChange + accuracyBonus;
  };
  
  const whiteEloChange = calculateEloChange(game.winner === 'white', game.white_accuracy || 50);
  const blackEloChange = calculateEloChange(game.winner === 'black', game.black_accuracy || 50);
  
  const getCurrentPosition = () => {
    if (selectedMoveIndex < 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return moves[selectedMoveIndex]?.board_state_after || game.board_state;
  };
  
  const getCurrentEvaluation = () => {
    if (selectedMoveIndex < 0) return moveEvaluations[0];
    return moveEvaluations[selectedMoveIndex + 1];
  };
  
  
  const goToMove = (index: number) => {
    setSelectedMoveIndex(Math.max(-1, Math.min(moves.length - 1, index)));
  };
  
  const getEvalBar = () => {
    const currentEval = getCurrentEvaluation();
    if (!currentEval) return null;
    
    const clampedEval = currentEval.mate 
      ? (currentEval.mate > 0 ? 10 : -10)
      : Math.max(-10, Math.min(10, currentEval.score));
    const whitePercentage = ((clampedEval + 10) / 20) * 100;
    
    return (
      <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:15px_15px] [background-position:0_0,7.5px_7.5px] opacity-5" />
        <div className="relative p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-white/70">Position Evaluation</span>
            <span className="text-sm font-black font-mono text-white tracking-wider">
              {currentEval.mate ? `M${Math.abs(currentEval.mate)}` : `${currentEval.score > 0 ? '+' : ''}${currentEval.score.toFixed(1)}`}
            </span>
          </div>
          <div className="relative h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 transform -translate-x-1/2 z-10" />
            <div 
              className="absolute top-0 right-0 h-full bg-gradient-to-l from-white via-white/90 to-white/70 transition-all duration-500 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              style={{ width: `${whitePercentage}%` }}
            />
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-black via-gray-900 to-gray-800 transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
              style={{ width: `${100 - whitePercentage}%` }}
            />
          </div>
        </div>
      </Card>
    );
  };
  
  const getEvaluationGraph = () => {
    if (moveEvaluations.length === 0) return null;
    
    return (
      <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Evaluation Graph</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="relative h-32 bg-black/50 rounded-lg border border-white/10 overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-white/10" />
            </div>
            <svg className="w-full h-full" viewBox={`0 0 ${moveEvaluations.length * 10} 100`} preserveAspectRatio="none">
              <polyline
                points={moveEvaluations.map((evalData, index) => {
                  const x = index * 10;
                  const y = 50 - (Math.max(-10, Math.min(10, evalData.score)) * 4);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="1.5"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {selectedMoveIndex >= -1 && moveEvaluations[selectedMoveIndex + 1] && (
                <circle
                  cx={(selectedMoveIndex + 1) * 10}
                  cy={50 - (Math.max(-10, Math.min(10, moveEvaluations[selectedMoveIndex + 1]?.score || 0)) * 4)}
                  r="2"
                  fill="#ffffff"
                  className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                />
              )}
            </svg>
          </div>
        </div>
      </Card>
    );
  };

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

      {/* Redirect Dialog */}
      {showRedirectDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border-2 border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="mb-6">
              <div className="inline-block p-4 bg-white/10 rounded-full mb-4">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
              <h3 className="text-2xl font-black tracking-widest uppercase text-white mb-2">
                Redirecting to Game Center
              </h3>
              <p className="text-white/70 font-light mb-4">
                Preparing your rewards
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black text-white tabular-nums">
                  {redirectCountdown}
                </span>
                <span className="text-xl text-white/70">s</span>
              </div>
            </div>
            <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
        </div>
      )}

      <div className="relative z-10 p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Result Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              {game.winner ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-2xl border-2 border-yellow-500/30">
                    <Trophy className="w-16 h-16 text-yellow-300" />
                  </div>
                </div>
              ) : (
                <div className="relative p-4 bg-gradient-to-br from-white/10 to-gray-900/90 rounded-2xl border-2 border-white/20">
                  <Swords className="w-16 h-16 text-white/60" />
                </div>
              )}
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
              {getResultText()}
            </h2>
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
          
          <div className="grid lg:grid-cols-[1fr_450px] gap-8">
            {/* Analysis Board */}
            <div className="space-y-6">
              {getEvalBar()}
              {getEvaluationGraph()}
              
              <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%)] bg-[length:30px_30px] opacity-50" />
                <div className="relative p-8">
                  <div className="relative" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <Chessboard
                      position={getCurrentPosition()}
                      draggable={false}
                      lightSquareStyle={{ backgroundColor: '#eeeed2' }}
                      darkSquareStyle={{ backgroundColor: '#769656' }}
                    />
                  </div>
                  
                  {/* Move Navigation */}
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToMove(-1)}
                      disabled={selectedMoveIndex === -1}
                      className="border border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToMove(selectedMoveIndex - 1)}
                      disabled={selectedMoveIndex === -1}
                      className="border border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-6 py-2 bg-black/50 border border-white/10 rounded-lg backdrop-blur-sm min-w-[140px] text-center">
                      <span className="text-sm font-black tracking-wider text-white">
                        {selectedMoveIndex === -1 ? 'START' : `MOVE ${selectedMoveIndex + 1} / ${moves.length}`}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToMove(selectedMoveIndex + 1)}
                      disabled={selectedMoveIndex === moves.length - 1}
                      className="border border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToMove(moves.length - 1)}
                      disabled={selectedMoveIndex === moves.length - 1}
                      className="border border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Game Stats & Analysis */}
            <div className="space-y-6">
              <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%)] bg-[length:30px_30px] opacity-50" />
                <div className="relative p-8 text-center">
                  <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                      {/* White Stats */}
                      <div className="relative p-6 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-xl">
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center text-black font-black text-lg">♔</div>
                        </div>
                        <p className="text-xs font-black tracking-widest uppercase text-white/70 mb-3">White</p>
                        <div className="flex items-baseline gap-2 justify-center mb-2">
                          <p className="text-4xl font-black text-white">{game.white_accuracy || 0}%</p>
                        </div>
                        <p className="text-xs font-bold tracking-wide text-white/60 uppercase mb-3">Accuracy</p>
                        {game.white_playstyle && (
                          <p className="text-xs font-bold capitalize text-yellow-300 mb-3 tracking-wide">{game.white_playstyle}</p>
                        )}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-center gap-2">
                            {whiteEloChange >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm font-black ${whiteEloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {whiteEloChange >= 0 ? '+' : ''}{whiteEloChange} ELO
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Black Stats */}
                      <div className="relative p-6 bg-gradient-to-br from-black/50 to-black/30 border-2 border-white/10 rounded-xl">
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 bg-black border-2 border-white/30 rounded-sm flex items-center justify-center text-white font-black text-lg">♚</div>
                        </div>
                        <p className="text-xs font-black tracking-widest uppercase text-white/70 mb-3">Black</p>
                        <div className="flex items-baseline gap-2 justify-center mb-2">
                          <p className="text-4xl font-black text-white">{game.black_accuracy || 0}%</p>
                        </div>
                        <p className="text-xs font-bold tracking-wide text-white/60 uppercase mb-3">Accuracy</p>
                        {game.black_playstyle && (
                          <p className="text-xs font-bold capitalize text-yellow-300 mb-3 tracking-wide">{game.black_playstyle}</p>
                        )}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-center gap-2">
                            {blackEloChange >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm font-black ${blackEloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {blackEloChange >= 0 ? '+' : ''}{blackEloChange} ELO
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {game.game_analysis && (
                      <div className="p-6 bg-black/50 border border-white/10 rounded-xl text-left">
                        <div className="flex items-center gap-2 mb-4">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <p className="text-sm font-black tracking-widest uppercase text-white/90">Game Analysis</p>
                        </div>
                        <p className="text-sm leading-relaxed text-white/70 font-light">{game.game_analysis}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-white to-white/90 hover:from-white/90 hover:to-white text-black font-black tracking-widest uppercase border-2 border-white/30 transition-all duration-300 hover:scale-105"
                    onClick={onPlayAgain}
                  >
                    Play Again
                  </Button>
                </div>
              </Card>

              {moves.length > 0 && (
                <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
                  <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Move History</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-2">
                        {moves.map((move, index) => {
                          const evalData = moveEvaluations[index + 1];
                          const prevEval = moveEvaluations[index];
                          let evalChange = null;
                          
                          if (evalData && prevEval) {
                            const diff = move.player_color === 'w' 
                              ? evalData.score - prevEval.score 
                              : prevEval.score - evalData.score;
                            evalChange = diff;
                          }
                          
                          return (
                            <div 
                              key={move.id} 
                              className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                                selectedMoveIndex === index 
                                  ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                                  : 'bg-black/30 border-white/10 hover:bg-black/50 hover:border-white/20'
                              }`}
                              onClick={() => setSelectedMoveIndex(index)}
                            >
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <Badge className="font-mono text-xs font-black bg-white text-black border-0 px-3 py-1">
                                  {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move.move_notation}
                                </Badge>
                                <Badge className={`font-bold text-xs border-2 ${
                                  move.player_color === 'w' 
                                    ? 'bg-white text-black border-white/30' 
                                    : 'bg-black text-white border-white/20'
                                }`}>
                                  {move.player_color === 'w' ? 'WHITE' : 'BLACK'}
                                </Badge>
                                {evalData && (
                                  <Badge className="font-mono text-xs font-black bg-black/50 border border-white/20 text-white">
                                    {evalData.mate ? `M${Math.abs(evalData.mate)}` : `${evalData.score > 0 ? '+' : ''}${evalData.score.toFixed(1)}`}
                                  </Badge>
                                )}
                                {evalChange !== null && Math.abs(evalChange) > 0.5 && (
                                  <Badge 
                                    className={`font-mono text-xs font-black border-2 ${
                                      evalChange < -1 ? 'border-red-500/50 text-red-400 bg-red-900/20' : 
                                      evalChange < -0.5 ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20' : 
                                      'border-white/20 text-white/60 bg-black/30'
                                    }`}
                                  >
                                    {evalChange < -2 ? '??' : evalChange < -1 ? '?' : evalChange < -0.5 ? '?!' : ''}
                                  </Badge>
                                )}
                              </div>
                              {move.explanation && (
                                <p className="text-xs text-white/60 leading-relaxed font-light">
                                  {move.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
