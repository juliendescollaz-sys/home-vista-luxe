import { useState, useEffect } from "react";
import { Phone, PhoneOff, Video, Settings2, AlertCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { intercomService } from "@/services/intercomService";
import { useIntercomStore } from "@/store/intercomStore";
import { useVideoCall } from "@/hooks/useVideoCall";
import { sipService } from '@/services/sipService';
import { useSIPConfigStore, useIsSIPConfigured } from '@/store/useSIPConfigStore';
import { toast } from "sonner";
import { AkuvoxVideoStream } from "@/components/AkuvoxVideoStream";
import { MediaMTXConfigDialog } from "@/components/MediaMTXConfigDialog";
import { SIPConfigDialog } from "@/components/SIPConfigDialog";
import { useIsMediaMTXConfigValid, useMediaMTXConfigStore } from "@/store/useMediaMTXConfigStore";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DebugConsole } from "@/components/DebugConsole";

export default function IntercomTest() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [videoMode, setVideoMode] = useState<'akuvox' | 'livekit'>('akuvox');
  const [sipStatus, setSipStatus] = useState<string>('disconnected');
  const [shouldShowVideo, setShouldShowVideo] = useState(false); // Contrôle explicite de l'affichage vidéo
  const { currentCall, setCurrentCall, endCall } = useIntercomStore();

  // Configuration SIP
  const { config: sipConfig } = useSIPConfigStore();
  const isSIPConfigured = useIsSIPConfigured();

  // Hook LiveKit (ancien système)
  const {
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    isConnecting: isConnectingLiveKit,
    isConnected: isConnectedLiveKit,
    error: errorLiveKit,
    remoteVideoRef,
  } = useVideoCall();

  // Config MediaMTX et mode de connexion
  // IMPORTANT: NE PAS utiliser useAkuvoxVideo() ici car ça initialise la PeerConnection
  // avant qu'on soit prêt, ce qui cause des conflits avec SIP sur iOS Safari
  const isMediaMTXConfigured = useIsMediaMTXConfigValid();
  const { detectedMode } = useMediaMTXConfigStore();
  const { displayMode } = useDisplayMode();

  // Déterminer le mode de connexion (panel ou mobile) sans initialiser la connexion
  const connectionMode = detectedMode === 'local' ? 'panel' :
                         detectedMode === 'remote' ? 'mobile' :
                         displayMode === 'panel' ? 'panel' : 'mobile';

  // Initialiser le service SIP au montage si config disponible
  useEffect(() => {
    if (isSIPConfigured && sipConfig) {
      console.log('🔌 Initializing SIP service with saved config');
      sipService.init(sipConfig);

      // Mettre à jour le statut SIP régulièrement
      const statusInterval = setInterval(() => {
        setSipStatus(sipService.getConnectionState());
      }, 1000);

      // Écouter les appels entrants réels depuis l'Akuvox
      sipService.onIncomingCall((session) => {
        console.log('📞 Real incoming call from Akuvox!');

        // Créer un objet Call pour l'UI (compatible avec IntercomCall)
        const callerName = session.remote_identity.display_name || session.remote_identity.uri.user || 'Akuvox';
        const incomingCall = {
          id: `call-${Date.now()}`,
          room: `room-${Date.now()}`,
          callerToken: '',
          calleeToken: '',
          livekitUrl: '',
          from: callerName,
          to: 'user',
          status: 'ringing' as const,
          startTime: Date.now(),
          videoEnabled: true,
          audioEnabled: true,
        };

        setCurrentCall(incomingCall);
        toast.info(`Appel entrant de ${incomingCall.from}`);
      });

      return () => {
        clearInterval(statusInterval);
        sipService.disconnect();
      };
    } else {
      console.log('⚠️ SIP not configured - skipping initialization');
      setSipStatus('not_configured');
    }
  }, [isSIPConfigured, sipConfig, setCurrentCall]);

  const handleSimulateCall = async () => {
    setIsSimulating(true);
    try {
      const call = await intercomService.simulateIncomingCall("akuvox", "200");
      setCurrentCall(call);
      toast.success("Appel entrant simulé");
    } catch (err) {
      console.error("Erreur simulation appel:", err);
      toast.error("Erreur lors de la simulation");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAcceptCall = async () => {
    if (!currentCall) return;

    console.log('🔔 handleAcceptCall started - timestamp:', Date.now());

    try {
      // IMPORTANT sur iOS Safari : l'ordre est critique !
      // 1. Capturer le micro AVANT tout
      // 2. Répondre au SIP et ATTENDRE que la connexion soit établie
      // 3. ENSUITE seulement afficher la vidéo

      console.log('🎤 Step 1: Pre-acquiring microphone...');
      let audioStream: MediaStream | undefined;

      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        console.log('✅ Microphone acquired successfully');
      } catch (micError) {
        console.error('❌ Failed to acquire microphone:', micError);
        toast.error("Impossible d'accéder au microphone");
        return;
      }

      // Répondre au SIP avec le stream pré-capturé
      console.log('📞 Step 2: Answering SIP call with pre-acquired stream...');
      sipService.answer(audioStream);

      // Attendre que le SIP soit vraiment connecté (ICE + RTP)
      // On attend plus longtemps car iOS Safari peut être lent
      console.log('⏳ Step 3: Waiting 2s for SIP WebRTC to establish...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Step 4: SIP should be established, now updating UI...');

      // MAINTENANT seulement, mettre à jour le statut et afficher la vidéo
      // On fait les deux setState ensemble pour minimiser les re-renders
      setCurrentCall({ ...currentCall, status: 'active' });
      setShouldShowVideo(true);

      console.log('📺 Step 5: Video component should now mount');

      if (videoMode === 'livekit') {
        await connectLiveKit(currentCall);
      }

      toast.success("Appel accepté");
    } catch (err) {
      console.error("Erreur connexion:", err);
      toast.error("Erreur lors de la connexion");
    }
  };

  const handleRejectCall = () => {
    endCall();
    toast.info("Appel rejeté");
  };

  const handleHangUp = () => {
    sipService.hangup();

    if (videoMode === 'livekit') {
      disconnectLiveKit();
    }
    // Pour Akuvox, la déconnexion est gérée par le composant AkuvoxVideoStream au unmount

    setShouldShowVideo(false); // Reset pour le prochain appel
    endCall();
    toast.info("Appel terminé");
  };

  // DEBUG: Logger l'état actuel à chaque render
  console.log('🔄 RENDER - currentCall:', currentCall?.status, 'shouldShowVideo:', shouldShowVideo, 'videoMode:', videoMode);

  // État: Pas d'appel en cours
  if (!currentCall) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header avec config */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Test Interphone Vidéo</h1>
              <p className="text-sm text-muted-foreground">
                Test des deux systèmes : LiveKit (SIP) et Akuvox WebRTC (WHEP)
              </p>
            </div>
            <div className="flex gap-2">
              <SIPConfigDialog />
              <MediaMTXConfigDialog />
            </div>
          </div>

          {/* Avertissement si MediaMTX non configuré */}
          {!isMediaMTXConfigured && (
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Configuration MediaMTX manquante
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Configurez l'IP du Raspberry Pi pour tester le système Akuvox WebRTC.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statut SIP */}
          <Card className={
            sipStatus === 'registered' ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' :
            sipStatus === 'not_configured' ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20' :
            'border-gray-500/50'
          }>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Wifi className={`h-5 w-5 mt-0.5 ${
                  sipStatus === 'registered' ? 'text-green-600 dark:text-green-500' :
                  sipStatus === 'not_configured' ? 'text-yellow-600 dark:text-yellow-500' :
                  'text-gray-600 dark:text-gray-500'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    sipStatus === 'registered' ? 'text-green-800 dark:text-green-200' :
                    sipStatus === 'not_configured' ? 'text-yellow-800 dark:text-yellow-200' :
                    'text-gray-800 dark:text-gray-200'
                  }`}>
                    {sipStatus === 'registered' ? 'SIP Connecté' :
                     sipStatus === 'not_configured' ? 'SIP Non Configuré' :
                     sipStatus === 'connecting' ? 'SIP Connexion en cours...' :
                     'SIP Déconnecté'}
                  </p>
                  <p className={`text-xs mt-1 ${
                    sipStatus === 'registered' ? 'text-green-700 dark:text-green-300' :
                    sipStatus === 'not_configured' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {sipStatus === 'registered' ? 'Prêt à recevoir des appels depuis l\'Akuvox' :
                     sipStatus === 'not_configured' ? 'Configure tes identifiants SIP pour recevoir les appels réels' :
                     'En attente de connexion au serveur Kamailio'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sélection du mode vidéo */}
          <Tabs value={videoMode} onValueChange={(v) => setVideoMode(v as 'akuvox' | 'livekit')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="akuvox" className="space-x-2">
                <span>Akuvox WebRTC</span>
                {isMediaMTXConfigured && (
                  <Badge variant="outline" className="text-xs">
                    {connectionMode === 'panel' ? 'LAN' : 'TURN'}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="livekit">LiveKit (SIP)</TabsTrigger>
            </TabsList>

            <TabsContent value="akuvox" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Akuvox WebRTC Direct
                  </CardTitle>
                  <CardDescription>
                    Connexion WebRTC native vers MediaMTX (Raspberry Pi). Mode détecté:{" "}
                    <strong>{connectionMode === 'panel' ? 'Panel (LAN direct)' : 'Mobile/Tablet (TURN)'}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                      ✅ Flux RTSP Akuvox → MediaMTX → WebRTC WHEP
                    </p>
                    <p className="text-muted-foreground">
                      {connectionMode === 'panel'
                        ? '🏠 Connexion directe LAN (pas de TURN)'
                        : '🌐 Connexion via serveur TURN pour accès remote'}
                    </p>
                    {!isMediaMTXConfigured && (
                      <p className="text-destructive text-xs">
                        ⚠️ Configuration MediaMTX requise
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSimulateCall}
                    disabled={isSimulating || !isMediaMTXConfigured}
                    className="w-full"
                    size="lg"
                  >
                    {isSimulating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                        Simulation en cours...
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-2" />
                        Simuler appel Akuvox WebRTC
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="livekit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    LiveKit + SIP
                  </CardTitle>
                  <CardDescription>
                    Système original avec LiveKit pour la vidéo et SIP pour l'audio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                      📞 Audio: SIP (JsSIP)
                    </p>
                    <p className="text-muted-foreground">
                      📹 Vidéo: LiveKit room
                    </p>
                  </div>

                  <Button
                    onClick={handleSimulateCall}
                    disabled={isSimulating}
                    className="w-full"
                    size="lg"
                  >
                    {isSimulating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                        Simulation en cours...
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-2" />
                        Simuler appel LiveKit
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Affichage des erreurs */}
          {errorLiveKit && videoMode === 'livekit' && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">{errorLiveKit}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // État: Appel entrant (sonnerie)
  if (currentCall.status === "ringing") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <div className="text-center space-y-8">
          {/* Animation de sonnerie */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Info appelant */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Appel entrant</h2>
            <p className="text-muted-foreground">Interphone: {currentCall.from}</p>
            <p className="text-xs text-muted-foreground">
              Mode vidéo: {videoMode === 'akuvox' ? 'Akuvox WebRTC' : 'LiveKit'}
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-6 justify-center">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={handleRejectCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
              onClick={handleAcceptCall}
              disabled={isConnectingLiveKit}
            >
              {isConnectingLiveKit ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-background border-t-transparent" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // État: Appel actif (vidéo)
  // DEBUG: On arrive ici si currentCall existe ET status !== 'ringing'
  console.log('⚠️ RENDERING ACTIVE CALL SCREEN - status:', currentCall.status, 'shouldShowVideo:', shouldShowVideo);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Affichage selon le mode vidéo - UNIQUEMENT si shouldShowVideo est true */}
      {videoMode === 'akuvox' ? (
        // Nouveau système: Akuvox WebRTC
        // IMPORTANT: Ne monter le composant QUE quand shouldShowVideo est true
        // pour éviter les conflits PeerConnection avec SIP sur iOS Safari
        shouldShowVideo ? (
          <AkuvoxVideoStream
            autoConnect={true}
            enableMicrophone={false}
            showMicrophoneControl={false}
            showDebugInfo={import.meta.env.DEV}
            className="w-full h-full"
            onConnected={() => console.log('Akuvox stream connected')}
            onError={(error) => toast.error(error)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto" />
              <p className="text-white">Connexion audio en cours...</p>
            </div>
          </div>
        )
      ) : (
        // Ancien système: LiveKit
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div
            ref={remoteVideoRef as unknown as React.RefObject<HTMLDivElement>}
            className="w-full h-full flex items-center justify-center [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />
          {!isConnectedLiveKit && (
            <div className="absolute text-white/50 flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/50 border-t-transparent" />
              <span>Connexion LiveKit en cours...</span>
            </div>
          )}
        </div>
      )}

      {/* Contrôles en bas */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="flex gap-4 p-4 rounded-full bg-black/50 backdrop-blur-sm">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleHangUp}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Indicateur du mode actif */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
        {videoMode === 'akuvox'
          ? `Akuvox WebRTC (${connectionMode === 'panel' ? 'LAN' : 'TURN'})`
          : 'LiveKit'}
      </div>

      {/* Erreur LiveKit */}
      {errorLiveKit && videoMode === 'livekit' && (
        <div className="absolute top-4 right-4 max-w-xs p-3 rounded-lg bg-destructive/90 text-white text-sm">
          {errorLiveKit}
        </div>
      )}

      {/* Debug Console */}
      <DebugConsole />
    </div>
  );
}
