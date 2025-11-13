import { useEffect, useRef, useState } from "react";
import { HAClient } from "@/lib/haClient";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity } from "@/types/homeassistant";

export function useHAClient() {
  const connection = useHAStore((state) => state.connection);
  const setConnected = useHAStore((state) => state.setConnected);
  const setEntities = useHAStore((state) => state.setEntities);
  const setAreas = useHAStore((state) => state.setAreas);
  const setFloors = useHAStore((state) => state.setFloors);
  const setDevices = useHAStore((state) => state.setDevices);
  const setEntityRegistry = useHAStore((state) => state.setEntityRegistry);
  
  const clientRef = useRef<HAClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
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
    let reconnecting = false; // CRITIQUE iOS : protection contre appels multiples

    const boot = async () => {
      setIsConnecting(true);
      setError(null);

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

        // CRITIQUE iOS : forcer reconnect + fullSync + resubscription au retour premier plan
        const onVisible = async () => {
          if (document.visibilityState !== "visible" || reconnecting) return;
          console.log("👁️ App au premier plan, resync...");
          reconnecting = true;
          try {
            // Force reconnect pour réactiver le WS si gelé
            await client.connect();
            await fullSync(client);
            (window as any).__NEOLIA_LAST_RESUME_AT__ = Date.now();
          } catch (e) {
            console.error("❌ Erreur resync:", e);
          } finally {
            reconnecting = false;
          }
        };

        // Resync sur récupération réseau
        const onOnline = async () => {
          if (reconnecting) return;
          console.log("🌐 Connexion réseau rétablie, resync...");
          reconnecting = true;
          try {
            await client.connect();
            await fullSync(client);
            (window as any).__NEOLIA_LAST_RESUME_AT__ = Date.now();
          } catch (e) {
            console.error("❌ Erreur resync online:", e);
          } finally {
            reconnecting = false;
          }
        };

        // CRITIQUE iOS : resync au retour d'avant-plan (fiable en PWA/WebView)
        const onFocus = async () => {
          if (reconnecting) return;
          console.log("🔄 Focus détecté, resync...");
          reconnecting = true;
          try {
            await client.connect();
            await fullSync(client);
            (window as any).__NEOLIA_LAST_RESUME_AT__ = Date.now();
          } catch (e) {
            console.error("❌ Erreur resync on focus:", e);
          } finally {
            reconnecting = false;
          }
        };

        // CRITIQUE iOS : pageshow est le plus fiable pour détecter le retour d'arrière-plan
        const onPageShow = async (ev: PageTransitionEvent) => {
          if (reconnecting) return;
          console.log("📄 Pageshow détecté, resync...");
          reconnecting = true;
          try {
            await client.connect();
            await fullSync(client);
            (window as any).__NEOLIA_LAST_RESUME_AT__ = Date.now();
          } catch (e) {
            console.error("❌ Erreur resync on pageshow:", e);
          } finally {
            reconnecting = false;
          }
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("online", onOnline);
        window.addEventListener("focus", onFocus);
        window.addEventListener("pageshow", onPageShow as EventListener);

        return () => {
          if (watchdogTimer) clearInterval(watchdogTimer);
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("online", onOnline);
          window.removeEventListener("focus", onFocus);
          window.removeEventListener("pageshow", onPageShow as EventListener);
        };
      } catch (error) {
        console.error("❌ Erreur de connexion:", error);
        setError(error instanceof Error ? error.message : "Erreur de connexion");
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
