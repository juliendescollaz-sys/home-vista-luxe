import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { getEntityDomain } from "@/lib/entityUtils";

/**
 * Hook pour gérer les toggles optimistes des entités HA avec système centralisé
 * 
 * Comportement :
 * - Mise à jour immédiate de l'UI (optimistic update) gérée par le composant
 * - Envoi de la commande à Home Assistant via triggerEntityToggle du store
 * - Le store gère : timeout 2s, confirmation WebSocket, cooldown 50ms, rollback automatique
 * 
 * Exception : media_player conserve son comportement non-optimiste
 */
export function useOptimisticToggle() {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const triggerEntityToggle = useHAStore((state) => state.triggerEntityToggle);

  const toggleEntity = async (entityId: string, onRollback?: () => void) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = getEntityDomain(entityId);
    
    // Ne pas appliquer l'UI optimiste aux media_player
    if (domain === "media_player") {
      const isOn = entity.state === "on";
      const service = isOn ? "turn_off" : "turn_on";
      
      try {
        await client.callService(domain, service, {}, { entity_id: entityId });
        toast.success(isOn ? "Éteint" : "Allumé");
      } catch (error) {
        console.error("Erreur lors du contrôle:", error);
        toast.error("Erreur lors du contrôle");
      }
      return;
    }

    // UI optimiste pour les autres domaines
    const isOn = entity.state === "on";
    const targetState = isOn ? "off" : "on";
    const service = isOn ? "turn_off" : "turn_on";

    await triggerEntityToggle(
      entityId,
      targetState,
      async () => {
        await client.callService(domain, service, {}, { entity_id: entityId });
      },
      onRollback
    );
  };

  const controlEntity = async (
    entityId: string,
    service: string,
    data?: any,
    targetState?: string,
    onRollback?: () => void
  ) => {
    if (!client) {
      toast.error("Client non connecté");
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) return;

    const domain = getEntityDomain(entityId);
    
    // Ne pas appliquer l'UI optimiste aux media_player
    if (domain === "media_player") {
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("Erreur lors du contrôle:", error);
        throw error;
      }
      return;
    }

    // UI optimiste pour les autres domaines (si targetState fourni)
    if (targetState) {
      await triggerEntityToggle(
        entityId,
        targetState,
        async () => {
          await client.callService(domain, service, data, { entity_id: entityId });
        },
        onRollback
      );
    } else {
      // Pas d'UI optimiste si on ne connaît pas l'état cible
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("❌ Erreur lors du contrôle:", error);
        toast.error("Erreur de connexion");
        throw error;
      }
    }
  };

  return {
    toggleEntity,
    controlEntity,
  };
}
