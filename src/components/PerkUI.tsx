import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Flame, Shield, Target, Clock, Snowflake, Zap } from "lucide-react";

interface PerkUIProps {
  hintToken: number | boolean;
  fireTrailMoves: number;
  shieldUses: number;
  timeBonus: number;
  freezeOpponent: boolean;
}

const PerkUI = ({
  hintToken,
  fireTrailMoves,
  shieldUses,
  timeBonus,
  freezeOpponent,
}: PerkUIProps) => {
  const hasActivePerks = (typeof hintToken === 'boolean' ? hintToken : hintToken > 0) || fireTrailMoves > 0 || shieldUses > 0 || timeBonus > 0 || freezeOpponent;

  if (!hasActivePerks) return null;

  const perks = [
    (typeof hintToken === 'boolean' ? hintToken : hintToken > 0) && {
      icon: Lightbulb,
      label: "Hint Token",
      value: hintToken,
      color: "blue",
      bg: "from-blue-900/20 to-blue-800/20",
      border: "border-blue-500/30",
      text: "text-blue-300",
      iconColor: "text-blue-400",
    },
    fireTrailMoves > 0 && {
      icon: Flame,
      label: "Fire-Trail",
      value: fireTrailMoves,
      color: "orange",
      bg: "from-orange-900/20 to-orange-800/20",
      border: "border-orange-500/30",
      text: "text-orange-300",
      iconColor: "text-orange-400",
    },
    shieldUses > 0 && {
      icon: Shield,
      label: "Shield",
      value: shieldUses,
      color: "purple",
      bg: "from-purple-900/20 to-purple-800/20",
      border: "border-purple-500/30",
      text: "text-purple-300",
      iconColor: "text-purple-400",
    },
    timeBonus > 0 && {
      icon: Clock,
      label: "Time Bonus",
      value: `+${timeBonus}s`,
      color: "green",
      bg: "from-green-900/20 to-green-800/20",
      border: "border-green-500/30",
      text: "text-green-300",
      iconColor: "text-green-400",
    },
    freezeOpponent && {
      icon: Snowflake,
      label: "Frozen",
      value: "1s",
      color: "cyan",
      bg: "from-cyan-900/20 to-cyan-800/20",
      border: "border-cyan-500/30",
      text: "text-cyan-300",
      iconColor: "text-cyan-400",
      animate: "animate-pulse",
    },
  ].filter(Boolean);

  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h3 className="text-sm font-black tracking-widest uppercase text-white/90">Active Perks</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        
        <div className="space-y-2">
          {perks.map((perk, idx) => {
            const Icon = perk.icon;
            return (
              <div
                key={idx}
                className={`group relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${perk.bg} border ${perk.border} transition-all duration-300 hover:scale-[1.02] ${perk.animate || ''}`}
              >
                {/* Subtle glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${perk.bg} opacity-0 group-hover:opacity-100 transition-opacity rounded-lg blur-sm`} />
                
                <div className={`relative p-2 rounded-lg bg-black/30 border ${perk.border}`}>
                  <Icon className={`w-5 h-5 ${perk.iconColor}`} />
                </div>
                
                <span className={`text-xs font-bold ${perk.text} flex-1`}>
                  {perk.label}
                </span>
                
                <Badge className={`bg-black/50 ${perk.border} ${perk.text} text-[10px] font-black px-2 py-0.5`}>
                  {typeof perk.value === 'number' ? perk.value : typeof perk.value === 'string' ? perk.value : 'Active'}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default PerkUI;
