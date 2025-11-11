import { useState, useEffect, useRef, useCallback } from "react";
import { HAEntity } from "@/types/homeassistant";
import { HAClient } from "@/lib/haClient";

interface TimelineState {
  position: number;
  duration: number;
  state: "playing" | "paused" | "idle" | "off" | "unavailable" | "buffering";
  positionUpdatedAt?: string;
}

export function useMediaPlayerTimeline(
  client: HAClient | null,
  entity: HAEntity
) {
  const [timeline, setTimeline] = useState<TimelineState>({
    position: entity.attributes.media_position || 0,
    duration: entity.attributes.media_duration || 0,
    state: entity.state as any,
    positionUpdatedAt: entity.attributes.media_position_updated_at,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const suppressRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  // Calcul de la position actuelle (avec animation pour playing)
  const computePositionNow = useCallback((state: TimelineState, nowMs: number): number => {
    const dur = state.duration || 0;
    const base = state.position || 0;
    
    if (state.state !== "playing" || !state.positionUpdatedAt) {
      return Math.min(base, dur);
    }

    try {
      const t0 = Date.parse(state.positionUpdatedAt);
      if (isNaN(t0)) return Math.min(base, dur);
      
      const elapsed = Math.max(0, (nowMs - t0) / 1000);
      return Math.min(base + elapsed, dur);
    } catch {
      return Math.min(base, dur);
    }
  }, []);

  // Mise à jour depuis l'entité HA (si pas en train de drag)
  useEffect(() => {
    if (isDragging || suppressRef.current === entity.entity_id) return;

    setTimeline({
      position: entity.attributes.media_position || 0,
      duration: entity.attributes.media_duration || 0,
      state: entity.state as any,
      positionUpdatedAt: entity.attributes.media_position_updated_at,
    });
  }, [
    entity.attributes.media_position,
    entity.attributes.media_duration,
    entity.attributes.media_position_updated_at,
    entity.state,
    entity.entity_id,
    isDragging,
  ]);

  // Animation de la timeline (1s interval)
  useEffect(() => {
    if (timeline.state !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (!isDragging && suppressRef.current !== entity.entity_id) {
        setTimeline((prev) => ({
          ...prev,
          position: computePositionNow(prev, Date.now()),
        }));
      }
    };

    // Premier tick immédiat
    tick();

    // Puis toutes les secondes
    timerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeline.state, timeline.positionUpdatedAt, isDragging, entity.entity_id, computePositionNow]);

  // Contrôles
  const handlePlayPause = useCallback(async () => {
    if (!client) return;

    try {
      if (timeline.state === "playing") {
        await client.callService("media_player", "media_pause", undefined, {
          entity_id: entity.entity_id,
        });
      } else {
        await client.callService("media_player", "media_play", undefined, {
          entity_id: entity.entity_id,
        });
      }
    } catch (error) {
      console.error("Erreur play/pause:", error);
    }
  }, [client, entity.entity_id, timeline.state]);

  // Seek handlers
  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
    suppressRef.current = entity.entity_id;
    setLocalPosition(timeline.position);
  }, [entity.entity_id, timeline.position]);

  const handleSeekChange = useCallback((value: number) => {
    setLocalPosition(value);
  }, []);

  const handleSeekEnd = useCallback(async () => {
    setIsDragging(false);

    if (!client) return;

    try {
      await client.callService(
        "media_player",
        "media_seek",
        { seek_position: localPosition },
        { entity_id: entity.entity_id }
      );
    } catch (error) {
      console.error("Erreur seek:", error);
    }

    // Lever le suppress après 400ms
    setTimeout(() => {
      suppressRef.current = null;
    }, 400);
  }, [client, entity.entity_id, localPosition]);

  const currentPosition = isDragging ? localPosition : timeline.position;
  const currentDuration = timeline.duration;

  return {
    position: currentPosition,
    duration: currentDuration,
    state: timeline.state,
    isDragging,
    handlePlayPause,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
  };
}
