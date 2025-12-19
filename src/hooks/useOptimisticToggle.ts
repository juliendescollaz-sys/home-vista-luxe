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

  // --- suppression des faux positifs pendant onboarding / transition panel ---
  const isPanelTransition =
    typeof window !== "undefined" &&
    sessionStorage.getItem("neolia_panel_transition") === "1";

  const toggleEntity = async (entityId: string, onRollback?: () => void) => {
    console.info("[Neolia] toggleEntity appelé", { entityId, hasClient: !!client });

    if (!client) {
      console.error("[Neolia] toggleEntity - Client non connecté");
      if (!isPanelTransition) {
        toast.error("Client non connecté");
      }
      return;
    }

    if (!client.isConnected()) {
      console.error("[Neolia] toggleEntity - WebSocket non connecté");
      if (!isPanelTransition) {
        toast.error("Connexion Home Assistant perdue");
      }
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) {
      console.error("[Neolia] toggleEntity - Entité non trouvée", entityId);
      return;
    }

    const domain = getEntityDomain(entityId);

    // Ne pas appliquer l'UI optimiste aux media_player
    if (domain === "media_player") {
      const isOn = entity.state === "on";
      const service = isOn ? "turn_off" : "turn_on";

      try {
        await client.callService(domain, service, {}, { entity_id: entityId });
        toast.success(isOn ? "Éteint" : "Allumé");
      } catch (error) {
        console.error("[Neolia] Erreur contrôle media_player:", error);
        toast.error("Erreur lors du contrôle");
      }
      return;
    }

    // UI optimiste pour les autres domaines
    const isOn = entity.state === "on";
    const targetState = isOn ? "off" : "on";
    const service = isOn ? "turn_off" : "turn_on";

    console.info("[Neolia] toggleEntity - Appel triggerEntityToggle", {
      entityId,
      currentState: entity.state,
      targetState,
      service: `${domain}.${service}`,
    });

    await triggerEntityToggle(
      entityId,
      targetState,
      async () => {
        await client.callService(domain, service, {}, { entity_id: entityId });
      },
      onRollback,
    );
  };

  const controlEntity = async (
    entityId: string,
    service: string,
    data?: any,
    targetState?: string,
    onRollback?: () => void,
  ) => {
    console.info("[Neolia] controlEntity appelé", {
      entityId,
      service,
      targetState,
      hasClient: !!client,
    });

    if (!client) {
      console.error("[Neolia] controlEntity - Client non connecté");
      if (!isPanelTransition) {
        toast.error("Client non connecté");
      }
      return;
    }

    if (!client.isConnected()) {
      console.error("[Neolia] controlEntity - WebSocket non connecté");
      if (!isPanelTransition) {
        toast.error("Connexion Home Assistant perdue");
      }
      return;
    }

    const entity = entities?.find((e) => e.entity_id === entityId);
    if (!entity) {
      console.error("[Neolia] controlEntity - Entité non trouvée", entityId);
      return;
    }

    const domain = getEntityDomain(entityId);

    // Ne pas appliquer l'UI optimiste aux media_player
    if (domain === "media_player") {
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("[Neolia] Erreur contrôle media_player:", error);
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
        onRollback,
      );
    } else {
      // Pas d'UI optimiste si on ne connaît pas l'état cible
      try {
        await client.callService(domain, service, data, { entity_id: entityId });
      } catch (error) {
        console.error("[Neolia] Erreur contrôle (sans targetState):", error);
        toast.error("Erreur de communication avec Home Assistant");
        throw error;
      }
    }
  };

  return {
    toggleEntity,
    controlEntity,
  };
}
