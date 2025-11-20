import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Scenes = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-[7.625rem]" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Scènes" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <p className="text-muted-foreground">Vos scènes Home Assistant apparaîtront ici...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Scenes;
