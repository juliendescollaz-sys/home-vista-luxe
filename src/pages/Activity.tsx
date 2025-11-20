import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

const Activity = () => {
  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <h2 className="text-3xl font-bold mb-4">Activité</h2>
        <p className="text-muted-foreground">Journal des événements récents à venir...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Activity;
