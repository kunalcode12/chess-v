import { Snowflake } from "lucide-react";

interface FreezeOverlayProps {
  active: boolean;
}

const FreezeOverlay = ({ active }: FreezeOverlayProps) => {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-sm" />
      <div className="relative bg-[#262421] border-2 border-cyan-400 rounded-lg p-6 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <Snowflake className="w-12 h-12 text-cyan-400 animate-spin" />
          <div className="text-xl font-bold text-cyan-300">OPPONENT FROZEN!</div>
          <div className="text-sm text-[#b5b5b5]">Your opponent cannot move for 1 second</div>
        </div>
      </div>
    </div>
  );
};

export default FreezeOverlay;

