import { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, DoorOpen, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import Hls from "hls.js";

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
  ringtone = "default",
  ringtoneVolume = 0.8,
  videoDelayAfterDoor = 5,
}: IncomingCallOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [micEnabled, setMicEnabled] = useState(true);
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
      const requestWakeLock = async () => {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            console.log("[IncomingCall] Wake Lock activé");
          }
        } catch (err) {
          console.warn("[IncomingCall] Wake Lock non disponible:", err);
        }
      };
      requestWakeLock();

      return () => {
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log("[IncomingCall] Wake Lock libéré");
        }
      };
    }
  }, [visible]);

  // Jouer la sonnerie quand l'appel sonne
  useEffect(() => {
    if (callState === "ringing" && visible) {
      // Créer l'élément audio pour la sonnerie
      const audio = new Audio(`/sounds/ringtones/${ringtone}.mp3`);
      audio.loop = true;
      audio.volume = ringtoneVolume;
      audioRef.current = audio;

      audio.play().catch((err) => {
        console.warn("[IncomingCall] Impossible de jouer la sonnerie:", err);
      });

      return () => {
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
      addDebugLog(`Appel détecté, activation vidéo`);
      setVideoStatus("connecting");
      setVideoError(null);
      setShowVideo(true);
    } else if (!hlsUrl && visible) {
      addDebugLog("Pas d'URL vidéo configurée");
      setVideoError("URL vidéo non configurée");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, callState, hlsUrl]); // Ne pas inclure addDebugLog pour éviter les re-renders

  // Flag pour éviter les doubles initialisations
  const hlsInitializedRef = useRef(false);

  // Étape 2: Charger HLS une fois que le <video> est rendu (showVideo = true)
  useEffect(() => {
    if (!showVideo || !hlsUrl) return;

    // Éviter les doubles chargements avec un flag
    if (hlsInitializedRef.current) {
      console.log("[IncomingCall] HLS déjà initialisé, skip");
      return;
    }
    hlsInitializedRef.current = true;

    // Petit délai pour s'assurer que le DOM est prêt
    const timeoutId = setTimeout(() => {
      const video = videoRef.current;
      if (!video) {
        addDebugLog("ERREUR: videoRef toujours null après délai!");
        hlsInitializedRef.current = false;
        return;
      }

      addDebugLog(`videoRef OK, chargement HLS`);

      // Détruire l'instance HLS précédente si elle existe
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Tester d'abord le HLS natif (certains Android le supportent)
      const canPlayHlsNative = video.canPlayType("application/vnd.apple.mpegurl") ||
                               video.canPlayType("application/x-mpegURL");

      if (canPlayHlsNative) {
        addDebugLog("HLS NATIF");
        video.src = hlsUrl;
        // Passer à connected quand la vidéo joue vraiment
        video.onplaying = () => {
          addDebugLog("VIDEO playing");
          setVideoStatus("connected");
        };
        video.onloadeddata = () => addDebugLog("Data loaded");
        video.onerror = () => {
          addDebugLog(`Erreur: ${video.error?.message}`);
          setVideoStatus("failed");
          setVideoError(video.error?.message || "Erreur video");
        };
        video.onwaiting = () => addDebugLog("Buffering...");
        video.muted = true;
        video.play().catch(e => addDebugLog(`Play: ${e.message}`));
        return;
      }

      // Fallback: utiliser hls.js si HLS natif non supporté
      if (Hls.isSupported()) {
        addDebugLog("hls.js supporté, création instance");
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          // Config pour flux live avec MediaMTX (on-demand, démarrage lent)
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 10,
          manifestLoadingRetryDelay: 2000,
          levelLoadingTimeOut: 30000,
          levelLoadingMaxRetry: 10,
          levelLoadingRetryDelay: 2000,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 10,
          fragLoadingRetryDelay: 2000,
          // Forcer le rechargement du playlist
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          // Désactiver les requêtes preflight/HEAD en forçant le mode simple
          xhrSetup: (xhr, url) => {
            // Pas de headers custom pour éviter les preflight CORS
            addDebugLog(`XHR: ${url.split("/").pop()}`);
          },
        });

        // Log des événements de chargement
        hls.on(Hls.Events.MANIFEST_LOADING, (event, data) => {
          addDebugLog(`MANIFEST_LOADING: ${data.url}`);
        });

        hls.on(Hls.Events.MANIFEST_LOADED, () => {
          addDebugLog(`MANIFEST_LOADED OK`);
        });

        hls.on(Hls.Events.LEVEL_LOADING, (event, data) => {
          addDebugLog(`LEVEL_LOADING: level ${data.level}`);
        });

        hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
          const frags = data.details.fragments || [];
          addDebugLog(`LEVEL_LOADED: ${frags.length} frags, live=${data.details.live}`);
          if (frags.length > 0) {
            addDebugLog(`First frag: ${frags[0].url?.split("/").pop() || "?"}`);
          }
        });

        hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
          addDebugLog(`FRAG_LOADING: ${data.frag.sn}`);
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          addDebugLog(`FRAG_LOADED OK`);
        });

        hls.loadSource(hlsUrl);
        addDebugLog("loadSource appelé");
        hls.attachMedia(video);
        addDebugLog("attachMedia appelé");

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          addDebugLog("MANIFEST_PARSED - attente premier fragment...");
        });

        // Attendre que le premier fragment soit bufferisé avant de lancer la lecture
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          addDebugLog("FRAG_BUFFERED - démarrage lecture");
          setVideoStatus("connected");
          setVideoError(null);
          // Autoplay avec muted d'abord (contourne les restrictions Android)
          video.muted = true;
          video.play()
            .then(() => {
              addDebugLog("Lecture démarrée (muted)");
              // Démuter après le démarrage
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  addDebugLog("Audio activé");
                }
              }, 500);
            })
            .catch((e) => {
              addDebugLog(`Autoplay failed même muted: ${e.message}`);
            });
        }, { once: true }); // Une seule fois

        // Surveiller les événements vidéo pour debug
        video.onplaying = () => addDebugLog("VIDEO: playing");
        video.onpause = () => addDebugLog("VIDEO: paused");
        video.onwaiting = () => addDebugLog("VIDEO: waiting/buffering");
        video.onstalled = () => addDebugLog("VIDEO: stalled");
        video.onerror = () => addDebugLog(`VIDEO: error ${video.error?.message}`);

        hls.on(Hls.Events.ERROR, (event, data) => {
          // Logger toutes les erreurs avec plus de détails
          const url = data.url || data.frag?.url || data.context?.url || "?";
          const errDetail = `${data.details}${data.response?.code ? ` HTTP${data.response.code}` : ""} ${url.split("/").pop()}`;

          if (data.fatal) {
            addDebugLog(`FATAL: ${errDetail}`);
            setVideoError(`${data.type}: ${data.details}`);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              addDebugLog("Retry réseau...");
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              addDebugLog("Recovery média...");
              hls.recoverMediaError();
            } else {
              setVideoStatus("failed");
            }
          } else {
            addDebugLog(`WARN: ${errDetail}`);
          }
        });

        hlsRef.current = hls;
      }
      // Fallback pour Safari/iOS qui supporte HLS nativement
      else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        addDebugLog("Utilisation HLS natif (Safari)");
        video.src = hlsUrl;

        video.onloadeddata = () => {
          addDebugLog("Vidéo HLS chargée (natif)");
          setVideoStatus("connected");
        };

        video.onerror = (e) => {
          addDebugLog(`Erreur vidéo HLS (natif): ${e}`);
          setVideoStatus("failed");
          setVideoError("Erreur chargement vidéo");
        };

        video.play().catch((e) => {
          addDebugLog(`Autoplay failed (natif): ${e.message}`);
        });
      } else {
        addDebugLog("HLS non supporté!");
        setVideoStatus("failed");
        setVideoError("HLS non supporté");
      }
    }, 100); // 100ms pour laisser le DOM se mettre à jour

    return () => {
      clearTimeout(timeoutId);
      // Réinitialiser le flag pour permettre une nouvelle initialisation
      hlsInitializedRef.current = false;
      // Détruire l'instance HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Arrêter la vidéo quand l'overlay se ferme
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
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
    // Note: Le micro est géré par Linphone SIP, pas par la vidéo HLS
  }, [micEnabled]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Zone vidéo (fond) */}
      <div className="absolute inset-0">
        {showVideo ? (
          <>
            {/* Video cachée tant qu'elle ne joue pas */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${videoStatus === "connected" ? "opacity-100" : "opacity-0"}`}
              playsInline
              muted
              autoPlay
            />
            {/* Overlay de chargement - visible tant que pas connected */}
            {videoStatus !== "connected" && (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center z-40">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Phone className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-white text-xl font-medium">Appel interphone</p>
                  <p className="text-white/60 text-sm mt-2">Connexion video...</p>
                </div>
              </div>
            )}
            {/* Erreur */}
            {videoError && (
              <div className="absolute top-2 left-2 right-2 bg-red-900/90 text-white text-xs p-2 rounded z-50">
                {videoError}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Overlay gradient pour lisibilité des contrôles */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
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
            /* Boutons sonnerie : Répondre / Raccrocher */
            <div className="flex justify-center items-center gap-16">
              {/* Raccrocher (rouge) */}
              <button
                onClick={handleHangup}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              >
                <PhoneOff className="w-10 h-10 text-white" />
              </button>

              {/* Répondre (vert) */}
              <button
                onClick={handleAnswer}
                className="w-24 h-24 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors shadow-lg animate-pulse"
              >
                <Phone className="w-12 h-12 text-white" />
              </button>

              {/* Ouvrir porte directement */}
              <button
                onClick={handleOpenDoor}
                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors shadow-lg"
              >
                <DoorOpen className="w-10 h-10 text-white" />
              </button>
            </div>
          ) : callState === "incall" ? (
            /* Boutons en communication : Micro / Raccrocher / Ouvrir porte */
            <div className="flex justify-center items-center gap-8">
              {/* Toggle Micro */}
              <button
                onClick={toggleMic}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-lg",
                  micEnabled
                    ? "bg-slate-700 hover:bg-slate-600"
                    : "bg-red-600 hover:bg-red-700"
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
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
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
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                <DoorOpen className="w-10 h-10 text-white" />
              </button>
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
