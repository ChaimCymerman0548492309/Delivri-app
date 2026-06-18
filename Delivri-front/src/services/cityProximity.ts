import { API } from '../config/api';
import { getCityCenter } from '../data/israeliCityCenters';
import { citiesMatch, haversineKm } from '../utils/geoUtils';

type Coordinates = [number, number];

const NEARBY_RADIUS_KM = 40;
const NEARBY_GROUP_LIMIT = 20;

let cachedUserCity: string | null = null;
let cachedUserCityCoords: Coordinates | null = null;

export const reverseGeocodeCity = async (location: Coordinates): Promise<string | null> => {
  try {
    const [lon, lat] = location;
    const url = `${API.NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=he&zoom=10`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DelivriApp/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.municipality ||
      data.address?.county ||
      null
    );
  } catch {
    return null;
  }
};

interface SortedCityResult {
  sortedCities: string[];
  nearbyCities: Set<string>;
  userCity: string | null;
}

export const sortCitiesByProximity = async (
  cities: string[],
  userLocation: Coordinates | null,
): Promise<SortedCityResult> => {
  if (!userLocation) {
    const alpha = [...cities].sort((a, b) => a.localeCompare(b, 'he'));
    return { sortedCities: alpha, nearbyCities: new Set(), userCity: null };
  }

  if (!cachedUserCity) {
    cachedUserCity = await reverseGeocodeCity(userLocation);
  }
  cachedUserCityCoords = userLocation;

  const ranked = cities.map((city) => {
    const center = getCityCenter(city);
    const distance = center ? haversineKm(userLocation, center) : Number.POSITIVE_INFINITY;
    const isUserCity = cachedUserCity ? citiesMatch(city, cachedUserCity) : false;
    return { city, distance, isUserCity };
  });

  ranked.sort((a, b) => {
    if (a.isUserCity && !b.isUserCity) return -1;
    if (!a.isUserCity && b.isUserCity) return 1;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.city.localeCompare(b.city, 'he');
  });

  const nearbyCities = new Set(
    ranked
      .filter((r) => r.distance <= NEARBY_RADIUS_KM || r.isUserCity)
      .slice(0, NEARBY_GROUP_LIMIT)
      .map((r) => r.city),
  );

  return {
    sortedCities: ranked.map((r) => r.city),
    nearbyCities,
    userCity: cachedUserCity,
  };
};

export const resetCityProximityCache = () => {
  cachedUserCity = null;
  cachedUserCityCoords = null;
};

export const getCityGroupLabel = (city: string, nearbyCities: Set<string>): string => {
  if (nearbyCities.has(city)) return 'קרוב אליך';
  return 'כל הערים';
};

/** בדיקה אם מיקום המשתמש השתנה משמעותית */
export const shouldRefreshCitySort = (newLocation: Coordinates | null): boolean => {
  if (!newLocation) return false;
  if (!cachedUserCityCoords) return true;
  if (haversineKm(cachedUserCityCoords, newLocation) > 5) {
    cachedUserCity = null;
    cachedUserCityCoords = null;
    return true;
  }
  return false;
};
