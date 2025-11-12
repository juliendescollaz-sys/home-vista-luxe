import { useState, useEffect } from "react";
import { useHAStore } from "@/store/useHAStore";

export function useSunState() {
  const { entities } = useHAStore();
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    // Chercher l'entité sun.sun
    const sunEntity = entities?.find(e => e.entity_id === "sun.sun");
    
    if (sunEntity) {
      // Si on a sun.sun, utiliser above_horizon
      setIsNight(sunEntity.state !== "above_horizon");
    } else {
      // Fallback : heure locale (nuit entre 20h et 6h)
      const hour = new Date().getHours();
      setIsNight(hour >= 20 || hour < 6);
    }
  }, [entities]);

  return isNight;
}
