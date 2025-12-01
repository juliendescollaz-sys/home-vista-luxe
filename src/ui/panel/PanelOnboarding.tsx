import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Server, AlertCircle, CheckCircle2, Bug } from "lucide-react";
import {
  fetchConfigFromNeoliaServer,
  setHaConfig,
  testHaConnection,
} from "@/services/haConfig";
import { useHAStore } from "@/store/useHAStore";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";

type OnboardingStatus = "idle" | "loading" | "success" | "error";
type TestStatus = "idle" | "testing" | "success" | "error";

/**
 * Écran d'onboarding spécifique au mode PANEL
 * Permet de récupérer automatiquement la configuration HA depuis NeoliaServer
 */
export function PanelOnboarding() {
  const [installerIp, setInstallerIp] = useState("");
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testResult, setTestResult] = useState<string>("");
  const setConnection = useHAStore((state) => state.setConnection);

  /**
   * Valide le format de l'adresse IP (accepte IP ou IP:port)
   */
  const isValidIp = (ip: string): boolean => {
    if (!ip) return false;

    // On accepte "ip" ou "ip:port"
    let hostPart = ip.trim();

    if (hostPart.startsWith("http://")) {
      hostPart = hostPart.substring("http://".length);
    } else if (hostPart.startsWith("https://")) {
      hostPart = hostPart.substring("https://".length);
    }

    const colonIndex = hostPart.lastIndexOf(":");
    if (colonIndex > -1) {
      hostPart = hostPart.substring(0, colonIndex).trim();
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(hostPart)) {
      return false;
    }

    const octets = hostPart.split(".");
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  };

  const handleImportConfig = async () => {
    const trimmedIp = installerIp.trim();

    // 1. Validation de l'IP
    if (!trimmedIp) {
      setErrorMessage("Veuillez saisir l'adresse IP du poste d'installation.");
      setStatus("error");
      return;
    }

    if (!isValidIp(trimmedIp)) {
      setErrorMessage("Adresse IP invalide. Format attendu : 192.168.1.34");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    console.log("[PanelOnboarding] Connexion à NeoliaServer via IP saisie :", trimmedIp);
    setStatusMessage(`Connexion à NeoliaServer à l'adresse ${trimmedIp}…`);

    try {
      // 2. Récupération de la config depuis NeoliaServer (timeout 4s)
      const { ha_url, token } = await fetchConfigFromNeoliaServer(trimmedIp);

      setStatusMessage("Configuration reçue. Enregistrement…");

      // 3. Enregistrement de la config
      await setHaConfig({ url: ha_url, token });

      setStatusMessage("Configuration importée. Vérification de la connexion Home Assistant…");

      // 4. Test de connexion à Home Assistant
      const isConnected = await testHaConnection(ha_url, token, 5000);

      if (!isConnected) {
        setStatus("error");
        setErrorMessage(
          "Les paramètres reçus ne permettent pas de se connecter à Home Assistant. " +
          "Vérifiez que Home Assistant est accessible depuis ce panneau."
        );
        setStatusMessage("");
        return;
      }

      // 5. Mise à jour du store
      setConnection({
        url: ha_url,
        token,
        connected: true,
      });

      setStatus("success");
      setStatusMessage("Configuration importée avec succès. Connexion à Home Assistant établie.");

      // Redirection automatique immédiate
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      setStatus("error");
      setStatusMessage("");

      console.error("[PanelOnboarding] Erreur lors de l'import:", error);

      // Détection du type d'erreur enrichi par fetchConfigFromNeoliaServer
      const errorType = error?.type;

      if (errorType === "timeout" || error.message?.includes("TIMEOUT")) {
        setErrorMessage(
          "NeoliaServer ne répond pas (timeout 4s). " +
          "Vérifiez que le PC est allumé, sur le même réseau, et que NeoliaServer est lancé."
        );
      } else if (errorType === "network" || error.message?.includes("NETWORK")) {
        setErrorMessage(
          `Impossible de contacter NeoliaServer à l'adresse "${trimmedIp}". ` +
          "Causes possibles :\n" +
          "• Le PC n'est pas sur le même réseau WiFi\n" +
          "• NeoliaServer n'est pas lancé sur le PC\n" +
          "• Le port 8765 est bloqué par un firewall\n" +
          "• Problème CORS (voir logs console)"
        );
      } else if (error.message?.includes("invalide")) {
        setErrorMessage(
          "La configuration reçue est invalide. Vérifiez NeoliaServer et réessayez."
        );
      } else if (error.message?.includes("HTTP")) {
        setErrorMessage(`Erreur serveur: ${error.message}`);
      } else {
        setErrorMessage(`Erreur: ${error.message || "Erreur inconnue"}`);
      }
    }
  };

  /**
   * Bouton de test de connexion pour debug
   */
  const handleTestConnection = async () => {
    const trimmedIp = installerIp.trim();
    if (!trimmedIp) {
      setTestResult("Veuillez d'abord saisir une adresse IP.");
      setTestStatus("error");
      return;
    }

    setTestStatus("testing");
    setTestResult("Test en cours...");

    try {
      console.log("[PanelOnboarding] Test de connexion vers:", trimmedIp);
      const result = await fetchConfigFromNeoliaServer(trimmedIp);
      
      setTestStatus("success");
      setTestResult(
        `✅ Connexion réussie!\n` +
        `ha_url: ${result.ha_url}\n` +
        `token: ${result.token.substring(0, 20)}...`
      );
    } catch (error: any) {
      setTestStatus("error");
      const errorType = error?.type || "unknown";
      setTestResult(
        `❌ Échec (${errorType})\n` +
        `Message: ${error.message}\n` +
        `Voir console pour détails.`
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && status !== "loading" && status !== "success") {
      handleImportConfig();
    }
  };

  const isInputDisabled = status === "loading" || status === "success";
  const isButtonDisabled = status === "loading" || status === "success";

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
                disabled={isInputDisabled}
                className="text-lg h-14"
              />
              <p className="text-sm text-muted-foreground">
                L'adresse IP est affichée dans la fenêtre de NeoliaServer sur le PC
                (ex : 192.168.1.34)
              </p>
            </div>

            {/* Message de statut pendant le chargement */}
            {status === "loading" && statusMessage && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-base text-blue-600 dark:text-blue-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Message d'erreur */}
            {status === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Message de succès */}
            {status === "success" && statusMessage && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-base text-green-600 dark:text-green-400">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Bouton d'import */}
            <Button
              onClick={handleImportConfig}
              disabled={isButtonDisabled}
              size="lg"
              className="w-full h-16 text-lg"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Connexion à NeoliaServer…
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  Configuration importée
                </>
              ) : (
                "Importer la configuration"
              )}
            </Button>

            {/* Section Debug - Bouton de test */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Diagnostic</span>
              </div>
              
              <Button
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || status === "loading"}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {testStatus === "testing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  "Tester la connexion NeoliaServer"
                )}
              </Button>

              {testResult && (
                <pre className={`mt-3 p-3 rounded-md text-xs font-mono whitespace-pre-wrap ${
                  testStatus === "success" 
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" 
                    : testStatus === "error"
                    ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {testResult}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
