import { useState, useEffect } from "react";
import { NeoliaScene, SceneScope } from "@/types/scenes";
import { useSceneStore } from "@/store/useSceneStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Trash2, Users, User } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SceneIconPicker } from "./SceneIconPicker";

interface SceneEditDialogProps {
  scene: NeoliaScene;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SceneEditDialog({ scene, open, onOpenChange }: SceneEditDialogProps) {
  const updateScene = useSceneStore((s) => s.updateScene);
  const deleteScene = useSceneStore((s) => s.deleteScene);

  const [name, setName] = useState(scene.name);
  const [description, setDescription] = useState(scene.description || "");
  const [icon, setIcon] = useState(scene.icon);
  const [scope, setScope] = useState<SceneScope>(scene.scope);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(scene.name);
      setDescription(scene.description || "");
      setIcon(scene.icon);
      setScope(scene.scope);
    }
  }, [open, scene]);

  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Sparkles;

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la scène est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    updateScene(scene.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      scope,
    });

    toast({
      title: "Scène modifiée",
      description: `"${name.trim()}" a été mise à jour.`,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteScene(scene.id);
    setIsDeleteConfirmOpen(false);
    onOpenChange(false);
    
    toast({
      title: "Scène supprimée",
      description: `"${scene.name}" a été supprimée.`,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la scène</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="scene-name">Nom de la scène</Label>
              <Input
                id="scene-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Soirée cinéma"
              />
            </div>

            {/* Icône */}
            <div className="space-y-2">
              <Label>Icône</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => setIconPickerOpen(true)}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">Changer l'icône</span>
              </Button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="scene-description">Description (optionnel)</Label>
              <Textarea
                id="scene-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez cette scène..."
                rows={2}
              />
            </div>

            {/* Portée */}
            <div className="space-y-3">
              <Label>Portée de la scène</Label>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  {scope === "shared" ? (
                    <Users className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {scope === "shared" ? "Partagée" : "Locale uniquement"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scope === "shared"
                        ? "Accessible à tous les utilisateurs"
                        : "Visible uniquement dans cette app"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={scope === "shared"}
                  onCheckedChange={(checked) => setScope(checked ? "shared" : "local")}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </div>
      </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir une icône</DialogTitle>
          </DialogHeader>
          <SceneIconPicker
            selectedIcon={icon}
            onSelectIcon={(newIcon) => {
              setIcon(newIcon);
              setIconPickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette scène ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la scène « {scene.name} ».
              Les appareils ne seront pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
