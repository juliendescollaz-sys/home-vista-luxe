import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  const handleConfiguratorImport = async () => {
    setErrorConfigurator(null);

    // Récupérer l'adresse du configurateur depuis localStorage
    let baseUrl = localStorage.getItem("neolia_configurator_url") || "http://neolia-configurator.local:8765";
    baseUrl = baseUrl.trim();

    if (!baseUrl) {
      setErrorConfigurator("Adresse du configurateur invalide");
      return;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    try {
      setIsLoadingConfigurator(true);
      const res = await fetch(`${baseUrl}/config`);
      
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const data = await res.json() as { ha_url?: string; token?: string };
      
      if (!data.ha_url || !data.token) {
        throw new Error("JSON invalide (ha_url ou token manquant)");
      }

      const trimmedUrl = data.ha_url.trim();
      const trimmedToken = data.token.trim();

      // Enregistrer la configuration (même logique que OnboardingManual)
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

      toast.success("Configuration importée", {
        description: "Connexion en cours...",
      });

      // Naviguer vers la page d'accueil
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (e) {
      console.error("Erreur NeoliaConfigurator:", e);
      setErrorConfigurator("Impossible de contacter NeoliaConfigurator");
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
            <img 
              src={neoliaLogo} 
              alt="Neolia" 
              className="h-24 w-auto"
            />
          </div>
          <p className="text-muted-foreground text-xl">Smart Home Premium</p>
        </div>

        {/* Boutons de connexion */}
        <div className="space-y-4">
          {panelMode ? (
            /* Mode Panel : bouton Configurator au lieu du QR */
            <div className="space-y-2">
              <Button
                onClick={handleConfiguratorImport}
                disabled={isLoadingConfigurator}
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
                <p className="text-xs text-destructive text-center">
                  {errorConfigurator}
                </p>
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
