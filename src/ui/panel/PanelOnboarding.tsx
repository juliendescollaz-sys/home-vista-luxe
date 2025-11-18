import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  fetchConfigFromNeoliaServer,
  setHaConfig,
  testHaConnection,
} from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";

type OnboardingState = "idle" | "loading" | "error" | "success";

/**
 * Écran d'onboarding spécifique au mode PANEL
 * Permet de récupérer automatiquement la configuration HA depuis NeoliaServer
 */
export function PanelOnboarding() {
  const [installerIp, setInstallerIp] = useState("");
  const [state, setState] = useState<OnboardingState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const setConnection = useHAStore((state) => state.setConnection);

  const handleImportConfig = async () => {
    // Validation de l'IP
    if (!installerIp.trim()) {
      setErrorMessage("Veuillez saisir l'adresse IP du poste d'installation.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMessage("");

    try {
      // 1. Récupération de la config depuis NeoliaServer
      const { ha_url, token } = await fetchConfigFromNeoliaServer(installerIp.trim());

      // 2. Enregistrement de la config
      await setHaConfig({ url: ha_url, token });

      // 3. Test de connexion rapide
      const isConnected = await testHaConnection({ url: ha_url, token });

      if (!isConnected) {
        setState("error");
        setErrorMessage(
          "Configuration importée mais impossible de contacter Home Assistant. " +
          "Vérifiez que Home Assistant est accessible depuis ce panneau."
        );
        return;
      }

      // 4. Mise à jour du store
      setConnection({
        url: ha_url,
        token,
        connected: true,
      });

      setState("success");

      // Redirection automatique après 1 seconde
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setState("error");

      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("fetch")) {
          setErrorMessage(
            `Impossible de contacter NeoliaServer à l'adresse http://${installerIp}:8765/config. ` +
            "Vérifiez que le PC est sur le même réseau et que NeoliaServer est lancé."
          );
        } else if (error.message.includes("invalide")) {
          setErrorMessage(
            "La configuration reçue est invalide. Vérifiez NeoliaServer et réessayez."
          );
        } else {
          setErrorMessage(`Erreur: ${error.message}`);
        }
      } else {
        setErrorMessage("Une erreur inattendue s'est produite.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && state !== "loading") {
      handleImportConfig();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={neoliaLogoDark}
            alt="Neolia Logo Dark"
            className="h-16 dark:hidden"
          />
          <img
            src={neoliaLogo}
            alt="Neolia Logo"
            className="h-16 hidden dark:block"
          />
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Configuration du panneau Neolia</CardTitle>
            </div>
            <CardDescription className="text-lg leading-relaxed">
              Pour configurer ce panneau, lancez l'outil <strong>NeoliaServer</strong> sur
              le PC de l'installateur. Assurez-vous que le PC et ce panneau sont sur le
              même réseau local.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Champ IP */}
            <div className="space-y-3">
              <Label htmlFor="installer-ip" className="text-lg">
                Adresse IP du poste d'installation
              </Label>
              <Input
                id="installer-ip"
                type="text"
                placeholder="192.168.1.34"
                value={installerIp}
                onChange={(e) => setInstallerIp(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={state === "loading"}
                className="text-lg h-14"
              />
              <p className="text-sm text-muted-foreground">
                L'adresse IP est affichée dans la fenêtre de NeoliaServer sur le PC
                (ex : 192.168.1.34)
              </p>
            </div>

            {/* Messages d'état */}
            {state === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {state === "success" && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-base text-green-600 dark:text-green-400">
                  Configuration importée avec succès. Connexion à Home Assistant…
                </AlertDescription>
              </Alert>
            )}

            {/* Bouton d'import */}
            <Button
              onClick={handleImportConfig}
              disabled={state === "loading" || state === "success"}
              size="lg"
              className="w-full h-16 text-lg"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Import en cours…
                </>
              ) : (
                "Importer la configuration"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
