import { Package } from "lucide-react";

export const GroupBadge = () => {
  return (
    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-background/90 backdrop-blur-md rounded-md border border-border/50 z-10">
      <Package className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">
        Groupe
      </span>
    </div>
  );
};
