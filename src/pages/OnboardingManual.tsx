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
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { 
  CLOUD_BASE_URL, 
  DEV_SHARED_TOKEN, 
  MOBILE_TABLET_DEFAULT_TOKEN,
  getDevInitialHaUrl 
} from "@/config/networkDefaults";

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
  const { displayMode } = useDisplayMode();
  
  // URL par défaut selon le mode et les variables d'environnement
  const getDefaultUrl = () => {
    // Vérifier si une URL a été pré-remplie
    const prefill = localStorage.getItem("neolia_prefill_url");
    if (prefill) {
      localStorage.removeItem("neolia_prefill_url");
      return prefill;
    }
    
    // En mode Panel, utiliser l'URL de dev si disponible, sinon vide
    if (displayMode === "panel") {
      return getDevInitialHaUrl(); // Vide en PROD
    }
    
    // En mode Mobile/Tablet, utiliser l'URL de dev ou cloud
    return getDevInitialHaUrl() || CLOUD_BASE_URL;
  };
  
  const getDefaultToken = () => {
    const prefill = localStorage.getItem("neolia_prefill_token");
    if (prefill) {
      localStorage.removeItem("neolia_prefill_token");
      return prefill;
    }
    
    // En mode Mobile/Tablet, utiliser le token par défaut
    if (displayMode === "mobile" || displayMode === "tablet") {
      return MOBILE_TABLET_DEFAULT_TOKEN;
    }
    
    // En mode Panel, utiliser le token de dev si disponible
    return DEV_SHARED_TOKEN;
  };
  
  const [url, setUrl] = useState(getDefaultUrl);
  const [token, setToken] = useState(getDefaultToken);
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  const handleConnect = async () => {
    // Validate inputs
    try {
      urlSchema.parse(url);
      tokenSchema.parse(token);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsConnecting(true);

    try {
      const trimmedUrl = url.trim();
      const trimmedToken = token.trim();

      // Enregistrer la configuration (format legacy)
      await setHaConfig({
        url: trimmedUrl,
        token: trimmedToken,
      });

      // Mettre à jour le store
      setConnection({
        url: trimmedUrl,
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
              <Label htmlFor="url">URL Home Assistant *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://xxxxx.ui.nabu.casa"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnecting}
                maxLength={500}
                required
              />
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
