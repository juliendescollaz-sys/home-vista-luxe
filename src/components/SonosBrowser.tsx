import { useEffect } from "react";
import { useSonosBrowser, BrowseNode } from "@/hooks/useSonosBrowser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ChevronRight, Play, Folder, Radio, Disc3, ListMusic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HAClient } from "@/lib/haClient";

interface SonosBrowserProps {
  client: HAClient | null;
  entityId: string;
  connectionUrl?: string;
}

export function SonosBrowser({ client, entityId, connectionUrl }: SonosBrowserProps) {
  const { page, loadRoot, navigateTo, navigateBack, playMedia } = useSonosBrowser(client, entityId);

  useEffect(() => {
    if (client && page.items.length === 0 && !page.loading && page.path.length === 1) {
      console.log("🚀 Chargement initial de la racine");
      loadRoot();
    }
  }, [client, loadRoot, page.items.length, page.loading, page.path.length]);

  const getIconForNode = (node: BrowseNode) => {
    if (node.canPlay && !node.canExpand) return Play;
    if (node.title.toLowerCase().includes("playlist")) return ListMusic;
    if (node.title.toLowerCase().includes("album")) return Disc3;
    if (node.title.toLowerCase().includes("radio")) return Radio;
    if (node.canExpand) return Folder;
    return Music;
  };

  const getThumbnailUrl = (thumbnail?: string) => {
    if (!thumbnail) return null;
    if (thumbnail.startsWith("http")) return thumbnail;
    if (connectionUrl) return `${connectionUrl}${thumbnail}`;
    return null;
  };

  const handleNodeClick = (node: BrowseNode) => {
    console.log("👆 Click sur node", node);
    if (node.canExpand) {
      console.log("📂 Navigation vers dossier");
      navigateTo(node);
    } else if (node.canPlay) {
      console.log("▶️ Lecture");
      playMedia(node);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Bibliothèque Sonos</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRoot}
            disabled={page.loading}
          >
            Actualiser
          </Button>
        </div>

        {/* Fil d'Ariane */}
        {page.path.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap mb-3">
            {page.path.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <button
                  onClick={() => navigateBack(index)}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    index === page.path.length - 1 && "text-foreground font-medium"
                  )}
                  disabled={page.loading}
                >
                  {item.title}
                </button>
                {index < page.path.length - 1 && (
                  <ChevronRight className="h-3 w-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      {page.loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {page.error && (
        <div className="text-center py-8">
          <p className="text-destructive mb-2">{page.error}</p>
          <Button variant="outline" size="sm" onClick={loadRoot}>
            Réessayer
          </Button>
        </div>
      )}

      {!page.loading && !page.error && page.items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucun élément ici</p>
        </div>
      )}

      {!page.loading && !page.error && page.items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
          {page.items.map((node, index) => {
            const Icon = getIconForNode(node);
            const thumbnailUrl = getThumbnailUrl(node.thumbnail);

            return (
              <button
                key={`${node.title}-${index}`}
                onClick={() => handleNodeClick(node)}
                className={cn(
                  "relative overflow-hidden rounded-lg transition-all duration-200",
                  "flex flex-col items-start p-3 text-left",
                  "border border-border hover:border-primary",
                  "hover:bg-accent active:scale-95",
                  "group"
                )}
              >
                {/* Thumbnail ou icône */}
                <div className="w-full aspect-square mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={node.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Titre */}
                <div className="w-full">
                  <p className="text-sm font-medium line-clamp-2 mb-1">
                    {node.title}
                  </p>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-1">
                    {node.canPlay && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                        <Play className="h-2.5 w-2.5" />
                        Jouer
                      </span>
                    )}
                    {node.canExpand && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
