import { useEffect, useState } from "react";
import { HAClient } from "@/lib/haClient";
import { useHAStore } from "@/store/useHAStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Home, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Dev = () => {
  const connection = useHAStore((state) => state.connection);
  const client = useHAStore((state) => state.client);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    entities: number;
    areas: number;
    devices: number;
    floors: number;
  } | null>(null);
  const [testEntityId, setTestEntityId] = useState("group.neolia_switch");

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Test direct callService sans triggerEntityToggle
  const testDirectService = async (service: "turn_on" | "turn_off") => {
    if (!client) {
      toast.error("Client non connecté");
      addLog("❌ Client non connecté");
      return;
    }

    const domain = testEntityId.split(".")[0];
    addLog(`🔧 Test direct: ${domain}.${service} sur ${testEntityId}`);
    
    try {
      const result = await client.callService(domain, service, {}, { entity_id: testEntityId });
      addLog(`✅ Service OK: ${domain}.${service}`);
      addLog(`📤 Résultat: ${JSON.stringify(result)}`);
      toast.success(`${service} envoyé avec succès`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`❌ Erreur: ${errorMsg}`);
      toast.error(`Erreur: ${errorMsg}`);
    }
  };

  const testConnection = async () => {
    if (!connection) {
      addLog("❌ Pas de connexion configurée");
      return;
    }

    setStatus("connecting");
    setLogs([]);
    setStats(null);

    try {
      addLog("🔌 Création du client HAClient...");
      const client = new HAClient({
        baseUrl: connection.url,
        token: connection.token,
      });

      addLog(`📍 URL WebSocket: ${connection.url.replace(/^https?/, "wss")}/api/websocket`);
      addLog("🔐 Connexion en cours...");
      
      await client.connect();
      addLog("✅ WebSocket connecté et authentifié!");

      addLog("📊 Récupération des états...");
      const states = await client.getStates();
      addLog(`✅ ${states.length} entités récupérées`);

      addLog("🏠 Récupération des pièces...");
      const areas = await client.listAreas();
      addLog(`✅ ${areas.length} pièces récupérées`);

      addLog("📱 Récupération des appareils...");
      const devices = await client.listDevices();
      addLog(`✅ ${devices.length} appareils récupérés`);

      addLog("🏢 Récupération des étages...");
      const floors = await client.listFloors().catch(() => []);
      addLog(`✅ ${floors.length} étages récupérés`);

      setStats({
        entities: states.length,
        areas: areas.length,
        devices: devices.length,
        floors: floors.length,
      });

      addLog("👂 Test d'abonnement aux événements...");
      const unsubscribe = client.subscribeStateChanges((data) => {
        addLog(`🔔 Changement d'état détecté: ${data.entity_id}`);
      });

      addLog("✅ Tous les tests réussis!");
      setStatus("success");

      // Nettoyage après 30 secondes
      setTimeout(() => {
        addLog("🧹 Nettoyage de la connexion de test...");
        unsubscribe();
        client.disconnect();
      }, 30000);
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
      setStatus("error");
    }
  };

  useEffect(() => {
    if (connection) {
      testConnection();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🛠️ Page de test HA WebSocket</h1>
            <p className="text-muted-foreground mt-2">
              Test de la connexion WebSocket à Home Assistant via Nabu Casa
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Button>
        </div>

        {!connection && (
          <Card className="p-6 border-destructive bg-destructive/5">
            <p className="text-destructive">
              ⚠️ Aucune connexion configurée. Allez sur la page d'onboarding pour configurer votre connexion.
            </p>
          </Card>
        )}

        {connection && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Configuration</h2>
              <Button onClick={testConnection} disabled={status === "connecting"}>
                {status === "connecting" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Relancer le test
              </Button>
            </div>
            
            <div className="space-y-2 text-sm font-mono bg-muted p-4 rounded">
              <div>
                <span className="text-muted-foreground">URL:</span> {connection.url}
              </div>
              <div>
                <span className="text-muted-foreground">Token:</span> {connection.token.slice(0, 20)}...
              </div>
              <div>
                <span className="text-muted-foreground">WebSocket:</span>{" "}
                {connection.url.replace(/^https?/, "wss")}/api/websocket
              </div>
            </div>
          </Card>
        )}

        {/* Test direct callService */}
        {client && (
          <Card className="p-6 space-y-4 border-primary/50">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Test direct callService
            </h2>
            <p className="text-sm text-muted-foreground">
              Test sans passer par triggerEntityToggle, pendingActions, ou UI optimiste.
            </p>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testEntityId}
                onChange={(e) => setTestEntityId(e.target.value)}
                className="flex-1 px-3 py-2 rounded border bg-background font-mono text-sm"
                placeholder="entity_id (ex: group.neolia_switch)"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => testDirectService("turn_on")}
                variant="default"
                className="flex-1"
              >
                turn_on
              </Button>
              <Button 
                onClick={() => testDirectService("turn_off")}
                variant="outline"
                className="flex-1"
              >
                turn_off
              </Button>
            </div>
          </Card>
        )}

        {stats && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Statistiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-3xl font-bold text-primary">{stats.entities}</div>
                <div className="text-sm text-muted-foreground">Entités</div>
              </div>
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-3xl font-bold text-primary">{stats.areas}</div>
                <div className="text-sm text-muted-foreground">Pièces</div>
              </div>
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-3xl font-bold text-primary">{stats.devices}</div>
                <div className="text-sm text-muted-foreground">Appareils</div>
              </div>
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-3xl font-bold text-primary">{stats.floors}</div>
                <div className="text-sm text-muted-foreground">Étages</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📝 Logs en temps réel</h2>
            {status === "connecting" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
          </div>
          
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-y-auto">
            {logs.length === 0 && (
              <div className="text-muted-foreground">En attente de logs...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-muted/50">
          <h2 className="text-xl font-semibold mb-4">✅ Ce qui est testé</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Connexion WebSocket à Nabu Casa</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Authentification avec token</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Récupération des états (get_states)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Récupération des pièces (config/area_registry/list)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Récupération des appareils (config/device_registry/list)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Récupération des étages (config/floor_registry/list)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Abonnement aux changements d'état (subscribe_events)</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Dev;
