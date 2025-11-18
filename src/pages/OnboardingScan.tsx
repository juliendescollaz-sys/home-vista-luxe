import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle2, Loader2, QrCode, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { storeHACredentials } from "@/lib/crypto";
import { useHAStore } from "@/store/useHAStore";
import { parseQRCode, testHAConnection } from "@/lib/qrParser";

const OnboardingScan = () => {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const navigate = useNavigate();
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  useEffect(() => {
    // Ensure video element is mounted
    if (videoRef.current) {
      setVideoReady(true);
    }
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setScanning(true);
      setStatus("scanning");
      setMessage("Positionnez le QR code dans le cadre");

      console.log("🎬 Starting camera initialization...");

      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      // Request camera access with iOS-compatible constraints
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      console.log("📸 Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Camera access granted, stream active:", stream.active);

      // Manually attach stream to video element (crucial for iOS)
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Ensure video plays (iOS requirement)
      await video.play();
      console.log("▶️ Video playing");

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
        } else {
          video.onloadedmetadata = () => {
            console.log("📹 Video metadata loaded");
            resolve();
          };
        }
      });

      // Now initialize @zxing scanner
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      console.log("🔍 Starting QR code detection...");
      
      // Use the already-active stream
      await codeReader.decodeFromStream(
        stream,
        video,
        (result, error) => {
          if (result) {
            const qrText = result.getText();
            console.log("📱 QR code detected:", qrText);
            handleQRCode(qrText);
          }
          if (error && error.name !== 'NotFoundException') {
            console.error("Scanner error:", error);
          }
        }
      );

    } catch (error: any) {
      console.error("❌ Camera error:", error.name, error.message);
      setScanning(false);
      setStatus("error");
      
      let errorMessage = "Impossible d'accéder à la caméra";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permission caméra refusée";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Aucune caméra trouvée";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Caméra déjà utilisée par une autre app";
      }
      
      setMessage(errorMessage);
      toast.error("Erreur caméra", {
        description: errorMessage,
      });
    }
  };

  const stopScanning = () => {
    console.log("🛑 Stopping scanner...");
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("⏹️ Track stopped:", track.kind);
      });
      videoRef.current.srcObject = null;
    }
    
    if (readerRef.current) {
      readerRef.current = null;
    }
    
    setScanning(false);
    console.log("✅ Scanner stopped");
  };

  const handleQRCode = async (qrText: string) => {
    // Prevent multiple simultaneous processing
    if (processingRef.current) return;
    processingRef.current = true;

    stopScanning();
    setStatus("processing");
    setMessage("Vérification du code...");

    try {
      console.log("📱 QR code scanné:", qrText.substring(0, 50) + "...");

      // Parse and validate QR code
      const { baseUrl, token, wsUrl } = parseQRCode(qrText);
      console.log("✅ QR code valide:", { baseUrl, wsUrl });

      setMessage("Connexion à Home Assistant...");

      // Test WebSocket connection with authentication
      await testHAConnection(wsUrl, token);
      
      console.log("✅ Connexion Home Assistant réussie");
      setStatus("success");
      setMessage("Connexion établie !");

      // Store encrypted credentials locally
      await storeHACredentials(baseUrl, token);

      // Update Zustand store
      setConnection({
        url: baseUrl,
        token: token,
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
      console.error("❌ Erreur de jumelage:", error);
      setStatus("error");
      processingRef.current = false; // Reset flag on error
      
      // Map error messages to user-friendly French
      const errorMsg = error.message || "Erreur lors du jumelage";
      
      setMessage(errorMsg);
      toast.error("Échec du jumelage", {
        description: errorMsg,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Bouton retour */}
      <div className="w-full max-w-md mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/onboarding")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <Card className="overflow-hidden bg-gradient-card border-border/50">
          <div className="relative aspect-square bg-black">
            {scanning ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
              />
            ) : (
              <>
                {/* Hidden video element to initialize ref */}
                <video
                  ref={videoRef}
                  className="hidden"
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                </div>
              </>
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
                disabled={!videoReady}
              >
                <Camera className="mr-2 h-5 w-5" />
                {videoReady ? "Démarrer le scan" : "Chargement..."}
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
      </div>
    </div>
  );
};

export default OnboardingScan;