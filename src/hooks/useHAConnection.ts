// src/hooks/useHAConnection.ts
import { useEffect, useState } from "react";
import { initHAConnection, getHAConnection } from "@/lib/haConnection";

/**
 * Hook minimaliste qui gère la connexion HA.
 * Aucune logique custom. On observe seulement.
 */
export function useHAConnection(haUrl: string, token: string) {
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "error"
  >("connecting");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setConnectionState("connecting");

      try {
        const conn = await initHAConnection(haUrl, token);
        if (cancelled) return;

        // Connexion initiale OK
        setConnectionState("connected");
        setError(null);

        // Liste des événements natifs HA
        conn.addEventListener("ready", () =>
          setConnectionState("connected")
        );
        conn.addEventListener("disconnected", () =>
          setConnectionState("connecting")
        );
        conn.addEventListener("reconnect-error", () =>
          setConnectionState("error")
        );
      } catch (err) {
        if (cancelled) return;
        setConnectionState("error");
        setError("Impossible de se connecter à Home Assistant");
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
  }, [haUrl, token]);

  return {
    connection: getHAConnection(),
    connectionState,
    error,
    isReady: connectionState === "connected",
  };
}
