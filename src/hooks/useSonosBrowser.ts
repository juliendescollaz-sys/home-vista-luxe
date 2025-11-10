import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export type BrowseNode = {
  title: string;
  canPlay: boolean;
  canExpand: boolean;
  mediaContentId?: string;
  mediaContentType?: string;
  thumbnail?: string;
};

export type BreadcrumbItem = {
  title: string;
  mediaContentId?: string;
  mediaContentType?: string;
};

type BrowsePage = {
  path: BreadcrumbItem[];
  items: BrowseNode[];
  loading: boolean;
  error?: string;
};

export function useSonosBrowser(ws: WebSocket | null, entityId: string) {
  const nextId = useRef(1);
  const cache = useRef(new Map<string, BrowseNode[]>());
  const pendingRequests = useRef(new Map<number, string>());
  
  const [page, setPage] = useState<BrowsePage>({
    path: [{ title: "Sonos" }],
    items: [],
    loading: false,
    error: undefined,
  });

  const send = useCallback((msg: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const id = nextId.current++;
      ws.send(JSON.stringify({ id, ...msg }));
      return id;
    }
    return -1;
  }, [ws]);

  const getCacheKey = useCallback((id?: string, type?: string) => {
    return `${entityId}::${id || "ROOT"}::${type || "ROOT"}`;
  }, [entityId]);

  const browseMedia = useCallback((mediaContentId?: string, mediaContentType?: string) => {
    if (!ws) {
      toast.error("Non connecté à Home Assistant");
      return;
    }

    const cacheKey = getCacheKey(mediaContentId, mediaContentType);
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      setPage(p => ({ ...p, items: cached, loading: false, error: undefined }));
      return;
    }

    setPage(p => ({ ...p, loading: true, error: undefined }));

    const payload: any = {
      type: "media_player/browse_media",
      entity_id: entityId,
    };

    if (mediaContentId && mediaContentType) {
      payload.media_content_id = mediaContentId;
      payload.media_content_type = mediaContentType;
    }

    const reqId = send(payload);
    if (reqId !== -1) {
      pendingRequests.current.set(reqId, cacheKey);
    }
  }, [ws, entityId, send, getCacheKey]);

  const playMedia = useCallback((node: BrowseNode) => {
    if (!node.canPlay || !node.mediaContentId || !node.mediaContentType) {
      toast.error("Cet élément ne peut pas être lu");
      return;
    }

    send({
      type: "call_service",
      domain: "media_player",
      service: "play_media",
      service_data: {
        entity_id: entityId,
        media_content_id: node.mediaContentId,
        media_content_type: node.mediaContentType,
      },
    });

    toast.success("Lecture lancée");
  }, [send, entityId]);

  const navigateTo = useCallback((node: BrowseNode) => {
    if (!node.canExpand || !node.mediaContentId || !node.mediaContentType) return;

    setPage(p => ({
      ...p,
      path: [
        ...p.path,
        {
          title: node.title,
          mediaContentId: node.mediaContentId,
          mediaContentType: node.mediaContentType,
        },
      ],
    }));

    browseMedia(node.mediaContentId, node.mediaContentType);
  }, [browseMedia]);

  const navigateBack = useCallback((index: number) => {
    const targetPath = page.path.slice(0, index + 1);
    setPage(p => ({ ...p, path: targetPath }));

    const target = targetPath[targetPath.length - 1];
    browseMedia(target.mediaContentId, target.mediaContentType);
  }, [page.path, browseMedia]);

  const loadRoot = useCallback(() => {
    setPage({
      path: [{ title: "Sonos" }],
      items: [],
      loading: false,
      error: undefined,
    });
    browseMedia();
  }, [browseMedia]);

  useEffect(() => {
    if (!ws) return;

    const onMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "result" && msg.id) {
          const cacheKey = pendingRequests.current.get(msg.id);
          if (!cacheKey) return;

          pendingRequests.current.delete(msg.id);

          if (msg.success && msg.result) {
            const res = msg.result;
            const items: BrowseNode[] = (res.children || []).map((c: any) => ({
              title: c.title || "Sans titre",
              canPlay: !!c.can_play,
              canExpand: !!c.can_expand,
              mediaContentId: c.media_content_id,
              mediaContentType: c.media_content_type,
              thumbnail: c.thumbnail || c.thumbnail_url,
            }));

            cache.current.set(cacheKey, items);
            setPage(p => ({ ...p, items, loading: false, error: undefined }));
          } else if (msg.success === false) {
            const errorMsg = msg.error?.message || "Contenu indisponible";
            setPage(p => ({ ...p, loading: false, error: errorMsg }));
            toast.error(errorMsg);
          }
        }
      } catch (err) {
        console.error("Erreur parsing message browse:", err);
      }
    };

    ws.addEventListener("message", onMessage);
    return () => ws.removeEventListener("message", onMessage);
  }, [ws]);

  return {
    page,
    loadRoot,
    navigateTo,
    navigateBack,
    playMedia,
  };
}
