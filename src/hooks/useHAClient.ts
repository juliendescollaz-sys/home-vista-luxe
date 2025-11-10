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
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection || !connection.url || !connection.token) {
      console.log("⚠️ Pas de connexion configurée");
      setConnected(false);
      return;
    }

    const connectAndSync = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        console.log("🔄 Initialisation du client HA...");
        const client = new HAClient({
          baseUrl: connection.url,
          token: connection.token,
        });

        await client.connect();
        clientRef.current = client;
        setConnected(true);

        console.log("🔄 Synchronisation des données...");
        
        // Charger toutes les données en parallèle
        const [entities, areas, floors, devices, entityRegistry] = await Promise.all([
          client.getStates(),
          client.listAreas(),
          client.listFloors().catch(() => [] as any[]), // Les floors peuvent ne pas exister
          client.listDevices().catch(() => [] as any[]), // Les devices peuvent ne pas être accessibles
          client.listEntities().catch(() => [] as any[]), // Le registre des entités
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

        // S'abonner aux changements d'état
        const unsubscribe = client.subscribeStateChanges((data) => {
          if (data.new_state) {
            // Mettre à jour l'entité dans le store
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

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error("❌ Erreur de connexion:", error);
        setError(error instanceof Error ? error.message : "Erreur de connexion");
        setConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };

    connectAndSync();

    return () => {
      if (clientRef.current) {
        console.log("🔌 Nettoyage de la connexion...");
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [connection?.url, connection?.token]);

  return {
    client: clientRef.current,
    isConnecting,
    error,
    isConnected: clientRef.current?.isConnected() || false,
  };
}
