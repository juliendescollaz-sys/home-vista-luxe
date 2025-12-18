import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HA_PHOTOS_DIR = "/config/www/neolia/pieces";
const HA_PHOTOS_URL = "/local/neolia/pieces";
const JSON_FILENAME = "room_photos.json";

interface RoomPhotoMetadata {
  photoUrl: string;
  ownerUserId: string;
  shared: boolean;
  locked: boolean;
  parentalCodeHash?: string;
  updatedAt: string;
}

interface RoomPhotosJson {
  version: number;
  rooms: Record<string, RoomPhotoMetadata>;
}

async function fetchMetadata(haBaseUrl: string, haToken: string): Promise<RoomPhotosJson> {
  const url = `${haBaseUrl}${HA_PHOTOS_URL}/${JSON_FILENAME}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${haToken}` },
    });
    
    if (response.status === 404) {
      return { version: 1, rooms: {} };
    }
    
    if (!response.ok) {
      console.warn(`Failed to fetch metadata: ${response.status}`);
      return { version: 1, rooms: {} };
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Could not fetch metadata:", error);
    return { version: 1, rooms: {} };
  }
}

async function saveMetadata(
  haBaseUrl: string,
  haToken: string,
  metadata: RoomPhotosJson
): Promise<void> {
  // Use HA REST API to write file
  const url = `${haBaseUrl}/api/config/core/save_file`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${haToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: `${HA_PHOTOS_DIR}/${JSON_FILENAME}`,
      content: JSON.stringify(metadata, null, 2),
    }),
  });
  
  if (!response.ok) {
    // Try alternative method - direct file write via shell command integration
    // This requires shell_command integration or similar
    console.warn("save_file API failed, trying alternative method");
    throw new Error(`Failed to save metadata: ${response.status}`);
  }
}

async function uploadImage(
  haBaseUrl: string,
  haToken: string,
  filename: string,
  imageBase64: string
): Promise<string> {
  // Convert base64 to binary
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Use HA API to save file
  const url = `${haBaseUrl}/api/config/core/save_file`;
  
  // First try to create directory if it doesn't exist
  // Note: HA will create parent directories automatically
  
  const filePath = `${HA_PHOTOS_DIR}/${filename}`;
  
  // HA's save_file expects base64 content for binary files
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${haToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: filePath,
      content: imageBase64,
      encoding: "base64",
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Upload failed:", response.status, errorText);
    throw new Error(`Failed to upload image: ${response.status}`);
  }
  
  return `${HA_PHOTOS_URL}/${filename}`;
}

async function deleteImage(
  haBaseUrl: string,
  haToken: string,
  filename: string
): Promise<void> {
  const url = `${haBaseUrl}/api/config/core/delete_file`;
  const filePath = `${HA_PHOTOS_DIR}/${filename}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${haToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: filePath }),
  });
  
  if (!response.ok && response.status !== 404) {
    console.warn(`Failed to delete image: ${response.status}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { haBaseUrl, haToken, action, roomId, userId, filename, imageBase64, metadata } = body;

    if (!haBaseUrl || !haToken) {
      return new Response(
        JSON.stringify({ error: "haBaseUrl and haToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "upload") {
      if (!roomId || !userId || !filename || !imageBase64) {
        return new Response(
          JSON.stringify({ error: "roomId, userId, filename, and imageBase64 are required for upload" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upload image
      const photoUrl = await uploadImage(haBaseUrl, haToken, filename, imageBase64);

      // Update metadata
      const existingMetadata = await fetchMetadata(haBaseUrl, haToken);
      existingMetadata.rooms[roomId] = {
        photoUrl,
        ownerUserId: userId,
        shared: metadata?.shared ?? true,
        locked: metadata?.locked ?? false,
        parentalCodeHash: metadata?.parentalCodeHash,
        updatedAt: new Date().toISOString(),
      };

      await saveMetadata(haBaseUrl, haToken, existingMetadata);

      return new Response(
        JSON.stringify({ success: true, photoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!roomId) {
        return new Response(
          JSON.stringify({ error: "roomId is required for delete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current metadata to find the filename
      const existingMetadata = await fetchMetadata(haBaseUrl, haToken);
      const roomData = existingMetadata.rooms[roomId];

      if (roomData) {
        // Extract filename from URL
        const urlFilename = roomData.photoUrl.split("/").pop();
        if (urlFilename) {
          await deleteImage(haBaseUrl, haToken, urlFilename);
        }

        // Remove from metadata
        delete existingMetadata.rooms[roomId];
        await saveMetadata(haBaseUrl, haToken, existingMetadata);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      const metadata = await fetchMetadata(haBaseUrl, haToken);
      return new Response(
        JSON.stringify(metadata),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'upload', 'delete', or 'get'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ha-room-photos:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
