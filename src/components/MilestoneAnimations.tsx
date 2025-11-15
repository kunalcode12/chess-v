import { useEffect, useState } from "react";
import { Sparkles, Zap, Gift, Crown, Star } from "lucide-react";

interface MilestoneAnimationsProps {
  activeMilestone: number | null;
  activePerk: string | null;
  auraActive: boolean;
  auraTimeLeft: number;
  celestialActive: boolean;
  displayName: string;
}

const MilestoneAnimations = ({
  activeMilestone,
  activePerk,
  auraActive,
  auraTimeLeft,
  celestialActive,
  displayName,
}: MilestoneAnimationsProps) => {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    // Text-only fallback
    return (
      <>
        {activeMilestone === 25 && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-white bg-[#262421] p-4 rounded-lg border border-[#3d3935]">
            +25 Points!
          </div>
        )}
        {activeMilestone === 50 && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-white bg-[#262421] p-4 rounded-lg border border-[#3d3935]">
            +50 Points!
          </div>
        )}
        {activeMilestone === 100 && activePerk && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-white bg-[#262421] p-4 rounded-lg border border-[#3d3935]">
            Reward: {activePerk}
          </div>
        )}
        {auraActive && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 text-white bg-[#262421] p-4 rounded-lg border border-[#3d3935]">
            500 Point Power Mode! ({auraTimeLeft}s)
          </div>
        )}
        {celestialActive && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-white bg-[#262421] p-4 rounded-lg border border-[#3d3935]">
            CELESTIAL STORM ACTIVATED!
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* 25 Points - Spark Pop */}
      {activeMilestone === 25 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="relative">
            {/* Spark burst */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                  style={{
                    transform: `rotate(${i * 45}deg) translateY(-30px)`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
            {/* Floating +25 text */}
            <div className="text-2xl font-bold text-yellow-400 animate-bounce">
              +25!
            </div>
          </div>
        </div>
      )}

      {/* 50 Points - Mini Fireworks */}
      {activeMilestone === 50 && (
        <>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            {/* Firework particles */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                style={{
                  transform: `rotate(${i * 30}deg) translateY(-40px)`,
                  animation: `firework 1s ease-out forwards`,
                  animationDelay: "0s",
                }}
              />
            ))}
            <div className="text-3xl font-bold text-yellow-400 animate-pulse">
              +50 Points!
            </div>
          </div>
          {/* Board border glow */}
          <div className="fixed inset-0 pointer-events-none z-40">
            <div
              className="absolute inset-0 border-4 border-yellow-400 animate-pulse"
              style={{ animationDuration: "0.2s" }}
            />
          </div>
        </>
      )}

      {/* 100 Points - Reward Box */}
      {activeMilestone === 100 && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="relative">
            {/* Box drop animation */}
            <div
              className="text-6xl animate-bounce"
              style={{ animationDuration: "0.8s" }}
            >
              📦
            </div>
            {/* Box open with poof */}
            {activePerk && (
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in">
                <div className="text-4xl mb-2">✨</div>
                <div className="text-xl font-bold text-yellow-400">
                  You unlocked:
                </div>
                <div className="text-lg text-white mt-1">{activePerk}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 500 Points - Aura Upgrade */}
      {auraActive && (
        <>
          {/* Swirling aura around streamer side */}
          <div className="fixed top-0 left-0 w-1/2 h-full pointer-events-none z-40">
            <div className="absolute inset-0 border-4 border-purple-500 rounded-r-full animate-pulse opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent animate-spin-slow" />
          </div>
          {/* Countdown timer */}
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-[#262421] border border-purple-500 rounded-full w-16 h-16 flex items-center justify-center">
              <div className="text-white font-bold">{auraTimeLeft}</div>
            </div>
          </div>
          {/* Banner */}
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg font-bold text-lg animate-pulse">
              500 Point Power Mode!
            </div>
          </div>
        </>
      )}

      {/* 5000 Points - Celestial Storm */}
      {celestialActive && (
        <>
          {/* Screen dim */}
          <div className="fixed inset-0 bg-black/50 z-50 pointer-events-none animate-fade-in" />
          {/* Star particles */}
          <div className="fixed inset-0 z-50 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          {/* Giant emblem */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="text-8xl mb-4 animate-spin-slow">⭐</div>
            <div className="text-4xl font-bold text-yellow-400 text-center animate-pulse">
              CELESTIAL STORM
            </div>
            <div className="text-2xl font-bold text-white text-center mt-2 animate-pulse">
              ACTIVATED!
            </div>
            {/* Beam effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/50 via-transparent to-transparent animate-pulse" />
          </div>
        </>
      )}

      <style>{`
        @keyframes firework {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0);
            opacity: 0;
          }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-in;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </>
  );
};

export default MilestoneAnimations;

