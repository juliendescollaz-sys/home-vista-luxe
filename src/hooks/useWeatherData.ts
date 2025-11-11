import { useState, useEffect, useCallback, useRef } from "react";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity } from "@/types/homeassistant";

export interface UnifiedWeather {
  source: 'weather' | 'sensors' | 'none';
  entity_id: string | null;
  condition: string | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind_speed: number | null;
  wind_bearing: number | null;
  visibility: number | null;
  precipitation: number | null;
  forecast: Array<{
    datetime: string;
    temperature?: number | null;
    templow?: number | null;
    condition?: string | null;
    precipitation?: number | null;
    wind_speed?: number | null;
    wind_bearing?: number | null;
  }>;
  units: {
    temperature: '°C' | '°F';
    wind_speed: 'km/h' | 'm/s';
    pressure: 'hPa' | 'mbar';
    visibility?: 'km' | 'mi';
    precipitation?: 'mm';
  };
}

interface HAConfig {
  unit_system: {
    temperature: string;
    length: string;
  };
}

// Enhanced keyword matching for FR/EN
const kw = {
  temp: ["temperature", "temp", "température", "outdoor", "exterior", "outside", "ext", "ambient"],
  cond: ["condition", "summary", "symbol", "weather", "meteo", "météo", "sky", "state", "temps", "ciel"],
  hum: ["humidity", "humidité"],
  pres: ["pressure", "barometer", "pression"],
  wspd: ["wind_speed", "wind", "gust", "vent", "rafale", "rafales"],
  wdir: ["wind_bearing", "wind_direction", "bearing", "direction", "deg", "angle"],
  rain: ["precipitation", "precip", "rain", "pluie"],
};

const deviceClassHints = {
  temp: ["temperature"],
  hum: ["humidity"],
  pres: ["pressure"],
};

const unitHints = {
  temp: ["°C", "°F", "C", "F"],
  pres: ["hPa", "mbar", "bar"],
  wspd: ["km/h", "m/s", "mph"],
};

const isValid = (v: any) =>
  !(v === undefined || v === null || v === "" || String(v).toLowerCase() === "unknown" || String(v).toLowerCase() === "unavailable");

const mpsToKmh = (v: number | null) => (v == null ? null : v * 3.6);

const scoreBy = (e: HAEntity, keys: string[], dcHints?: string[], unitHintsArr?: string[]) => {
  const id = e.entity_id.toLowerCase();
  const name = (e.attributes.friendly_name || "").toLowerCase();
  const attrs = JSON.stringify(e.attributes || {}).toLowerCase();
  let s = 0;

  for (const k of keys) {
    if (id.includes(k)) s += 2;
    if (name.includes(k)) s += 1.5;
    if (attrs.includes(k)) s += 1;
  }
  if (dcHints?.includes(e.attributes?.device_class)) s += 3;
  if (unitHintsArr?.includes(e.attributes?.unit_of_measurement)) s += 1.5;
  if (e.last_changed) s += 0.2;

  return s;
};

const pick = (entities: HAEntity[], keys: string[], dc?: string[], units?: string[]) => {
  let best: HAEntity | null = null, bestScore = -1;
  for (const e of entities) {
    const sc = scoreBy(e, keys, dc, units);
    if (sc > bestScore) { best = e; bestScore = sc; }
  }
  return best;
};

