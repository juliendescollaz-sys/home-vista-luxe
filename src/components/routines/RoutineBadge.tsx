import { Clock } from "lucide-react";

export function RoutineBadge() {
  return (
    <div 
      className="absolute flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide shadow-sm"
      style={{ top: "0.75rem", left: "0.75rem" }}
    >
      <Clock className="h-3 w-3 text-primary" />
      <span className="text-muted-foreground">Routine</span>
    </div>
  );
}
