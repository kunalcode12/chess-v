import { Card } from "@/components/ui/card";
import { Clock, Crown, Shield } from "lucide-react";

interface PlayerCardProps {
  color: 'white' | 'black';
  timeRemaining: number;
  isActive: boolean;
  capturedPieces: string[];
  shieldCount?: number;
  onShieldClick?: () => void;
}

const PlayerCard = ({ color, timeRemaining, isActive, capturedPieces, shieldCount = 0, onShieldClick }: PlayerCardProps) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const pieceUnicode: Record<string, string> = {
    'p': '♟',
    'n': '♞',
    'b': '♝',
    'r': '♜',
    'q': '♛',
  };

  const pieceValues: Record<string, number> = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9
  };

  const materialAdvantage = capturedPieces.reduce((sum, piece) => {
    return sum + (pieceValues[piece.toLowerCase()] || 0);
  }, 0);

  const isWhite = color === 'white';
  const isLowTime = timeRemaining < 60 && isActive;

  return (
    <div className={`relative overflow-hidden transition-all duration-500 ${
      isActive 
        ? 'scale-[1.02]' 
        : 'opacity-80'
    }`}>
      {/* Chess board pattern background */}
      <div className={`absolute inset-0 opacity-5 ${
        isWhite ? 'bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:20px_20px] [background-position:0_0,10px_10px]' 
        : 'bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:20px_20px] [background-position:0_0,10px_10px]'
      }`} />
      
      {/* Active glow effect */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      )}

      <Card className={`relative border-2 backdrop-blur-xl transition-all duration-300 ${
        isActive
          ? isWhite
            ? 'bg-gradient-to-br from-white/10 to-gray-900/90 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            : 'bg-gradient-to-br from-black/90 to-gray-800/90 border-gray-700/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]'
          : isWhite
            ? 'bg-gradient-to-br from-gray-900/80 to-black/90 border-gray-800/20'
            : 'bg-gradient-to-br from-black/80 to-gray-900/90 border-gray-800/20'
      }`}>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            {/* Left side - Player info */}
            <div className="flex items-center gap-5">
              {/* King icon with elegant styling */}
              <div className={`relative w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-bold transition-all duration-300 ${
                isWhite
                  ? isActive
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-white/50'
                    : 'bg-white/20 text-white/60 border border-white/20'
                  : isActive
                    ? 'bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.8)] border-2 border-gray-700/50'
                    : 'bg-black/20 text-white/60 border border-gray-700/20'
              }`}>
                {isWhite ? '♔' : '♚'}
                {isActive && (
                  <div className="absolute -top-1 -right-1">
                    <Crown className={`w-4 h-4 ${isWhite ? 'text-yellow-400' : 'text-yellow-300'}`} />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className={`text-xl font-black tracking-wider uppercase ${
                    isWhite ? 'text-white' : 'text-white'
                  }`}>
                    {color}
                  </h3>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  )}
                  {shieldCount > 0 && (
                    <button
                      onClick={onShieldClick}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-900/30 border border-blue-600/50 hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`${shieldCount} Shield${shieldCount > 1 ? 's' : ''} - Click to rewind turn during your turn`}
                    >
                      <Shield className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                      <span className="text-xs font-bold text-blue-300">{shieldCount}</span>
                    </button>
                  )}
                </div>
                
                {/* Captured pieces */}
                {capturedPieces.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {capturedPieces.slice(0, 5).map((piece, idx) => (
                        <span key={idx} className={`text-xl ${
                          isWhite ? 'text-white/70' : 'text-white/70'
                        }`}>
                          {pieceUnicode[piece.toLowerCase()]}
                        </span>
                      ))}
                      {capturedPieces.length > 5 && (
                        <span className={`text-xs font-bold ${
                          isWhite ? 'text-white/50' : 'text-white/50'
                        }`}>
                          +{capturedPieces.length - 5}
                        </span>
                      )}
                    </div>
                    {materialAdvantage > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isWhite 
                          ? 'bg-white/20 text-white border border-white/30' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        +{materialAdvantage}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side - Timer */}
            <div className={`relative px-6 py-3 rounded-lg font-mono text-2xl font-black transition-all duration-300 ${
              isActive
                ? isWhite
                  ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.4)] border-2 border-white/50'
                  : 'bg-black text-white shadow-[0_0_25px_rgba(0,0,0,0.8)] border-2 border-gray-700/50'
                : isWhite
                  ? 'bg-white/10 text-white/60 border border-white/20'
                  : 'bg-black/20 text-white/60 border border-gray-700/20'
            } ${isLowTime ? 'animate-pulse scale-105' : ''}`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${isActive ? (isWhite ? 'text-black' : 'text-white') : 'opacity-50'}`} />
                <span>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </div>
              {isLowTime && (
                <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-lg" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PlayerCard;
