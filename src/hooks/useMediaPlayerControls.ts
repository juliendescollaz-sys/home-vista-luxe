import { useRef, useState, useEffect, useCallback } from "react";
import { HAClient } from "@/lib/haClient";

const IN_FLIGHT_TIMEOUT_MS = 4000;
const CONFIRMATION_WINDOW_MS = 1500;

type MediaState = "playing" | "paused" | "idle" | "off" | "standby" | "buffering" | "unavailable";

export function useMediaPlayerControls(
  client: HAClient | null,
  entityId: string, 
  currentState: MediaState
) {
  // Stabiliser entityId pour éviter des comportements incohérents au retour d'arrière-plan iOS
  const stableEntityId = entityId || "";
  
  const [inFlightAction, setInFlightAction] = useState<"play" | "pause" | null>(null);
  const timerRef = useRef<number | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const lastCommandRef = useRef<"play" | "pause" | null>(null);
  const retryRef = useRef(false);

  // Stop tout spinner de manière sûre
  const clearInFlight = useCallback(() => {
    if (timerRef.current) { 
      window.clearTimeout(timerRef.current); 
      timerRef.current = null; 
    }
    if (confirmTimerRef.current) { 
      window.clearTimeout(confirmTimerRef.current); 
      confirmTimerRef.current = null; 
    }
    setInFlightAction(null);
  }, []);

  // Confirmation par remontée HA (websocket/poll)
  useEffect(() => {
    if (!inFlightAction) return;

    // Conditions de confirmation
    const okPlay = inFlightAction === "play" && 
      (currentState === "playing" || currentState === "buffering");
    const okPause = inFlightAction === "pause" && 
      (currentState === "paused" || currentState === "idle" || 
       currentState === "off" || currentState === "standby");

    if (okPlay || okPause) {
      clearInFlight();
      retryRef.current = false;
      lastCommandRef.current = null;
    }
  }, [currentState, inFlightAction, clearInFlight]);

  // Envoi générique + gestion retry/rollback
  const sendAction = useCallback(async (action: "play" | "pause") => {
    if (inFlightAction || !client) return; // single-flight
    
    setInFlightAction(action);
    lastCommandRef.current = action;

    // Timeout dur: stopper spinner quoi qu'il arrive
    timerRef.current = window.setTimeout(() => {
      clearInFlight();
      retryRef.current = false;
    }, IN_FLIGHT_TIMEOUT_MS) as unknown as number;

    // Fenêtre de confirmation courte: si pas d'ACK, on tente 1 retry
    confirmTimerRef.current = window.setTimeout(async () => {
      // Si toujours pas confirmé, 1 retry
      if (inFlightAction && !retryRef.current) {
        retryRef.current = true;
        try {
          if (action === "play") {
            await client.callService("media_player", "media_play", undefined, { 
              entity_id: stableEntityId 
            });
          } else {
            await client.callService("media_player", "media_pause", undefined, { 
              entity_id: stableEntityId 
            });
          }
        } catch (e) {
          console.warn("Retry media action failed", e);
        }
      }
    }, CONFIRMATION_WINDOW_MS) as unknown as number;

    try {
      if (action === "play") {
        await client.callService("media_player", "media_play", undefined, { 
          entity_id: stableEntityId 
        });
      } else {
        await client.callService("media_player", "media_pause", undefined, { 
          entity_id: stableEntityId 
        });
      }
    } catch (e) {
      console.error("Media action error", e);
      clearInFlight();
      retryRef.current = false;
      lastCommandRef.current = null;
    }
  }, [stableEntityId, inFlightAction, clearInFlight, client]);

  // API publique
  const play = useCallback(() => sendAction("play"), [sendAction]);
  const pause = useCallback(() => sendAction("pause"), [sendAction]);

  return {
    play,
    pause,
    inFlight: Boolean(inFlightAction),
    lastAction: lastCommandRef.current as ("play" | "pause" | null),
    stopSpinner: clearInFlight,
  };
}
