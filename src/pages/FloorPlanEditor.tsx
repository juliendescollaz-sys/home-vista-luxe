import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeProjectStore } from "@/store/useHomeProjectStore";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloorPlanCanvas } from "@/components/floor-editor/FloorPlanCanvas";
import { RoomPropertiesPanel } from "@/components/floor-editor/RoomPropertiesPanel";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDisplayMode } from "@/hooks/useDisplayMode";

const FloorPlanEditor = () => {
  const navigate = useNavigate();
  const { displayMode } = useDisplayMode();
  const ptClass = displayMode === "mobile" ? "pt-28" : "pt-10";

  const { project, updateProject, updateRoom, removeRoom, addRoom } = useHomeProjectStore();
  const [activeLevel, setActiveLevel] = useState(project?.levels[0]?.id || "");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(20);

  if (!project) {
    navigate("/rooms");
    return null;
  }

  const handleRoomsUpdate = (updatedRooms: typeof project.rooms) => {
    updateProject({ rooms: updatedRooms });
  };

  const handleAddRoom = () => {
    if (!activeLevel) return;
    const newRoomId = addRoom({
      levelId: activeLevel,
      name: "Nouvelle pièce",
      type: "",
    });
    setSelectedRoomId(newRoomId);
    toast.success("Pièce ajoutée");
  };

  const handleSave = () => {
    toast.success("Plan enregistré");
    // TODO: POST vers /api/neolia/floorplans
  };

  const handleContinue = () => {
    toast.success("Configuration terminée");
    navigate("/rooms");
    // TODO: Passer au Wizard n°2 (placement des appareils)
  };

  const selectedRoom = project.rooms.find((r) => r.id === selectedRoomId) || null;
  const levelRooms = project.rooms.filter((r) => r.levelId === activeLevel);

  return (
    <div className={`min-h-screen bg-background ${ptClass}`}>
      <TopBar title="Éditeur de plan" />

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
            <Button onClick={handleContinue} size="sm">
              Continuer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-4">
          <div className="space-y-3">
            <Tabs value={activeLevel} onValueChange={setActiveLevel}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <TabsList>
                  {project.levels.map((level) => (
                    <TabsTrigger key={level.id} value={level.id}>
                      {level.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Grille:</label>
                  <select 
                    value={gridSize} 
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="px-2 py-1 text-sm bg-background border border-border rounded-md"
                  >
                    <option value={10}>10px</option>
                    <option value={20}>20px</option>
                    <option value={30}>30px</option>
                    <option value={40}>40px</option>
                  </select>
                  
                  <Button variant="outline" size="sm" onClick={handleAddRoom}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une pièce
                  </Button>
                </div>
              </div>

              {project.levels.map((level) => (
                <TabsContent key={level.id} value={level.id} className="mt-3">
                  <FloorPlanCanvas
                    rooms={project.rooms}
                    onRoomsUpdate={handleRoomsUpdate}
                    levelId={level.id}
                    selectedRoomId={selectedRoomId}
                    onRoomSelect={setSelectedRoomId}
                    gridSize={gridSize}
                  />

                  <div className="mt-3 text-center text-xs text-muted-foreground space-y-1">
                    <p>Glissez-déposez les pièces pour les positionner</p>
                    <p>Utilisez les poignées aux coins pour redimensionner</p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {levelRooms.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucune pièce dans ce niveau</p>
                <Button variant="outline" className="mt-4" onClick={handleAddRoom} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter la première pièce
                </Button>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <RoomPropertiesPanel
              room={selectedRoom}
              onUpdate={updateRoom}
              onDelete={(id) => {
                removeRoom(id);
                if (selectedRoomId === id) {
                  setSelectedRoomId(null);
                }
                toast.success("Pièce supprimée");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanEditor;
