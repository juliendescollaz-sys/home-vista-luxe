import { useEffect, useCallback, useRef } from "react";
import { usePanelIntercomStore, useIsPanelIntercomConfigured } from "@/store/usePanelIntercomStore";
import { linphoneSipService } from "@/services/linphoneSipService";
import { Capacitor } from "@capacitor/core";

/**
 * Hook principal pour gérer l'interphone sur le Panel
 *
 * Ce hook :
 * - Initialise le SIP natif si configuré
 * - Écoute les appels entrants
 * - Gère les actions (répondre, raccrocher, ouvrir porte)
 * - Synchronise l'état avec le store
 *
 * Usage dans PanelRootLayout :
 * ```tsx
 * const {
 *   callState,
 *   callerName,
 *   answer,
 *   hangup,
 *   openDoor,
 *   isRinging,
 *   isInCall
 * } = usePanelIntercom();
 * ```
 */
export function usePanelIntercom() {
  const isConfigured = useIsPanelIntercomConfigured();
  const config = usePanelIntercomStore((s) => s.config);
  const currentCall = usePanelIntercomStore((s) => s.currentCall);
  const sipState = usePanelIntercomStore((s) => s.sipState);

  const setIncomingCall = usePanelIntercomStore((s) => s.setIncomingCall);
  const setCallState = usePanelIntercomStore((s) => s.setCallState);
  const setDoorOpened = usePanelIntercomStore((s) => s.setDoorOpened);
  const clearCall = usePanelIntercomStore((s) => s.clearCall);
  const setSipState = usePanelIntercomStore((s) => s.setSipState);
  const setError = usePanelIntercomStore((s) => s.setError);

  const isInitializedRef = useRef(false);
  const enabled = config.enabled;

  // Initialiser le SIP au montage si configuré et activé
  useEffect(() => {
    // Si désactivé, déconnecter
    if (!enabled) {
      console.log("[usePanelIntercom] Interphone désactivé");
      if (isInitializedRef.current) {
        linphoneSipService.destroy();
        isInitializedRef.current = false;
        setSipState("disconnected");
      }
      return;
    }

    if (!isConfigured) {
      console.log("[usePanelIntercom] Interphone non configuré, skip init");
      return;
    }

    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      console.log("[usePanelIntercom] Pas sur Android, skip init SIP natif");
      return;
    }

    if (isInitializedRef.current) {
      return;
    }

    const initSip = async () => {
      console.log("[usePanelIntercom] Initialisation SIP...");

      // Configurer les callbacks
      linphoneSipService.setCallbacks({
        onIncomingCall: (info) => {
          console.log("[usePanelIntercom] Appel entrant:", info);
          setIncomingCall(info.from, info.displayName);
        },
        onCallConnected: () => {
          console.log("[usePanelIntercom] Appel connecté");
          setCallState("incall");
        },
        onCallEnded: (reason) => {
          console.log("[usePanelIntercom] Appel terminé:", reason);
          setCallState("ended");
          // Effacer après un court délai
          setTimeout(() => {
            clearCall();
          }, 1000);
        },
        onRegistrationStateChanged: (state) => {
          console.log("[usePanelIntercom] État SIP:", state);
          setSipState(state);
        },
        onError: (error) => {
          console.error("[usePanelIntercom] Erreur SIP:", error);
          setError(error);
        },
      });

      // Initialiser et s'enregistrer
      const initResult = await linphoneSipService.initialize();
      if (!initResult) {
        console.error("[usePanelIntercom] Échec initialisation Linphone");
        setError("Échec initialisation Linphone");
        return;
      }

      const regResult = await linphoneSipService.register({
        server: config.sip.server,
        user: config.sip.user,
        password: config.sip.password,
        domain: config.sip.domain || config.sip.server,
        displayName: config.sip.user,
      });

      if (!regResult) {
        console.error("[usePanelIntercom] Échec enregistrement SIP");
        setError("Échec enregistrement SIP");
        return;
      }

      isInitializedRef.current = true;
      console.log("[usePanelIntercom] SIP initialisé et enregistrement en cours");
    };

    initSip();

    return () => {
      // Cleanup au démontage
      if (isInitializedRef.current) {
        linphoneSipService.destroy();
        isInitializedRef.current = false;
      }
    };
  }, [
    enabled,
    isConfigured,
    config.sip.server,
    config.sip.user,
    config.sip.password,
    config.sip.domain,
    setIncomingCall,
    setCallState,
    clearCall,
    setSipState,
    setError,
  ]);

  /**
   * Répondre à l'appel
   */
  const answer = useCallback(async () => {
    console.log("[usePanelIntercom] Répondre à l'appel");
    const success = await linphoneSipService.answer();
    if (success) {
      setCallState("incall");
    }
    return success;
  }, [setCallState]);

  /**
   * Raccrocher l'appel
   */
  const hangup = useCallback(async () => {
    console.log("[usePanelIntercom] Raccrocher");
    await linphoneSipService.hangup();
    clearCall();
  }, [clearCall]);

  /**
   * Rejeter l'appel entrant
   */
  const reject = useCallback(async () => {
    console.log("[usePanelIntercom] Rejeter l'appel");
    await linphoneSipService.reject();
    clearCall();
  }, [clearCall]);

  /**
   * Ouvrir la porte
   */
  const openDoor = useCallback(async () => {
    console.log("[usePanelIntercom] Ouvrir la porte");

    const { method, httpUrl, dtmfCode } = config.door;

    try {
      if (method === "http" && httpUrl) {
        // Appel HTTP pour ouvrir la porte
        console.log("[usePanelIntercom] Ouverture porte via HTTP:", httpUrl);
        const response = await fetch(httpUrl, { method: "GET" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } else if (method === "dtmf" && dtmfCode) {
        // Envoyer DTMF
        console.log("[usePanelIntercom] Ouverture porte via DTMF:", dtmfCode);
        await linphoneSipService.sendDtmf(dtmfCode);
      }

      setDoorOpened();

      // Raccrocher après le délai configuré
      const delay = config.door.videoDelayAfterOpen;
      if (delay > 0) {
        setTimeout(() => {
          hangup();
        }, delay * 1000);
      }
    } catch (error) {
      console.error("[usePanelIntercom] Erreur ouverture porte:", error);
      setError(`Erreur ouverture porte: ${error}`);
    }
  }, [config.door, setDoorOpened, hangup, setError]);

  /**
   * Toggle microphone
   */
  const toggleMicrophone = useCallback(async (enabled: boolean) => {
    await linphoneSipService.setMicrophoneEnabled(enabled);
  }, []);

  /**
   * Toggle haut-parleur
   */
  const toggleSpeaker = useCallback(async (enabled: boolean) => {
    await linphoneSipService.setSpeakerEnabled(enabled);
  }, []);

  return {
    // État
    isConfigured,
    sipState,
    currentCall,
    callState: currentCall?.state ?? null,
    callerName: currentCall?.displayName ?? "",
    callerFrom: currentCall?.from ?? "",
    doorOpened: currentCall?.doorOpened ?? false,

    // Raccourcis état
    isRinging: currentCall?.state === "ringing",
    isInCall: currentCall?.state === "incall",
    isRegistered: sipState === "registered",

    // Config
    config,
    videoUrl: config.video.whepUrl || (config.sip.server ? `http://${config.sip.server}:8889/akuvox/whep` : null),

    // Actions
    answer,
    hangup,
    reject,
    openDoor,
    toggleMicrophone,
    toggleSpeaker,
  };
}

export default usePanelIntercom;