export function useWeatherData() {
  const { client, entities, isConnected } = useHAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<UnifiedWeather | null>(null);
  const configRef = useRef<HAConfig | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasInitializedRef = useRef(false);

  const toUnits = useCallback((cfg: HAConfig | null) => {
    const metric = !cfg || cfg.unit_system.temperature === "°C";
    return {
      temperature: metric ? "°C" : "°F",
      wind_speed: metric ? "km/h" : "m/s",
      pressure: "hPa",
      visibility: metric ? "km" : "mi",
      precipitation: "mm",
    } as UnifiedWeather["units"];
  }, []);

  const convert = useCallback((u: UnifiedWeather["units"], raw: {
    temperature?: number | null;
    wind_speed?: number | null;
    pressure?: number | null;
    visibility?: number | null;
  }) => {
    let t = raw.temperature ?? null;
    let w = raw.wind_speed ?? null;
    let p = raw.pressure ?? null;
    let vis = raw.visibility ?? null;

    if (u.wind_speed === "km/h" && w != null && w < 50) {
      w = mpsToKmh(w);
    }
    return { temperature: t, wind_speed: w, pressure: p, visibility: vis };
  }, []);

  const buildFromWeatherEntity = useCallback((e: HAEntity, cfg: HAConfig | null): UnifiedWeather => {
    const u = toUnits(cfg);
    const attrs = e.attributes || {};
    const conv = convert(u, {
      temperature: attrs.temperature ? Number(attrs.temperature) : null,
      wind_speed: attrs.wind_speed ? Number(attrs.wind_speed) : null,
      pressure: attrs.pressure ? Number(attrs.pressure) : null,
      visibility: attrs.visibility ? Number(attrs.visibility) : null,
    });
    return {
      source: "weather",
      entity_id: e.entity_id,
      condition: isValid(e.state) ? String(e.state) : null,
      temperature: conv.temperature ?? null,
      humidity: attrs.humidity ? Number(attrs.humidity) : null,
      pressure: conv.pressure ?? null,
      wind_speed: conv.wind_speed ?? null,
      wind_bearing: attrs.wind_bearing ? Number(attrs.wind_bearing) : null,
      visibility: conv.visibility ?? null,
      precipitation: attrs.precipitation ? Number(attrs.precipitation) : null,
      forecast: Array.isArray(attrs.forecast) ? attrs.forecast.map((f: any) => ({
        datetime: f.datetime || f.datetime_iso || new Date().toISOString(),
        temperature: f.temperature ?? null,
        templow: f.templow ?? null,
        condition: f.condition ?? null,
        precipitation: f.precipitation ?? null,
        wind_speed: f.wind_speed ?? null,
        wind_bearing: f.wind_bearing ?? null,
      })) : [],
      units: u,
    };
  }, [convert, toUnits]);

  const buildFromSensors = useCallback((entityList: HAEntity[], cfg: HAConfig | null): UnifiedWeather | null => {
    const sensors = entityList.filter(e => e.entity_id.startsWith("sensor."));
    if (!sensors.length) return null;

    const temp = pick(sensors, kw.temp, deviceClassHints.temp, unitHints.temp);
    const cond = pick(sensors, kw.cond);
    const hum = pick(sensors, kw.hum, deviceClassHints.hum);
    const pres = pick(sensors, kw.pres, deviceClassHints.pres, unitHints.pres);
    const wspd = pick(sensors, kw.wspd, undefined, unitHints.wspd);
    const wdir = pick(sensors, kw.wdir);
    const rain = pick(sensors, kw.rain);

    console.log("🔎 Capteurs trouvés:", {
      temp: temp?.entity_id,
      cond: cond?.entity_id,
      hum: hum?.entity_id,
      pres: pres?.entity_id,
      wspd: wspd?.entity_id,
      wdir: wdir?.entity_id,
      rain: rain?.entity_id,
    });

    const u = toUnits(cfg);
    const conv = convert(u, {
      temperature: temp && isValid(temp.state) ? Number(temp.state) : null,
      wind_speed: wspd && isValid(wspd.state) ? Number(wspd.state) : null,
      pressure: pres && isValid(pres.state) ? Number(pres.state) : null,
      visibility: null,
    });

    return {
      source: "sensors",
      entity_id: null,
      condition: cond && isValid(cond.state) ? String(cond.state) : null,
      temperature: conv.temperature,
      humidity: hum && isValid(hum.state) ? Number(hum.state) : null,
      pressure: conv.pressure,
      wind_speed: conv.wind_speed,
      wind_bearing: wdir && isValid(wdir.state) ? Number(wdir.state) : null,
      visibility: null,
      precipitation: rain && isValid(rain.state) ? Number(rain.state) : null,
      forecast: [],
      units: u,
    };
  }, [convert, toUnits]);

  const selectWeather = useCallback((entityList: HAEntity[], cfg: HAConfig | null): UnifiedWeather | null => {
    const weathers = entityList.filter(e => e.entity_id.startsWith("weather."));
    
    console.log("🔎 Entités weather.* trouvées:", weathers.map(w => w.entity_id));
    
    if (weathers.length) {
      const home = weathers.find(w => ["weather.home", "weather.maison"].includes(w.entity_id));
      const chosen = home || weathers[0];
      console.log("✅ Utilisation de:", chosen.entity_id);
      return buildFromWeatherEntity(chosen, cfg);
    }

    console.log("⚠️ Aucune entité weather.*, recherche dans les capteurs...");
    const built = buildFromSensors(entityList, cfg);
    if (built) {
      console.log("✅ Données météo construites depuis les capteurs");
      return built;
    }

    console.warn("❌ Aucune source météo trouvée");
    return {
      source: "none",
      entity_id: null,
      condition: null,
      temperature: null,
      humidity: null,
      pressure: null,
      wind_speed: null,
      wind_bearing: null,
      visibility: null,
      precipitation: null,
      forecast: [],
      units: toUnits(cfg),
    };
  }, [buildFromSensors, buildFromWeatherEntity, toUnits]);

  const refresh = useCallback(async () => {
    if (!client || !isConnected) {
      console.log("⏸️ Client non connecté, attente...");
      return;
    }
    
    if (!entities || entities.length === 0) {
      console.log("⏸️ Entités non encore chargées, attente...");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Rafraîchissement des données météo...");
      
      // Fetch config via WebSocket
      try {
        const cfg = await client.getConfig();
        console.log("✅ Config récupérée:", cfg?.unit_system);
        configRef.current = cfg;
      } catch (e) {
        console.warn("⚠️ Config non disponible, utilisation des valeurs par défaut");
        configRef.current = null;
      }

      // Debug entity counts
      const weatherEntities = entities.filter(e => e.entity_id.startsWith("weather."));
      const sensors = entities.filter(e => e.entity_id.startsWith("sensor."));
      const tempSensors = sensors.filter(e =>
        kw.temp.some(k => (e.entity_id + JSON.stringify(e.attributes || {})).toLowerCase().includes(k))
        || e.attributes?.device_class === "temperature"
      );
      
      console.log("📊 Entités disponibles:", {
        total: entities.length,
        "weather.*": weatherEntities.length,
        "sensor.*": sensors.length,
        "temp sensors": tempSensors.length,
      });

      const unified = selectWeather(entities, configRef.current);
      setWeatherData(unified);
      setIsLoading(false);
      
      if (unified.source === "none") {
        setError("Aucune source météo détectée. Activez une intégration météo dans Home Assistant.");
      }
    } catch (e: any) {
      console.error("❌ Erreur refresh:", e);
      setError(e.message || "Erreur de récupération météo");
      setIsLoading(false);
    }
  }, [client, entities, isConnected, selectWeather]);

  // Initial load - wait for entities to be populated
  useEffect(() => {
    if (!client || !isConnected || !entities.length || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    console.log("🌤️ Initialisation météo...");
    refresh();
  }, [client, isConnected, entities.length, refresh]);

  // Real-time updates handled by store, just refresh when entities change
  useEffect(() => {
    if (!client || !isConnected || !entities.length || !hasInitializedRef.current) return;
    
    // Refresh weather data when entities update
    const weatherEntities = entities.filter(e => e.entity_id.startsWith("weather."));
    if (weatherEntities.length > 0 || entities.some(e => e.entity_id.startsWith("sensor."))) {
      const unified = selectWeather(entities, configRef.current);
      setWeatherData(unified);
    }
  }, [entities, client, isConnected, selectWeather]);

  return { weatherData, isLoading, error, refresh };
}
