import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoveRight } from "lucide-react";

interface Move {
  move_notation: string;
  player_color: string;
  explanation?: string;
}

interface MoveHistoryProps {
  moves: Move[];
}

const MoveHistory = ({ moves }: MoveHistoryProps) => {
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
      
      <div className="relative p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Move History</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-1">
            {movePairs.map((pair) => (
              <div 
                key={pair.number} 
                className="group flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
              >
                {/* Move number */}
                <span className="text-xs font-black text-white/40 w-8 text-right tabular-nums">
                  {pair.number}.
                </span>
                
                {/* White move */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white px-3 py-1 bg-white/10 rounded border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                    {pair.white.move_notation}
                  </span>
                </div>
                
                {/* Arrow or Black move */}
                {pair.black ? (
                  <>
                    <MoveRight className="w-3 h-3 text-white/30" />
                    <span className="font-mono text-sm font-bold text-white px-3 py-1 bg-black/30 rounded border border-white/10 hover:bg-black/40 transition-colors cursor-default">
                      {pair.black.move_notation}
                    </span>
                  </>
                ) : (
                  <div className="w-3 h-3" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};

export default MoveHistory;
