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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Limiter la taille max à 800px pour économiser l'espace
          const maxSize = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compression JPEG à 0.7 pour réduire la taille
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          console.log('📸 Original size:', (e.target?.result as string)?.length, 'Compressed:', compressedDataUrl.length);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (areaId: string, file: File) => {
    try {
      console.log('📸 Photo change for areaId:', areaId);
      const compressedDataUrl = await compressImage(file);
      console.log('📸 Compressed DataURL for areaId:', areaId, 'Length:', compressedDataUrl.length);
      setAreaPhoto(areaId, compressedDataUrl);
      
      // Vérifier la taille totale du localStorage
      setTimeout(() => {
        const stored = localStorage.getItem('ha-storage');
        if (stored) {
          console.log('📸 LocalStorage total size:', (stored.length / 1024).toFixed(2), 'KB');
          const parsed = JSON.parse(stored);
          console.log('📸 AreaPhotos keys:', Object.keys(parsed.state?.areaPhotos || {}));
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error compressing image:', error);
    }
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
