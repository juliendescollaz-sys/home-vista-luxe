import { useState, useEffect, useRef, useCallback } from "react";
import { HAEntity } from "@/types/homeassistant";
import { HAClient } from "@/lib/haClient";

type PlaybackPhase = "idle" | "pending_play" | "buffering" | "playing" | "pending_pause" | "paused";

interface TimelineState {
  position: number;
  duration: number;
  state: "playing" | "paused" | "idle" | "off" | "unavailable" | "buffering";
  positionUpdatedAt?: string;
  repeat?: "off" | "all" | "one";
  media_content_id?: string;
  media_title?: string;
}

interface PendingSeek {
  pos: number;
  wasPlaying: boolean;
  deadline: number;
}

const LOOP_EPSILON_SEC = 0.75;
const SMOOTHING_DURATION_MS = 200;
const START_CONFIRM_DELTA_SEC = 0.4;
const PLAY_CONFIRM_TIMEOUT_MS = 3500;
const PAUSE_CONFIRM_TIMEOUT_MS = 1800;

export function useMediaPlayerTimeline(
  client: HAClient | null,
  entity: HAEntity | undefined
) {
  const [timeline, setTimeline] = useState<TimelineState>({
    position: entity?.attributes?.media_position || 0,
    duration: entity?.attributes?.media_duration || 0,
    state: (entity?.state as any) || "idle",
    positionUpdatedAt: entity?.attributes?.media_position_updated_at,
    repeat: entity?.attributes?.repeat || "off",
    media_content_id: entity?.attributes?.media_content_id,
    media_title: entity?.attributes?.media_title,
  });

  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [lastVisualPos, setLastVisualPos] = useState(0);
  const [, forceUpdate] = useState(0);
  const suppressRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<PendingSeek | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTrackRef = useRef<string | undefined>(undefined);
  const playConfirmTimer = useRef<number | null>(null);
  const pauseConfirmTimer = useRef<number | null>(null);

  // Calcul de la position actuelle (avec animation pour playing et gestion repeat)
  const computePositionNow = useCallback((
    state: TimelineState, 
    nowMs: number, 
    lastVisual: number, 
    currentPhase: PlaybackPhase
  ): number => {
    const dur = Number(state.duration) || 0;
    const base = Number(state.position) || 0;
    
    if (dur <= 0) return 0;

    // Phases gelées: on n'avance pas la timeline
    if (currentPhase === "pending_play" || currentPhase === "buffering" || 
        currentPhase === "pending_pause" || currentPhase === "paused") {
      return Math.min(base, dur);
    }

    // Seulement en vraie lecture confirmée
    if (currentPhase !== "playing" || state.state !== "playing") {
      return Math.min(base, dur);
    }

    const updatedAt = Date.parse(state.positionUpdatedAt || "");
    const elapsed = isNaN(updatedAt) ? 0 : Math.max(0, (nowMs - updatedAt) / 1000);
    const computed = base + elapsed;

    // Gestion du repeat
    if (state.repeat === "one" || state.repeat === "all") {
      if (computed >= dur - LOOP_EPSILON_SEC) {
        const wrapped = computed % dur;
        const delta = (nowMs % SMOOTHING_DURATION_MS) / SMOOTHING_DURATION_MS;
        return lastVisual * (1 - delta) + wrapped * delta;
      }
      return Math.min(computed, dur);
    }

    // Sans repeat
    return Math.min(computed, dur);
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
    const newRepeat = entity.attributes?.repeat || "off";
    const newMediaContentId = entity.attributes?.media_content_id;
    const newMediaTitle = entity.attributes?.media_title;

    // Détecter un changement de piste
    const trackKey = `${newMediaContentId ?? ""}::${newMediaTitle ?? ""}`;
    const trackChanged = lastTrackRef.current !== undefined && lastTrackRef.current !== trackKey;
    
    if (trackChanged) {
      lastTrackRef.current = trackKey;
      setLastVisualPos(0);
      setTimeline({
        position: 0,
        duration: newDuration,
        state: newState,
        positionUpdatedAt: new Date().toISOString(),
        repeat: newRepeat,
        media_content_id: newMediaContentId,
        media_title: newMediaTitle,
      });
      forceUpdate(Date.now());
      return;
    }
    
    // Mise à jour normale depuis HA
    lastTrackRef.current = trackKey;
    setTimeline({
      position: newPosition,
      duration: newDuration,
      state: newState,
      positionUpdatedAt: newPositionUpdatedAt,
      repeat: newRepeat,
      media_content_id: newMediaContentId,
      media_title: newMediaTitle,
    });

    // Validation de la phase selon l'état HA
    const updatedAt = Date.parse(newPositionUpdatedAt || "");
    const movedRecently = !isNaN(updatedAt) && (Date.now() - updatedAt) < 1500;

    if (newState === "buffering") {
      setPhase("buffering");
    } else if (newState === "playing") {
      // Confirme lecture seulement si on voit la position bouger
      if (movedRecently && newPosition > 0 && newDuration > 0) {
        setPhase("playing");
        if (playConfirmTimer.current) {
          clearTimeout(playConfirmTimer.current);
          playConfirmTimer.current = null;
        }
      } else if (phase === "pending_play" || phase === "buffering") {
        setPhase("buffering");
      } else {
        setPhase("playing");
      }
    } else if (newState === "paused" || newState === "idle" || newState === "off") {
      setPhase("paused");
      if (pauseConfirmTimer.current) {
        clearTimeout(pauseConfirmTimer.current);
        pauseConfirmTimer.current = null;
      }
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
    phase,
  ]);

  // Timer pour forcer un re-render toutes les secondes (animation visuelle)
  useEffect(() => {
    if (!entity || phase !== "playing") {
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
  }, [entity, phase, isDragging]);

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
    
    setLastVisualPos(localPosition);

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
    : computePositionNow(timeline, Date.now(), lastVisualPos, phase);
  const currentDuration = timeline.duration;
  
  // Mettre à jour lastVisualPos pour le smoothing
  useEffect(() => {
    if (!isDragging) {
      setLastVisualPos(currentPosition);
    }
  }, [currentPosition, isDragging]);

  // Contrôles de phase
  const beginPendingPlay = useCallback(() => {
    setPhase("pending_play");
    if (playConfirmTimer.current) {
      clearTimeout(playConfirmTimer.current);
    }
    playConfirmTimer.current = window.setTimeout(() => {
      // Timeout: ne pas rollback, laisser HA décider
    }, PLAY_CONFIRM_TIMEOUT_MS) as unknown as number;
  }, []);

  const beginPendingPause = useCallback(() => {
    setPhase("pending_pause");
    if (pauseConfirmTimer.current) {
      clearTimeout(pauseConfirmTimer.current);
    }
    pauseConfirmTimer.current = window.setTimeout(() => {
      // Timeout: rester gelé
    }, PAUSE_CONFIRM_TIMEOUT_MS) as unknown as number;
  }, []);

  return {
    position: currentPosition,
    duration: currentDuration,
    state: timeline.state,
    phase,
    isDragging,
    handlePlayPause,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
    beginPendingPlay,
    beginPendingPause,
  };
}
