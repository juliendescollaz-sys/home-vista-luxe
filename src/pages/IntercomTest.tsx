import { useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { intercomService } from "@/services/intercomService";
import { useIntercomStore } from "@/store/intercomStore";
import { useVideoCall } from "@/hooks/useVideoCall";
import { sipService } from '@/services/sipService';
import { toast } from "sonner";

export default function IntercomTest() {
  const [isSimulating, setIsSimulating] = useState(false);
  const { currentCall, setCurrentCall, endCall } = useIntercomStore();
  const {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    error,
    localVideoRef,
    remoteVideoRef,
  } = useVideoCall();

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
    try {
      // Accept SIP audio call
      sipService.answer();
      
      // Connect to LiveKit for video
      await connect(currentCall);
      
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
    disconnect();
    toast.info("Appel terminé");
  };

  // État: Pas d'appel en cours
  if (!currentCall) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Test Interphone Vidéo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cette page permet de tester l'intégration LiveKit pour l'interphone vidéo.
              </p>
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
                    Simuler appel entrant
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">{error}</p>
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
              disabled={isConnecting}
            >
              {isConnecting ? (
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
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Vidéo distante (plein écran) - conteneur pour le track attach */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div
          ref={remoteVideoRef as unknown as React.RefObject<HTMLDivElement>}
          className="w-full h-full flex items-center justify-center [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
        />
        {!isConnected && (
          <div className="absolute text-white/50 flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/50 border-t-transparent" />
            <span>Connexion en cours...</span>
          </div>
        )}
      </div>

      {/* Vidéo locale masquée - caméra utilisateur non utilisée */}

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

      {/* Erreur */}
      {error && (
        <div className="absolute top-4 left-4 right-20 p-3 rounded-lg bg-destructive/90 text-white text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
