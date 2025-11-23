import type { HAEntity, HAFloor, HAArea } from "@/types/homeassistant";
import { LocationBadge } from "./LocationBadge";
import { UniversalEntityTile } from "./entities/UniversalEntityTile";

interface UniversalEntityTileWrapperProps {
  entity: HAEntity;
  floor?: HAFloor | null;
  area?: HAArea | null;
}

export const UniversalEntityTileWrapper = ({ 
  entity,
  floor,
  area
}: UniversalEntityTileWrapperProps) => {

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <LocationBadge floor={floor} area={area} />
      </div>

      <UniversalEntityTile entity={entity} />
    </div>
  );
};
