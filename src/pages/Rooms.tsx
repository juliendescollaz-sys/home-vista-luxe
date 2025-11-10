import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useHAStore } from "@/store/useHAStore";
import { RoomCard } from "@/components/RoomCard";
import { Home } from "lucide-react";

const Rooms = () => {
  const areas = useHAStore((state) => state.areas);
  const devices = useHAStore((state) => state.devices);
  const areaPhotos = useHAStore((state) => state.areaPhotos);
  const setAreaPhoto = useHAStore((state) => state.setAreaPhoto);

  // Log pour déboguer
  console.log('🏠 Areas:', areas.map(a => ({ id: a.area_id, name: a.name })));
  console.log('📸 AreaPhotos in state:', areaPhotos);

  // Compter les appareils par pièce
  const getDeviceCount = (areaId: string) => {
    return devices.filter((device) => device.area_id === areaId && !device.disabled_by).length;
  };

  const handlePhotoChange = (areaId: string, file: File) => {
    console.log('📸 Photo change for areaId:', areaId);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      console.log('📸 DataURL created for areaId:', areaId, 'Length:', dataUrl?.length);
      setAreaPhoto(areaId, dataUrl);
      
      // Vérifier immédiatement après l'enregistrement
      setTimeout(() => {
        const stored = localStorage.getItem('ha-storage');
        console.log('📸 LocalStorage after save:', stored ? JSON.parse(stored) : null);
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Pièces</h2>
        
        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune pièce configurée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configurez des pièces dans Home Assistant
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => (
              <RoomCard
                key={area.area_id}
                areaId={area.area_id}
                name={area.name}
                deviceCount={getDeviceCount(area.area_id)}
                customPhoto={areaPhotos[area.area_id]}
                onPhotoChange={(file) => handlePhotoChange(area.area_id, file)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rooms;
