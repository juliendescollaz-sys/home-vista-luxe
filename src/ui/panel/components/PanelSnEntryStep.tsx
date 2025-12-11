// src/ui/panel/components/PanelSnEntryStep.tsx

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";

// Placeholder pour l'image - à remplacer par l'asset réel quand disponible
import haSnLocationPlaceholder from "@/assets/ha-sn-location.png";

export function PanelSnEntryStep() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const {
    config: neoliaPanelConfig,
    loading: configLoading,
    error: configError,
    setEnteredNeoliaCode,
    setHasCompletedSnStep,
  } = useNeoliaPanelConfigStore();

  // Validation du format : exactement 4 chiffres
  const isValidFormat = /^\d{4}$/.test(code);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limiter à 4 caractères et filtrer les non-chiffres
    const filtered = value.replace(/\D/g, "").slice(0, 4);
    setCode(filtered);
    setError("");
  };

  const handleValidate = useCallback(() => {
    if (!isValidFormat) {
      setError("Veuillez saisir exactement 4 chiffres.");
      return;
    }

    setIsValidating(true);
    setError("");

    // Si la config HA est disponible, comparer le code
    if (neoliaPanelConfig?.neoliaCode) {
      const expectedCode = neoliaPanelConfig.neoliaCode;
      
      if (code !== expectedCode) {
        setError(
          "Le code ne correspond pas à l'installation détectée. " +
          "Vérifiez le numéro de série ou contactez votre installateur."
        );
        setIsValidating(false);
        return;
      }
    }

    // Code valide (ou pas encore de config HA pour comparer)
    setEnteredNeoliaCode(code);
    setHasCompletedSnStep(true);

    // Marquer l'onboarding Panel comme terminé dans localStorage
    try {
      window.localStorage.setItem("neolia_panel_onboarding_completed", "1");
    } catch {
      // Ignorer les erreurs de storage
    }

    console.log("[PanelSnEntryStep] Code SN validé, redirection vers la page principale...");

    // Rediriger directement vers la page principale du Panel
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  }, [code, isValidFormat, neoliaPanelConfig, setEnteredNeoliaCode, setHasCompletedSnStep]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValidFormat && !isValidating) {
      handleValidate();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={neoliaLogoDark} alt="Neolia Logo Dark" className="h-16 dark:hidden" />
          <img src={neoliaLogo} alt="Neolia Logo" className="h-16 hidden dark:block" />
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Associer ce panneau à votre installation</CardTitle>
            </div>
            <CardDescription className="text-lg leading-relaxed">
              Pour identifier la bonne installation sur votre réseau, veuillez saisir les{" "}
              <strong>4 derniers chiffres</strong> du numéro de série de votre Home Assistant.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Image d'aide */}
            <div className="flex justify-center">
              <img
                src={haSnLocationPlaceholder}
                alt="Emplacement du numéro de série sur votre Home Assistant"
                className="max-w-full h-auto rounded-lg border border-border shadow-sm"
                style={{ maxHeight: "200px" }}
              />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Le numéro de série se trouve sur l'étiquette située sous votre boîtier Home Assistant.
            </p>

            {/* Champ de saisie */}
            <div className="space-y-3">
              <Label htmlFor="neolia-sn-code" className="text-lg">
                Code Neolia (4 derniers chiffres)
              </Label>
              <Input
                id="neolia-sn-code"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="ex: 1234"
                value={code}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                disabled={isValidating}
                className="text-2xl h-16 text-center tracking-[0.5em] font-mono"
                autoFocus
              />
              {code.length > 0 && code.length < 4 && (
                <p className="text-sm text-muted-foreground">
                  {4 - code.length} chiffre{4 - code.length > 1 ? "s" : ""} restant{4 - code.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Message d'erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}

            {/* Message de connexion en cours */}
            {configLoading && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-base text-blue-600 dark:text-blue-400">
                  Connexion à votre installation en cours…
                  {" "}Si le problème persiste, rapprochez-vous de votre installateur.
                </AlertDescription>
              </Alert>
            )}

            {/* Message si config en erreur mais pas bloquant */}
            {configError && !error && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-600 dark:text-yellow-400">
                  Impossible de vérifier le code avec Home Assistant pour l'instant.
                  Vous pouvez tout de même continuer.
                </AlertDescription>
              </Alert>
            )}

            {/* Bouton de validation */}
            <Button
              onClick={handleValidate}
              disabled={!isValidFormat || isValidating}
              size="lg"
              className="w-full h-16 text-lg"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Vérification…
                </>
              ) : (
                "Continuer"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
