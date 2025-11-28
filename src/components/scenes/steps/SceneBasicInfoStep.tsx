import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { SceneIconPickerDialog } from "../SceneIconPickerDialog";
import { SceneWizardDraft, SceneScope } from "@/types/scenes";
import { User, Users, Pencil, Sparkles, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface SceneBasicInfoStepProps {
  draft: SceneWizardDraft;
  onUpdate: (updates: Partial<SceneWizardDraft>) => void;
  isEditMode?: boolean;
}

export function SceneBasicInfoStep({
  draft,
  onUpdate,
  isEditMode = false
}: SceneBasicInfoStepProps) {
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [suggestedIcon, setSuggestedIcon] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hasUserSelectedIcon, setHasUserSelectedIcon] = useState(isEditMode);

  // Debounced AI icon suggestion - triggers on every name change
  useEffect(() => {
    if (!draft.name.trim() || draft.name.trim().length < 3) {
      setSuggestedIcon(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-scene-icon', {
          body: { sceneName: draft.name }
        });
        
        if (!error && data?.icon) {
          setSuggestedIcon(data.icon);
        }
      } catch (err) {
        console.error('Icon suggestion error:', err);
      } finally {
        setIsSuggesting(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [draft.name]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestedIcon) {
      onUpdate({ icon: suggestedIcon });
      setSuggestedIcon(null);
      setHasUserSelectedIcon(true);
    }
  }, [suggestedIcon, onUpdate]);

  const handleManualIconSelect = useCallback((icon: string) => {
    onUpdate({ icon });
    setHasUserSelectedIcon(true);
    setSuggestedIcon(null);
  }, [onUpdate]);

  const renderSelectedIcon = () => {
    const IconComponent = (LucideIcons as any)[draft.icon];
    if (!IconComponent) {
      const FallbackIcon = (LucideIcons as any).Sparkles;
      return <FallbackIcon className="w-8 h-8" />;
    }
    return <IconComponent className="w-8 h-8" />;
  };

  const renderSuggestedIcon = () => {
    if (!suggestedIcon) return null;
    const IconComponent = (LucideIcons as any)[suggestedIcon];
    if (!IconComponent) return null;
    return <IconComponent className="w-6 h-6" />;
  };

  const isScopeSelected = draft.scope === "local" || draft.scope === "shared";
  const isNameValid = draft.name.trim().length > 0;
  return <div className="space-y-6">
      {/* Nom de la scène */}
      <div className="space-y-2">
        <Label htmlFor="scene-name">Nom de la scène *</Label>
        <Input id="scene-name" placeholder="Ex: Soirée cinéma, Réveil, Départ de la maison..." value={draft.name} onChange={e => onUpdate({
        name: e.target.value
      })} className={cn("focus-visible:ring-0 focus-visible:ring-offset-0", !isNameValid && draft.name !== "" && "border-destructive")} />
        <p className="text-xs text-muted-foreground">
          Choisissez un nom évocateur pour reconnaître rapidement votre scène.
        </p>
      </div>

      {/* Sélection d'icône - compact avec bouton pour ouvrir le dialog */}
      <div className="space-y-2">
        <Label>Icône de la scène</Label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            {renderSelectedIcon()}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => setIconDialogOpen(true)} className="gap-2">
              <Pencil className="w-4 h-4" />
              Changer l'icône
            </Button>
            
            {/* AI Suggestion */}
            {isSuggesting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Suggestion en cours...
              </div>
            )}
            
            {suggestedIcon && !isSuggesting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAcceptSuggestion}
                className="gap-2 text-primary hover:text-primary h-auto py-1 px-2 justify-start"
              >
                <Sparkles className="w-3 h-3" />
                <span className="text-xs">Utiliser</span>
                <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                  {renderSuggestedIcon()}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Portée de la scène - OBLIGATOIRE */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1">
          Portée de la scène *
          {!isScopeSelected && !isEditMode}
        </Label>
        <RadioGroup value={draft.scope} onValueChange={(value: SceneScope) => onUpdate({
        scope: value
      })} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label htmlFor="scope-local" className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors", "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5", !isScopeSelected && "border-dashed")}>
            <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <User className="w-4 h-4" />
                Local uniquement
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Visible seulement dans cette application Neolia.
              </p>
            </div>
          </label>

          <label htmlFor="scope-shared" className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors", "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5", !isScopeSelected && "border-dashed")}>
            <RadioGroupItem value="shared" id="scope-shared" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Users className="w-4 h-4" />
                Partagée
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Créée dans Home Assistant, accessible à tous.
              </p>
            </div>
          </label>
        </RadioGroup>
        
        {/* Message de validation si portée non sélectionnée */}
        {!isScopeSelected && !isEditMode && <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
            
            
          </div>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="scene-description">Description (optionnel)</Label>
        <Textarea id="scene-description" placeholder="Décrivez brièvement ce que fait cette scène..." value={draft.description} onChange={e => onUpdate({
        description: e.target.value
      })} rows={2} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
      </div>

      {/* Info box */}
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi ces informations ?</span> Le nom et l'icône vous permettent 
          de reconnaître rapidement la scène. La portée détermine si elle est personnelle 
          ou partagée avec toute la maison.
        </p>
      </div>

      {/* Dialog pour le picker d'icônes */}
      <SceneIconPickerDialog open={iconDialogOpen} onOpenChange={setIconDialogOpen} selectedIcon={draft.icon} onSelectIcon={handleManualIconSelect} />
    </div>;
}