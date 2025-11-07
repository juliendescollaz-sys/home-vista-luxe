import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { storeHACredentials } from "@/lib/crypto";
import { useHAStore } from "@/store/useHAStore";

const OnboardingScan = () => {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const navigate = useNavigate();
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setScanning(true);
      setStatus("scanning");
      setMessage("Positionnez le QR code dans le cadre");

      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      if (videoRef.current) {
        // First, request camera permission with back camera preference
        // This is crucial for iOS - it needs permission before enumerating devices
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: 'environment' } // Prefer back camera
            }
          });
          
          // Stop the temporary stream - @zxing will create its own
          stream.getTracks().forEach(track => track.stop());
          
          // Now enumerate devices (labels will be available after permission granted)
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          console.log("📹 Available cameras:", videoDevices.map(d => d.label));
          
          // Try to find back camera
          const backCamera = videoDevices.find(device => 
            device.label && (
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('arrière') ||
              device.label.toLowerCase().includes('environment')
            )
          );
          
          const deviceId = backCamera?.deviceId;
          console.log("📷 Using camera:", backCamera?.label || "default camera");

          await codeReader.decodeFromVideoDevice(
            deviceId,
            videoRef.current,
            (result, error) => {
              if (result) {
                const qrText = result.getText();
                console.log("📱 QR code detected:", qrText);
                handleQRCode(qrText);
              }
              // Ignore NOT_FOUND errors (normal when no QR is in view)
              if (error && error.name !== 'NotFoundException') {
                console.error("Scanner error:", error);
              }
            }
          );
        } catch (permError) {
          console.error("Permission denied or camera unavailable:", permError);
          throw permError;
        }
      }
    } catch (error) {
      console.error("Failed to start camera:", error);
      setStatus("error");
      setMessage("Impossible d'accéder à la caméra");
      toast.error("Erreur caméra", {
        description: "Vérifiez les permissions de votre navigateur",
      });
    }
  };

  const stopScanning = () => {
    if (videoRef.current) {
      // Stop all video tracks
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    if (readerRef.current) {
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleQRCode = async (qrText: string) => {
    stopScanning();
    setStatus("processing");
    setMessage("Vérification du code...");

    try {
      // Validate QR format
      if (!qrText.startsWith("ha-pair://v1?code=")) {
        throw new Error("Format de QR code invalide");
      }

      const code = qrText.replace("ha-pair://v1?code=", "");
      console.log("🔄 Redeeming code...");

      // Call redeem API
      const { data, error } = await supabase.functions.invoke('pair-redeem', {
        body: { code },
      });

      if (error) {
        console.error("Redeem error:", error);
        throw new Error(error.message || "Échec de l'échange du code");
      }

      if (!data?.ha_base_url || !data?.access_token) {
        throw new Error("Réponse invalide du serveur");
      }

      console.log("✅ Code redeemed successfully");
      setStatus("success");
      setMessage("Connexion établie !");

      // Store encrypted credentials locally
      await storeHACredentials(data.ha_base_url, data.access_token);

      // Update Zustand store
      setConnection({
        url: data.ha_base_url,
        token: data.access_token,
        connected: true,
      });
      setConnected(true);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      toast.success("Jumelage réussi !", {
        description: "Redirection en cours...",
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (error: any) {
      console.error("QR handling error:", error);
      setStatus("error");
      
      let errorMsg = "Erreur lors du jumelage";
      if (error.message.includes("expired")) {
        errorMsg = "Ce code a expiré. Générez-en un nouveau.";
      } else if (error.message.includes("already used")) {
        errorMsg = "Ce code a déjà été utilisé.";
      } else if (error.message.includes("Rate limit")) {
        errorMsg = "Trop de tentatives. Réessayez dans quelques instants.";
      }
      
      setMessage(errorMsg);
      toast.error("Échec du jumelage", {
        description: errorMsg,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow">
              <QrCode className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Scanner le QR Code</h1>
          <p className="text-muted-foreground">
            Scannez le QR code généré depuis votre admin
          </p>
        </div>

        <Card className="overflow-hidden bg-gradient-card border-border/50">
          <div className="relative aspect-square bg-black">
            {scanning ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            {/* Scanning overlay */}
            {scanning && (
              <div className="absolute inset-0 border-4 border-primary/50 rounded-lg">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Status message */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              {status === "scanning" && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">{message}</span>
                </>
              )}
              {status === "processing" && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">{message}</span>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-500">{message}</span>
                </>
              )}
              {status === "error" && (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive">{message}</span>
                </>
              )}
              {status === "idle" && (
                <span className="text-sm text-muted-foreground">
                  Appuyez sur "Démarrer le scan" pour commencer
                </span>
              )}
            </div>

            {/* Action button */}
            {!scanning && status !== "processing" && status !== "success" && (
              <Button
                onClick={startScanning}
                className="w-full"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Démarrer le scan
              </Button>
            )}

            {scanning && (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Annuler
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-muted/50 border-border/50">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">💡 Comment générer un QR code ?</p>
            <ol className="space-y-1 pl-4 list-decimal">
              <li>Connectez-vous à votre interface admin</li>
              <li>Allez dans <strong className="text-foreground">Paramètres</strong> → <strong className="text-foreground">Jumelage</strong></li>
              <li>Cliquez sur "Générer un QR code"</li>
              <li>Scannez le code affiché (valable 10 minutes)</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingScan;