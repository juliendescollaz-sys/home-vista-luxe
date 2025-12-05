                  {/* Overlay des zones cliquables */}
                  {selectedPlan?.hasJson && selectedPlan?.json?.polygons ? (
                    (() => {
                      // Sécurité supplémentaire : même si le store est dans un état bizarre,
                      // on évite un "Cannot read properties of undefined (reading 'json')"
                      if (!selectedPlan || !selectedPlan.json) return null;

                      const polygons = selectedPlan.json.polygons || [];
                      const areasFromJson = selectedPlan.json.areas || [];

                      return (
                        <div className="absolute inset-0 z-30 pointer-events-none">
                          {polygons.map((polygon, index) => {
                            const points = polygon.relative ?? [];
                            if (points.length === 0) return null;

                            // centroïde (position de base)
                            let sumX = 0;
                            let sumY = 0;
                            points.forEach(([x, y]) => {
                              sumX += x;
                              sumY += y;
                            });
                            const baseX = sumX / points.length;
                            const baseY = sumY / points.length;

                            // Priorité aux noms HA, fallback sur JSON
                            const haArea = areas.find(
                              (a) => a.area_id === polygon.areaId
                            );
                            const areaFromJson = areasFromJson.find(
                              (a) => a.areaId === polygon.areaId
                            );
                            const roomName =
                              haArea?.name ??
                              areaFromJson?.name ??
                              `Pièce ${index + 1}`;

                            const key = `${selectedPlan.floorId}:${polygon.areaId}`;
                            const overridePos = labelPositions[key];

                            return (
                              <DraggableRoomLabel
                                key={key}
                                floorId={selectedPlan.floorId}
                                areaId={polygon.areaId}
                                roomName={roomName}
                                baseX={baseX}
                                baseY={baseY}
                                overridePos={overridePos}
                                isSelected={selectedAreaId === polygon.areaId}
                                onPositionChange={(x, y) => {
                                  setLabelPosition(
                                    selectedPlan.floorId,
                                    polygon.areaId,
                                    x,
                                    y
                                  );
                                }}
                                onClickRoom={() => {
                                  setSelectedAreaId(polygon.areaId);
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 z-20">
                      <p className="text-xs text-muted-foreground bg-background/90 backdrop-blur px-3 py-1.5 rounded-full border border-border/60 shadow-sm">
                        {selectedPlan?.hasJson === false
                          ? "Aucune zone définie pour ce plan (JSON manquant)"
                          : "Zones non configurées pour cet étage"}
                      </p>
                    </div>
                  )}
