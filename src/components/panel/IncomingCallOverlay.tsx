import { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, DoorOpen, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import Hls from "hls.js";
import { KeepAwake } from "@capacitor-community/keep-awake";

interface IncomingCallOverlayProps {
  /** Visible ou non */
  visible: boolean;
  /** Nom de l'appelant à afficher */
  callerName: string;
  /** État de l'appel : ringing, incall, ended */
  callState: "ringing" | "incall" | "ended";
  /** URL du flux vidéo WHEP (MediaMTX) */
  videoUrl?: string;
  /** Callback quand on décroche */
  onAnswer: () => void;
  /** Callback quand on raccroche */
  onHangup: () => void;
  /** Callback quand on ouvre la porte */
  onOpenDoor: () => void;
  /** Callback pour activer/désactiver le micro */
  onToggleMic?: (enabled: boolean) => void;
  /** Callback pour régler le volume du HP (0-1) */
  onSetPlaybackGain?: (gain: number) => void;
  /** Sonnerie sélectionnée (nom du fichier sans extension) */
  ringtone?: string;
  /** Volume de la sonnerie (0-1) */
  ringtoneVolume?: number;
  /** Délai vidéo après ouverture porte (secondes) */
  videoDelayAfterDoor?: number;
}

/**
 * Overlay plein écran pour les appels interphone
 * S'affiche au-dessus de toute l'application quand un appel arrive
 */
export function IncomingCallOverlay({
  visible,
  callerName,
  callState,
  videoUrl,
  onAnswer,
  onHangup,
  onOpenDoor,
  onToggleMic,
  onSetPlaybackGain,
  ringtone = "default",
  ringtoneVolume = 0.8,
  videoDelayAfterDoor = 5,
}: IncomingCallOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState(0.8); // Volume HP interphone (0-1)
  const [showVideo, setShowVideo] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const [videoStatus, setVideoStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const doorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Helper pour ajouter des logs de debug visibles dans l'UI
  const addDebugLog = useCallback((msg: string) => {
    console.log("[IncomingCall]", msg);
    setDebugLogs((prev) => [...prev.slice(-25), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Convertir l'URL WHEP en URL HLS
  // videoUrl = http://192.168.1.115:8889/akuvox/whep -> http://192.168.1.115:8888/akuvox/index.m3u8
  const hlsUrl = videoUrl
    ? videoUrl.replace(":8889/", ":8888/").replace("/whep", "/index.m3u8")
    : null;

  // Référence pour l'instance HLS
  const hlsRef = useRef<Hls | null>(null);

  // Réveiller l'écran et le garder allumé pendant l'appel
  useEffect(() => {
    if (visible) {
      const activateKeepAwake = async () => {
        try {
          // Capacitor KeepAwake (Android natif - réveille l'écran)
          await KeepAwake.keepAwake();
          console.log("[IncomingCall] KeepAwake activé (Capacitor)");
        } catch {
          // Fallback: Web Wake Lock API (garde allumé mais ne réveille pas)
          try {
            if ("wakeLock" in navigator) {
              wakeLockRef.current = await navigator.wakeLock.request("screen");
              console.log("[IncomingCall] Wake Lock activé (Web API)");
            }
          } catch (err) {
            console.warn("[IncomingCall] Wake Lock non disponible:", err);
          }
        }
      };
      activateKeepAwake();

      return () => {
        // Libérer KeepAwake
        KeepAwake.allowSleep().catch(() => {});
        // Libérer Web Wake Lock
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
        console.log("[IncomingCall] Wake Lock libéré");
      };
    }
  }, [visible]);

  // Jouer la sonnerie quand l'appel sonne
  useEffect(() => {
    if (callState === "ringing" && visible) {
      const audioPath = `/sounds/ringtones/${ringtone}.mp3`;
      const audio = new Audio(audioPath);
      audio.loop = true;
      audio.volume = ringtoneVolume;
      audioRef.current = audio;

      audio.play().catch(() => {
        // Ignorer les erreurs de lecture
      });

      return () => {
        audio.onerror = null;
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }
  }, [callState, visible, ringtone, ringtoneVolume]);

  // Arrêter la sonnerie quand on décroche ou raccroche
  useEffect(() => {
    if (callState !== "ringing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, [callState]);

  // Étape 1: Activer l'affichage vidéo quand un appel arrive
  useEffect(() => {
    if (visible && (callState === "ringing" || callState === "incall") && hlsUrl) {
      // Ne pas réinitialiser si déjà en cours ou connecté
      if (!showVideo) {
        addDebugLog(`Appel détecté, activation vidéo`);
        setVideoStatus("connecting");
        setVideoError(null);
        setShowVideo(true);
      }
    } else if (!hlsUrl && visible) {
      addDebugLog("Pas d'URL vidéo configurée");
      setVideoError("URL vidéo non configurée");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, callState, hlsUrl]); // Ne pas inclure addDebugLog/showVideo pour éviter les re-renders

  // Flag pour éviter les doubles initialisations
  const hlsInitializedRef = useRef(false);
  // Canvas ref pour dessiner la vidéo (évite le lecteur Android natif)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Animation frame ref pour le rendu canvas
  const animationFrameRef = useRef<number | null>(null);

  // Étape 2: Charger HLS avec rendu sur canvas (évite le lecteur Android)
  useEffect(() => {
    if (!showVideo || !hlsUrl) return;

    // Éviter les doubles chargements avec un flag
    if (hlsInitializedRef.current) {
      console.log("[IncomingCall] HLS déjà initialisé, skip");
      return;
    }
    hlsInitializedRef.current = true;

    // Créer l'élément vidéo CACHÉ (jamais affiché directement)
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.controls = false;
    // Garder la vidéo hors écran - ne jamais l'ajouter au DOM visible
    video.style.position = "absolute";
    video.style.left = "-9999px";
    video.style.top = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.setAttribute("disablePictureInPicture", "");
    video.setAttribute("disableRemotePlayback", "");

    // Ajouter au body pour que le décodage fonctionne
    document.body.appendChild(video);

    // Stocker la référence
    videoRef.current = video;

    addDebugLog(`Video créée (cachée), chargement HLS`);

    // Détruire l'instance HLS précédente si elle existe
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      addDebugLog("Canvas non trouvé!");
      return;
    }

    // Fonction pour dessiner la vidéo sur le canvas
    const drawVideoToCanvas = () => {
      if (!video || video.paused || video.ended || !canvas) {
        animationFrameRef.current = requestAnimationFrame(drawVideoToCanvas);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Adapter la taille du canvas au container
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      // Calculer les dimensions pour cover (comme object-fit: cover)
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasRatio > videoRatio) {
        // Canvas plus large que la vidéo
        drawWidth = canvas.width;
        drawHeight = canvas.width / videoRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // Canvas plus haut que la vidéo
        drawHeight = canvas.height;
        drawWidth = canvas.height * videoRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
      animationFrameRef.current = requestAnimationFrame(drawVideoToCanvas);
    };

    // Fonction de cleanup commune
    const cleanup = () => {
      // Arrêter l'animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Réinitialiser le flag pour permettre une nouvelle initialisation
      hlsInitializedRef.current = false;
      // Détruire l'instance HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Retirer et détruire la vidéo
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        videoRef.current = null;
      }
    };

    // Tester d'abord le HLS natif (certains Android le supportent)
    const canPlayHlsNative = video.canPlayType("application/vnd.apple.mpegurl") ||
                             video.canPlayType("application/x-mpegURL");

    if (canPlayHlsNative) {
      addDebugLog("HLS NATIF + Canvas");
      video.src = hlsUrl;

      // Quand la vidéo joue, démarrer le rendu canvas
      video.onplaying = () => {
        addDebugLog("VIDEO playing - démarrage canvas");
        // Démarrer le rendu sur canvas
        drawVideoToCanvas();
        setVideoStatus("connected");
      };
      video.onloadeddata = () => addDebugLog("Data loaded");
      video.onerror = () => {
        addDebugLog(`Erreur: ${video.error?.message}`);
        setVideoStatus("failed");
        setVideoError(video.error?.message || "Erreur video");
      };
      video.onwaiting = () => addDebugLog("Buffering...");
      video.play().catch(e => addDebugLog(`Play: ${e.message}`));

      return cleanup;
    }

    // Fallback: utiliser hls.js si HLS natif non supporté
    if (Hls.isSupported()) {
      addDebugLog("hls.js + Canvas");
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        addDebugLog("Manifest parsed");
        video.play().catch(e => addDebugLog(`Play: ${e.message}`));
      });

      video.onplaying = () => {
        addDebugLog("VIDEO playing - démarrage canvas (hls.js)");
        drawVideoToCanvas();
        setVideoStatus("connected");
      };

      hls.on(Hls.Events.ERROR, (_, data) => {
        addDebugLog(`HLS Error: ${data.type} - ${data.details}`);
        if (data.fatal) {
          setVideoStatus("failed");
          setVideoError(`HLS: ${data.details}`);
        }
      });

      return cleanup;
    }

    // HLS non supporté du tout
    addDebugLog("HLS non supporté!");
    setVideoStatus("failed");
    setVideoError("HLS non supporté");

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideo, hlsUrl]); // Ne pas inclure addDebugLog pour éviter les re-renders

  // Cleanup quand l'appel se termine ou l'overlay se ferme
  useEffect(() => {
    if (!visible || callState === "ended") {
      setShowVideo(false);
      setVideoStatus("idle");
      setDebugLogs([]);
    }
  }, [visible, callState]);

  // Gérer le délai vidéo après ouverture de porte
  useEffect(() => {
    if (doorOpened && videoDelayAfterDoor > 0) {
      doorTimerRef.current = setTimeout(() => {
        // Fermer l'overlay après le délai
        onHangup();
      }, videoDelayAfterDoor * 1000);

      return () => {
        if (doorTimerRef.current) {
          clearTimeout(doorTimerRef.current);
        }
      };
    }
  }, [doorOpened, videoDelayAfterDoor, onHangup]);

  // Reset quand l'overlay se ferme
  useEffect(() => {
    if (!visible) {
      setShowVideo(false);
      setDoorOpened(false);
      setMicEnabled(true);
      if (doorTimerRef.current) {
        clearTimeout(doorTimerRef.current);
      }
    }
  }, [visible]);

  const handleAnswer = useCallback(() => {
    onAnswer();
  }, [onAnswer]);

  const handleHangup = useCallback(() => {
    onHangup();
  }, [onHangup]);

  const handleOpenDoor = useCallback(() => {
    setDoorOpened(true);
    onOpenDoor();
  }, [onOpenDoor]);

  const toggleMic = useCallback(() => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    // Appeler Linphone pour activer/désactiver le micro
    onToggleMic?.(newState);
  }, [micEnabled, onToggleMic]);

  const toggleSpeakerMute = useCallback(() => {
    const newVolume = speakerVolume > 0 ? 0 : 0.8;
    setSpeakerVolume(newVolume);
    onSetPlaybackGain?.(newVolume);
  }, [speakerVolume, onSetPlaybackGain]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setSpeakerVolume(newVolume);
    // Appliquer le volume au flux audio SIP via Linphone
    onSetPlaybackGain?.(newVolume);
  }, [onSetPlaybackGain]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Zone vidéo (fond) */}
      <div className="absolute inset-0">
        {/* Fond dégradé + icône - TOUJOURS visible sauf quand vidéo connectée */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center transition-opacity duration-500 ${
            videoStatus === "connected" ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Phone className="w-16 h-16 text-white" />
            </div>
            <p className="text-white text-xl font-medium">Appel interphone</p>
            {videoStatus === "connecting" && (
              <p className="text-white/60 text-sm mt-2">Connexion video...</p>
            )}
            {videoError && (
              <p className="text-red-400 text-sm mt-2">{videoError}</p>
            )}
          </div>
        </div>

        {/* Canvas pour afficher la vidéo (évite le lecteur Android natif) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Overlay gradient pour lisibilité des contrôles */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* Contenu (au-dessus de la vidéo) */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header : nom de l'appelant */}
        <div className="flex-none p-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{callerName}</h1>
          <p className="text-lg text-white/70">
            {callState === "ringing" && "Appel entrant..."}
            {callState === "incall" && (doorOpened ? "Porte ouverte" : "En communication")}
            {callState === "ended" && "Appel terminé"}
          </p>

          {/* Animation sonnerie */}
          {callState === "ringing" && (
            <div className="flex justify-center mt-4 space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-green-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Contrôles */}
        <div className="flex-none p-8 pb-12">
          {callState === "ringing" ? (
            /* Boutons sonnerie : Raccrocher / Répondre / Ouvrir porte - espacés */
            <div className="flex justify-around items-center max-w-md mx-auto">
              {/* Raccrocher (rouge) */}
              <button
                onClick={handleHangup}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 flex items-center justify-center transition-colors shadow-lg"
              >
                <PhoneOff className="w-10 h-10 text-white" />
              </button>

              {/* Répondre (vert) - plus gros et au centre */}
              <button
                onClick={handleAnswer}
                className="w-24 h-24 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 flex items-center justify-center transition-colors shadow-lg animate-pulse"
              >
                <Phone className="w-12 h-12 text-white" />
              </button>

              {/* Ouvrir porte directement */}
              <button
                onClick={handleOpenDoor}
                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center transition-colors shadow-lg"
              >
                <DoorOpen className="w-10 h-10 text-white" />
              </button>
            </div>
          ) : callState === "incall" ? (
            /* Boutons en communication avec barre de volume */
            <div className="space-y-6">
              {/* Ligne principale : Micro / Raccrocher / Porte */}
              <div className="flex justify-around items-center max-w-md mx-auto">
                {/* Toggle Micro */}
                <button
                  onClick={toggleMic}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-lg",
                    micEnabled
                      ? "bg-slate-700 hover:bg-slate-600 active:bg-slate-500"
                      : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                  )}
                >
                  {micEnabled ? (
                    <Mic className="w-8 h-8 text-white" />
                  ) : (
                    <MicOff className="w-8 h-8 text-white" />
                  )}
                </button>

                {/* Raccrocher */}
                <button
                  onClick={handleHangup}
                  className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 flex items-center justify-center transition-colors shadow-lg"
                >
                  <PhoneOff className="w-10 h-10 text-white" />
                </button>

                {/* Ouvrir porte */}
                <button
                  onClick={handleOpenDoor}
                  disabled={doorOpened}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-colors shadow-lg",
                    doorOpened
                      ? "bg-green-800 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  )}
                >
                  <DoorOpen className="w-10 h-10 text-white" />
                </button>
              </div>

              {/* Barre de volume HP */}
              <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
                <button
                  onClick={toggleSpeakerMute}
                  className="w-10 h-10 rounded-full bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center"
                >
                  {speakerVolume > 0 ? (
                    <Volume2 className="w-5 h-5 text-white" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={speakerVolume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${speakerVolume * 100}%, #334155 ${speakerVolume * 100}%, #334155 100%)`
                  }}
                />
                <span className="text-white/60 text-sm w-10 text-right">
                  {Math.round(speakerVolume * 100)}%
                </span>
              </div>
            </div>
          ) : null}

          {/* Indicateur porte ouverte */}
          {doorOpened && (
            <div className="text-center mt-6">
              <p className="text-green-400 text-lg">
                Porte ouverte - Fermeture dans {videoDelayAfterDoor}s
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncomingCallOverlay;
