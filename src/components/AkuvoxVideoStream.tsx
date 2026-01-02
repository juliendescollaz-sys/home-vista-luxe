import { useEffect } from 'react';
import { Video, VideoOff, Loader2, WifiOff, Wifi } from 'lucide-react';
import { useAkuvoxVideo } from '@/hooks/useAkuvoxVideo';
import { cn } from '@/lib/utils';

export interface AkuvoxVideoStreamProps {
  /** Démarre automatiquement la connexion au montage du composant */
  autoConnect?: boolean;

  /** Classe CSS personnalisée pour le conteneur */
  className?: string;

  /** Afficher les contrôles de debug (statut, ICE state, etc.) */
  showDebugInfo?: boolean;

  /** Callback appelé quand la connexion est établie */
  onConnected?: () => void;

  /** Callback appelé en cas d'erreur */
  onError?: (error: string) => void;
}

/**
 * Composant pour afficher le flux vidéo de l'interphone Akuvox
 *
 * Ce composant :
 * - Gère la connexion WebRTC vers MediaMTX
 * - Affiche le flux vidéo en plein écran
 * - Adapte automatiquement le mode (Panel/Mobile)
 * - Gère les états de chargement et d'erreur
 *
 * Usage :
 * ```tsx
 * <AkuvoxVideoStream
 *   autoConnect
 *   onConnected={() => console.log('Vidéo connectée!')}
 *   showDebugInfo={process.env.NODE_ENV === 'development'}
 * />
 * ```
 */
export function AkuvoxVideoStream({
  autoConnect = false,
  className,
  showDebugInfo = false,
  onConnected,
  onError,
}: AkuvoxVideoStreamProps) {
  const {
    status,
    iceConnectionState,
    stream,
    videoRef,
    error,
    connect,
    disconnect,
    isConfigValid,
    connectionMode,
  } = useAkuvoxVideo();

  // Auto-connect si demandé (une seule fois au montage si autoConnect)
  useEffect(() => {
    if (autoConnect && isConfigValid && status === 'idle') {
      console.log('🚀 Auto-connect triggered');
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, isConfigValid, status]); // Ne PAS inclure 'connect' pour éviter la boucle

  // Appeler les callbacks
  useEffect(() => {
    if (status === 'connected' && onConnected) {
      onConnected();
    }
  }, [status, onConnected]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  /**
   * Rendu : Configuration invalide
   */
  if (!isConfigValid) {
    return (
      <div className={cn('relative w-full h-full bg-black flex items-center justify-center', className)}>
        <div className="text-center space-y-4 p-6 max-w-md">
          <VideoOff className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Configuration manquante</h3>
            <p className="text-sm text-white/70">
              Veuillez configurer l'adresse IP du Raspberry Pi dans les paramètres pour
              activer la vidéo de l'interphone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Rendu : État de chargement / connexion
   */
  if (status === 'idle' || status === 'connecting') {
    return (
      <div className={cn('relative w-full h-full bg-black flex items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-white font-medium">
              {status === 'idle' ? 'En attente...' : 'Connexion en cours...'}
            </p>
            {showDebugInfo && (
              <p className="text-xs text-white/50">
                Mode: {connectionMode} | ICE: {iceConnectionState || 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Rendu : Erreur de connexion
   */
  if (status === 'failed' || status === 'disconnected') {
    return (
      <div className={cn('relative w-full h-full bg-black flex items-center justify-center', className)}>
        <div className="text-center space-y-4 p-6 max-w-md">
          <WifiOff className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {status === 'failed' ? 'Connexion échouée' : 'Déconnecté'}
            </h3>
            {error && (
              <p className="text-sm text-white/70">{error}</p>
            )}
            {showDebugInfo && (
              <div className="text-xs text-white/50 space-y-1 mt-4">
                <p>Status: {status}</p>
                <p>ICE State: {iceConnectionState || 'N/A'}</p>
                <p>Mode: {connectionMode}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Rendu : Vidéo connectée
   */
  return (
    <div className={cn('relative w-full h-full bg-black', className)}>
      {/* Élément vidéo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        className="w-full h-full object-cover"
      />

      {/* Indicateur de connexion (si pas encore de stream) */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
            <p className="text-sm text-white">Réception du flux vidéo...</p>
          </div>
        </div>
      )}

      {/* Debug info overlay */}
      {showDebugInfo && (
        <div className="absolute top-2 left-2 bg-black/75 text-white text-xs p-2 rounded space-y-1">
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-500" />
            <span>Connected ({connectionMode})</span>
          </div>
          <div>Status: {status}</div>
          <div>ICE: {iceConnectionState || 'N/A'}</div>
          {stream && (
            <div>
              Stream: {stream.getVideoTracks().length}v / {stream.getAudioTracks().length}a
            </div>
          )}
        </div>
      )}
    </div>
  );
}
