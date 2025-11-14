import { useEffect, useRef, useState } from "react";

type HaState = {
  entity_id: string;
  state: string; // "playing" | "paused" | "idle" | ...
  attributes: {
    friendly_name?: string;
    shuffle?: boolean;               // bool
    repeat?: "off" | "all" | "one";  // string
    media_title?: string;
    media_artist?: string;
    [k: string]: any;
  };
};
type HaMsg =
  | { type: "auth_required" | "auth_ok" | "auth_invalid" }
  | { type: "result"; id: number; success: boolean; result?: any }
  | { type: "event"; id: number; event: any };

export function useSonos(ws: WebSocket | null, entityId: string) {
  const nextId = useRef(1);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<HaState | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const send = (msg: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: nextId.current++, ...msg }));
    }
  };

  // 1) init + subscribe
  useEffect(() => {
    if (!ws) return;

    const onMessage = (e: MessageEvent) => {
      try {
        const m: HaMsg = JSON.parse(e.data);
        if (m.type === "auth_ok") {
          setReady(true);
          send({ type: "get_states" });
          send({ type: "subscribe_events", event_type: "state_changed" });
        } else if (m.type === "result" && Array.isArray((m as any).result)) {
          const found = (m as any).result.find((s: HaState) => s.entity_id === entityId);
          if (found) setState(found);
        } else if (m.type === "event") {
          const ev = (m as any).event;
          if (ev?.event_type === "state_changed" && ev.data?.entity_id === entityId) {
            setState(ev.data.new_state as HaState);
            // libérer les boutons (fin d'action confirmée par HA)
            setPending({});
          }
        }
      } catch { /* ignore */ }
    };
    ws.addEventListener("message", onMessage);
    // Si la session est déjà auth_ok, on force init
    const initTimer = setTimeout(() => {
      setReady(true);
      send({ type: "get_states" });
      send({ type: "subscribe_events", event_type: "state_changed" });
    }, 200);

    return () => {
      ws.removeEventListener("message", onMessage);
      clearTimeout(initTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, entityId]);

  // Helpers
  const playing = state?.state === "playing";
  // 🔒 Important : cast strict pour éviter le "vrai" fantôme sur iOS
  const shuffle = state?.attributes?.shuffle === true;
  const repeat = (state?.attributes?.repeat ?? "off") as "off" | "all" | "one";

  // Services — on désactive le bouton (pending) et on attend state_changed
  const call = (domain: string, service: string, data?: Record<string, any>) =>
    send({ type: "call_service", domain, service, service_data: { entity_id: entityId, ...(data || {}) } });

  const playPause = () => { setPending(p => ({...p, playpause: true})); call("media_player","media_play_pause"); };
  const next = () =>       { setPending(p => ({...p, next: true}));      call("media_player","media_next_track"); };
  const prev = () =>       { setPending(p => ({...p, prev: true}));      call("media_player","media_previous_track"); };

  const toggleShuffle = () => {
    // ✅ HA attend un booléen strict; pas de string, pas d'optimisme UI
    setPending(p => ({...p, shuffle: true}));
    call("media_player", "shuffle_set", { shuffle: !shuffle });
  };

  const cycleRepeat = () => {
    // ✅ cycle fiable: off → all → one → off
    const nextRep = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    setPending(p => ({...p, repeat: true}));
    call("media_player", "repeat_set", { repeat: nextRep });
  };

  return {
    ready,
    state,
    playing,
    shuffle,
    repeat,
    pending,
    actions: { playPause, next, prev, toggleShuffle, cycleRepeat }
  };
}
