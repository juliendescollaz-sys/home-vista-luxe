import { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, DoorOpen, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const doorTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Afficher la vidéo quand l'appel est actif
  useEffect(() => {
    if (callState === "incall" && videoUrl) {
      setShowVideo(true);
    } else if (callState === "ringing") {
      // Afficher la vidéo aussi pendant la sonnerie
      setShowVideo(true);
    }
  }, [callState, videoUrl]);

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
    setMicEnabled((prev) => !prev);
    // TODO: Appeler linphoneSipService.setMicrophoneEnabled(!micEnabled)
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Zone vidéo (fond) */}
      <div className="absolute inset-0">
        {showVideo && videoUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
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
