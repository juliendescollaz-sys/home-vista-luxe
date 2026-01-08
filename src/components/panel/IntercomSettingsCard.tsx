import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Phone, Settings, Volume2, DoorOpen, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { usePanelIntercomStore } from "@/store/usePanelIntercomStore";
import { linphoneSipService } from "@/services/linphoneSipService";
import { Capacitor } from "@capacitor/core";

// Sonneries disponibles (les fichiers doivent être dans public/sounds/ringtones/)
const AVAILABLE_RINGTONES = [
  { id: "default", name: "Par défaut" },
  { id: "classic", name: "Classique" },
  { id: "doorbell", name: "Sonnette" },
  { id: "chime", name: "Carillon" },
  { id: "modern", name: "Moderne" },
];

/**
 * Card de configuration de l'interphone pour le Panel
 */
export function IntercomSettingsCard() {
  const config = usePanelIntercomStore((s) => s.config);
  const sipState = usePanelIntercomStore((s) => s.sipState);
  const setEnabled = usePanelIntercomStore((s) => s.setEnabled);
  const setSipConfig = usePanelIntercomStore((s) => s.setSipConfig);
  const setVideoConfig = usePanelIntercomStore((s) => s.setVideoConfig);
  const setDoorConfig = usePanelIntercomStore((s) => s.setDoorConfig);
  const setRingtoneConfig = usePanelIntercomStore((s) => s.setRingtoneConfig);

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinCode, setPinCode] = useState("");

  // État local pour le formulaire de config
  const [formData, setFormData] = useState({
    server: config.sip.server,
    user: config.sip.user,
    password: config.sip.password,
    doorMethod: config.door.method,
    doorHttpUrl: config.door.httpUrl || "",
    doorDtmfCode: config.door.dtmfCode || "",
    videoDelay: config.door.videoDelayAfterOpen,
  });

  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  // Gérer l'activation/désactivation
  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && (!config.sip.server || !config.sip.user || !config.sip.password)) {
      toast.error("Configurez d'abord les paramètres SIP");
      return;
    }
    setEnabled(enabled);
    if (enabled) {
      toast.success("Interphone activé");
    } else {
      toast.info("Interphone désactivé");
    }
  };

  // Ouvrir la config avec appairage PIN
  const handleOpenPinDialog = () => {
    setPinCode("");
    setShowPinDialog(true);
  };

  // Valider le PIN et récupérer la config
  const handleValidatePin = async () => {
    if (pinCode.length !== 6) {
      toast.error("Le code PIN doit contenir 6 chiffres");
      return;
    }

    // TODO: Appeler l'API du R-Pi pour récupérer la config
    // Pour l'instant, on affiche juste la config manuelle
    toast.info("Appairage PIN à venir - utilisez la config manuelle");
    setShowPinDialog(false);
    setShowConfigDialog(true);
  };

  // Sauvegarder la configuration
  const handleSaveConfig = () => {
    if (!formData.server || !formData.user || !formData.password) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSipConfig({
      server: formData.server,
      user: formData.user,
      password: formData.password,
      domain: formData.server,
    });

    setVideoConfig({
      whepUrl: `http://${formData.server}:8889/akuvox/whep`,
    });

    setDoorConfig({
      method: formData.doorMethod as "http" | "dtmf" | "none",
      httpUrl: formData.doorHttpUrl,
      dtmfCode: formData.doorDtmfCode,
      videoDelayAfterOpen: formData.videoDelay,
    });

    setShowConfigDialog(false);
    toast.success("Configuration sauvegardée");
  };

  // Tester la connexion SIP
  const handleTestConnection = async () => {
    if (!isAndroid) {
      toast.error("Test disponible uniquement sur Android");
      return;
    }

    toast.info("Test de connexion en cours...");

    try {
      const initResult = await linphoneSipService.initialize();
      if (!initResult) {
        toast.error("Échec initialisation Linphone");
        return;
      }

      const regResult = await linphoneSipService.register({
        server: config.sip.server,
        user: config.sip.user,
        password: config.sip.password,
        domain: config.sip.domain || config.sip.server,
      });

      if (regResult) {
        toast.success("Connexion SIP réussie !");
      } else {
        toast.error("Échec de l'enregistrement SIP");
      }
    } catch (error) {
      toast.error(`Erreur: ${error}`);
    }
  };

  // Tester la sonnerie
  const handleTestRingtone = () => {
    const audioPath = `/sounds/ringtones/${config.ringtone.name}.mp3`;
    const audio = new Audio(audioPath);
    audio.volume = config.ringtone.volume;

    audio.onerror = () => {
      toast.error(`Impossible de jouer: ${config.ringtone.name}`);
    };

    audio.play().catch(() => {
      toast.error("Impossible de jouer la sonnerie");
    });

    // Arrêter après 3 secondes (désactiver onerror avant de vider src)
    setTimeout(() => {
      audio.onerror = null;
      audio.pause();
      audio.src = "";
    }, 3000);
  };

  return (
    <>
      <Card className="p-5 bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Interphone</h3>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        {/* Statut */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Statut SIP</span>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  sipState === "registered"
                    ? "bg-green-500"
                    : sipState === "registering"
                    ? "bg-yellow-500 animate-pulse"
                    : sipState === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
                }`}
              />
              <span className="text-xs">
                {sipState === "registered"
                  ? "Connecté"
                  : sipState === "registering"
                  ? "Connexion..."
                  : sipState === "error"
                  ? "Erreur"
                  : "Déconnecté"}
              </span>
            </div>
          </div>

          {config.sip.server && (
            <div className="text-xs text-muted-foreground">
              Serveur: {config.sip.server}
            </div>
          )}
        </div>

        {/* Sonnerie */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sonnerie</span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={config.ringtone.name}
              onValueChange={(value) => setRingtoneConfig({ name: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_RINGTONES.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleTestRingtone}>
              Test
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-12">Volume</span>
            <Slider
              value={[config.ringtone.volume * 100]}
              max={100}
              step={5}
              onValueChange={([v]) => setRingtoneConfig({ volume: v / 100 })}
              className="flex-1"
            />
            <span className="text-xs w-8">{Math.round(config.ringtone.volume * 100)}%</span>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleOpenPinDialog}
          >
            <KeyRound className="h-4 w-4 mr-1" />
            Appairage PIN
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setFormData({
                server: config.sip.server,
                user: config.sip.user,
                password: config.sip.password,
                doorMethod: config.door.method,
                doorHttpUrl: config.door.httpUrl || "",
                doorDtmfCode: config.door.dtmfCode || "",
                videoDelay: config.door.videoDelayAfterOpen,
              });
              setShowConfigDialog(true);
            }}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurer
          </Button>
        </div>

        {/* Bouton test si configuré */}
        {config.sip.server && isAndroid && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-2"
            onClick={handleTestConnection}
          >
            Tester la connexion
          </Button>
        )}

        {!isAndroid && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            L'interphone SIP natif est disponible uniquement sur Android.
          </p>
        )}
      </Card>

      {/* Dialog PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Appairage par PIN</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Entrez le code PIN à 6 chiffres fourni par l'installateur.
            </p>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidatePin} disabled={pinCode.length !== 6}>
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Config manuelle */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Interphone</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Section SIP */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Connexion SIP
              </h4>

              <div className="space-y-2">
                <Label htmlFor="server" className="text-xs">
                  Adresse du serveur (R-Pi) *
                </Label>
                <Input
                  id="server"
                  placeholder="192.168.1.115"
                  value={formData.server}
                  onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user" className="text-xs">
                  Identifiant SIP *
                </Label>
                <Input
                  id="user"
                  placeholder="panel-401"
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">
                  Mot de passe *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* Section Porte */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Ouverture de porte
              </h4>

              <div className="space-y-2">
                <Label className="text-xs">Méthode</Label>
                <Select
                  value={formData.doorMethod}
                  onValueChange={(v) => setFormData({ ...formData, doorMethod: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">Requête HTTP</SelectItem>
                    <SelectItem value="dtmf">Code DTMF</SelectItem>
                    <SelectItem value="none">Désactivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.doorMethod === "http" && (
                <div className="space-y-2">
                  <Label htmlFor="doorUrl" className="text-xs">
                    URL d'ouverture
                  </Label>
                  <Input
                    id="doorUrl"
                    placeholder="http://192.168.1.51/fcgi/do?action=OpenDoor&DoorNum=1"
                    value={formData.doorHttpUrl}
                    onChange={(e) => setFormData({ ...formData, doorHttpUrl: e.target.value })}
                  />
                </div>
              )}

              {formData.doorMethod === "dtmf" && (
                <div className="space-y-2">
                  <Label htmlFor="doorDtmf" className="text-xs">
                    Code DTMF
                  </Label>
                  <Input
                    id="doorDtmf"
                    placeholder="#"
                    value={formData.doorDtmfCode}
                    onChange={(e) => setFormData({ ...formData, doorDtmfCode: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">
                  Délai vidéo après ouverture: {formData.videoDelay}s
                </Label>
                <Slider
                  value={[formData.videoDelay]}
                  max={15}
                  min={0}
                  step={1}
                  onValueChange={([v]) => setFormData({ ...formData, videoDelay: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveConfig}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IntercomSettingsCard;
