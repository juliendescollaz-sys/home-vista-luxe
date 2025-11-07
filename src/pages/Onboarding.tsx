import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useHAStore } from "@/store/useHAStore";
import { testConnection } from "@/lib/homeassistant";
import { Home, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Onboarding = () => {
  const [url, setUrl] = useState("http://homeassistant.local:8123");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  
  const navigate = useNavigate();
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  const handleConnect = async () => {
    if (!url || !token) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    setStatus("testing");

    try {
      const isValid = await testConnection(url, token);
      
      if (isValid) {
        setStatus("success");
        setConnection({ url, token, connected: true });
        setConnected(true);
        
        toast.success("Connexion réussie !", {
          description: "Bienvenue sur Neolia Smart Home",
        });

        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setStatus("error");
        toast.error("Connexion échouée", {
          description: "Vérifiez la console pour plus de détails. Problèmes possibles: CORS, URL incorrecte, ou token invalide.",
        });
      }
    } catch (error) {
      setStatus("error");
      toast.error("Erreur de connexion", {
        description: "Consultez la console du navigateur (F12) pour voir les détails de l'erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow">
              <Home className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Neolia</h1>
          <p className="text-muted-foreground text-lg">Smart Home Premium</p>
        </div>

        <Card className="p-8 bg-gradient-card border-border/50 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-base">URL Home Assistant</Label>
              <Input
                id="url"
                type="url"
                placeholder="http://homeassistant.local:8123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                L'adresse de votre serveur Home Assistant
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="text-base">Token d'accès</Label>
              <Input
                id="token"
                type="password"
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGc..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-12 font-mono text-sm"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Créez un token dans Profil → Sécurité
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={loading || !url || !token}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {status === "testing" && "Test de connexion..."}
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Connexion réussie
                </>
              ) : status === "error" ? (
                <>
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Réessayer
                </>
              ) : (
                "Se connecter"
              )}
            </Button>

            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                Connexion sécurisée avec chiffrement de bout en bout
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/50 border-border/50">
          <div className="space-y-3 text-sm">
            <p className="font-medium text-foreground">⚠️ Problème de connexion ?</p>
            <div className="space-y-2 text-muted-foreground">
              <p>Les URL <code className="px-1 py-0.5 bg-background rounded text-xs">http://</code> locales ne fonctionnent pas depuis cette app web (CORS/HTTPS).</p>
              <p className="font-medium text-foreground">Solutions :</p>
              <ul className="space-y-1 pl-4 list-disc">
                <li>
                  <strong>Recommandé:</strong> Utilisez{" "}
                  <a
                    href="https://www.nabucasa.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Nabu Casa
                  </a>{" "}
                  (URL HTTPS fournie)
                </li>
                <li>
                  Configurez un accès HTTPS externe (DuckDNS + Let's Encrypt)
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Première installation ?</p>
          <a
            href="https://www.home-assistant.io/getting-started/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Guide de démarrage Home Assistant →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
