/**
 * Dialog for configuring room photo options (sharing, parental lock)
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import type { PhotoUploadOptions } from "@/types/roomPhotos";

interface RoomPhotoOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: PhotoUploadOptions) => void;
  isLoading?: boolean;
  previewUrl?: string;
}

export const RoomPhotoOptionsDialog = ({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  previewUrl,
}: RoomPhotoOptionsDialogProps) => {
  const [shared, setShared] = useState(true);
  const [locked, setLocked] = useState(false);
  const [parentalCode, setParentalCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState("");

  const handleConfirm = () => {
    // Validate code if locked
    if (locked) {
      if (parentalCode.length < 4 || parentalCode.length > 8) {
        setCodeError("Le code doit contenir entre 4 et 8 chiffres");
        return;
      }
      if (!/^\d+$/.test(parentalCode)) {
        setCodeError("Le code ne doit contenir que des chiffres");
        return;
      }
    }

    onConfirm({
      shared,
      locked,
      parentalCode: locked ? parentalCode : undefined,
    });
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setParentalCode(digits);
    setCodeError("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Options de la photo</DialogTitle>
          <DialogDescription>
            Configurez le partage et la protection de cette photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          {previewUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Sharing option */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="shared" className="font-medium">
                  Partager avec les autres utilisateurs
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {shared
                  ? "La photo sera visible par tous les utilisateurs de l'app."
                  : "La photo ne sera visible que sur votre appareil."}
              </p>
            </div>
            <Switch
              id="shared"
              checked={shared}
              onCheckedChange={setShared}
              disabled={isLoading}
            />
          </div>

          {/* Lock option */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="locked" className="font-medium">
                  Bloquer la modification
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {locked
                  ? "Un code sera nécessaire pour modifier ou supprimer la photo."
                  : "Les autres utilisateurs pourront modifier cette photo."}
              </p>
            </div>
            <Switch
              id="locked"
              checked={locked}
              onCheckedChange={(checked) => {
                setLocked(checked);
                if (!checked) {
                  setParentalCode("");
                  setCodeError("");
                }
              }}
              disabled={isLoading}
            />
          </div>

          {/* Parental code input */}
          {locked && (
            <div className="space-y-2 pl-6 border-l-2 border-border">
              <Label htmlFor="code" className="text-sm font-medium">
                Code parental (4 à 8 chiffres)
              </Label>
              <div className="relative">
                <Input
                  id="code"
                  type={showCode ? "text" : "password"}
                  value={parentalCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="••••"
                  maxLength={8}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {codeError && (
                <p className="text-sm text-destructive">{codeError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Ce code ne sera jamais stocké en clair. Conservez-le précieusement.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
