import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EvaluationBarProps {
  evaluation: number; // Positive favors white, negative favors black (in pawns)
  mate?: number; // Moves to mate
}

const EvaluationBar = ({ evaluation, mate }: EvaluationBarProps) => {
  // For mate scores, show extreme advantage
  let displayEval = evaluation;
  let clampedEval = evaluation;
  
  if (mate !== undefined && mate !== null) {
    displayEval = mate > 0 ? 999 : -999;
    clampedEval = mate > 0 ? 10 : -10;
  } else {
    // Clamp evaluation between -10 and +10 for display
    clampedEval = Math.max(-10, Math.min(10, evaluation));
  }
  
  // Convert to percentage (0-100, where 50 is equal)
  const whitePercentage = ((clampedEval + 10) / 20) * 100;
  
  const getEvalText = () => {
    if (mate !== undefined && mate !== null) {
      return `M${Math.abs(mate)}`;
    }
    if (Math.abs(evaluation) > 5) {
      return evaluation > 0 ? "White winning" : "Black winning";
    } else if (Math.abs(evaluation) > 2) {
      return evaluation > 0 ? "White better" : "Black better";
    }
    return "Equal";
  };
  
  const getDisplayValue = () => {
    if (mate !== undefined && mate !== null) {
      return `M${Math.abs(mate)}`;
    }
    return `${evaluation > 0 ? '+' : ''}${evaluation.toFixed(1)}`;
  };

  const isWhiteWinning = evaluation > 0;
  const isBlackWinning = evaluation < 0;
  const isEqual = Math.abs(evaluation) < 0.5;

  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
      {/* Chess board pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:15px_15px] [background-position:0_0,7.5px_7.5px] opacity-5" />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWhiteWinning && <TrendingUp className="w-4 h-4 text-white" />}
            {isBlackWinning && <TrendingDown className="w-4 h-4 text-white" />}
            {isEqual && <Minus className="w-4 h-4 text-white/60" />}
            <span className="text-xs font-bold tracking-widest uppercase text-white/70">Evaluation</span>
          </div>
          <span className="text-xs font-black tracking-wider uppercase text-white">{getEvalText()}</span>
        </div>
        
        {/* Evaluation bar */}
        <div className="relative h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 transform -translate-x-1/2 z-10" />
          
          {/* White advantage bar */}
          <div 
            className="absolute top-0 right-0 h-full bg-gradient-to-l from-white via-white/90 to-white/70 transition-all duration-500 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            style={{ width: `${whitePercentage}%` }}
          />
          
          {/* Black advantage bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-black via-gray-900 to-gray-800 transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            style={{ width: `${100 - whitePercentage}%` }}
          />
        </div>
        
        {/* Labels and value */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-black border-2 border-white/20 rounded-sm shadow-lg"></div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Black</span>
          </div>
          
          <div className="px-4 py-1.5 bg-black/50 border border-white/10 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-black font-mono text-white tracking-wider">{getDisplayValue()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">White</span>
            <div className="w-4 h-4 bg-white border-2 border-white/20 rounded-sm shadow-lg"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EvaluationBar;
