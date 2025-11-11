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

const isValid = (value: any): boolean => {
  if (value === undefined || value === null || value === '') return false;
  const str = String(value).toLowerCase();
  return str !== 'unknown' && str !== 'unavailable' && str !== 'none';
};

const scoreMatch = (text: string, keywords: string[]): number => {
  const lower = text.toLowerCase();
  return keywords.reduce((score, kw) => {
    if (lower.includes(kw.toLowerCase())) return score + 1;
    return score;
  }, 0);
};

const findBestSensor = (entities: HAEntity[], keywords: string[]): HAEntity | null => {
  const candidates = entities
    .filter(e => e.entity_id.startsWith('sensor.'))
    .map(e => ({
      entity: e,
      score: scoreMatch(e.entity_id, keywords) + scoreMatch(e.attributes?.friendly_name || '', keywords)
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates.length > 0 ? candidates[0].entity : null;
};

export const useWeatherData = () => {
  const client = useHAStore((state) => state.client);
  const isConnected = useHAStore((state) => state.isConnected);
  const entities = useHAStore((state) => state.entities);
  
  const [weatherData, setWeatherData] = useState<UnifiedWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConfig = async (): Promise<HAConfig | null> => {
    const connection = useHAStore.getState().connection;
    if (!connection) return null;
    
    try {
      const response = await fetch(`${connection.url}/api/config`, {
        headers: {
          Authorization: `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const config = await response.json();
      return config as HAConfig;
    } catch (err) {
      console.warn("Failed to fetch HA config:", err);
      return null;
    }
  };

  const convertUnits = (value: number | null, fromUnit: string, config: HAConfig | null): number | null => {
    if (value === null || !config) return value;
    
    // Temperature conversion
    if (fromUnit === '°C' && config.unit_system.temperature === 'F') {
      return (value * 9/5) + 32;
    }
    
    // Wind speed m/s to km/h
    if (fromUnit === 'm/s' && config.unit_system.length === 'km') {
      return value * 3.6;
    }
    
    return value;
  };

  const discoverWeatherSource = useCallback(async (): Promise<UnifiedWeather> => {
    const allStates = entities;

    // Skip config fetch if it fails (CORS issue with Nabu Casa)
    let config: HAConfig | null = null;
    try {
      config = await fetchConfig();
    } catch (err) {
      // Continue without config, use defaults
      console.warn("Config fetch failed, using defaults");
    }

    // 1. Try to find weather.* entity
    const weatherEntities = allStates.filter(e => e.entity_id.startsWith('weather.'));
    
    if (weatherEntities.length > 0) {
      // Prioritize weather.home or weather.maison
      let chosen = weatherEntities.find(e => 
        e.entity_id === 'weather.home' || e.entity_id === 'weather.maison'
      ) || weatherEntities[0];

      const attrs = chosen.attributes;
      const forecast = attrs?.forecast || [];

      return {
        source: 'weather',
        entity_id: chosen.entity_id,
        condition: isValid(chosen.state) ? String(chosen.state) : null,
        temperature: isValid(attrs?.temperature) ? parseFloat(attrs.temperature) : null,
        humidity: isValid(attrs?.humidity) ? parseFloat(attrs.humidity) : null,
        pressure: isValid(attrs?.pressure) ? parseFloat(attrs.pressure) : null,
        wind_speed: isValid(attrs?.wind_speed) ? parseFloat(attrs.wind_speed) : null,
        wind_bearing: isValid(attrs?.wind_bearing) ? parseFloat(attrs.wind_bearing) : null,
        visibility: isValid(attrs?.visibility) ? parseFloat(attrs.visibility) : null,
        precipitation: null,
        forecast: forecast.map((f: any) => ({
          datetime: f.datetime,
          temperature: isValid(f.temperature) ? parseFloat(f.temperature) : null,
          templow: isValid(f.templow) ? parseFloat(f.templow) : null,
          condition: isValid(f.condition) ? String(f.condition) : null,
          precipitation: isValid(f.precipitation) ? parseFloat(f.precipitation) : null,
          wind_speed: isValid(f.wind_speed) ? parseFloat(f.wind_speed) : null,
          wind_bearing: isValid(f.wind_bearing) ? parseFloat(f.wind_bearing) : null,
        })),
        units: {
          temperature: config?.unit_system?.temperature === 'F' ? '°F' : '°C',
          wind_speed: 'km/h',
          pressure: 'hPa',
          visibility: config?.unit_system?.length === 'mi' ? 'mi' : 'km',
          precipitation: 'mm',
        },
      };
    }

    // 2. Fallback to sensor aggregation
    const tempSensor = findBestSensor(allStates, ['temperature', 'temp']);
    const condSensor = findBestSensor(allStates, ['condition', 'summary', 'symbol', 'weather']);
    const humSensor = findBestSensor(allStates, ['humidity']);
    const pressSensor = findBestSensor(allStates, ['pressure', 'barometer', 'barometric']);
    const windSpeedSensor = findBestSensor(allStates, ['wind_speed', 'wind', 'gust']);
    const windBearingSensor = findBestSensor(allStates, ['wind_bearing', 'wind_direction', 'bearing']);
    const precipSensor = findBestSensor(allStates, ['precipitation', 'rain', 'precip']);

    if (!tempSensor && !condSensor) {
      return {
        source: 'none',
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
        units: {
          temperature: '°C',
          wind_speed: 'km/h',
          pressure: 'hPa',
        },
      };
    }

    // Try to find forecast attribute from any sensor
    let forecast: any[] = [];
    const forecastSensor = allStates.find(e => e.attributes?.forecast);
    if (forecastSensor) {
      forecast = forecastSensor.attributes.forecast || [];
    }

    return {
      source: 'sensors',
      entity_id: null,
      condition: condSensor && isValid(condSensor.state) ? String(condSensor.state) : null,
      temperature: tempSensor && isValid(tempSensor.state) ? parseFloat(tempSensor.state) : null,
      humidity: humSensor && isValid(humSensor.state) ? parseFloat(humSensor.state) : null,
      pressure: pressSensor && isValid(pressSensor.state) ? parseFloat(pressSensor.state) : null,
      wind_speed: windSpeedSensor && isValid(windSpeedSensor.state) ? parseFloat(windSpeedSensor.state) : null,
      wind_bearing: windBearingSensor && isValid(windBearingSensor.state) ? parseFloat(windBearingSensor.state) : null,
      visibility: null,
      precipitation: precipSensor && isValid(precipSensor.state) ? parseFloat(precipSensor.state) : null,
      forecast: forecast.map((f: any) => ({
        datetime: f.datetime,
        temperature: isValid(f.temperature) ? parseFloat(f.temperature) : null,
        templow: isValid(f.templow) ? parseFloat(f.templow) : null,
        condition: isValid(f.condition) ? String(f.condition) : null,
        precipitation: isValid(f.precipitation) ? parseFloat(f.precipitation) : null,
        wind_speed: isValid(f.wind_speed) ? parseFloat(f.wind_speed) : null,
        wind_bearing: isValid(f.wind_bearing) ? parseFloat(f.wind_bearing) : null,
      })),
      units: {
        temperature: config?.unit_system?.temperature === 'F' ? '°F' : '°C',
        wind_speed: 'km/h',
        pressure: 'hPa',
        precipitation: 'mm',
      },
    };
  }, [entities]);

  const refresh = useCallback(async () => {
    if (!client || !isConnected) {
      setIsLoading(false);
      setError("Non connecté");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await discoverWeatherSource();
      setWeatherData(data);
      setRetryCount(0);
    } catch (err: any) {
      console.error("Weather discovery error:", err);
      setError(err.message || "Erreur de découverte");
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, discoverWeatherSource]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!client || !isConnected || entities.length === 0) {
      setIsLoading(false);
      return;
    }

    // Debounce pour éviter les appels multiples
    const timer = setTimeout(() => {
      refresh();
    }, 100);

    // Subscribe to state changes only once
    if (!unsubscribeRef.current) {
      unsubscribeRef.current = client.subscribeStateChanges((data: any) => {
        // Refresh if weather/sensor/input entities change
        if (
          data.entity_id?.startsWith('weather.') || 
          data.entity_id?.startsWith('sensor.') ||
          data.entity_id?.startsWith('input_text.ville_meteo') ||
          data.entity_id?.startsWith('input_number.weather_')
        ) {
          // Debounce WebSocket updates
          setTimeout(() => refresh(), 500);
        }
      });
    }

    return () => {
      clearTimeout(timer);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [client, isConnected, entities.length, refresh]);

  return {
    weatherData,
    isLoading,
    error,
    refresh,
  };
};
