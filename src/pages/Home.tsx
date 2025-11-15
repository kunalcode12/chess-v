import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Crown, 
  Users, 
  Clock, 
  RefreshCw, 
  Grid3x3,
  Move,
  Target,
  Trophy,
  Play,
  LogIn
} from "lucide-react";

interface AvailableGame {
  id: string;
  join_code: string;
  created_at: string;
  time_limit: number;
}

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const loadAvailableGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      // Try Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('get-available-games', {
          method: 'GET',
        });

        if (!error && data?.games) {
          // The function returns { games: [...] }
          setAvailableGames(data.games);
          setIsLoadingGames(false);
          return;
        }
      } catch (edgeFunctionError) {
        console.warn('Edge Function failed, falling back to direct query:', edgeFunctionError);
      }

      // Fallback to direct query if Edge Function fails
      const { data, error } = await supabase
        .from('games')
        .select('id, join_code, created_at, time_limit, white_player_id, black_player_id, game_status')
        .eq('game_status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading available games:', error);
        throw error;
      }

      // Filter games: only include those where at least one player slot is empty
      // AND exclude finished/abandoned games
      const games = (data || []).filter(game => {
        // Exclude finished games
        if (game.game_status === 'finished') return false;
        
        const hasWhite = game.white_player_id !== null;
        const hasBlack = game.black_player_id !== null;
        // Include if at least one slot is empty (waiting for opponent)
        return !(hasWhite && hasBlack);
      }).map(game => ({
        id: game.id,
        join_code: game.join_code,
        created_at: game.created_at,
        time_limit: game.time_limit,
      }));

      setAvailableGames(games);
    } catch (error: any) {
      console.error('Error loading available games:', error);
      // Set empty array on error to prevent UI issues
      setAvailableGames([]);
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  const handleJoinAvailableGame = async (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const formatTimeLimit = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Parse URL parameters and store in localStorage
  useEffect(() => {
    const authToken = searchParams.get("authToken");
    const streamUrlParam = searchParams.get("streamUrl");
    const wallet = searchParams.get("wallet");

    // Store in localStorage if present in URL
    if (authToken) {
      localStorage.setItem("authToken", authToken);
      console.log("Auth token stored in localStorage");
    }
    if (streamUrlParam) {
      const decodedStreamUrl = decodeURIComponent(streamUrlParam);
      localStorage.setItem("streamUrl", decodedStreamUrl);
      console.log("Stream URL stored in localStorage:", decodedStreamUrl);
    }
    if (wallet) {
      localStorage.setItem("wallet", wallet);
      console.log("Wallet stored in localStorage");
    }
  }, [searchParams]);

  // Load available games on mount and when navigating back to this page
  useEffect(() => {
    loadAvailableGames();
  }, [location.pathname, loadAvailableGames]);

  // Set up polling interval to refresh games every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadAvailableGames();
    }, 30000); // 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [loadAvailableGames]);

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from('games')
        .insert({
          join_code: code,
          game_status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/game/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a join code",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select()
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (error || !data) {
        throw new Error("Game not found");
      }

      navigate(`/game/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Chess board pattern generator with animation
  const ChessBoardPattern = () => {
    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isWhite = (row + col) % 2 === 0;
        squares.push(
          <motion.div
            key={`${row}-${col}`}
            className={`absolute w-[12.5%] h-[12.5%] ${
              isWhite ? 'bg-white/5' : 'bg-black/20'
            }`}
            style={{
              left: `${col * 12.5}%`,
              top: `${row * 12.5}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (row * 8 + col) * 0.01, duration: 0.3 }}
          />
        );
      }
    }
    return <div className="absolute inset-0">{squares}</div>;
  };

  // Chess pieces for floating animation
  const chessPieces = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
  
  // Floating chess pieces component
  const FloatingPieces = () => {
    return (
      <>
        {Array.from({ length: 12 }).map((_, i) => {
          const piece = chessPieces[i % chessPieces.length];
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          const duration = 15 + Math.random() * 10;
          const delay = Math.random() * 5;
          
          return (
            <motion.div
              key={i}
              className="absolute text-white/10 text-6xl pointer-events-none select-none"
              initial={{ 
                x: `${startX}vw`, 
                y: `${startY}vh`,
                rotate: 0,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{
                y: [`${startY}vh`, `${startY - 20}vh`, `${startY}vh`],
                x: [`${startX}vw`, `${startX + 5}vw`, `${startX}vw`],
                rotate: [0, 360, 0],
                scale: [0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.3, 0.5 + Math.random() * 0.5]
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut"
              }}
              style={{
                fontSize: `${40 + Math.random() * 40}px`,
              }}
            >
              {piece}
            </motion.div>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Chess board pattern background */}
      <div className="absolute inset-0 opacity-30">
        <ChessBoardPattern />
      </div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      {/* Floating chess pieces */}
      <FloatingPieces />

      {/* Animated decorative chess pieces pattern */}
      <motion.div 
        className="absolute top-20 left-10 opacity-5"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Grid3x3 className="w-64 h-64 text-white" />
      </motion.div>
      <motion.div 
        className="absolute bottom-20 right-10 opacity-5"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Crown className="w-64 h-64 text-white" />
      </motion.div>

      <div className="relative z-10 container mx-auto px-6 py-16">
        {/* Header Section */}
        <motion.div 
          className="text-center mb-20 space-y-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center gap-6 mb-6">
            <motion.div 
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", stiffness: 200 }}
            >
              <motion.div 
                className="absolute inset-0 bg-white/20 rounded-2xl blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="relative bg-white p-6 rounded-2xl shadow-2xl border-4 border-black"
                whileHover={{ 
                  scale: 1.1, 
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.5 }
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Crown className="w-20 h-20 text-black" />
                </motion.div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.h1 
                className="text-8xl font-black text-white mb-3 tracking-tighter drop-shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                CHESS
              </motion.h1>
              <motion.h2 
                className="text-6xl font-black text-white tracking-tighter drop-shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                EMPIRE
              </motion.h2>
              <motion.div 
                className="flex items-center justify-center gap-3 mt-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
              >
                <motion.div 
                  className="h-px bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: 64 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  <Grid3x3 className="w-6 h-6 text-white" />
                </motion.div>
                <motion.div 
                  className="h-px bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: 64 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
              </motion.div>
            </motion.div>
          </div>

          <motion.p 
            className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            Master the game of kings. Challenge opponents, perfect your strategy, and claim your throne.
          </motion.p>
        </motion.div>

        {/* Main Action Cards - Chess Board Style */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          {/* Create Game Card - White Square */}
          <motion.div
            initial={{ opacity: 0, x: -100, rotateY: -90 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ delay: 1.6, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, rotateY: 5 }}
          >
            <Card className="group relative overflow-hidden border-4 border-white bg-white shadow-2xl hover:shadow-white/50 transition-all duration-300">
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-white to-gray-100"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              />
              <div className="relative p-10 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div 
                    className="p-4 bg-black rounded-lg shadow-lg"
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: [0, -10, 10, 0],
                      boxShadow: "0 0 30px rgba(0,0,0,0.5)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Play className="w-10 h-10 text-white" />
                    </motion.div>
                  </motion.div>
                <div>
                  <h2 className="text-3xl font-bold text-black mb-1">New Game</h2>
                  <p className="text-gray-600 text-sm font-medium">Start a match</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed font-medium">
                Create a new chess game and invite your opponent to join the board.
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleCreateGame}
                  disabled={isCreating}
                  className="w-full h-16 text-lg font-bold bg-black hover:bg-gray-900 text-white shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-black relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  />
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Move className="w-5 h-5 mr-2" />
                      </motion.div>
                      Create Game
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </Card>
          </motion.div>

          {/* Join Game Card - Black Square */}
          <motion.div
            initial={{ opacity: 0, x: 100, rotateY: 90 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ delay: 1.8, duration: 0.8, type: "spring" }}
            whileHover={{ scale: 1.05, rotateY: -5 }}
          >
            <Card className="group relative overflow-hidden border-4 border-white bg-black shadow-2xl hover:shadow-white/30 transition-all duration-300">
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-black to-gray-900"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              />
              <div className="relative p-10 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div 
                    className="p-4 bg-white rounded-lg shadow-lg"
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: [0, 10, -10, 0],
                      boxShadow: "0 0 30px rgba(255,255,255,0.3)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      <LogIn className="w-10 h-10 text-black" />
                    </motion.div>
                  </motion.div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">Join Game</h2>
                  <p className="text-gray-400 text-sm font-medium">Enter code</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="h-16 text-center text-2xl font-bold bg-white border-4 border-gray-300 text-black placeholder:text-gray-400 focus:border-black focus:ring-4 focus:ring-white/50"
                />
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleJoinGame}
                    disabled={isJoining}
                    className="w-full h-16 text-lg font-bold bg-white hover:bg-gray-100 text-black shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    />
                    {isJoining ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 15, -15, 0]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Target className="w-5 h-5 mr-2" />
                        </motion.div>
                        Join Game
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
          </motion.div>
        </motion.div>

        {/* Available Games Section - Chess Board Style */}
        <AnimatePresence>
          {availableGames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="max-w-5xl mx-auto border-4 border-white bg-white shadow-2xl">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between border-b-4 border-black pb-4">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="p-3 bg-black rounded-lg"
                        whileHover={{ 
                          scale: 1.1, 
                          rotate: [0, -10, 10, 0],
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 360],
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          <Trophy className="w-7 h-7 text-white" />
                        </motion.div>
                      </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold text-black">
                      Active Games
                    </h2>
                    <p className="text-sm text-gray-600 font-medium">
                      {availableGames.length} {availableGames.length === 1 ? 'game' : 'games'} waiting
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => loadAvailableGames()}
                  disabled={isLoadingGames}
                  className="border-2 border-black bg-white hover:bg-gray-100 text-black font-bold"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isLoadingGames ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {availableGames.map((game, index) => {
                    const isWhiteSquare = index % 2 === 0;
                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ scale: 1.02, x: 10 }}
                      >
                        <Card
                          className={`group p-6 border-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                            isWhiteSquare
                              ? 'bg-white border-black hover:bg-gray-50'
                              : 'bg-black border-white hover:bg-gray-900'
                          }`}
                          onClick={() => handleJoinAvailableGame(game.id)}
                        >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <div className={`absolute inset-0 rounded-lg blur ${
                                isWhiteSquare ? 'bg-black/20' : 'bg-white/20'
                              }`} />
                              <Badge className={`relative font-mono text-xl px-5 py-2.5 border-4 shadow-lg ${
                                isWhiteSquare
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-black border-white'
                              }`}>
                                {game.join_code}
                              </Badge>
                            </div>
                            <div className={`flex items-center gap-5 font-semibold ${
                              isWhiteSquare ? 'text-black' : 'text-white'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Clock className={`w-5 h-5 ${isWhiteSquare ? 'text-black' : 'text-white'}`} />
                                <span>{formatTimeLimit(game.time_limit)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className={`w-5 h-5 ${isWhiteSquare ? 'text-black' : 'text-white'}`} />
                                <span className="text-sm">Waiting</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-medium ${
                              isWhiteSquare ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {getTimeAgo(game.created_at)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinAvailableGame(game.id);
                              }}
                              className={`border-2 font-bold hover:scale-105 transition-transform ${
                                isWhiteSquare
                                  ? 'border-black bg-white hover:bg-gray-100 text-black'
                                  : 'border-white bg-black hover:bg-gray-900 text-white'
                              }`}
                            >
                              Join
                            </Button>
                          </div>
                        </div>
                      </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </Card>
          </motion.div>
        )}
        </AnimatePresence>

        {isLoadingGames && availableGames.length === 0 && (
          <Card className="max-w-5xl mx-auto border-4 border-white bg-white shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black rounded-lg">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-black">
                      Active Games
                    </h2>
                    <p className="text-sm text-gray-600 font-medium">
                      Searching...
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => loadAvailableGames()}
                  disabled={isLoadingGames}
                  className="border-2 border-black bg-white hover:bg-gray-100 text-black font-bold"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isLoadingGames ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-black rounded-full mb-4">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-600 font-medium">Loading games...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Features Section - Chess Board Pattern */}
        <motion.div 
          className="mt-24 max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Target, title: "Strategic", desc: "Master the art of chess strategy", bg: "bg-white", text: "text-black", border: "border-black" },
              { icon: Move, title: "Real-Time", desc: "Play instantly with live updates", bg: "bg-black", text: "text-white", border: "border-white" },
              { icon: Trophy, title: "Competitive", desc: "Climb ranks and prove mastery", bg: "bg-white", text: "text-black", border: "border-black" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: [0, 5, -5, 0],
                  z: 50
                }}
              >
                <Card
                  className={`p-8 border-4 ${feature.bg} ${feature.border} shadow-xl hover:shadow-2xl transition-all duration-300`}
                >
                  <motion.div 
                    className={`inline-block p-4 ${feature.bg === 'bg-white' ? 'bg-black' : 'bg-white'} rounded-lg mb-4`}
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: [0, -10, 10, 0],
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.3
                      }}
                    >
                      <feature.icon className={`w-8 h-8 ${feature.bg === 'bg-white' ? 'text-white' : 'text-black'}`} />
                    </motion.div>
                  </motion.div>
                  <motion.h3 
                    className={`text-xl font-bold ${feature.text} mb-2`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {feature.title}
                  </motion.h3>
                  <p className={`text-sm ${feature.text === 'text-black' ? 'text-gray-600' : 'text-gray-400'} font-medium`}>
                    {feature.desc}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
