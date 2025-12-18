import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Upload path (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      const haBaseUrl = String(form.get("haBaseUrl") || "");
      const haToken = String(form.get("haToken") || "");
      const roomId = String(form.get("roomId") || "");
      const userId = String(form.get("userId") || "");
      const shared = String(form.get("shared") || "false");
      const locked = String(form.get("locked") || "false");
      const parentalCodeHash = form.get("parentalCodeHash");
      const file = form.get("file");

      if (!haBaseUrl || !haToken || !roomId || !userId) {
        return json({ error: "Missing required fields" }, 400);
      }

      if (!(file instanceof File)) {
        return json({ error: "Missing file" }, 400);
      }

      const upstream = new FormData();
      upstream.append("file", file);
      upstream.append("roomId", roomId);
      upstream.append("userId", userId);
      upstream.append("shared", shared);
      upstream.append("locked", locked);
      if (typeof parentalCodeHash === "string" && parentalCodeHash.length > 0) {
        upstream.append("parentalCodeHash", parentalCodeHash);
      }

      const uploadUrl = `${normalizeBaseUrl(haBaseUrl)}/api/neolia/room_photo`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${haToken}`,
        },
        body: upstream,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[ha-room-photos] Upload error: ${response.status} - ${errorText}`);
        return json(
          {
            error: `Home Assistant API error: ${response.status}`,
            details: errorText,
          },
          response.status
        );
      }

      const result = await response.json().catch(() => ({}));
      return json(result, 200);
    }

    // Metadata path (application/json)
    const body = await req.json().catch(() => ({} as any));
    const action = String(body.action || "");
    const haBaseUrl = String(body.haBaseUrl || "");
    const haToken = String(body.haToken || "");

    if (action !== "metadata") {
      return json({ error: "Invalid action" }, 400);
    }

    if (!haBaseUrl) {
      return json({ error: "Missing haBaseUrl" }, 400);
    }

    const metadataUrl = `${normalizeBaseUrl(haBaseUrl)}/local/neolia/pieces/room_photos.json`;

    const response = await fetch(metadataUrl, {
      method: "GET",
      headers: haToken
        ? {
            Authorization: `Bearer ${haToken}`,
          }
        : undefined,
    });

    if (response.status === 404) {
      return json({ version: 1, rooms: {} }, 200);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[ha-room-photos] Metadata error: ${response.status} - ${errorText}`);
      return json(
        {
          error: `Home Assistant metadata error: ${response.status}`,
          details: errorText,
        },
        response.status
      );
    }

    const metadata = await response.json().catch(() => ({ version: 1, rooms: {} }));
    return json(metadata, 200);
  } catch (error: unknown) {
    console.error("[ha-room-photos] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
