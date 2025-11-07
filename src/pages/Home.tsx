import { useHAStore } from "@/store/useHAStore";
import { useHAClient } from "@/hooks/useHAClient";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Thermometer, Music, Lock, Camera, MoreVertical } from "lucide-react";
import type { EntityDomain } from "@/types/homeassistant";

const domainIcons: Record<EntityDomain, any> = {
  light: Lightbulb,
  climate: Thermometer,
  media_player: Music,
  lock: Lock,
  camera: Camera,
  switch: Lightbulb,
  sensor: Thermometer,
  binary_sensor: Thermometer,
  cover: MoreVertical,
  scene: Lightbulb,
  script: Lightbulb,
  button: Lightbulb,
};

const Home = () => {
  const areas = useHAStore((state) => state.areas);
  const entities = useHAStore((state) => state.entities);
  const { isConnecting, error } = useHAClient();

  const getAreaEntities = (areaId: string) => {
    return entities?.filter((e) => e.attributes.area_id === areaId) || [];
  };

  const getActiveCount = (areaId: string) => {
    return getAreaEntities(areaId).filter((e) => e.state === "on").length;
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <TopBar />
        <div className="max-w-screen-xl mx-auto px-4 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <TopBar />
      
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Bienvenue</h2>
          <p className="text-muted-foreground">
            {areas?.length || 0} pièces • {entities?.filter(e => e.state === "on").length || 0} actifs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas?.map((area) => {
            const areaEntities = getAreaEntities(area.area_id);
            const activeCount = getActiveCount(area.area_id);
            const primaryEntity = areaEntities[0];
            const domain = primaryEntity?.entity_id.split(".")[0] as EntityDomain;
            const Icon = domainIcons[domain] || MoreVertical;

            return (
              <Card
                key={area.area_id}
                className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 bg-gradient-card border-border/50"
              >
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
                
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    {activeCount > 0 && (
                      <div className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                        {activeCount} actif{activeCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-1">{area.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {areaEntities.length} appareil{areaEntities.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {areaEntities.slice(0, 3).map((entity) => {
                      const isActive = entity.state === "on";
                      return (
                        <div
                          key={entity.entity_id}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            isActive ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
