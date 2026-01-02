import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AkuvoxWebRTCService,
  type AkuvoxWebRTCConfig,
  type ConnectionMode,
} from '@/services/akuvoxWebRTCService';
import { useMediaMTXConfigStore, useIsMediaMTXConfigValid } from '@/store/useMediaMTXConfigStore';
import { useDisplayMode, type DisplayMode } from './useDisplayMode';

export type AkuvoxConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected';

export interface UseAkuvoxVideoResult {
  /** État de la connexion */
  status: AkuvoxConnectionStatus;

  /** État ICE de la connexion */
  iceConnectionState: RTCIceConnectionState | null;

  /** Flux vidéo/audio reçu de l'interphone */
  stream: MediaStream | null;

  /** Ref pour attacher le flux vidéo à un élément <video> */
  videoRef: React.RefObject<HTMLVideoElement>;

  /** Erreur éventuelle */
  error: string | null;

  /** Démarre la connexion */
  connect: () => Promise<void>;

  /** Ferme la connexion */
  disconnect: () => void;

  /** Indique si la config MediaMTX est valide */
  isConfigValid: boolean;

  /** Mode de connexion détecté (panel ou mobile) */
  connectionMode: ConnectionMode;
}

/**
 * Hook React pour gérer la connexion WebRTC vers le flux Akuvox
 *
 * Ce hook :
 * - Détecte automatiquement le mode (Panel vs Mobile/Tablet)
 * - Configure les ICE servers appropriés (avec/sans TURN)
 * - Gère le cycle de vie de la connexion WebRTC
 * - Expose le flux MediaStream pour affichage dans un <video>
 *
 * Usage :
 * ```tsx
 * const { status, stream, videoRef, connect, disconnect } = useAkuvoxVideo();
 *
 * // Dans le JSX
 * <video ref={videoRef} autoPlay playsInline />
 * ```
 */
export function useAkuvoxVideo(): UseAkuvoxVideoResult {
  const [status, setStatus] = useState<AkuvoxConnectionStatus>('idle');
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<AkuvoxWebRTCService | null>(null);
  const isConnectingRef = useRef<boolean>(false); // Guard pour éviter les connexions multiples

  // Récupérer la config MediaMTX depuis le store
  const { config: mediaMTXConfig, turnConfig, detectedMode } = useMediaMTXConfigStore();
  const isConfigValid = useIsMediaMTXConfigValid();

  // Détecter le mode d'affichage (panel, mobile, tablet)
  const { displayMode } = useDisplayMode();

  /**
   * Détermine le mode de connexion en fonction du mode réseau détecté
   * - Si detectedMode est défini (après détection), on l'utilise
   * - Sinon, fallback sur displayMode (panel → 'panel', autres → 'mobile')
   *
   * Cela permet à un iPhone en WiFi local d'utiliser le mode 'local' (sans TURN)
   * et un iPhone en 4G d'utiliser le mode 'remote' (avec TURN)
   */
  const connectionMode: ConnectionMode = detectedMode === 'local' ? 'panel' :
                                          detectedMode === 'remote' ? 'mobile' :
                                          displayMode === 'panel' ? 'panel' : 'mobile';

  /**
   * Démarre la connexion WebRTC
   */
  const connect = useCallback(async () => {
    // Guard: éviter les connexions multiples simultanées
    if (isConnectingRef.current) {
      console.warn('⚠️ Connection already in progress, skipping duplicate connect() call');
      return;
    }

    // Vérifier que la config est valide
    if (!isConfigValid || !mediaMTXConfig) {
      const err = 'Configuration MediaMTX invalide. Veuillez configurer l\'IP du Raspberry Pi.';
      setError(err);
      setStatus('failed');
      return;
    }

    isConnectingRef.current = true; // Marquer comme "en cours de connexion"
    setStatus('connecting');
    setError(null);
    setStream(null);

    // Détecter le mode réseau (local vs remote) avant de se connecter
    const detectedMode = await useMediaMTXConfigStore.getState().detectNetworkMode();

    try {
      // Créer le service WebRTC
      const service = new AkuvoxWebRTCService();
      serviceRef.current = service;

      // Préparer la config WebRTC
      const webrtcConfig: AkuvoxWebRTCConfig = {
        whepUrl: mediaMTXConfig.whepUrl,
        mode: connectionMode,
        turnConfig:
          connectionMode === 'mobile'
            ? {
                url: turnConfig.url,
                username: turnConfig.username,
                credential: turnConfig.credential,
              }
            : undefined,
      };

      console.log('🎥 Connecting to Akuvox stream:', {
        networkMode: detectedMode,
        displayMode: displayMode,
        connectionMode: connectionMode,
        whepUrl: mediaMTXConfig.whepUrl,
        useTurn: connectionMode === 'mobile' && detectedMode === 'remote',
      });

      // Connecter avec callbacks
      await service.connect(webrtcConfig, {
        onTrack: (receivedStream) => {
          console.log('✅ Stream received:', receivedStream);
          setStream(receivedStream);
          setStatus('connected');
          isConnectingRef.current = false; // Connexion terminée avec succès
        },
        onConnectionStateChange: (state) => {
          console.log('🔗 Connection state changed:', state);

          switch (state) {
            case 'connected':
              setStatus('connected');
              setError(null);
              break;
            case 'failed':
              setStatus('failed');
              setError('La connexion WebRTC a échoué');
              break;
            case 'disconnected':
            case 'closed':
              setStatus('disconnected');
              break;
          }
        },
        onIceConnectionStateChange: (state) => {
          console.log('🧊 ICE connection state changed:', state);
          setIceConnectionState(state);

          if (state === 'failed') {
            setError('Échec de la connexion ICE. Vérifiez la configuration réseau.');
            setStatus('failed');
          }
        },
        onError: (err) => {
          console.error('❌ WebRTC error:', err);
          setError(err.message);
          setStatus('failed');
        },
      });
    } catch (err) {
      console.error('❌ Failed to connect:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setStatus('failed');
      isConnectingRef.current = false; // Réinitialiser le guard en cas d'erreur
    }
  }, [isConfigValid, mediaMTXConfig, turnConfig, connectionMode]);

  /**
   * Ferme la connexion WebRTC
   */
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from Akuvox stream');

    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }

    setStream(null);
    setStatus('disconnected');
    setIceConnectionState(null);
    setError(null);
    isConnectingRef.current = false; // Réinitialiser le guard
  }, []);

  /**
   * Attache automatiquement le stream à l'élément video
   */
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('📺 Attaching stream to video element');
      console.log('  - Stream tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length,
      });
      console.log('  - Video element:', {
        readyState: videoRef.current.readyState,
        paused: videoRef.current.paused,
        muted: videoRef.current.muted,
        autoplay: videoRef.current.autoplay,
        playsInline: videoRef.current.playsInline,
      });

      videoRef.current.srcObject = stream;

      // Vérifier si la vidéo démarre automatiquement
      videoRef.current.play().then(() => {
        console.log('✅ Video playback started');
      }).catch((err) => {
        console.error('❌ Video playback failed:', err);
        console.log('  - Trying with muted=true...');
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch((e) => {
            console.error('❌ Video playback still failed (muted):', e);
          });
        }
      });
    }

    return () => {
      // Cleanup : retirer le stream du video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  /**
   * Cleanup au démontage du composant
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    iceConnectionState,
    stream,
    videoRef,
    error,
    connect,
    disconnect,
    isConfigValid,
    connectionMode,
  };
}
