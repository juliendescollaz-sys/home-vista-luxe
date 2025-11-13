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
const SNAPSHOT_EPSILON_SEC = 0.5; // marge anti-jitter

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
  const lastVisualPosRef = useRef(0); // position visuelle en continu
  const lastResumeAtRef = useRef<number>(0); // fence temps pour iOS resume

  // Mettre à jour la position visuelle
  const updateLastVisualPos = useCallback((p: number) => {
    lastVisualPosRef.current = Math.max(0, p);
  }, []);

  // Récupérer la dernière position visuelle
  const getLastVisualPos = useCallback(() => {
    return lastVisualPosRef.current || 0;
  }, []);

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

  // Synchroniser le fence temps au marqueur global de resume
  useEffect(() => {
    const t = (window as any).__NEOLIA_LAST_RESUME_AT__;
    if (typeof t === "number" && t > (lastResumeAtRef.current || 0)) {
      lastResumeAtRef.current = t;
    }
  }, []);

  // Purge des verrous en cours lors d'un fullSync ou changement significatif
  useEffect(() => {
    if (!entity) return;
    
    // Si position ou duration changent significativement, purger les verrous
    const posUpdatedAt = entity.attributes?.media_position_updated_at;
    if (posUpdatedAt && (pendingSeekRef.current || suppressRef.current)) {
      const delta = Date.now() - Date.parse(posUpdatedAt);
      // Si les données HA sont fraîches (< 3s), c'est probablement un fullSync
      if (delta < 3000) {
        console.log("🧹 Purge des verrous (fullSync détecté)");
        suppressRef.current = null;
        pendingSeekRef.current = null;
      }
    }
  }, [entity?.attributes?.media_position_updated_at, entity?.attributes?.media_duration]);

  // Mise à jour depuis l'entité HA (avec gestion pendingSeek)
  useEffect(() => {
    if (!entity || isDragging) return;
    
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
      suppressRef.current = null;
      pendingSeekRef.current = null;
      setTimeline({
        position: 0,
        duration: newDuration,
        state: newState,
        positionUpdatedAt: newPositionUpdatedAt || new Date().toISOString(),
        repeat: newRepeat,
        media_content_id: newMediaContentId,
        media_title: newMediaTitle,
      });
      setPhase(newState === "playing" ? "playing" : "paused");
      forceUpdate(Date.now());
      return;
    }

    // PRIORITÉ ABSOLUE : états paused/idle/off TOUJOURS traités immédiatement
    if (newState === "paused" || newState === "idle" || newState === "off" || newState === "standby") {
      const incoming = Number(newPosition) || 0;
      const snap = getLastVisualPos();
      const fixed = Math.max(incoming, snap - SNAPSHOT_EPSILON_SEC);

      lastTrackRef.current = trackKey;
      suppressRef.current = null;
      pendingSeekRef.current = null;
      
      setTimeline({
        position: fixed,
        duration: newDuration,
        state: newState,
        positionUpdatedAt: fixed > incoming ? new Date().toISOString() : newPositionUpdatedAt,
        repeat: newRepeat,
        media_content_id: newMediaContentId,
        media_title: newMediaTitle,
      });

      setPhase("paused");
      if (pauseConfirmTimer.current) {
        clearTimeout(pauseConfirmTimer.current);
        pauseConfirmTimer.current = null;
      }
      if (playConfirmTimer.current) {
        clearTimeout(playConfirmTimer.current);
        playConfirmTimer.current = null;
      }
      return;
    }

    // Gestion pendingSeek pour les états playing/buffering uniquement
    const isSuppress = suppressRef.current === entity.entity_id;
    const pending = pendingSeekRef.current;

    if (isSuppress && pending) {
      const haPos = entity.attributes?.media_position || 0;
      const positionConfirmed = Math.abs(haPos - pending.pos) <= 1.5;
      const timedOut = Date.now() > pending.deadline;

      if (positionConfirmed || timedOut) {
        suppressRef.current = null;
        pendingSeekRef.current = null;
      } else {
        // Toujours en attente du seek
        return;
      }
    } else if (isSuppress) {
      // Suppress actif sans pending : ignorer temporairement
      return;
    }

    // Horodatage HA de la position pour fence iOS
    const haUpdated = Date.parse(newPositionUpdatedAt || entity.last_updated || "");
    const fence = lastResumeAtRef.current || 0;
    const isStaleAfterResume = fence > 0 && !Number.isNaN(haUpdated) && haUpdated < fence;
    const adjustedPositionUpdatedAt = isStaleAfterResume 
      ? new Date(fence).toISOString() 
      : newPositionUpdatedAt;

    // Mise à jour normale depuis HA (playing/buffering)
    lastTrackRef.current = trackKey;
    setTimeline({
      position: newPosition,
      duration: newDuration,
      state: newState,
      positionUpdatedAt: adjustedPositionUpdatedAt,
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
  
  // Mettre à jour lastVisualPos pour le smoothing ET le ref pour les snapshots
  useEffect(() => {
    if (!isDragging) {
      setLastVisualPos(currentPosition);
      updateLastVisualPos(currentPosition);
    }
  }, [currentPosition, isDragging, updateLastVisualPos]);

  // Contrôles de phase
  const beginPendingPlay = useCallback(() => {
    setPhase("pending_play");
    // Ne pas modifier la position, reprise exacte depuis le snapshot pause
    if (playConfirmTimer.current) {
      clearTimeout(playConfirmTimer.current);
    }
    playConfirmTimer.current = window.setTimeout(() => {
      // Timeout: ne pas rollback, laisser HA décider
    }, PLAY_CONFIRM_TIMEOUT_MS) as unknown as number;
  }, []);

  const beginPendingPause = useCallback(() => {
    const snap = getLastVisualPos();
    setPhase("pending_pause");
    
    // Snapshot visuel : figer exactement à la valeur affichée
    setTimeline(prev => ({
      ...prev,
      state: "paused", // visuel gelé immédiatement
      position: snap,
      positionUpdatedAt: new Date().toISOString(),
    }));
    
    if (pauseConfirmTimer.current) {
      clearTimeout(pauseConfirmTimer.current);
    }
    pauseConfirmTimer.current = window.setTimeout(() => {
      // Timeout: rester gelé sur le snapshot, pas de rollback
    }, PAUSE_CONFIRM_TIMEOUT_MS) as unknown as number;
  }, [getLastVisualPos]);

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
