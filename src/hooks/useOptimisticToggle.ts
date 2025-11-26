import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import { getEntityDomain } from "@/lib/entityUtils";

/**
 * Hook pour gérer les toggles optimistes des entités HA avec timeout et rollback automatique
 * 
 * Comportement :
 * - Mise à jour immédiate de l'UI (optimistic update)
 * - Envoi de la commande à Home Assistant
 * - Timeout de 5 secondes : si aucune confirmation WebSocket, rollback automatique
 * - Rollback immédiat en cas d'erreur réseau
 * 
 * Exception : media_player conserve son comportement non-optimiste
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

    // 1. Marquer l'action comme en attente (avec timeout de 5 secondes)
    setPendingAction(entityId, targetState, 5000);

    // 2. Mettre à jour immédiatement l'UI locale
    const updatedEntities = entities?.map((e) =>
      e.entity_id === entityId ? { ...e, state: targetState } : e
    ) || [];
    setEntities(updatedEntities);

    // 3. Programmer le rollback automatique si pas de confirmation WebSocket dans 5s
    const timeoutId = setTimeout(() => {
      const currentEntity = useHAStore.getState().entities?.find((e) => e.entity_id === entityId);
      
      // Si l'état n'a toujours pas été confirmé par HA (encore en pending)
      if (currentEntity && useHAStore.getState().pendingActions[entityId]) {
        console.warn(`⏱️ Timeout pour ${entityId}, rollback automatique`);
        clearPendingAction(entityId);
        
        const rolledBackEntities = useHAStore.getState().entities?.map((e) =>
          e.entity_id === entityId ? { ...e, state: prevState } : e
        ) || [];
        setEntities(rolledBackEntities);
        
        toast.error("Commande expirée - état restauré");
      }
    }, 5000);

    // 4. Envoyer la commande à HA
    try {
      await client.callService(domain, service, {}, { entity_id: entityId });
      // Pas de toast de succès ici - on attend la confirmation WebSocket
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("❌ Erreur réseau lors du contrôle:", error);
      clearTimeout(timeoutId);
      
      // Rollback immédiat en cas d'erreur réseau
      clearPendingAction(entityId);
      const rolledBackEntities = entities?.map((e) =>
        e.entity_id === entityId ? { ...e, state: prevState } : e
      ) || [];
      setEntities(rolledBackEntities);
      
      toast.error("Erreur de connexion - état restauré");
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
      
      // 1. Marquer l'action comme en attente (avec timeout de 5 secondes)
      setPendingAction(entityId, targetState, 5000);

      // 2. Mettre à jour immédiatement l'UI locale
      const updatedEntities = entities?.map((e) =>
        e.entity_id === entityId ? { ...e, state: targetState } : e
      ) || [];
      setEntities(updatedEntities);

      // 3. Programmer le rollback automatique si pas de confirmation dans 5s
      const timeoutId = setTimeout(() => {
        const currentEntity = useHAStore.getState().entities?.find((e) => e.entity_id === entityId);
        
        if (currentEntity && useHAStore.getState().pendingActions[entityId]) {
          console.warn(`⏱️ Timeout pour ${entityId}, rollback automatique`);
          clearPendingAction(entityId);
          
          const rolledBackEntities = useHAStore.getState().entities?.map((e) =>
            e.entity_id === entityId ? { ...e, state: prevState } : e
          ) || [];
          setEntities(rolledBackEntities);
          
          toast.error("Commande expirée - état restauré");
        }
      }, 5000);

      // 4. Envoyer la commande à HA
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("❌ Erreur réseau lors du contrôle:", error);
        clearTimeout(timeoutId);
        
        // Rollback immédiat en cas d'erreur réseau
        clearPendingAction(entityId);
        const rolledBackEntities = entities?.map((e) =>
          e.entity_id === entityId ? { ...e, state: prevState } : e
        ) || [];
        setEntities(rolledBackEntities);
        
        toast.error("Erreur de connexion - état restauré");
        throw error;
      }
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
