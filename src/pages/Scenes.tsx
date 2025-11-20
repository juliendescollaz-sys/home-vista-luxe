import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Scenes = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-16" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <h2 className="text-3xl font-bold mb-4">Scènes & Routines</h2>
        <p className="text-muted-foreground">Vos scènes Home Assistant apparaîtront ici...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Scenes;
