import { useState, useEffect } from "react";

export type Handedness = "right" | "left";

const HANDEDNESS_KEY = "neolia_handedness";

export function useHandedness() {
  const [handedness, setHandednessState] = useState<Handedness>(() => {
    const stored = localStorage.getItem(HANDEDNESS_KEY);
    return (stored as Handedness) || "right";
  });

  const setHandedness = (value: Handedness) => {
    localStorage.setItem(HANDEDNESS_KEY, value);
    setHandednessState(value);
  };

  return { handedness, setHandedness };
}
