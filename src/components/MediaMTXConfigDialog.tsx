import { useState } from 'react';
import { Settings, Server, Wifi, Check, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMediaMTXConfigStore, useIsMediaMTXConfigValid } from '@/store/useMediaMTXConfigStore';
import { toast } from 'sonner';

export interface MediaMTXConfigDialogProps {
  /** Contenu du bouton trigger (par défaut: icône Settings) */
  trigger?: React.ReactNode;

  /** Callback appelé après sauvegarde réussie */
  onSaved?: () => void;
}

/**
 * Dialog pour configurer l'adresse IP du Raspberry Pi (MediaMTX)
 *
 * Ce composant permet de :
 * - Saisir l'IP du Raspberry Pi sur le LAN
 * - Configurer les paramètres TURN (pour mode mobile)
 * - Valider la configuration
 * - Persister la config dans le store Zustand
 */
export function MediaMTXConfigDialog({ trigger, onSaved }: MediaMTXConfigDialogProps) {
  const [open, setOpen] = useState(false);

  // State du store
  const { config, turnConfig, setConfig, setTurnConfig } = useMediaMTXConfigStore();
  const isValid = useIsMediaMTXConfigValid();

  // State local du formulaire
  const [raspberryIp, setRaspberryIp] = useState(config?.raspberryPiIp || '');
  const [remoteHostname, setRemoteHostname] = useState(config?.remoteHostname || '');
  const [preferredMode, setPreferredMode] = useState<'auto' | 'local' | 'remote'>(config?.preferredMode || 'auto');
  const [turnUrl, setTurnUrl] = useState(turnConfig.url);
  const [turnUsername, setTurnUsername] = useState(turnConfig.username);
  const [turnCredential, setTurnCredential] = useState(turnConfig.credential);

  // State pour la découverte automatique
  const [isDiscovering, setIsDiscovering] = useState(false);

  /**
   * Valide et sauvegarde la configuration
   */
  const handleSave = () => {
    // Les deux champs sont optionnels, mais s'ils sont renseignés, ils doivent être valides
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnamePattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

    // Valider l'IP/hostname local s'il est renseigné
    if (raspberryIp && !ipPattern.test(raspberryIp) && !hostnamePattern.test(raspberryIp)) {
      toast.error('Adresse IP ou hostname local invalide');
      return;
    }

    // Valider le hostname distant s'il est renseigné
    if (remoteHostname && !hostnamePattern.test(remoteHostname)) {
      toast.error('Hostname distant invalide');
      return;
    }

    // Sauvegarder la configuration complète
    setConfig({
      raspberryPiIp: raspberryIp,
      remoteHostname,
      preferredMode,
    });

    // Sauvegarder la config TURN
    setTurnConfig({
      url: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });

    toast.success('Configuration sauvegardée');
    setOpen(false);

    if (onSaved) {
      onSaved();
    }
  };

  /**
   * Réinitialise les valeurs du formulaire
   */
  const handleReset = () => {
    setRaspberryIp(config?.raspberryPiIp || '');
    setRemoteHostname(config?.remoteHostname || '');
    setTurnUrl(turnConfig.url);
    setTurnUsername(turnConfig.username);
    setTurnCredential(turnConfig.credential);
  };

  /**
   * Configure automatiquement le hostname mDNS standard (neolia-n100.local)
   * Le test de connexion se fera lors de la connexion vidéo pour éviter les erreurs Mixed Content
   */
  const handleDiscover = async () => {
    setIsDiscovering(true);

    try {
      const MDNS_HOSTNAME = 'neolia-n100.local';

      // Configurer directement le hostname mDNS standard
      // Le test HTTP est impossible depuis HTTPS (Mixed Content), le vrai test se fera lors de la connexion WebRTC
      setRaspberryIp(MDNS_HOSTNAME);

      toast.success(`Configuration automatique : ${MDNS_HOSTNAME}`, {
        description: 'Le test de connexion se fera lors de la connexion vidéo',
      });
    } catch (err) {
      console.error('Discovery error:', err);
      toast.error('Erreur lors de la configuration automatique');
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configuration MediaMTX
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuration MediaMTX
          </DialogTitle>
          <DialogDescription>
            Configurez l'adresse IP du Raspberry Pi pour activer la vidéo de l'interphone Akuvox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Configuration locale (N100) */}
          <div className="space-y-2">
            <Label htmlFor="raspberry-ip" className="text-base font-semibold">
              Serveur local (N100) <span className="text-sm font-normal text-muted-foreground">(optionnel)</span>
            </Label>

            <div className="space-y-2">
              <Label htmlFor="raspberry-ip" className="text-sm text-muted-foreground">
                Adresse IP ou hostname local
              </Label>
              <div className="flex gap-2">
                <Input
                  id="raspberry-ip"
                  placeholder="Ex: neolia-n100.local ou 192.168.1.115"
                  value={raspberryIp}
                  onChange={(e) => setRaspberryIp(e.target.value)}
                  disabled={isDiscovering}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDiscover}
                  disabled={isDiscovering}
                  title="Découvrir via mDNS (neolia-n100.local)"
                >
                  {isDiscovering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisée pour connexion WiFi locale. Clique sur la loupe pour détecter automatiquement le N100 via mDNS.
              </p>
            </div>

            {/* Aperçu de l'URL WHEP locale */}
            {raspberryIp && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">URL locale :</p>
                <code className="text-xs break-all">
                  http://{raspberryIp}:8889/akuvox/whep
                </code>
              </div>
            )}
          </div>

          {/* Configuration distante (VPS) */}
          <div className="space-y-2">
            <Label htmlFor="remote-hostname" className="text-base font-semibold">
              Serveur distant (VPS) <span className="text-sm font-normal text-muted-foreground">(optionnel)</span>
            </Label>

            <div className="space-y-2">
              <Label htmlFor="remote-hostname" className="text-sm text-muted-foreground">
                Hostname public
              </Label>
              <Input
                id="remote-hostname"
                placeholder="Ex: video.example.com"
                value={remoteHostname}
                onChange={(e) => setRemoteHostname(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Utilisée pour connexion via internet (4G, réseau distant).
              </p>
            </div>

            {/* Aperçu de l'URL WHEP distante */}
            {remoteHostname && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">URL distante :</p>
                <code className="text-xs break-all">
                  https://{remoteHostname}/akuvox/whep
                </code>
              </div>
            )}
          </div>

          {/* Sélecteur de mode de connexion */}
          <div className="space-y-2">
            <Label htmlFor="preferred-mode" className="text-base font-semibold">
              Mode de connexion
            </Label>
            <Select value={preferredMode} onValueChange={(value: 'auto' | 'local' | 'remote') => setPreferredMode(value)}>
              <SelectTrigger id="preferred-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatique (détection)</SelectItem>
                <SelectItem value="local">Local forcé (HTTP)</SelectItem>
                <SelectItem value="remote">Remote forcé (HTTPS)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Automatique : détecte le mode selon la config. Local forcé : toujours HTTP. Remote forcé : toujours HTTPS (pour contourner Mixed Content sur mobile).
            </p>
          </div>

          {/* Configuration TURN (pour mode mobile) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Serveur TURN (connexion remote)
            </Label>

            <div className="space-y-3">
              <div>
                <Label htmlFor="turn-url" className="text-sm text-muted-foreground">
                  URL TURN
                </Label>
                <Input
                  id="turn-url"
                  placeholder="turn:141.227.158.64:3478"
                  value={turnUrl}
                  onChange={(e) => setTurnUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="turn-username" className="text-sm text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    id="turn-username"
                    placeholder="neolia"
                    value={turnUsername}
                    onChange={(e) => setTurnUsername(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="turn-credential" className="text-sm text-muted-foreground">
                    Credential
                  </Label>
                  <Input
                    id="turn-credential"
                    type="password"
                    placeholder="Neolia022Turn"
                    value={turnCredential}
                    onChange={(e) => setTurnCredential(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Le serveur TURN est utilisé uniquement pour les connexions mobiles/tablet à distance
                (pas en mode Panel LAN).
              </p>
            </div>
          </div>

          {/* Indicateur de validité */}
          {isValid && config && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Configuration valide
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
