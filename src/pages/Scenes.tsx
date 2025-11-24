import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Scenes = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-[26px]";
  const rootClassName = displayMode === "mobile" 
    ? `min-h-screen bg-background pb-24 ${ptClass}`
    : "w-full h-full flex items-center justify-center";
  
  return (
    <div className={rootClassName}>
      <TopBar title="Scènes" />
      <div className="max-w-screen-xl mx-auto px-6 py-6 text-center">
        <p className="text-muted-foreground">Vos scènes Home Assistant apparaîtront ici...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Scenes;
