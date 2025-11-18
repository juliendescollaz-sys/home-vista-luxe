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
import { z } from "zod";

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
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  const handleConnect = async () => {
    // Validate inputs before attempting connection
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

      // Mettre à jour le store (comme dans OnboardingScan)
      setConnection({
        url: parsed.baseUrl,
        token: parsed.token,
        connected: true,
      });
      setConnected(true);

      toast.success("Connexion établie avec succès", {
        description: "Redirection en cours...",
      });
    
      // Délai identique au scan QR pour cohérence
      setTimeout(() => {
        navigate("/");
      }, 1500);
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
                type="url"
                placeholder="http://homeassistant.local:8123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnecting}
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token d'accès</Label>
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
