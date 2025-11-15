import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flag, Handshake, Undo2, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GameControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  drawOfferedBy: string | null;
  playerColor: 'w' | 'b' | null;
  onAcceptDraw: () => void;
  onUndo?: () => void;
  shieldUses?: number;
}

const GameControls = ({ 
  onResign, 
  onOfferDraw, 
  drawOfferedBy, 
  playerColor,
  onAcceptDraw,
  onUndo,
  shieldUses = 0,
}: GameControlsProps) => {
  const opponentOfferedDraw = drawOfferedBy && 
    ((playerColor === 'w' && drawOfferedBy === 'black') || 
     (playerColor === 'b' && drawOfferedBy === 'white'));

  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Controls</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        
        {opponentOfferedDraw && (
          <div className="relative p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-2 border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,215,0,.05)_50%,transparent_75%)] bg-[length:20px_20px] animate-[slide_2s_linear_infinite]" />
            <div className="relative">
              <p className="text-sm font-bold mb-1 text-yellow-300 uppercase tracking-wide">Draw Offered</p>
              <p className="text-xs text-white/60 mb-4">
                Your opponent has offered a draw
              </p>
              <Button
                onClick={onAcceptDraw}
                className="w-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 text-yellow-200 border border-yellow-500/30 font-bold transition-all duration-300 hover:scale-105"
                size="sm"
              >
                <Handshake className="w-4 h-4 mr-2" />
                Accept Draw
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2 bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-900/60 hover:to-red-800/60 text-red-200 border border-red-700/30 font-bold transition-all duration-300 hover:scale-105"
              >
                <Flag className="w-4 h-4" />
                Resign
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-black/95 border-2 border-white/10 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white font-black text-xl">Resign Game?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  Are you sure you want to resign? This will end the game and your opponent will win.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onResign} className="bg-red-900/60 hover:bg-red-800/60 text-white border border-red-700/30">Resign</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={onOfferDraw}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold transition-all duration-300 hover:scale-105"
            disabled={drawOfferedBy === (playerColor === 'w' ? 'white' : 'black')}
          >
            <Handshake className="w-4 h-4" />
            {drawOfferedBy === (playerColor === 'w' ? 'white' : 'black') ? 'Draw Offered' : 'Offer Draw'}
          </Button>

          {onUndo && shieldUses > 0 && (
            <Button
              onClick={onUndo}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-blue-500/30 bg-gradient-to-r from-blue-900/20 to-blue-800/20 hover:from-blue-900/30 hover:to-blue-800/30 text-blue-300 font-bold transition-all duration-300 hover:scale-105"
            >
              <Shield className="w-4 h-4" />
              Undo Move ({shieldUses})
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default GameControls;
