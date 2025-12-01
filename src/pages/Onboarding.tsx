import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Mail, KeyRound, Download, Loader2 } from "lucide-react";
import neoliaLogo from "@/assets/neolia-logo.png";
import { isPanelMode } from "@/lib/platform";
import { useHAStore } from "@/store/useHAStore";
import { setHaConfig } from "@/services/haConfig";
import { toast } from "sonner";

const Onboarding = () => {
  const navigate = useNavigate();
  const panelMode = isPanelMode();
  const setConnection = useHAStore((state) => state.setConnection);
  const setConnected = useHAStore((state) => state.setConnected);

  // États pour le bouton Configurator (Panel uniquement)
  const [isLoadingConfigurator, setIsLoadingConfigurator] = useState(false);
  const [errorConfigurator, setErrorConfigurator] = useState<string | null>(null);
  const [configServerUrl, setConfigServerUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("neolia_configurator_url") || "192.168.1.10:8765";
    }
    return "192.168.1.10:8765";
  });

  const handleConfigServerUrlChange = (value: string) => {
    setConfigServerUrl(value);
    try {
      localStorage.setItem("neolia_configurator_url", value);
    } catch {
      // ignore storage errors
    }
  };

  const handleConfiguratorImport = async () => {
    setErrorConfigurator(null);

    let baseUrl = (configServerUrl || "").trim();

    // Auto-prefix http:// if missing
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = "http://" + baseUrl;
    }

    if (!baseUrl) {
      setErrorConfigurator("Veuillez saisir l'adresse du serveur NeoliaConfigurator.");
      return;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const url = `${baseUrl}/config`;
    const debugUrl = url;

    // 🔍 LOG DEBUG : URL utilisée
    console.log("[NeoliaConfigurator] Tentative de connexion vers :", debugUrl);

    try {
      setIsLoadingConfigurator(true);

      const res = await fetch(debugUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      console.log("[NeoliaConfigurator] Réponse brute :", res.status, res.statusText);

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const data = (await res.json()) as { ha_url?: string; token?: string };
      console.log("[NeoliaConfigurator] JSON reçu :", data);

      if (!data.ha_url || !data.token) {
        throw new Error("JSON invalide renvoyé par NeoliaConfigurator (ha_url ou token manquant)");
      }

      const trimmedUrl = data.ha_url.trim();
      const trimmedToken = data.token.trim();

      await setHaConfig({
        url: trimmedUrl,
        token: trimmedToken,
      });

      setConnection({
        url: trimmedUrl,
        token: trimmedToken,
        connected: true,
      });
      setConnected(true);

      toast.success("Configuration importée", {
        description: "Connexion en cours...",
      });

      console.log("[NeoliaConfigurator] Connexion HA configurée avec succès :", {
        url: trimmedUrl,
      });

      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (e: any) {
      console.error("[NeoliaConfigurator] Erreur lors du fetch :", e);
      setErrorConfigurator(
        "Impossible de contacter NeoliaConfigurator (" + (e?.message || String(e)) + ")\nURL: " + debugUrl,
      );
    } finally {
      setIsLoadingConfigurator(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-12 animate-fade-up">
        {/* Logo Neolia */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <img src={neoliaLogo} alt="Neolia" className="h-24 w-auto" />
          </div>
          <p className="text-muted-foreground text-xl">Smart Home Premium</p>
        </div>

        {/* Boutons de connexion */}
        <div className="space-y-4">
          {panelMode ? (
            /* Mode Panel : bouton Configurator au lieu du QR */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Adresse du serveur NeoliaConfigurator (IP du PC)
                </label>
                <Input
                  type="text"
                  value={configServerUrl}
                  onChange={(e) => handleConfigServerUrlChange(e.target.value)}
                  placeholder="192.168.1.10:8765"
                  className="h-12 text-base"
                />
              </div>
              <Button
                onClick={handleConfiguratorImport}
                disabled={isLoadingConfigurator || !configServerUrl.trim()}
                size="lg"
                className="w-full h-14 text-lg font-semibold"
              >
                {isLoadingConfigurator ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-3 h-6 w-6" />
                    Connexion via Neolia Configurator
                  </>
                )}
              </Button>
              {errorConfigurator && (
                <p className="text-xs text-destructive text-center whitespace-pre-line">{errorConfigurator}</p>
              )}
            </div>
          ) : (
            /* Mode Mobile/Tablet : bouton QR classique */
            <Button
              onClick={() => navigate("/onboarding/scan")}
              size="lg"
              className="w-full h-14 text-lg font-semibold"
            >
              <QrCode className="mr-3 h-6 w-6" />
              Scanner un code QR
            </Button>
          )}

          <Button
            onClick={() => navigate("/onboarding/manual")}
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            <KeyRound className="mr-3 h-6 w-6" />
            Connexion manuelle
          </Button>
        </div>

        {/* Lien de contact */}
        <div className="text-center pt-8">
          <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
          <a
            href="mailto:contact@neolia.ch"
            className="inline-flex items-center gap-2 text-primary hover:underline text-base font-medium"
          >
            <Mail className="h-4 w-4" />
            contact@neolia.ch
          </a>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
