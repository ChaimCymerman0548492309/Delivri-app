import { normalizeGeocodeQuery } from '../utils/geoUtils';
import { geocodeWithPhoton } from './geocoding';

type Coordinates = [number, number];

const CACHE_KEY = 'delivri_city_coords_v2';
const FAILED_KEY = 'delivri_city_coords_failed_v1';
const FAILED_TTL_MS = 24 * 60 * 60 * 1000;

const memoryCache = new Map<string, Coordinates>();
const failedMemory = new Set<string>();
const inFlight = new Map<string, Promise<Coordinates | null>>();

const cityKey = (city: string) => city.replace(/\s+/g, ' ').trim();

const loadStorageCache = (): Record<string, Coordinates> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, Coordinates>;
  } catch {
    return {};
  }
};

const loadFailedCache = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(FAILED_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
};

const saveToStorage = (city: string, coords: Coordinates) => {
  try {
    const key = cityKey(city);
    const all = loadStorageCache();
    all[key] = coords;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // ignore quota errors
  }
};

const markFailed = (city: string) => {
  const key = cityKey(city);
  failedMemory.add(key);
  try {
    const all = loadFailedCache();
    all[key] = Date.now();
    sessionStorage.setItem(FAILED_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

export const isGeocodeFailed = (city: string): boolean => {
  const key = cityKey(city);
  if (failedMemory.has(key)) return true;

  const stored = loadFailedCache()[key];
  if (!stored) return false;
  if (Date.now() - stored > FAILED_TTL_MS) return false;
  failedMemory.add(key);
  return true;
};

export const getCachedCityCoords = (city: string): Coordinates | null => {
  const key = cityKey(city);
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  const stored = loadStorageCache()[key];
  if (stored) {
    memoryCache.set(key, stored);
    return stored;
  }
  return null;
};

export const resolveCityCoords = async (city: string, bias?: Coordinates): Promise<Coordinates | null> => {
  const key = cityKey(city);
  const cached = getCachedCityCoords(city);
  if (cached) return cached;
  if (isGeocodeFailed(city)) return null;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const query = normalizeGeocodeQuery(key);
      const coords = await geocodeWithPhoton(query, bias);
      if (coords) {
        memoryCache.set(key, coords);
        saveToStorage(city, coords);
        return coords;
      }
      markFailed(city);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const enrichCityCoordsBatch = async (
  bias: Coordinates,
  citiesToGeocode: string[],
): Promise<number> => {
  const pending = citiesToGeocode.filter((c) => !getCachedCityCoords(c) && !isGeocodeFailed(c));
  let enriched = 0;

  for (const city of pending) {
    const coords = await resolveCityCoords(city, bias);
    if (coords) enriched++;
    await sleep(350);
  }
  return enriched;
};
