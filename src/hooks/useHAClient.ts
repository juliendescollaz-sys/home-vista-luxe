import { useEffect, useRef, useState } from "react";
import { HAClient } from "@/lib/haClient";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity } from "@/types/homeassistant";

export function useHAClient() {
  const connection = useHAStore((state) => state.connection);
  const setConnected = useHAStore((state) => state.setConnected);
  const setConnectionStatus = useHAStore((state) => state.setConnectionStatus);
  const setLastError = useHAStore((state) => state.setLastError);
  const setEntities = useHAStore((state) => state.setEntities);
  const setAreas = useHAStore((state) => state.setAreas);
  const setFloors = useHAStore((state) => state.setFloors);
  const setDevices = useHAStore((state) => state.setDevices);
  const setEntityRegistry = useHAStore((state) => state.setEntityRegistry);
  
  const clientRef = useRef<HAClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reconnectingRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction de synchronisation complète
  const fullSync = async (client: HAClient) => {
    console.log("🔄 Synchronisation complète avec HA...");
    try {
      const [entities, areas, floors, devices, entityRegistry] = await Promise.all([
        client.getStates(),
        client.listAreas(),
        client.listFloors().catch(() => [] as any[]),
        client.listDevices().catch(() => [] as any[]),
        client.listEntities().catch(() => [] as any[]),
      ]);

      setEntities(entities);
      setAreas(areas);
      setFloors(floors);
      setDevices(devices);
      setEntityRegistry(entityRegistry);

      console.log("✅ Synchronisation terminée:", {
        entities: entities.length,
        areas: areas.length,
        floors: floors.length,
        devices: devices.length,
        entityRegistry: entityRegistry.length,
      });

      // Nettoyer ancien abonnement et en créer un nouveau
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // CRITIQUE iOS : réinstaller le handler local après chaque sync
      let lastEventAt = Date.now();
      unsubscribeRef.current = client.on("state_changed", (data: any) => {
        lastEventAt = Date.now();
        if (data?.new_state) {
          const currentEntities = useHAStore.getState().entities;
          const index = currentEntities.findIndex((e: HAEntity) => e.entity_id === data.new_state.entity_id);
          if (index >= 0) {
            const newEntities = [...currentEntities];
            newEntities[index] = data.new_state;
            setEntities(newEntities);
          } else {
            setEntities([...currentEntities, data.new_state]);
          }
        }
      });

      console.log("✅ Handler state_changed réinstallé");
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!connection || !connection.url || !connection.token) {
      console.log("⚠️ Pas de connexion configurée");
      setConnected(false);
      return;
    }

    let cancelled = false;

    const boot = async () => {
      setIsConnecting(true);
      setError(null);
      setConnectionStatus("connecting");
      setLastError(null);

      try {
        console.log("🔄 Initialisation du client HA...");
        const client = new HAClient({
          baseUrl: connection.url,
          token: connection.token,
        });

        await client.connect();
        if (cancelled) return;

        clientRef.current = client;
        useHAStore.getState().setClient(client);
        setConnected(true);
        setConnectionStatus("connected");
        setLastError(null);

        // Variable partagée pour le watchdog et l'abonnement
        let lastEventAt = Date.now();

        // Synchronisation initiale
        await fullSync(client);

        // Watchdog de fraîcheur (seulement quand visible)
        const VISIBLE_STALENESS_MS = 2500;
        let watchdogTimer: number | null = null;
        
        const checkStaleness = async () => {
          if (document.visibilityState !== "visible") return;
          const stale = Date.now() - lastEventAt > VISIBLE_STALENESS_MS;
          if (stale) {
            try {
              if (!client.isConnected()) await client.connect();
              await fullSync(client);
              lastEventAt = Date.now();
              (window as any).__NEOLIA_LAST_RESUME_AT__ = lastEventAt;
            } catch (e) {
              console.error("❌ Watchdog resync error:", e);
            }
          }
        };
        
        watchdogTimer = window.setInterval(checkStaleness, 800) as unknown as number;

        // CRITIQUE iOS : resync au retour d'avant-plan (fiable en PWA/WebView)
        const reconnect = async () => {
          if (reconnectingRef.current) return;
          reconnectingRef.current = true;
          
          console.log("🔄 Reconnexion en cours...");
          setConnectionStatus("reconnecting");
          setLastError(null);
          
          try {
            await client.connect();
            await fullSync(client);
            setConnectionStatus("connected");
            setConnected(true);
            setLastError(null);
            (window as any).__NEOLIA_LAST_RESUME_AT__ = Date.now();
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error("❌ Erreur reconnexion:", err);
            
            let userError = "Erreur de reconnexion";
            if (errorMsg.toLowerCase().includes("timeout")) {
              userError = "Timeout - Home Assistant ne répond pas";
            } else if (errorMsg.toLowerCase().includes("auth")) {
              userError = "Timeout d'authentification - merci de vous reconnecter";
            }
            
            setLastError(userError);
            setConnectionStatus("error");
            setConnected(false);
          } finally {
            reconnectingRef.current = false;
          }
        };

        const onAppPause = () => {
          const currentStatus = useHAStore.getState().connectionStatus;
          // Ne pas mettre en pause si on est en train de se connecter/reconnecter
          if (currentStatus === "connecting" || currentStatus === "reconnecting") {
            console.log("⏸️ App en arrière-plan (ignoré - connexion en cours)");
            return;
          }
          console.log("⏸️ App en arrière-plan");
          setConnectionStatus("paused");
        };

        const onAppResume = async () => {
          if (document.visibilityState !== "visible") return;
          
          const currentStatus = useHAStore.getState().connectionStatus;
          // Ne pas reconnecter si déjà connecté ou en cours de connexion
          if (currentStatus === "connected" || currentStatus === "connecting" || currentStatus === "reconnecting") {
            console.log("▶️ App au premier plan (déjà connecté ou connexion en cours)");
            return;
          }
          
          console.log("▶️ App au premier plan - reconnexion nécessaire");
          await reconnect();
        };

        const onVisible = () => {
          if (document.visibilityState === "visible") {
            onAppResume();
          } else {
            onAppPause();
          }
        };

        const onOnline = () => {
          console.log("🌐 Réseau revenu");
          onAppResume();
        };

        const onFocus = () => {
          console.log("🎯 Focus revenu");
          onAppResume();
        };

        const onPageShow = (e: PageTransitionEvent) => {
          if (e.persisted) {
            console.log("📄 Page restaurée (bfcache)");
            onAppResume();
          }
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("online", onOnline);
        window.addEventListener("focus", onFocus);
        window.addEventListener("pageshow", onPageShow as any);

        return () => {
          if (watchdogTimer) clearInterval(watchdogTimer);
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("online", onOnline);
          window.removeEventListener("focus", onFocus);
          window.removeEventListener("pageshow", onPageShow as any);
        };
      } catch (err) {
        if (cancelled) return;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("❌ Erreur connexion HA:", err);
        
        // Typer l'erreur pour l'utilisateur
        let userError = "Erreur de connexion à Home Assistant";
        if (errorMsg.toLowerCase().includes("timeout")) {
          userError = "Timeout - Home Assistant ne répond pas";
        } else if (errorMsg.toLowerCase().includes("auth") || errorMsg.includes("401") || errorMsg.includes("403")) {
          userError = "Timeout d'authentification - merci de vous reconnecter";
        }
        
        setError(errorMsg);
        setLastError(userError);
        setConnectionStatus("error");
        setConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };

    const cleanup = boot();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (clientRef.current) {
        console.log("🔌 Nettoyage de la connexion...");
        clientRef.current.disconnect();
        clientRef.current = null;
        useHAStore.getState().setClient(null);
      }
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [connection?.url, connection?.token]);

  return {
    client: clientRef.current,
    isConnecting,
    error,
    isConnected: clientRef.current?.isConnected() || false,
  };
}
