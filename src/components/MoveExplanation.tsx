import { Card } from "@/components/ui/card";
import { Lightbulb, Sparkles } from "lucide-react";

interface MoveExplanationProps {
  move: string;
  explanation: string;
}

const MoveExplanation = ({ move, explanation }: MoveExplanationProps) => {
  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl animate-in slide-in-from-right">
      {/* Subtle pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%)] bg-[length:30px_30px]" />
      
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="relative p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30">
            <Lightbulb className="w-6 h-6 text-yellow-300" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Last Move</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              <code className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-sm font-mono font-bold text-white tracking-wider">
                {move}
              </code>
            </div>
            <p className="text-sm text-white/70 leading-relaxed font-light">
              {explanation}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MoveExplanation;
