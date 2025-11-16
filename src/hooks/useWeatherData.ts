import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useHAStore } from "@/store/useHAStore";
import type { HAEntity } from "@/types/homeassistant";

type OpenMeteoDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
};

type OpenMeteoCurrent = {
  time: string;
  temperature_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  relative_humidity_2m: number;
  pressure_msl: number;
  weather_code?: number;
};

type OpenMeteoHourly = {
  time: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  wind_speed_10m?: number[];
  wind_direction_10m?: number[];
  weather_code?: number[];
};

const _omCache = new Map<string, { ts: number; data: any }>();
const CACHE_MS = 60_000; // 1 minute

function weatherCodeToCondition(code?: number | null): string | null {
  if (code == null) return null;
  if ([0].includes(code)) return "clear";
  if ([1, 2, 3].includes(code)) return "partlycloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "cloudy";
}

async function fetchOpenMeteo(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&timezone=auto` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant` +
    `&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&forecast_days=7` +
    `&windspeed_unit=kmh&precipitation_unit=mm`;

  const key = `${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const now = Date.now();
  const cached = _omCache.get(key);
  if (cached && (now - cached.ts) < CACHE_MS) return cached.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  _omCache.set(key, { ts: now, data: json });
  return json;
}

function mapOpenMeteoHourly(json: any): UnifiedWeather["forecast"] {
  const h: Partial<OpenMeteoHourly> = json.hourly || {};
  if (!Array.isArray(h.time)) return [];
  return h.time.slice(0, 24).map((iso: string, i: number) => ({
    datetime: new Date(iso).toISOString(),
    temperature: typeof h.temperature_2m?.[i] === "number" ? h.temperature_2m[i] : null,
    templow: null,
    condition: weatherCodeToCondition(h.weather_code?.[i]),
    precipitation: typeof h.precipitation?.[i] === "number" ? h.precipitation[i] : null,
    wind_speed: typeof h.wind_speed_10m?.[i] === "number" ? h.wind_speed_10m[i] : null,
    wind_bearing: typeof h.wind_direction_10m?.[i] === "number" ? h.wind_direction_10m[i] : null,
  }));
}

function mapOpenMeteoToUnified(json: any): UnifiedWeather {
  const cur: Partial<OpenMeteoCurrent> = json.current || {};
  const daily: Partial<OpenMeteoDaily> = json.daily || {};

  const units: UnifiedWeather["units"] = {
    temperature: "°C",
    wind_speed: "km/h",
    pressure: "hPa",
    visibility: undefined,
    precipitation: "mm",
  };

  const days = Array.isArray(daily.time)
    ? daily.time.map((iso: string, i: number) => ({
        datetime: new Date(iso).toISOString(),
        temperature: typeof daily.temperature_2m_max?.[i] === "number" ? daily.temperature_2m_max[i] : null,
        templow: typeof daily.temperature_2m_min?.[i] === "number" ? daily.temperature_2m_min[i] : null,
        condition: weatherCodeToCondition(daily.weather_code?.[i]),
        precipitation: typeof daily.precipitation_sum?.[i] === "number" ? daily.precipitation_sum[i] : null,
        wind_speed: typeof daily.wind_speed_10m_max?.[i] === "number" ? daily.wind_speed_10m_max[i] : null,
        wind_bearing: typeof daily.wind_direction_10m_dominant?.[i] === "number" ? daily.wind_direction_10m_dominant[i] : null,
      }))
    : [];

  const hourly = mapOpenMeteoHourly(json);

  return {
    source: "sensors",
    entity_id: null,
    condition: weatherCodeToCondition(cur.weather_code),
    temperature: typeof cur.temperature_2m === "number" ? cur.temperature_2m : null,
    humidity: typeof cur.relative_humidity_2m === "number" ? cur.relative_humidity_2m : null,
    pressure: typeof cur.pressure_msl === "number" ? cur.pressure_msl : null,
    wind_speed: typeof cur.wind_speed_10m === "number" ? cur.wind_speed_10m : null,
    wind_bearing: typeof cur.wind_direction_10m === "number" ? cur.wind_direction_10m : null,
    visibility: null,
    precipitation: null,
    forecast: days,
    hourlyForecast: hourly,
    units: units,
  };
}

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
  hourlyForecast?: Array<{
    datetime: string;
    temperature?: number | null;
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
  const { client, entities, isConnected, weatherEntity, selectedCity } = useHAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<UnifiedWeather | null>(null);
  const [forecastMode, setForecastMode] = useState<"daily" | "hourly">("daily");
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

  const selectWeather = useCallback((
    entityList: HAEntity[],
    cfg: HAConfig | null,
    city?: string | null,
    forcedEntityId?: string | null
  ): UnifiedWeather | null => {
    // 0) Entité forcée par l'utilisateur
    if (forcedEntityId) {
      const forced = entityList.find(e => e.entity_id === forcedEntityId);
      if (forced && forced.entity_id.startsWith("weather.")) {
        console.log("✅ Utilisation de l'entité forcée:", forcedEntityId);
        return buildFromWeatherEntity(forced, cfg);
      }
    }

    // 1) weather.* si dispo
    const weathers = entityList.filter(e => e.entity_id.startsWith("weather."));
    
    console.log("🔎 Entités weather.* trouvées:", weathers.map(w => w.entity_id));
    
    if (weathers.length) {
      const home = weathers.find(w => ["weather.home", "weather.maison"].includes(w.entity_id));
      if (home) {
        console.log("✅ Utilisation de weather.home/maison:", home.entity_id);
        return buildFromWeatherEntity(home, cfg);
      }

      if (city && city.trim()) {
        const lc = city.toLowerCase();
        const byCity = weathers.find(w => (w.attributes.friendly_name || "").toLowerCase().includes(lc));
        if (byCity) {
          console.log("✅ Utilisation de l'entité correspondant à la ville:", byCity.entity_id);
          return buildFromWeatherEntity(byCity, cfg);
        }
      }
      
      console.log("✅ Utilisation de la première entité weather.*:", weathers[0].entity_id);
      return buildFromWeatherEntity(weathers[0], cfg);
    }

    // 2) Fallback capteurs génériques
    console.log("⚠️ Aucune entité weather.*, recherche dans les capteurs...");
    const built = buildFromSensors(entityList, cfg);
    if (built) {
      console.log("✅ Données météo construites depuis les capteurs");
      return built;
    }

    // 3) Rien trouvé
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
    // 1) Si une ville est sélectionnée → on utilise Open-Meteo
    if (selectedCity) {
      setIsLoading(true);
      setError(null);
      try {
        console.log("🌍 Récupération météo Open-Meteo pour:", selectedCity.label);
        const json = await fetchOpenMeteo(selectedCity.lat, selectedCity.lon);
        let unified = mapOpenMeteoToUnified(json);
        if (forecastMode === "hourly") {
          unified = { ...unified, forecast: mapOpenMeteoHourly(json) };
        }
        setWeatherData(unified);
        setError(null);
      } catch (e: any) {
        console.error("❌ Erreur Open-Meteo:", e);
        setError(e.message || "Erreur Open-Meteo");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2) Sinon fallback sur HA
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

      const unified = selectWeather(entities, configRef.current, null, weatherEntity);
      setWeatherData(unified);
      
      if (unified.source === "none") {
        setError("Aucune source météo détectée. Activez une intégration météo dans Home Assistant.");
      }
    } catch (e: any) {
      console.error("❌ Erreur refresh:", e);
      setError(e.message || "Erreur de récupération météo");
    } finally {
      setIsLoading(false);
    }
  }, [client, entities, isConnected, selectWeather, weatherEntity, selectedCity, forecastMode]);

  // Refresh when selectedCity changes (avec debounce pour éviter les sauts)
  useEffect(() => {
    if (!selectedCity) return;
    
    const timer = setTimeout(() => {
      console.log("🏙️ Ville sélectionnée changée, refresh...");
      refresh();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCity]); // Pas besoin de refresh dans les deps, on l'appelle directement

  // Initial load - wait for entities to be populated
  useEffect(() => {
    if (!client || !isConnected || !entities.length || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    console.log("🌤️ Initialisation météo...");
    refresh();
  }, [client, isConnected, entities.length, refresh]);

  // Extraire uniquement l'entité météo pertinente pour éviter les rafraîchissements inutiles
  const relevantWeatherEntity = useMemo(() => {
    if (!entities.length) return null;
    
    // Si une ville est sélectionnée, pas besoin de surveiller les entités HA
    if (selectedCity) return null;
    
    // Trouver l'entité météo utilisée (forcée ou première disponible)
    if (weatherEntity) {
      const forced = entities.find(e => e.entity_id === weatherEntity);
      if (forced) {
        return {
          entity_id: forced.entity_id,
          state: forced.state,
          temp: forced.attributes?.temperature,
          humidity: forced.attributes?.humidity,
          pressure: forced.attributes?.pressure,
          wind_speed: forced.attributes?.wind_speed,
          lastUpdated: forced.last_updated
        };
      }
    }
    
    const weatherEnt = entities.find(e => e.entity_id.startsWith("weather."));
    if (weatherEnt) {
      return {
        entity_id: weatherEnt.entity_id,
        state: weatherEnt.state,
        temp: weatherEnt.attributes?.temperature,
        humidity: weatherEnt.attributes?.humidity,
        pressure: weatherEnt.attributes?.pressure,
        wind_speed: weatherEnt.attributes?.wind_speed,
        lastUpdated: weatherEnt.last_updated
      };
    }
    
    return null;
  }, [entities, weatherEntity, selectedCity]);

  // Ne mettre à jour que quand l'entité météo change réellement
  useEffect(() => {
    if (!client || !isConnected || !entities.length || !hasInitializedRef.current) return;
    if (selectedCity) return; // Si Open-Meteo est utilisé, pas de mise à jour depuis HA
    
    const unified = selectWeather(entities, configRef.current, null, weatherEntity);
    setWeatherData(unified);
  }, [relevantWeatherEntity, client, isConnected, selectWeather, weatherEntity, selectedCity]);

  return { weatherData, isLoading, error, refresh, forecastMode, setForecastMode };
}
