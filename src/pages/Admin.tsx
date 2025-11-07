import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Loader2, CheckCircle2, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCodeCanvas from "qrcode";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const urlSchema = z.string().url('URL invalide').max(500);
const tokenSchema = z.string().min(50, 'Token trop court (minimum 50 caractères)').max(1000, 'Token trop long (maximum 1000 caractères)');

const Admin = () => {
  const [haUrl, setHaUrl] = useState("https://");
  const [haToken, setHaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleGenerateQR = async () => {
    // Validate inputs
    try {
      urlSchema.parse(haUrl);
      tokenSchema.parse(haToken);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    if (!haUrl.includes(".ui.nabu.casa")) {
      toast.error("URL invalide", {
        description: "L'URL doit être une adresse Nabu Casa",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("🎫 Creating pair code...");

      const { data, error } = await supabase.functions.invoke('pair-create', {
        body: {
          haBaseUrl: haUrl,
          haToken: haToken,
        },
      });

      if (error) {
        console.error("Error creating pair code:", error);
        throw error;
      }

      if (!data?.qr_uri) {
        throw new Error("Invalid response from server");
      }

      console.log("✅ Pair code created");

      // Generate QR code image
      const qrImage = await QRCodeCanvas.toDataURL(data.qr_uri, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      setQrDataUrl(qrImage);
      setExpiresIn(data.expires_in);

      toast.success("QR code généré !", {
        description: `Valable ${data.expires_in / 60} minutes`,
      });

      // Start countdown
      const countdown = setInterval(() => {
        setExpiresIn(prev => {
          if (!prev || prev <= 1) {
            clearInterval(countdown);
            setQrDataUrl(null);
            toast.info("QR code expiré", {
              description: "Générez-en un nouveau",
            });
            return null;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Failed to generate QR:", error);
      toast.error("Erreur", {
        description: error.message || "Impossible de générer le QR code",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-6 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow">
              <QrCode className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin - Génération QR</h1>
          <p className="text-muted-foreground">
            Créez un QR code pour jumeler une nouvelle application
          </p>
        </div>

        {!qrDataUrl ? (
          <Card className="p-6 bg-gradient-card border-border/50">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">URL Nabu Casa</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://xxxxx.ui.nabu.casa"
                  value={haUrl}
                  onChange={(e) => setHaUrl(e.target.value)}
                  disabled={loading}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token d'accès longue durée</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGc..."
                  value={haToken}
                  onChange={(e) => setHaToken(e.target.value)}
                  className="font-mono text-sm"
                  disabled={loading}
                  maxLength={1000}
                  minLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Le token sera chiffré et stocké de manière sécurisée
                </p>
              </div>

              <Button
                onClick={handleGenerateQR}
                disabled={loading || !haUrl || !haToken}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-5 w-5" />
                    Générer le QR Code
                  </>
                )}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-gradient-card border-border/50 text-center space-y-6">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">QR Code prêt !</span>
            </div>

            <div className="bg-white p-4 rounded-lg inline-block">
              <img src={qrDataUrl} alt="QR Code" className="w-full max-w-xs mx-auto" />
            </div>

            {expiresIn !== null && (
              <div className="text-sm">
                <span className="text-muted-foreground">Expire dans: </span>
                <span className="font-mono font-bold text-lg text-primary">
                  {formatTime(expiresIn)}
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Scannez ce code depuis l'application mobile
            </p>

            <Button
              onClick={() => {
                setQrDataUrl(null);
                setExpiresIn(null);
                setHaUrl("https://");
                setHaToken("");
              }}
              variant="outline"
              className="w-full"
            >
              Générer un nouveau code
            </Button>
          </Card>
        )}

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>

        <Card className="p-4 bg-muted/50 border-border/50">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">🔒 Sécurité</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>Le token n'est jamais exposé côté client</li>
              <li>Chiffrement AES-GCM pour le stockage</li>
              <li>Code valable 10 minutes uniquement</li>
              <li>Usage unique (one-time)</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;