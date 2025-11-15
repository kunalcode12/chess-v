import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Clock,
  Zap,
  Package,
  Gift,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  Radio,
} from "lucide-react";

interface MonitorEvent {
  type: string;
  data: any;
  timestamp: Date;
}

interface ArenaMonitoringProps {
  arenaGameState: any;
  statusLabel: "pending" | "live" | "completed" | "stopped" | null;
  monitorCountdown: number | null;
  monitorArenaActive: boolean;
  monitorEvents: MonitorEvent[];
  currentCycle: any;
  lastBoost: any;
  lastDrop: any;
  streamUrl: string;
  onStreamUrlChange: (url: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
  showDisconnect: boolean;
  isGameCreator?: boolean;
}

const ArenaMonitoring = ({
  arenaGameState,
  statusLabel,
  monitorCountdown,
  monitorArenaActive,
  monitorEvents,
  currentCycle,
  lastBoost,
  lastDrop,
  streamUrl,
  onStreamUrlChange,
  onConnect,
  onDisconnect,
  isLoading,
  showDisconnect,
  isGameCreator = false,
}: ArenaMonitoringProps) => {
  const getStatusColor = () => {
    switch (statusLabel) {
      case "live":
        return "bg-green-500/20 border-green-500/50 text-green-300";
      case "pending":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
      case "completed":
        return "bg-blue-500/20 border-blue-500/50 text-blue-300";
      case "stopped":
        return "bg-gray-500/20 border-gray-500/50 text-gray-300";
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-300";
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <Card className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl">
      {/* Chess board pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:20px_20px] [background-position:0_0,10px_10px] opacity-5" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />

      <CardHeader className="relative pb-3 border-b-2 border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-widest uppercase text-white">
                Arena Monitoring
              </CardTitle>
              <p className="text-xs text-white/50 font-light mt-0.5">Live stream integration</p>
            </div>
          </div>
          <Badge className={`${getStatusColor()} font-black tracking-wider text-xs px-3 py-1 border-2`}>
            {statusLabel ? statusLabel.toUpperCase() : "DISCONNECTED"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative pt-4">
        {/* Connection Section - Only show to creator */}
        {!arenaGameState && isGameCreator && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                value={streamUrl}
                onChange={(e) => onStreamUrlChange(e.target.value)}
                placeholder="https://twitch.tv/yourchannel"
                className="bg-black/50 border-2 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 transition-all duration-300"
              />
            </div>
            <Button
              onClick={onConnect}
              disabled={isLoading || !streamUrl}
              className="bg-gradient-to-r from-white to-white/90 hover:from-white/90 hover:to-white text-black font-black tracking-wider uppercase border-2 border-white/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info for non-creator when arena not connected */}
        {!arenaGameState && !isGameCreator && (
          <div className="text-center py-4">
            <Radio className="w-6 h-6 mx-auto mb-2 text-white/40" />
            <p className="text-sm text-white/60 font-light">Waiting for game creator to connect...</p>
          </div>
        )}

        {/* Disconnect Button - Only show to creator */}
        {showDisconnect && isGameCreator && (
          <div className="mb-4">
            <Button
              onClick={onDisconnect}
              variant="destructive"
              className="w-full bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-900/60 hover:to-red-800/60 text-red-200 border-2 border-red-700/30 font-black tracking-wider uppercase transition-all duration-300 hover:scale-105"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect Arena
            </Button>
          </div>
        )}

        {/* Horizontal Boxes Layout */}
        {arenaGameState && (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* Game Info Box */}
            {arenaGameState && (
              <div className="relative p-3 bg-black/50 border-2 border-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-white/70" />
                  <span className="text-xs font-black tracking-widest uppercase text-white/70">Game ID</span>
                </div>
                <p className="font-mono text-xs font-black text-white tracking-wider truncate">
                  {arenaGameState.gameId?.slice(0, 8)}...
                </p>
              </div>
            )}

            {/* Countdown Box */}
            {monitorCountdown !== null && (
              <div className="relative p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-2 border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-black tracking-widest uppercase text-yellow-300">Countdown</span>
                </div>
                <p className="text-2xl font-black text-yellow-300 tabular-nums">{monitorCountdown}s</p>
              </div>
            )}

            {/* Arena Active Box */}
            {monitorArenaActive && (
              <div className="relative p-3 bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-black tracking-widest uppercase text-green-300">Active</span>
                </div>
              </div>
            )}

            {/* Current Cycle Box */}
            {currentCycle && (
              <div className="relative p-3 bg-black/50 border-2 border-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-black tracking-widest uppercase text-white/70">Cycle</span>
                </div>
                <p className="text-sm font-black text-white">
                  {currentCycle.currentCycle || currentCycle.cycle || "N/A"}
                </p>
              </div>
            )}

            {/* Last Boost Box */}
            {lastBoost && (
              <div className="relative p-3 bg-black/50 border-2 border-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-black tracking-widest uppercase text-white/70">Boost</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/60 truncate">
                    {lastBoost.playerName || lastBoost.boosterUsername || "Unknown"}
                  </p>
                  <p className="text-lg font-black text-yellow-300">
                    {lastBoost.boostAmount || lastBoost.currentCyclePoints || lastBoost.amount || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Last Drop Box */}
            {lastDrop && (
              <div className="relative p-3 bg-black/50 border-2 border-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  {lastDrop.type === "package_drop" ? (
                    <Package className="w-4 h-4 text-blue-300" />
                  ) : (
                    <Gift className="w-4 h-4 text-purple-300" />
                  )}
                  <span className="text-xs font-black tracking-widest uppercase text-white/70">
                    {lastDrop.type === "package_drop" ? "Package" : "Item"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/60 truncate">
                    {lastDrop.packageName || lastDrop.itemName || "Unknown"}
                  </p>
                  {lastDrop.cost && (
                    <p className="text-sm font-black text-yellow-300">{lastDrop.cost}</p>
                  )}
                </div>
              </div>
            )}

            {/* Events Count Box */}
            {monitorEvents.length > 0 && (
              <div className="relative p-3 bg-black/50 border-2 border-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-white/70" />
                  <span className="text-xs font-black tracking-widest uppercase text-white/70">Events</span>
                </div>
                <p className="text-2xl font-black text-white">{monitorEvents.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Events Log - Collapsible/Expandable */}
        {monitorEvents.length > 0 && (
          <div className="mt-4 relative border-2 border-white/10 bg-black/50 rounded-xl backdrop-blur-sm">
            <CardHeader className="pb-2 pt-3 border-b border-white/10">
              <CardTitle className="text-xs font-black tracking-widest uppercase flex items-center gap-2 text-white">
                <Activity className="w-3 h-3" />
                Events Log ({monitorEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[150px]">
                <div className="space-y-1.5 px-3 pb-3 pt-3">
                  {monitorEvents
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((event, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] p-2 bg-black/30 rounded border border-white/10 hover:bg-black/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className="text-[9px] border-white/20 text-white/70 font-bold px-1.5 py-0"
                          >
                            {event.type}
                          </Badge>
                          <span className="text-[9px] text-white/50 font-mono">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="text-[9px] text-white/60 font-mono truncate">
                          {JSON.stringify(event.data).slice(0, 80)}
                          {JSON.stringify(event.data).length > 80 && "..."}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </div>
        )}

        {/* Empty State */}
        {!arenaGameState && monitorEvents.length === 0 && (
          <div className="text-center py-6 text-white/40">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-light">No arena connection</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArenaMonitoring;
