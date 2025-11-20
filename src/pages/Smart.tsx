import { TopBar } from "@/components/TopBar";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const Smart = () => {
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-[7.1875rem]" : "pt-10";
  
  return (
    <div className={`min-h-screen bg-background pb-24 ${ptClass}`}>
      <TopBar title="Smart" />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <p className="text-muted-foreground">Fonctionnalités intelligentes à venir...</p>
      </div>
    </div>
  );
};

export default Smart;
