import { Layers, Home, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "floors" | "rooms" | "devices";

interface ViewSelectorProps {
  selectedView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hideFloors?: boolean;
}

export const ViewSelector = ({ selectedView, onViewChange, hideFloors = false }: ViewSelectorProps) => {
  const allViews = [
    { id: "floors" as ViewMode, label: "Étages", icon: Layers },
    { id: "rooms" as ViewMode, label: "Pièces", icon: Home },
    { id: "devices" as ViewMode, label: "Appareils", icon: Grid3x3 },
  ];

  const views = hideFloors 
    ? allViews.filter(view => view.id !== "floors")
    : allViews;

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
