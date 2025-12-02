import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHAStore } from "@/store/useHAStore";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Cloud, Home as HomeIcon, Activity, Hand } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { clearHACredentials } from "@/lib/crypto";
import { useConnectionMode } from "@/hooks/useConnectionMode";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import { useHandedness } from "@/hooks/useHandedness";
import { NeoliaBootstrapDebugCard } from "@/components/neolia/bootstrap/NeoliaBootstrapDebugCard";
import { useNeoliaMqttBootstrap } from "@/components/neolia/bootstrap/useNeoliaMqttBootstrap";

const Settings = () => {
  const navigate = useNavigate();
  const disconnect = useHAStore((state) => state.disconnect);
  const connection = useHAStore((state) => state.connection);
  const { theme, setTheme } = useTheme();
  const { connectionMode } = useConnectionMode();
  const { displayMode } = useDisplayMode();
  const { handedness, setHandedness } = useHandedness();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[26px]";

  // MQTT bootstrap state
  const [mqttHost, setMqttHost] = useState("192.168.1.219");
  const [mqttPort, setMqttPort] = useState(9001);
  const [mqttUser, setMqttUser] = useState("panel");
  const [mqttPassword, setMqttPassword] = useState("PanelMQTT!2025");

  const {
    mqttStatus,
    mqttError,
    lastPayloadAt,
    start,
    stop,
    status: bootstrapStatus,
    haConnection,
    error: bootstrapError,
  } = useNeoliaMqttBootstrap({
    host: mqttHost,
    port: mqttPort,
    username: mqttUser,
    password: mqttPassword,
    useSecure: false,
    autoStart: false,
  });

  const handleDisconnect = () => {
    disconnect();
    clearHACredentials();
    toast.success("Déconnecté de Home Assistant");
    // Utiliser window.location pour forcer un rechargement complet
    window.location.href = "/onboarding";
  };

  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex items-center justify-center";

  return (
    <div className={rootClassName}>
      <TopBar title="Paramètres" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-8">

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Connexion</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">URL Home Assistant</p>
                <p className="font-mono text-sm break-all">{connection?.url}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm">Connecté</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode de connexion</p>
                <div className="flex items-center gap-2">
                  {connectionMode === "remote" ? (
                    <>
                      <Cloud className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Cloud (Nabu Casa)</span>
                    </>
                  ) : (
                    <>
                      <HomeIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Local</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Apparence</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Thème</p>
                <div className="flex gap-3">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Clair
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Sombre
                  </Button>
                </div>
              </div>

              {displayMode === "mobile" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Préférence de main</p>
                  <div className="flex gap-3">
                    <Button 
                      variant={handedness === "left" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => {
                        setHandedness("left");
                        toast.success("Mode gaucher activé");
                      }}
                    >
                      <Hand className="mr-2 h-4 w-4 scale-x-[-1]" />
                      Gaucher
                    </Button>
                    <Button 
                      variant={handedness === "right" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => {
                        setHandedness("right");
                        toast.success("Mode droitier activé");
                      }}
                    >
                      <Hand className="mr-2 h-4 w-4" />
                      Droitier
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">Journal d'activité</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Suivi des événements</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le journal d'activité enregistre toutes les actions et événements de votre maison connectée.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info("Fonctionnalité à venir")}
              >
                Voir le journal
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4">À propos</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Neolia Smart Home v1.0.0</p>
              <p>Powered by Home Assistant</p>
              <p>© 2025 Neolia. Tous droits réservés.</p>
            </div>
          </Card>

          {/* Section Auto-bootstrap MQTT Neolia */}
          <div className="mt-8 space-y-4">
            <h2 className="text-base font-semibold">Auto-bootstrap MQTT Neolia</h2>
            <p className="text-sm text-muted-foreground">
              Connexion au broker MQTT pour récupérer automatiquement la configuration
              Neolia depuis le topic <code className="bg-muted px-1 py-0.5 rounded">neolia/config/global</code>.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>MQTT host</span>
                  <input
                    type="text"
                    value={mqttHost}
                    onChange={(e) => setMqttHost(e.target.value)}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>MQTT port (WebSocket)</span>
                  <input
                    type="number"
                    value={mqttPort}
                    onChange={(e) => setMqttPort(Number(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>MQTT username</span>
                  <input
                    type="text"
                    value={mqttUser}
                    onChange={(e) => setMqttUser(e.target.value)}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>MQTT password</span>
                  <input
                    type="password"
                    value={mqttPassword}
                    onChange={(e) => setMqttPassword(e.target.value)}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={start}
                    disabled={mqttStatus === "connecting" || mqttStatus === "connected"}
                    className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Se connecter
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    disabled={mqttStatus === "idle"}
                    className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Statut MQTT :</span>{" "}
                  <span>{mqttStatus}</span>
                </div>
                {mqttError && (
                  <div className="text-red-500">
                    <span className="font-semibold">Erreur MQTT :</span> {mqttError}
                  </div>
                )}
                {lastPayloadAt && (
                  <div>
                    <span className="font-semibold">Dernier payload :</span>{" "}
                    <span>{lastPayloadAt.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2">
                  <div>
                    <span className="font-semibold">Statut bootstrap Neolia :</span>{" "}
                    <span>{bootstrapStatus}</span>
                  </div>
                  {bootstrapError && (
                    <div className="text-red-500">
                      <span className="font-semibold">Erreur bootstrap :</span>{" "}
                      {bootstrapError}
                    </div>
                  )}
                  {haConnection && (
                    <div className="mt-2 space-y-1">
                      <div>
                        <span className="font-semibold">HA URL :</span>{" "}
                        <span className="font-mono text-xs">
                          {haConnection.baseUrl}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Token :</span>{" "}
                        <span className="font-mono text-[10px] break-all">
                          {haConnection.token}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">MQTT :</span>{" "}
                        <span className="font-mono text-xs">
                          {haConnection.mqttHost}:{haConnection.mqttPort}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section Debug Neolia (existante) */}
          <div className="mt-8 space-y-4">
            <h2 className="text-base font-semibold">Debug Neolia</h2>
            <p className="text-sm text-muted-foreground">
              Section technique pour tester le bootstrap Neolia à partir du JSON du topic MQTT <code className="bg-muted px-1 py-0.5 rounded">neolia/config/global</code>.
            </p>
            <NeoliaBootstrapDebugCard />
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDisconnect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
