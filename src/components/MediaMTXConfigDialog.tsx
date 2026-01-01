import { useState } from 'react';
import { Settings, Server, Wifi, Check } from 'lucide-react';
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
  const { config, turnConfig, setRaspberryPiIp, setTurnConfig } = useMediaMTXConfigStore();
  const isValid = useIsMediaMTXConfigValid();

  // State local du formulaire
  const [raspberryIp, setRaspberryIp] = useState(config?.raspberryPiIp || '');
  const [turnUrl, setTurnUrl] = useState(turnConfig.url);
  const [turnUsername, setTurnUsername] = useState(turnConfig.username);
  const [turnCredential, setTurnCredential] = useState(turnConfig.credential);

  /**
   * Valide et sauvegarde la configuration
   */
  const handleSave = () => {
    // Valider l'IP ou hostname
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnamePattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

    if (!ipPattern.test(raspberryIp) && !hostnamePattern.test(raspberryIp)) {
      toast.error('Adresse IP ou hostname invalide');
      return;
    }

    // Sauvegarder l'IP du Raspberry Pi
    setRaspberryPiIp(raspberryIp);

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
    setTurnUrl(turnConfig.url);
    setTurnUsername(turnConfig.username);
    setTurnCredential(turnConfig.credential);
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

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuration MediaMTX
          </DialogTitle>
          <DialogDescription>
            Configurez l'adresse IP du Raspberry Pi pour activer la vidéo de l'interphone Akuvox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Configuration Raspberry Pi */}
          <div className="space-y-2">
            <Label htmlFor="raspberry-ip" className="text-base font-semibold">
              Raspberry Pi (MediaMTX)
            </Label>

            <div className="space-y-2">
              <Label htmlFor="raspberry-ip" className="text-sm text-muted-foreground">
                Adresse IP ou hostname
              </Label>
              <Input
                id="raspberry-ip"
                placeholder="192.168.1.115 ou example.ngrok-free.dev"
                value={raspberryIp}
                onChange={(e) => setRaspberryIp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                IP locale (192.168.x.x) ou hostname public (pour ngrok/Cloudflare Tunnel).
              </p>
            </div>

            {/* Aperçu de l'URL WHEP */}
            {raspberryIp && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Endpoint WHEP généré :</p>
                <code className="text-xs break-all">
                  {raspberryIp.includes('.') && !raspberryIp.match(/^\d/) ? 'https' : 'http'}://{raspberryIp}:8889/akuvox/whep
                </code>
              </div>
            )}
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
