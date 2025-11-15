import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Zap, Gift, Crown, Star } from "lucide-react";

interface MilestoneEvent {
  milestone: number;
  displayName: string;
  points: number;
  reward?: string;
  timestamp: Date;
}

interface MilestoneFeedProps {
  events: MilestoneEvent[];
}

const MilestoneFeed = ({ events }: MilestoneFeedProps) => {
  const getMilestoneIcon = (milestone: number) => {
    switch (milestone) {
      case 25:
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
      case 50:
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 100:
        return <Gift className="w-4 h-4 text-blue-400" />;
      case 500:
        return <Crown className="w-4 h-4 text-purple-400" />;
      case 5000:
        return <Star className="w-4 h-4 text-yellow-300" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getMilestoneColor = (milestone: number) => {
    switch (milestone) {
      case 25:
        return "bg-yellow-900/30 border-yellow-600/50";
      case 50:
        return "bg-yellow-900/30 border-yellow-600/50";
      case 100:
        return "bg-blue-900/30 border-blue-600/50";
      case 500:
        return "bg-purple-900/30 border-purple-600/50";
      case 5000:
        return "bg-yellow-900/50 border-yellow-500/70";
      default:
        return "bg-gray-900/30 border-gray-600/50";
    }
  };

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80">
      <Card className="bg-[#262421] border-[#3d3935] shadow-lg">
        <div className="p-3 border-b border-[#3d3935]">
          <h3 className="text-sm font-semibold text-white">Milestone Feed</h3>
        </div>
        <ScrollArea className="h-48">
          <div className="p-2 space-y-2">
            {events.map((event, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border ${getMilestoneColor(
                  event.milestone
                )} animate-fade-in`}
              >
                <div className="flex items-start gap-2">
                  {getMilestoneIcon(event.milestone)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-white truncate">
                        {event.displayName}
                      </span>
                      <span className="text-xs text-[#b5b5b5]">→</span>
                      <Badge
                        variant="outline"
                        className="text-xs bg-transparent border-current text-yellow-400"
                      >
                        +{event.milestone} points
                      </Badge>
                    </div>
                    {event.reward && (
                      <div className="text-xs text-[#b5b5b5] mt-1">
                        Reward: <span className="text-yellow-400">{event.reward}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default MilestoneFeed;

