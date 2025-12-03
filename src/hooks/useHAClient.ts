import { useEffect, useRef, useState } from "react";
import { HAClient } from "@/lib/haClient";
import { useHAStore } from "@/store/useHAStore";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import type { HAEntity } from "@/types/homeassistant";

export function useHAClient() {
  const connection = useHAStore((state) => state.connection);
  const setConnected = useHAStore((state) => state.setConnected);
  const setEntities = useHAStore((state) => state.setEntities);
  const setAreas = useHAStore((state) => state.setAreas);
  const setFloors = useHAStore((state) => state.setFloors);
  const setDevices = useHAStore((state) => state.setDevices);
  const setEntityRegistry = useHAStore((state) => state.setEntityRegistry);
  const { displayMode } = useDisplayMode();
  const isPanel = displayMode === "panel";
  
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

      const stateChangedUnsubscribe = client.on("state_changed", (data: any) => {
        if (data?.new_state) {
          const entityId = data.new_state.entity_id;
          const newState = data.new_state.state;
          const oldState = data.old_state?.state;
          
          console.info("[Neolia] state_changed reçu", {
            entity_id: entityId,
            oldState,
            newState,
            hasPending: !!useHAStore.getState().pendingActions[entityId],
          });
          
          const currentEntities = useHAStore.getState().entities;
          const index = currentEntities.findIndex((e: HAEntity) => e.entity_id === entityId);
          if (index >= 0) {
            const newEntities = [...currentEntities];
            newEntities[index] = data.new_state;
            setEntities(newEntities);
          } else {
            setEntities([...currentEntities, data.new_state]);
          }
        }
      });

      // Écouter les reconnexions automatiques pour refaire un full sync
      const reconnectedUnsubscribe = client.on("reconnected", () => {
        console.log("🔄 Reconnexion WebSocket détectée, full sync...");
        fullSync(client).catch(console.error);
      });

      unsubscribeRef.current = () => {
        stateChangedUnsubscribe();
        reconnectedUnsubscribe();
      };
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!connection || !connection.url || !connection.token) {
      if (isPanel) {
        console.log("[NEOLIA][PANEL] ⚠️ Pas de connexion configurée");
      } else {
        console.log("⚠️ Pas de connexion configurée");
      }
      setConnected(false);
      return;
    }

    let cancelled = false;

    const boot = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        if (isPanel) {
          console.log("[NEOLIA][PANEL] 🔄 Initialisation du client HA...");
          console.log("[NEOLIA][PANEL] HA base URL =", connection.url);
          console.log("[NEOLIA][PANEL] Tentative de connexion à Home Assistant...");
        } else {
          console.log("🔄 Initialisation du client HA...");
        }
        
        const client = new HAClient({
          baseUrl: connection.url,
          token: connection.token,
        });

        await client.connect();
        if (cancelled) return;

        clientRef.current = client;
        useHAStore.getState().setClient(client);
        setConnected(true);
        
        if (isPanel) {
          console.log("[NEOLIA][PANEL] ✅ Connexion HA établie avec succès");
        }

        // Synchronisation initiale
        await fullSync(client);

        // Resync au retour au premier plan
        const onVisible = async () => {
          if (document.visibilityState !== "visible") return;
          console.log("👁️ App au premier plan, resync...");
          try {
            if (!client.isConnected()) {
              console.log("🔄 Reconnexion...");
              await client.connect();
            }
            await fullSync(client);
          } catch (e) {
            console.error("❌ Erreur resync:", e);
          }
        };

        // Resync sur récupération réseau
        const onOnline = async () => {
          console.log("🌐 Connexion réseau rétablie, resync...");
          try {
            if (!client.isConnected()) {
              await client.connect();
            }
            await fullSync(client);
          } catch (e) {
            console.error("❌ Erreur resync online:", e);
          }
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("online", onOnline);

        return () => {
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("online", onOnline);
        };
      } catch (error) {
        if (isPanel) {
          console.error("[NEOLIA][PANEL] ❌ Erreur connexion HA:", error);
          console.error("[NEOLIA][PANEL] URL tentée:", connection.url);
        } else {
          console.error("❌ Erreur de connexion:", error);
        }
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
