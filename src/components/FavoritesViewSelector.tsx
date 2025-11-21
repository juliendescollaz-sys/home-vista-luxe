import { Grid3x3, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type FavoritesViewMode = "type" | "location";

interface FavoritesViewSelectorProps {
  selectedView: FavoritesViewMode;
  onViewChange: (view: FavoritesViewMode) => void;
}

export const FavoritesViewSelector = ({ selectedView, onViewChange }: FavoritesViewSelectorProps) => {
  const views = [
    { id: "type" as FavoritesViewMode, label: "Par type", icon: Grid3x3 },
    { id: "location" as FavoritesViewMode, label: "Par localisation", icon: MapPin },
  ];

  return (
    <div className="flex gap-2 p-1 bg-muted/50 rounded-xl backdrop-blur-sm border border-border/50">
      {views.map((view) => {
        const Icon = view.icon;
        const isSelected = selectedView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground active:bg-accent/50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};
