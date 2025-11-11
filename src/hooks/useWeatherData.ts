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

const isValid = (v: any) =>
  !(v === undefined || v === null || v === "" || String(v).toLowerCase() === "unknown" || String(v).toLowerCase() === "unavailable");

const mpsToKmh = (v: number | null) => (v == null ? null : v * 3.6);

const scoreSensor = (e: HAEntity, keywords: string[]) => {
  const id = e.entity_id.toLowerCase();
  const name = (e.attributes.friendly_name || "").toLowerCase();
  let s = 0;
  for (const k of keywords) {
    if (id.includes(k)) s += 2;
    if (name.includes(k)) s += 1;
  }
  if (e.last_changed) s += 0.1;
  return s;
};

const pickBest = (entities: HAEntity[], keywords: string[], unitHint?: string) => {
  let best: HAEntity | null = null;
  let bestScore = -1;
  for (const e of entities) {
    const s = scoreSensor(e, keywords) + (e.attributes.unit_of_measurement === unitHint ? 0.5 : 0);
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return best;
};

export function useWeatherData() {
  const { client, entities } = useHAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<UnifiedWeather | null>(null);
  const configRef = useRef<HAConfig | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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

    const temp = pickBest(sensors, ["temperature", "temp"], "°C");
    const cond = pickBest(sensors, ["condition", "summary", "symbol", "weather"]);
    const hum  = pickBest(sensors, ["humidity"]);
    const pres = pickBest(sensors, ["pressure", "barometer"]);
    const wspd = pickBest(sensors, ["wind_speed", "wind", "gust"]);
    const wdir = pickBest(sensors, ["wind_bearing", "wind_direction", "bearing"]);
    const rain = pickBest(sensors, ["precipitation", "rain", "precip"]);

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
    let chosen: HAEntity | null = null;

    if (weathers.length) {
      const byHome = weathers.find(w => w.entity_id === "weather.home" || w.entity_id === "weather.maison");
      chosen = byHome || weathers[0];
      return buildFromWeatherEntity(chosen, cfg);
    }

    const built = buildFromSensors(entityList, cfg);
    if (built) return built;

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
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch config with error handling
      try {
        const cfg = await client.getConfig();
        configRef.current = cfg;
      } catch (e) {
        console.warn("Config fetch failed, using defaults:", e);
        configRef.current = null;
      }

      const unified = selectWeather(entities, configRef.current);
      setWeatherData(unified);
      setIsLoading(false);
    } catch (e: any) {
      setError(e.message || "Erreur de récupération météo");
      setIsLoading(false);
    }
  }, [client, entities, selectWeather]);

  // Boot + backoff
  const bootWithRetry = useCallback(async () => {
    if (retryRef.current) clearTimeout(retryRef.current);
    try {
      await refresh();
    } catch {
      // handled by refresh
    }
    if (!weatherData || weatherData.source === "none") {
      retryRef.current = setTimeout(bootWithRetry, 2000);
    }
  }, [refresh, weatherData]);

  useEffect(() => {
    bootWithRetry();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  // WS subscription
  useEffect(() => {
    if (!client) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsub = client.subscribeStateChanges((data: any) => {
      if (!data || data.event_type !== "state_changed") return;
      const e = data.new_state as HAEntity | undefined;
      if (!e) return;

      if (weatherData?.source === "weather" && weatherData.entity_id === e.entity_id) {
        refresh();
      } else if (weatherData?.source === "sensors" && e.entity_id.startsWith("sensor.")) {
        refresh();
      }
    });

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [client, weatherData, refresh]);

  return { weatherData, isLoading, error, refresh };
}
