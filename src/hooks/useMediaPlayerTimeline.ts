import { useState, useEffect, useRef, useCallback } from "react";
import { HAEntity } from "@/types/homeassistant";
import { HAClient } from "@/lib/haClient";

interface TimelineState {
  position: number;
  duration: number;
  state: "playing" | "paused" | "idle" | "off" | "unavailable" | "buffering";
  positionUpdatedAt?: string;
}

interface PendingSeek {
  pos: number;
  wasPlaying: boolean;
  deadline: number;
}

export function useMediaPlayerTimeline(
  client: HAClient | null,
  entity: HAEntity | undefined
) {
  const [timeline, setTimeline] = useState<TimelineState>({
    position: entity?.attributes?.media_position || 0,
    duration: entity?.attributes?.media_duration || 0,
    state: (entity?.state as any) || "idle",
    positionUpdatedAt: entity?.attributes?.media_position_updated_at,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [, forceUpdate] = useState(0);
  const suppressRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<PendingSeek | null>(null);
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
      const computed = base + elapsed;
      
      // Si on dépasse la durée, rester à la fin jusqu'à ce que HA envoie la nouvelle position
      if (computed > dur && dur > 0) {
        return dur;
      }
      
      return Math.min(computed, dur);
    } catch {
      return Math.min(base, dur);
    }
  }, []);

  // Mise à jour depuis l'entité HA (avec gestion pendingSeek)
  useEffect(() => {
    if (!entity || isDragging) return;
    
    const isSuppress = suppressRef.current === entity.entity_id;
    const pending = pendingSeekRef.current;

    // Si on attend la confirmation du seek
    if (isSuppress && pending) {
      const haPos = entity.attributes?.media_position || 0;
      const positionConfirmed = Math.abs(haPos - pending.pos) <= 1.5;
      const timedOut = Date.now() > pending.deadline;

      if (positionConfirmed || timedOut) {
        // Confirmation reçue ou timeout : lever le verrou
        suppressRef.current = null;
        pendingSeekRef.current = null;
      } else {
        // Toujours en attente : ignorer cet event
        return;
      }
    } else if (isSuppress) {
      // Suppress actif sans pending (cas legacy) : ignorer
      return;
    }

    const newPosition = entity.attributes?.media_position || 0;
    const newDuration = entity.attributes?.media_duration || 0;
    const newState = entity.state as any;
    const newPositionUpdatedAt = entity.attributes?.media_position_updated_at;

    // Détecter un changement de piste (reset de position en boucle par exemple)
    const positionJumped = Math.abs((timeline.position || 0) - newPosition) > 5;
    
    // Mise à jour normale depuis HA
    setTimeline({
      position: newPosition,
      duration: newDuration,
      state: newState,
      positionUpdatedAt: newPositionUpdatedAt,
    });

    // Si la position a sauté (nouvelle piste ou loop), forcer un re-render
    if (positionJumped) {
      forceUpdate(Date.now());
    }
  }, [
    entity,
    entity?.attributes?.media_position,
    entity?.attributes?.media_duration,
    entity?.attributes?.media_position_updated_at,
    entity?.state,
    entity?.entity_id,
    isDragging,
    timeline.position,
  ]);

  // Timer pour forcer un re-render toutes les secondes (animation visuelle)
  useEffect(() => {
    if (!entity || timeline.state !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Forcer un re-render toutes les secondes pour animer la timeline
    timerRef.current = window.setInterval(() => {
      if (!isDragging && suppressRef.current !== entity.entity_id) {
        forceUpdate(Date.now());
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [entity, timeline.state, isDragging]);

  // Contrôles
  const handlePlayPause = useCallback(async () => {
    if (!client || !entity) return;

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
  }, [client, entity, timeline.state]);

  // Seek handlers
  const handleSeekStart = useCallback(() => {
    if (!entity) return;
    setIsDragging(true);
    suppressRef.current = entity.entity_id;
    setLocalPosition(timeline.position);
  }, [entity, timeline.position]);

  const handleSeekChange = useCallback((value: number) => {
    setLocalPosition(value);
  }, []);

  const handleSeekEnd = useCallback(async () => {
    if (!entity) return;
    const wasPlaying = timeline.state === "playing";
    
    setIsDragging(false);

    if (!client) return;

    // Optimisme : mise à jour immédiate du modèle local
    const now = new Date().toISOString();
    setTimeline(prev => ({
      ...prev,
      position: localPosition,
      positionUpdatedAt: now,
      state: wasPlaying ? "playing" : "paused",
    }));

    // Créer le verrou optimiste
    pendingSeekRef.current = {
      pos: localPosition,
      wasPlaying,
      deadline: Date.now() + 2500, // 2.5s de fenêtre
    };

    suppressRef.current = entity.entity_id;

    try {
      await client.callService(
        "media_player",
        "media_seek",
        { seek_position: localPosition },
        { entity_id: entity.entity_id }
      );
    } catch (error) {
      console.error("Erreur seek:", error);
      // En cas d'erreur, lever immédiatement le verrou
      suppressRef.current = null;
      pendingSeekRef.current = null;
    }
  }, [client, entity, localPosition, timeline.state]);

  // Calculer la position courante de façon absolue (pas incrémentale)
  const currentPosition = isDragging 
    ? localPosition 
    : computePositionNow(timeline, Date.now());
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
