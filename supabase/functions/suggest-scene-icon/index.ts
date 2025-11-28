import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVAILABLE_ICONS = [
  "Sun", "Moon", "Sunset", "Sunrise", "Stars", "Sparkles", "Heart", "Flame", "Zap", "CloudMoon", "Lamp", "Glasses", "Eye", "Palette", "Gem", "Crown",
  "Home", "Sofa", "Bed", "Bath", "UtensilsCrossed", "Car", "Trees", "Building", "DoorOpen", "Armchair", "Warehouse", "Store", "ParkingSquare", "Fence", "LayoutGrid", "FlameKindling",
  "Tv", "Clapperboard", "Music", "Gamepad2", "BookOpen", "Briefcase", "Dumbbell", "Coffee", "Wine", "PartyPopper", "Headphones", "Camera", "Mic", "Bike", "Utensils", "ShoppingBag",
  "Thermometer", "Fan", "Snowflake", "CloudRain", "Wind", "Droplets", "CloudSun", "Cloudy", "Rainbow", "Umbrella", "ThermometerSun", "ThermometerSnowflake", "Waves", "CloudFog", "Heater",
  "Star", "Bell", "Clock", "Calendar", "MapPin", "Plane", "LogOut", "LogIn", "Shield", "Lightbulb", "Settings", "Power", "Timer", "Wifi", "Lock", "Unlock"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneName } = await req.json();
    
    if (!sceneName || sceneName.trim().length < 2) {
      return new Response(JSON.stringify({ icon: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant qui suggère une icône pour une scène domotique.
Tu dois répondre UNIQUEMENT avec le nom exact d'une icône parmi cette liste: ${AVAILABLE_ICONS.join(", ")}.
Analyse le nom de la scène et choisis l'icône la plus appropriée.
Réponds UNIQUEMENT avec le nom de l'icône, rien d'autre.`
          },
          {
            role: "user",
            content: `Quelle icône pour la scène "${sceneName}" ?`
          }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ icon: null, error: "rate_limit" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestedIcon = data.choices?.[0]?.message?.content?.trim();
    
    // Validate the suggested icon exists in our list
    const validIcon = AVAILABLE_ICONS.find(
      icon => icon.toLowerCase() === suggestedIcon?.toLowerCase()
    );

    return new Response(JSON.stringify({ icon: validIcon || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-scene-icon error:", error);
    return new Response(JSON.stringify({ icon: null, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
