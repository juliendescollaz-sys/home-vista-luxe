import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Routines = () => {
  const { displayMode } = useDisplayMode();
  
  return (
    <div className="w-full h-full bg-background">
      {displayMode === "mobile" && <TopBar title="Routines" />}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <p className="text-muted-foreground">Vos routines automatiques apparaîtront ici...</p>
      </div>
      {displayMode === "mobile" && <BottomNav />}
    </div>
  );
};

export default Routines;
