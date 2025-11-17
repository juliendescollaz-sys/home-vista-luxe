import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { testHAConnection, parseQRCode } from "@/lib/qrParser";
import { storeHACredentials } from "@/lib/crypto";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import neoliaLogo from "@/assets/neolia-logo.png";

const OnboardingManual = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmMTIyYzA5MGZkOGY0OGZlYjcxZjM5MjgzMjgwZTdmMSIsImlhdCI6MTc2Mjc2OTcxNSwiZXhwIjoyMDc4MTI5NzE1fQ.x7o25AkxgP8PXjTijmXkYOZeMDneeSZVPJT5kUi0emM");
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnection = useHAStore((state) => state.setConnection);

  const handleConnect = async () => {
    if (!url.trim() || !token.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsConnecting(true);

    try {
      // Créer un payload JSON simulé pour réutiliser la logique de parsing
      const simulatedQR = JSON.stringify({
        ha_url: url.trim(),
        ha_token: token.trim()
      });

      const parsed = parseQRCode(simulatedQR);
      
      // Tester la connexion WebSocket
      await testHAConnection(parsed.wsUrl, parsed.token);

      // Sauvegarder les credentials
      await storeHACredentials(parsed.baseUrl, parsed.token);

      // Mettre à jour le store
      setConnection({
        url: parsed.baseUrl,
        token: parsed.token,
        connected: false,
      });

    toast.success("Connexion établie avec succès");
    
    // Petit délai pour s'assurer que le store est bien mis à jour
    // avant la navigation, permettant à useHAClient de se déclencher
    setTimeout(() => {
      navigate("/");
    }, 100);
  } catch (error: any) {
    console.error("Erreur de connexion:", error);
      
      let errorMessage = "Erreur de connexion";
      if (error.message) {
        if (error.message.includes("URL HA invalide")) {
          errorMessage = "URL invalide : utilisez http(s):// ou ws(s)://";
        } else if (error.message.includes("Token refusé")) {
          errorMessage = "Token refusé par Home Assistant";
        } else if (error.message.includes("Serveur injoignable")) {
          errorMessage = "Serveur injoignable. Vérifiez l'URL.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background">
      <div className="w-full max-w-md mx-auto space-y-8 animate-fade-up">
        {/* Logo */}
        <div className="text-center space-y-6 pt-8">
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
              Entrez l'URL de votre Home Assistant et votre token d'accès
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL Home Assistant</Label>
              <Input
                id="url"
                type="text"
                placeholder="http://homeassistant.local:8123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token d'accès</Label>
              <Input
                id="token"
                type="password"
                placeholder="Votre Long-Lived Access Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting}
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

        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate("/onboarding")}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    </div>
  );
};

export default OnboardingManual;
