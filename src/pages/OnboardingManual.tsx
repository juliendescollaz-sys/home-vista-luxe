import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { useHAStore } from "@/store/useHAStore";
import { toast } from "sonner";
import neoliaLogo from "@/assets/neolia-logo.png";
import { z } from "zod";
import { setHaConfig } from "@/services/haConfig";
import { useDisplayMode } from "@/hooks/useDisplayMode";

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
  const isPanelMode = displayMode === "panel";
  
  // Initialiser avec les valeurs pré-remplies depuis localStorage (si provenant du Configurator)
  const [url, setUrl] = useState(() => {
    const prefill = localStorage.getItem("neolia_prefill_url");
    if (prefill) {
      localStorage.removeItem("neolia_prefill_url"); // Nettoyer après utilisation
      return prefill;
    }
    return "";
  });
  const [token, setToken] = useState(() => {
    const prefill = localStorage.getItem("neolia_prefill_token");
    if (prefill) {
      localStorage.removeItem("neolia_prefill_token"); // Nettoyer après utilisation
      return prefill;
    }
    return "";
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  // États pour l'import depuis NeoliaConfigurator
  const [configServerUrl, setConfigServerUrl] = useState(
    () => localStorage.getItem("neolia_configurator_url") || "http://neolia-configurator.local:8765"
  );
  const [isLoadingFromConfigurator, setIsLoadingFromConfigurator] = useState(false);
  const [errorFromConfigurator, setErrorFromConfigurator] = useState<string | null>(null);

  const handleImportFromConfigurator = async () => {
    setErrorFromConfigurator(null);

    let baseUrl = configServerUrl.trim();
    if (!baseUrl) {
      setErrorFromConfigurator("Veuillez saisir l'adresse du serveur NeoliaConfigurator.");
      return;
    }

    // Supprime un éventuel "/" final
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const fetchUrl = `${baseUrl}/config`;

    try {
      setIsLoadingFromConfigurator(true);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as {
        ha_url?: string;
        token?: string;
      };

      if (!data.ha_url || !data.token) {
        throw new Error("Réponse invalide du configurateur (ha_url ou token manquant).");
      }

      // Remplir les champs du formulaire
      setUrl(data.ha_url);
      setToken(data.token);

      toast.success("Configuration importée", {
        description: "URL et token récupérés depuis NeoliaConfigurator",
      });
      setErrorFromConfigurator(null);
    } catch (err: any) {
      console.error("Erreur lors de la récupération de la config depuis NeoliaConfigurator:", err);
      setErrorFromConfigurator(
        "Impossible de récupérer la configuration. Vérifiez que NeoliaConfigurator est lancé et accessible sur le réseau."
      );
    } finally {
      setIsLoadingFromConfigurator(false);
    }
  };

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
            {/* Section import depuis NeoliaConfigurator - Visible uniquement en mode Panel */}
            {isPanelMode && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border/40 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Si NeoliaConfigurator est lancé sur votre PC, vous pouvez importer automatiquement l&apos;URL et le token.
                </p>
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Adresse du serveur NeoliaConfigurator
                  </Label>
                  <Input
                    type="text"
                    className="text-sm"
                    value={configServerUrl}
                    onChange={(e) => {
                      setConfigServerUrl(e.target.value);
                      localStorage.setItem("neolia_configurator_url", e.target.value);
                    }}
                    placeholder="http://192.168.x.x:8765"
                    disabled={isLoadingFromConfigurator}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleImportFromConfigurator}
                  disabled={isLoadingFromConfigurator}
                  className="w-full gap-2"
                >
                  {isLoadingFromConfigurator ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion au configurateur...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Importer depuis NeoliaConfigurator
                    </>
                  )}
                </Button>

                {errorFromConfigurator && (
                  <p className="text-xs text-destructive">
                    {errorFromConfigurator}
                  </p>
                )}
              </div>
            )}

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
