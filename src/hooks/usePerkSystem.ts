import { useState, useCallback, useRef } from "react";

export interface Perk {
  id: string;
  type: "hint" | "fire-trail" | "shield" | "best-move" | "time-bonus" | "freeze-opponent";
  name: string;
  active: boolean;
  usesLeft?: number;
  duration?: number;
}

export const usePerkSystem = () => {
  const [activePerks, setActivePerks] = useState<Perk[]>([]);
  const [hintToken, setHintToken] = useState(false);
  const [fireTrailMoves, setFireTrailMoves] = useState(0);
  const [shieldUses, setShieldUses] = useState(0);
  const [bestMoveHighlight, setBestMoveHighlight] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);
  const [freezeOpponent, setFreezeOpponent] = useState(false);
  const freezeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activatePerk = useCallback((perkName: string) => {
    const perkId = `perk-${Date.now()}-${Math.random()}`;

    switch (perkName) {
      case "+10s hint token":
        setHintToken(true);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "hint",
            name: perkName,
            active: true,
            usesLeft: 1,
          },
        ]);
        break;

      case "1 fire-trail cosmetic move":
        setFireTrailMoves((prev) => prev + 1);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "fire-trail",
            name: perkName,
            active: true,
            usesLeft: 1,
          },
        ]);
        break;

      case "1 shield (undo)":
        setShieldUses((prev) => prev + 1);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "shield",
            name: perkName,
            active: true,
            usesLeft: 1,
          },
        ]);
        break;

      case "highlight best move 1s":
        setBestMoveHighlight(true);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "best-move",
            name: perkName,
            active: true,
            duration: 1000,
          },
        ]);
        setTimeout(() => {
          setBestMoveHighlight(false);
          setActivePerks((prev) =>
            prev.filter((p) => p.id !== perkId)
          );
        }, 1000);
        break;

      case "+5s":
        setTimeBonus((prev) => prev + 5);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "time-bonus",
            name: perkName,
            active: true,
          },
        ]);
        break;

      case "freeze opponent 1s":
        setFreezeOpponent(true);
        setActivePerks((prev) => [
          ...prev,
          {
            id: perkId,
            type: "freeze-opponent",
            name: perkName,
            active: true,
            duration: 1000,
          },
        ]);
        
        if (freezeTimeoutRef.current) {
          clearTimeout(freezeTimeoutRef.current);
        }
        
        freezeTimeoutRef.current = setTimeout(() => {
          setFreezeOpponent(false);
          setActivePerks((prev) =>
            prev.filter((p) => p.id !== perkId)
          );
        }, 1000);
        break;
    }
  }, []);

  const useHintToken = useCallback(() => {
    if (hintToken) {
      setHintToken(false);
      setActivePerks((prev) =>
        prev.map((p) =>
          p.type === "hint" && p.usesLeft && p.usesLeft > 0
            ? { ...p, usesLeft: p.usesLeft - 1, active: p.usesLeft > 1 }
            : p
        ).filter((p) => p.active || (p.usesLeft && p.usesLeft > 0))
      );
      return true;
    }
    return false;
  }, [hintToken]);

  const useFireTrail = useCallback(() => {
    if (fireTrailMoves > 0) {
      setFireTrailMoves((prev) => prev - 1);
      setActivePerks((prev) =>
        prev.map((p) =>
          p.type === "fire-trail" && p.usesLeft && p.usesLeft > 0
            ? { ...p, usesLeft: p.usesLeft - 1, active: p.usesLeft > 1 }
            : p
        ).filter((p) => p.active || (p.usesLeft && p.usesLeft > 0))
      );
      return true;
    }
    return false;
  }, [fireTrailMoves]);

  const useShield = useCallback(() => {
    if (shieldUses > 0) {
      setShieldUses((prev) => prev - 1);
      setActivePerks((prev) =>
        prev.map((p) =>
          p.type === "shield" && p.usesLeft && p.usesLeft > 0
            ? { ...p, usesLeft: p.usesLeft - 1, active: p.usesLeft > 1 }
            : p
        ).filter((p) => p.active || (p.usesLeft && p.usesLeft > 0))
      );
      return true;
    }
    return false;
  }, [shieldUses]);

  const consumeTimeBonus = useCallback(() => {
    if (timeBonus > 0) {
      const bonus = timeBonus;
      setTimeBonus(0);
      setActivePerks((prev) =>
        prev.filter((p) => p.type !== "time-bonus")
      );
      return bonus;
    }
    return 0;
  }, [timeBonus]);

  return {
    activePerks,
    hintToken,
    fireTrailMoves,
    shieldUses,
    bestMoveHighlight,
    timeBonus,
    freezeOpponent,
    activatePerk,
    useHintToken,
    useFireTrail,
    useShield,
    consumeTimeBonus,
  };
};

