import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import neoliaLogo from "@/assets/neolia-logo.png";
import { z } from "zod";
import { setHaConfig } from "@/services/haConfig";

const urlSchema = z.string()
  .trim()
  .min(10, "URL trop courte")
  .max(500, "URL trop longue")
  .refine(
    url => /^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url),
    "L'URL doit commencer par http://, https://, ws:// ou wss://"
  );

const tokenSchema = z.string()
  .trim()
  .min(50, "Token trop court")
  .max(1000, "Token trop long");

const OnboardingManual = () => {
  const navigate = useNavigate();
  const [localUrl, setLocalUrl] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("https://bl09dhclkeomkczlb0b7ktsssxmevmdq.ui.nabu.casa");
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmMTIyYzA5MGZkOGY0OGZlYjcxZjM5MjgzMjgwZTdmMSIsImlhdCI6MTc2Mjc2OTcxNSwiZXhwIjoyMDc4MTI5NzE1fQ.x7o25AkxgP8PXjTijmXkYOZeMDneeSZVPJT5kUi0emM");
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  const handleConnect = async () => {
    // Validate inputs
    try {
      urlSchema.parse(localUrl);
      tokenSchema.parse(token);
      if (remoteUrl.trim() && remoteUrl.trim().length > 0) {
        urlSchema.parse(remoteUrl);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsConnecting(true);

    try {
      const trimmedLocalUrl = localUrl.trim();
      const trimmedRemoteUrl = remoteUrl.trim() || undefined;
      const trimmedToken = token.trim();

      // Enregistrer la configuration avec le nouveau format
      await setHaConfig({
        localHaUrl: trimmedLocalUrl,
        remoteHaUrl: trimmedRemoteUrl,
        token: trimmedToken,
      });

      // Mettre à jour le store
      setConnection({
        url: trimmedLocalUrl,
        token: trimmedToken,
        connected: true,
      });
      setConnected(true);

      toast.success("Configuration enregistrée", {
        description: "Connexion en cours...",
      });
    
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement de la configuration:", error);
      toast.error("Erreur lors de l'enregistrement de la configuration");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background">
      <div className="w-full max-w-md mx-auto space-y-8 animate-fade-up">
        {/* Bouton retour */}
        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/onboarding")}
            className="gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </Button>
        </div>

        {/* Logo */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src={neoliaLogo} 
              alt="Neolia" 
              className="h-20 w-auto"
            />
          </div>
          <p className="text-muted-foreground text-lg">Smart Home Premium</p>
        </div>

        {/* Formulaire */}
        <Card>
          <CardHeader>
            <CardTitle>Connexion manuelle</CardTitle>
            <CardDescription>
              Configurez votre connexion à Home Assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="localUrl">URL locale (LAN) *</Label>
              <Input
                id="localUrl"
                type="url"
                placeholder="http://192.168.1.20:8123"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                disabled={isConnecting}
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remoteUrl">URL cloud (accès à distance)</Label>
              <Input
                id="remoteUrl"
                type="url"
                placeholder="https://xxxxx.ui.nabu.casa"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                disabled={isConnecting}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Optionnel. À renseigner seulement si l'accès à distance est activé.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token Home Assistant *</Label>
              <Input
                id="token"
                type="password"
                placeholder="eyJhbGci..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting}
                maxLength={1000}
                required
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingManual;
