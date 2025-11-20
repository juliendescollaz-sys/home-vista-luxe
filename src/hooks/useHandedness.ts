import { useState, useEffect } from "react";

export type Handedness = "right" | "left";

const HANDEDNESS_KEY = "neolia_handedness";
const HANDEDNESS_EVENT = "neolia_handedness_changed";

export function useHandedness() {
  const [handedness, setHandednessState] = useState<Handedness>(() => {
    const stored = localStorage.getItem(HANDEDNESS_KEY);
    return (stored as Handedness) || "right";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(HANDEDNESS_KEY);
      setHandednessState((stored as Handedness) || "right");
    };

    window.addEventListener(HANDEDNESS_EVENT, handleStorageChange);
    return () => window.removeEventListener(HANDEDNESS_EVENT, handleStorageChange);
  }, []);

  const setHandedness = (value: Handedness) => {
    localStorage.setItem(HANDEDNESS_KEY, value);
    setHandednessState(value);
    // Dispatch custom event pour notifier tous les autres composants
    window.dispatchEvent(new Event(HANDEDNESS_EVENT));
  };

  return { handedness, setHandedness };
}
