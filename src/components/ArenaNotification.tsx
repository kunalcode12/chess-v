import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Gift, X } from "lucide-react";

interface BoostNotification {
  type: "boost";
  boosterName: string;
  boostAmount: number;
}

interface ItemDropNotification {
  type: "item";
  itemName: string;
  cost: number;
  targetPlayerName: string;
  purchaserName: string;
}

type Notification = BoostNotification | ItemDropNotification;

interface ArenaNotificationProps {
  notification: Notification | null;
  onClose: () => void;
}

const ArenaNotification = ({ notification, onClose }: ArenaNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}
    >
      <Card className="bg-[#262421] border-[#3d3935] shadow-lg min-w-[300px] max-w-[400px]">
        {notification.type === "boost" ? (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-900/30 rounded-lg border border-yellow-600/50">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-white">Boost Activated</h4>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(onClose, 300);
                    }}
                    className="text-[#b5b5b5] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#b5b5b5] mb-2">
                  <span className="text-yellow-400 font-semibold">{notification.boosterName}</span> boosted with
                </p>
                <Badge className="bg-yellow-900/50 border-yellow-600/50 text-yellow-300 text-lg font-bold px-3 py-1">
                  +{notification.boostAmount}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-600/50">
                <Gift className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-white">Item Dropped</h4>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(onClose, 300);
                    }}
                    className="text-[#b5b5b5] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#b5b5b5] mb-1">
                  <span className="text-purple-400 font-semibold">{notification.itemName}</span>
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-[#b5b5b5]">
                    Purchased by: <span className="text-white">{notification.purchaserName}</span>
                  </p>
                  <p className="text-xs text-[#b5b5b5]">
                    Target: <span className="text-white">{notification.targetPlayerName}</span>
                  </p>
                  <Badge className="bg-purple-900/50 border-purple-600/50 text-purple-300 text-sm font-semibold px-2 py-0.5">
                    Cost: {notification.cost}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArenaNotification;

