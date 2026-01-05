import { useState } from 'react';
import { Settings2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSIPConfigStore } from '@/store/useSIPConfigStore';
import { toast } from 'sonner';

/**
 * Dialogue de configuration des identifiants SIP
 *
 * Permet à l'utilisateur de :
 * - Entrer manuellement ses credentials SIP
 * - Scanner un QR code (TODO)
 * - Sauvegarder la config en localStorage
 */
export function SIPConfigDialog() {
  const { config, setConfig } = useSIPConfigStore();
  const [open, setOpen] = useState(false);

  // Formulaire local
  const [uri, setUri] = useState(config?.uri || '');
  const [password, setPassword] = useState(config?.password || '');
  const [wsServers, setWsServers] = useState(config?.wsServers || 'wss://sip.neolia.app:8443');
  const [displayName, setDisplayName] = useState(config?.displayName || 'Julien');

  const handleSave = () => {
    // Validation basique
    if (!uri || !password || !wsServers) {
      toast.error('Tous les champs sont requis');
      return;
    }

    if (!uri.includes('@')) {
      toast.error('Format URI invalide (doit contenir @)');
      return;
    }

    if (!wsServers.startsWith('wss://')) {
      toast.error('WebSocket sécurisé (wss://) requis');
      return;
    }

    // Sauvegarder la config
    setConfig({
      uri,
      password,
      wsServers,
      displayName,
    });

    toast.success('Configuration SIP sauvegardée');
    setOpen(false);

    // Recharger la page pour initialiser le SIP service
    window.location.reload();
  };

  const handleReset = () => {
    setConfig(null);
    setUri('');
    setPassword('');
    setWsServers('wss://sip.neolia.app:8443');
    setDisplayName('Julien');
    toast.info('Configuration SIP réinitialisée');
    setOpen(false);

    // Recharger la page
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuration SIP</DialogTitle>
          <DialogDescription>
            Configure tes identifiants SIP pour recevoir les appels depuis l'Akuvox E12W.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URI SIP */}
          <div className="space-y-2">
            <Label htmlFor="uri">URI SIP *</Label>
            <Input
              id="uri"
              placeholder="sip:julien@sip.neolia.app"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: sip:utilisateur@domaine.com
            </p>
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe SIP *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Serveur WebSocket */}
          <div className="space-y-2">
            <Label htmlFor="wsServers">Serveur WebSocket *</Label>
            <Input
              id="wsServers"
              placeholder="wss://sip.neolia.app:8443"
              value={wsServers}
              onChange={(e) => setWsServers(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              URL du serveur Kamailio (doit commencer par wss://)
            </p>
          </div>

          {/* Nom d'affichage */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom d'affichage</Label>
            <Input
              id="displayName"
              placeholder="Julien"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!config}
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
