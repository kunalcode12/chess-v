import { useEffect, useState } from "react";
import { Shield, Rewind } from "lucide-react";

interface ShieldActivationProps {
  active: boolean;
  rewindActive?: boolean;
  onComplete: () => void;
}

const ShieldActivation = ({ active, rewindActive = false, onComplete }: ShieldActivationProps) => {
  const [showParticles, setShowParticles] = useState(false);
  const [showRewindText, setShowRewindText] = useState(false);

  useEffect(() => {
    if (active) {
      // Show blue flash
      setShowParticles(true);
      
      // Hide after animation completes
      const timer = setTimeout(() => {
        setShowParticles(false);
        onComplete();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  useEffect(() => {
    if (rewindActive) {
      setShowRewindText(true);
      const timer = setTimeout(() => {
        setShowRewindText(false);
      }, 500); // Show for 0.5s
      return () => clearTimeout(timer);
    }
  }, [rewindActive]);

  if (!active && !showParticles && !rewindActive && !showRewindText) return null;

  return (
    <>
      {/* Blue flash overlay */}
      {active && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div 
            className="absolute inset-0 bg-blue-500/40 transition-opacity duration-200"
            style={{
              animation: "blueFlash 0.2s ease-out",
            }}
          />
        </div>
      )}

      {/* Rewind animation with ghost trail */}
      {rewindActive && (
        <div className="fixed inset-0 z-[65] pointer-events-none">
          {/* Ghost trail overlay - pieces moving backward */}
          <div 
            className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm"
            style={{
              animation: "rewindFade 0.5s ease-out",
            }}
          />
          
          {/* Reverse motion lines */}
          {[...Array(30)].map((_, i) => (
            <div
              key={`trail-${i}`}
              className="absolute w-1 h-full bg-blue-400/30"
              style={{
                left: `${(i / 30) * 100}%`,
                animation: `rewindTrail 0.5s ease-out forwards`,
                animationDelay: `${(i / 30) * 0.3}s`,
                transformOrigin: 'center',
              }}
            />
          ))}
        </div>
      )}

      {/* TURN REWOUND text */}
      {showRewindText && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[75] pointer-events-none">
          <div className="relative">
            {/* Rewind icon */}
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
              <Rewind className="w-12 h-12 text-blue-400 animate-pulse" />
            </div>
            
            {/* Text */}
            <div 
              className="bg-blue-900/90 border-2 border-blue-400 rounded-lg px-8 py-4 backdrop-blur-xl shadow-2xl"
              style={{
                animation: "rewindTextPop 0.5s ease-out",
              }}
            >
              <div className="text-2xl font-black tracking-widest uppercase text-blue-300 text-center">
                TURN REWOUND
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shield breaking particles */}
      {showParticles && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-none">
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Central shield icon */}
            <Shield className="w-16 h-16 text-blue-400 animate-pulse" />
            
            {/* Particle bursts */}
            {[...Array(20)].map((_, i) => {
              const angle = (i / 20) * 360;
              const distance = 80;
              const delay = Math.random() * 0.3;
              
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-blue-400 opacity-90"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-${distance}px)`,
                    animation: `shieldParticle 0.6s ease-out forwards`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
            
            {/* Additional sparkle particles */}
            {[...Array(15)].map((_, i) => {
              const angle = Math.random() * 360;
              const distance = 60 + Math.random() * 40;
              const delay = Math.random() * 0.4;
              
              return (
                <div
                  key={`sparkle-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-blue-300 opacity-80"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-${distance}px)`,
                    animation: `shieldParticle 0.6s ease-out forwards`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes blueFlash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        
        @keyframes shieldParticle {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0);
          }
        }

        @keyframes rewindFade {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes rewindTrail {
          0% {
            opacity: 0;
            transform: scaleY(1);
          }
          50% {
            opacity: 0.5;
            transform: scaleY(0.5);
          }
          100% {
            opacity: 0;
            transform: scaleY(0);
          }
        }

        @keyframes rewindTextPop {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default ShieldActivation;

