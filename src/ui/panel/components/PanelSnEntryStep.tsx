import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNeoliaPanelConfigStore } from "@/store/useNeoliaPanelConfigStore";
import { useNeoliaSettings } from "@/store/useNeoliaSettings";
import { setHaConfig } from "@/services/haConfig";
import { resolvePanelConfigByCode } from "@/api/panelDiscoveryClient";
import neoliaLogoDark from "@/assets/neolia-logo-dark.png";
import neoliaLogo from "@/assets/neolia-logo.png";
import haSnLocationPlaceholder from "@/assets/ha-sn-location.png";

export function PanelSnEntryStep() {
  const navigate = useNavigate();
  const {
    enteredNeoliaCode,
    setEnteredNeoliaCode,
    setLoading,
    setError,
    setConfig,
    markSnStepCompleted,
  } = useNeoliaPanelConfigStore();

  const { setMqttHost, setMqttPort, setMqttUseSecure, setMqttUsername, setMqttPassword } =
    useNeoliaSettings();

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

      try {
        setError(null);
        setLoading(true);
        setSubmitting(true);

        // 1) On résout la config depuis le service de découverte
        const result = await resolvePanelConfigByCode(code);

        // 2) On configure le store MQTT
        setMqttHost(result.mqttHost);
        setMqttPort(result.mqttWsPort);
        setMqttUseSecure(false); // en général en LAN interne, WS non sécurisé
        setMqttUsername(result.mqttUsername);
        setMqttPassword(result.mqttPassword);

        // 3) On met à jour le store PanelConfig (panelHost/mqttWsPort)
        setConfig({
          neoliaCode: code,
          panelHost: result.mqttHost,
          mqttWsPort: result.mqttWsPort,
        });

        // 4) On persiste le code + flag "étape SN complétée"
        setEnteredNeoliaCode(code);
        markSnStepCompleted();

        // 5) Si le backend fournit déjà HA URL + token, on peut les enregistrer tout de suite
        if (result.haBaseUrl && result.haToken) {
          await setHaConfig({
            localHaUrl: result.haBaseUrl,
            token: result.haToken,
          });
        }

        // 6) On passe à l'onboarding principal (PanelOnboarding gère la connexion MQTT)
        navigate("/");
      } catch (err: any) {
        console.error("[PanelSnEntryStep] Erreur discovery:", err);
        setError(err?.message || "Impossible de joindre le service de découverte.");
      } finally {
        setLoading(false);
        setSubmitting(false);
      }
    },
    [
      localCode,
      setError,
      setLoading,
      setConfig,
      setEnteredNeoliaCode,
      markSnStepCompleted,
      setMqttHost,
      setMqttPort,
      setMqttUseSecure,
      setMqttUsername,
      setMqttPassword,
      navigate,
    ]
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
              détecter automatiquement la bonne installation.
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

              {/* Image explicative */}
              <div className="rounded-md overflow-hidden border">
                <img
                  src={haSnLocationPlaceholder}
                  alt="Emplacement du SN dans Home Assistant"
                  className="w-full object-cover"
                />
              </div>

              {/* Zone erreur éventuelle */}
              <PanelSnErrorAlert />
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

function PanelSnErrorAlert() {
  const { error } = useNeoliaPanelConfigStore();
  if (!error) return null;

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
