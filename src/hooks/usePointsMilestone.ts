import { useState, useEffect, useRef } from "react";

interface MilestoneEvent {
  milestone: number;
  displayName: string;
  points: number;
  reward?: string;
  timestamp: Date;
}

const MILESTONES = [25, 50, 100, 500, 5000];
const MILESTONE_PERKS: Record<number, string[]> = {
  100: [
    "+10s hint token",
    "1 fire-trail cosmetic move",
    "1 shield (undo)",
    "highlight best move 1s",
  ],
  500: ["+5s", "freeze opponent 1s"],
  5000: ["+20s", "double-move token", "2s best-move highlight", "10–20s cosmetic theme"],
};

export type PerkActivationCallback = (perkName: string) => void;

export const usePointsMilestone = (
  displayName: string = "Viewer",
  onPerkActivate?: PerkActivationCallback
) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [milestoneEvents, setMilestoneEvents] = useState<MilestoneEvent[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [activePerk, setActivePerk] = useState<string | null>(null);
  const [auraActive, setAuraActive] = useState(false);
  const [auraTimeLeft, setAuraTimeLeft] = useState(0);
  const [celestialActive, setCelestialActive] = useState(false);
  const pointsRef = useRef(0);
  const reachedMilestonesRef = useRef<Set<number>>(new Set());
  const auraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const triggerMilestone = (milestone: number, points: number) => {
    if (reachedMilestonesRef.current.has(milestone)) return;
    reachedMilestonesRef.current.add(milestone);

    const event: MilestoneEvent = {
      milestone,
      displayName,
      points,
      timestamp: new Date(),
    };

    // Get random perk for applicable milestones
    if (MILESTONE_PERKS[milestone]) {
      const perks = MILESTONE_PERKS[milestone];
      event.reward = perks[Math.floor(Math.random() * perks.length)];
      
      // Activate the perk
      if (onPerkActivate && event.reward) {
        onPerkActivate(event.reward);
      }
    }

    setMilestoneEvents((prev) => [event, ...prev.slice(0, 9)]);
    setActiveMilestone(milestone);

    // Handle milestone-specific effects
    switch (milestone) {
      case 25:
        if (!prefersReducedMotion) {
          setTimeout(() => setActiveMilestone(null), 800);
        }
        break;
      case 50:
        if (!prefersReducedMotion) {
          setTimeout(() => setActiveMilestone(null), 1000);
        }
        break;
      case 100:
        setActivePerk(event.reward || "");
        if (!prefersReducedMotion) {
          setTimeout(() => {
            setActivePerk(null);
            setActiveMilestone(null);
          }, 3000);
        }
        break;
      case 500:
        setAuraActive(true);
        setAuraTimeLeft(3);
        setActivePerk(event.reward || "");
        
        if (auraIntervalRef.current) {
          clearInterval(auraIntervalRef.current);
        }
        
        auraIntervalRef.current = setInterval(() => {
          setAuraTimeLeft((prev) => {
            if (prev <= 1) {
              if (auraIntervalRef.current) {
                clearInterval(auraIntervalRef.current);
                auraIntervalRef.current = null;
              }
              setAuraActive(false);
              setActivePerk(null);
              setActiveMilestone(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        break;
      case 5000:
        setCelestialActive(true);
        setActivePerk(event.reward || "");
        if (!prefersReducedMotion) {
          setTimeout(() => {
            setActiveMilestone(null);
            setTimeout(() => {
              setCelestialActive(false);
              setActivePerk(null);
            }, 15000);
          }, 3000);
        }
        break;
    }
  };

  const addPoints = (amount: number) => {
    const previousPoints = pointsRef.current;
    pointsRef.current += amount;
    const currentPoints = pointsRef.current;
    setTotalPoints(pointsRef.current);
    
    // Check for milestones - only trigger if we crossed the threshold
    // Check milestones in descending order to get the highest one reached
    const reachedMilestone = MILESTONES
      .slice()
      .reverse()
      .find(
        (m) => previousPoints < m && currentPoints >= m && !reachedMilestonesRef.current.has(m)
      );

    if (reachedMilestone) {
      triggerMilestone(reachedMilestone, currentPoints);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (auraIntervalRef.current) {
        clearInterval(auraIntervalRef.current);
      }
    };
  }, []);

  return {
    addPoints,
    totalPoints,
    milestoneEvents,
    activeMilestone,
    activePerk,
    auraActive,
    auraTimeLeft,
    celestialActive,
    displayName,
  };
};

