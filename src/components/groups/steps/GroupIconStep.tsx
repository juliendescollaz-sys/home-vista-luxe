import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GroupIconPickerDialog } from "../GroupIconPickerDialog";
import { ALL_GROUP_ICONS } from "@/types/groups";
import { Pencil, Sparkles, Loader2, Package } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GroupIconStepProps {
  icon: string;
  name: string;
  onIconChange: (icon: string) => void;
}

export function GroupIconStep({ icon, name, onIconChange }: GroupIconStepProps) {
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [suggestedIcon, setSuggestedIcon] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // AI icon suggestion based on name
  useEffect(() => {
    if (!name.trim() || name.trim().length < 3) {
      setSuggestedIcon(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const { data, error } = await supabase.functions.invoke("suggest-scene-icon", {
          body: { 
            sceneName: name,
            availableIcons: ALL_GROUP_ICONS
          },
        });

        if (!error && data?.icon) {
          setSuggestedIcon(data.icon);
        }
      } catch (err) {
        console.error("Icon suggestion error:", err);
      } finally {
        setIsSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [name]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestedIcon) {
      onIconChange(suggestedIcon);
      setSuggestedIcon(null);
    }
  }, [suggestedIcon, onIconChange]);

  const handleManualIconSelect = useCallback(
    (selectedIcon: string) => {
      onIconChange(selectedIcon);
      setSuggestedIcon(null);
    },
    [onIconChange]
  );

  const renderSelectedIcon = () => {
    const IconComponent = (LucideIcons as any)[icon];
    if (!IconComponent) {
      return <Package className="w-12 h-12" />;
    }
    return <IconComponent className="w-12 h-12" />;
  };

  const renderSuggestedIcon = () => {
    if (!suggestedIcon) return null;
    const IconComponent = (LucideIcons as any)[suggestedIcon];
    if (!IconComponent) return null;
    return <IconComponent className="w-8 h-8" />;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Icône du groupe</Label>

        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border-2 border-primary/20">
            {renderSelectedIcon()}
          </div>

          <Button type="button" variant="outline" onClick={() => setIconDialogOpen(true)} className="gap-2">
            <Pencil className="w-4 h-4" />
            Choisir une icône
          </Button>
        </div>

        {/* AI Suggestion */}
        {isSuggesting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Suggestion IA en cours...
          </div>
        )}

        {suggestedIcon && !isSuggesting && (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAcceptSuggestion}
              className="gap-2 text-primary hover:text-primary border-primary/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Utiliser la suggestion :</span>
              <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {renderSuggestedIcon()}
              </span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Pourquoi une icône ?</span> L'icône permet d'identifier visuellement 
          votre groupe d'un coup d'œil. L'IA peut vous suggérer une icône adaptée au nom de votre groupe.
        </p>
      </div>

      <GroupIconPickerDialog
        open={iconDialogOpen}
        onOpenChange={setIconDialogOpen}
        selectedIcon={icon}
        onSelectIcon={handleManualIconSelect}
      />
    </div>
  );
}
