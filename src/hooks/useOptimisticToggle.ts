import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { getEntityDomain } from "@/lib/entityUtils";

/**
 * Hook pour gérer les toggles optimistes des entités HA
 * (sauf media_player qui conserve son comportement actuel)
 */
export function useOptimisticToggle() {
  const client = useHAStore((state) => state.client);
  const entities = useHAStore((state) => state.entities);
  const setPendingAction = useHAStore((state) => state.setPendingAction);
  const clearPendingAction = useHAStore((state) => state.clearPendingAction);
  const setEntities = useHAStore((state) => state.setEntities);

  const toggleEntity = async (entityId: string) => {
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
    const prevState = entity.state;
    const isOn = prevState === "on";
    const targetState = isOn ? "off" : "on";
    const service = isOn ? "turn_off" : "turn_on";

    // 1. Marquer l'action comme en attente
    setPendingAction(entityId, targetState);

    // 2. Mettre à jour immédiatement l'UI locale
    const updatedEntities = entities?.map((e) =>
      e.entity_id === entityId ? { ...e, state: targetState } : e
    ) || [];
    setEntities(updatedEntities);

    // 3. Envoyer la commande à HA
    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
      toast.success(isOn ? "Éteint" : "Allumé");
    } catch (error) {
      console.error("Erreur lors du contrôle:", error);
      
      // Rollback immédiat en cas d'erreur
      clearPendingAction(entityId);
      const rolledBackEntities = entities?.map((e) =>
        e.entity_id === entityId ? { ...e, state: prevState } : e
      ) || [];
      setEntities(rolledBackEntities);
      
      toast.error("Erreur lors du contrôle");
    }
  };

  const controlEntity = async (
    entityId: string,
    service: string,
    data?: any,
    targetState?: string
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
      const prevState = entity.state;
      
      // 1. Marquer l'action comme en attente
      setPendingAction(entityId, targetState);

      // 2. Mettre à jour immédiatement l'UI locale
      const updatedEntities = entities?.map((e) =>
        e.entity_id === entityId ? { ...e, state: targetState } : e
      ) || [];
      setEntities(updatedEntities);

      // 3. Envoyer la commande à HA
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("Erreur lors du contrôle:", error);
        
        // Rollback immédiat en cas d'erreur
        clearPendingAction(entityId);
        const rolledBackEntities = entities?.map((e) =>
          e.entity_id === entityId ? { ...e, state: prevState } : e
        ) || [];
        setEntities(rolledBackEntities);
        
        throw error;
      }
    } else {
      // Pas d'UI optimiste si on ne connaît pas l'état cible
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("Erreur lors du contrôle:", error);
        throw error;
      }
    }
  };

  return {
    toggleEntity,
    controlEntity,
  };
}
