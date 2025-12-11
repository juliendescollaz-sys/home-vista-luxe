// src/ui/panel/components/PanelSnEntryStep.tsx

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import haSnLocationPlaceholder from "@/assets/ha-sn-location.png";

export function PanelSnEntryStep() {
  const navigate = useNavigate();

  const {
    enteredNeoliaCode,
    setEnteredNeoliaCode,
    setError,
    markSnStepCompleted,
    error,
  } = useNeoliaPanelConfigStore();

  const [localCode, setLocalCode] = useState(enteredNeoliaCode || "");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4); // 4 chiffres max
    setLocalCode(value);
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const code = localCode.trim();
      if (code.length !== 4) {
        setError("Veuillez entrer les 4 derniers chiffres du numéro de série.");
        return;
      }

      // Découverte réseau désactivée pour l’instant :
      // on se contente d’enregistrer le code et de passer à l’onboarding principal.
      try {
        setSubmitting(true);
        setError(null);

        setEnteredNeoliaCode(code);
        markSnStepCompleted();

        // On enchaîne sur l'onboarding panel (auto/manuelle)
        navigate("/");
      } finally {
        setSubmitting(false);
      }
    },
    [localCode, setError, setEnteredNeoliaCode, markSnStepCompleted, navigate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col items-center">
            <img
              src={neoliaLogoDark}
              alt="Neolia"
              className="h-10 dark:block hidden mb-2"
            />
            <img
              src={neoliaLogo}
              alt="Neolia"
              className="h-10 block dark:hidden mb-2"
            />
            <CardTitle className="text-xl font-bold text-center">
              Configuration du panneau Neolia
            </CardTitle>
            <CardDescription className="text-center">
              Entrez les 4 derniers chiffres du numéro de série du panneau pour
              initialiser la configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sn">Code Neolia (4 derniers chiffres du SN)</Label>
                <Input
                  id="sn"
                  inputMode="numeric"
                  maxLength={4}
                  value={localCode}
                  onChange={handleChange}
                  className="text-center text-2xl tracking-[0.3em]"
                />
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                <span>
                  Le numéro de série se trouve dans Home Assistant, dans le menu
                  des appareils Neolia.
                </span>
              </div>

              <div className="rounded-md overflow-hidden border">
                <img
                  src={haSnLocationPlaceholder}
                  alt="Emplacement du SN dans Home Assistant"
                  className="w-full object-cover"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={submitting || !localCode}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Vérification…
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
