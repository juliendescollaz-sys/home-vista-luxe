import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTINE_ICON_CATEGORIES, ROUTINE_ICON_FRENCH_LABELS } from "@/types/routines";
import * as LucideIcons from "lucide-react";
import { Search } from "lucide-react";

interface RoutineIconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export function RoutineIconPickerDialog({
  open,
  onOpenChange,
  selectedIcon,
  onSelectIcon,
}: RoutineIconPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return ROUTINE_ICON_CATEGORIES;
    }

    const search = searchTerm.toLowerCase();
    const result: typeof ROUTINE_ICON_CATEGORIES = {} as any;

    for (const [key, category] of Object.entries(ROUTINE_ICON_CATEGORIES)) {
      const filteredIcons = category.icons.filter((icon) => {
        // Check icon name
        if (icon.toLowerCase().includes(search)) return true;
        // Check French labels
        const labels = ROUTINE_ICON_FRENCH_LABELS[icon] || [];
        return labels.some((label) => label.toLowerCase().includes(search));
      });

      if (filteredIcons.length > 0) {
        (result as any)[key] = { ...category, icons: filteredIcons };
      }
    }

    return result;
  }, [searchTerm]);

  const hasResults = Object.keys(filteredCategories).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisir une icône</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une icône..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {hasResults ? (
            <div className="space-y-6 py-4">
              {Object.entries(filteredCategories).map(([key, category]) => (
                <div key={key}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    {category.label}
                  </h4>
                  <div className="grid grid-cols-6 gap-2">
                    {category.icons.map((iconName) => {
                      const IconComponent = (LucideIcons as any)[iconName];
                      if (!IconComponent) return null;

                      const isSelected = selectedIcon === iconName;

                      return (
                        <Button
                          key={iconName}
                          variant={isSelected ? "default" : "ghost"}
                          size="icon"
                          className={`w-10 h-10 ${isSelected ? "" : "hover:bg-muted"}`}
                          onClick={() => onSelectIcon(iconName)}
                          title={iconName}
                        >
                          <IconComponent className="h-5 w-5" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Aucune icône trouvée pour "{searchTerm}"
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
