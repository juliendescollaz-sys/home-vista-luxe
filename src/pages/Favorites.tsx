import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

const Favorites = () => {
  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Favoris</h2>
        <p className="text-muted-foreground">Vos appareils favoris apparaîtront ici...</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Favorites;
