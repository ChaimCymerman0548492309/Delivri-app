import { API } from '../config/api';
import { getCityCenter } from '../data/israeliCityCenters';
import {
  findBestCityMatch,
  haversineKm,
  locationStableKey,
  normalizeCityName,
} from '../utils/geoUtils';
import { enrichCityCoordsBatch, getCachedCityCoords } from './cityCoordsCache';

type Coordinates = [number, number];

const NEARBY_RADIUS_KM = 45;
const NEARBY_GROUP_LIMIT = 25;
const MAX_GEOCODE_PER_SORT = 8;

let cachedUserCity: string | null = null;
let cachedUserCityRaw: string | null = null;
let cachedUserCityCoords: Coordinates | null = null;
let lastSortLocationKey: string | null = null;

interface ReverseResult {
  raw: string | null;
  matched: string | null;
}

export const reverseGeocodeCity = async (
  location: Coordinates,
  cityList: string[] = [],
): Promise<ReverseResult> => {
  const [lon, lat] = location;
  let raw: string | null = null;

  try {
    const res = await fetch(API.PHOTON_REVERSE(lon, lat));
    if (res.ok) {
      const data = await res.json();
      const props = data.features?.[0]?.properties;
      raw =
        props?.city ||
        props?.locality ||
        props?.county ||
        (props?.type === 'city' || props?.type === 'town' ? props?.name : null) ||
        props?.name ||
        null;
    }
  } catch {
    // fallback
  }

  if (!raw) {
    return { raw: null, matched: null };
  }

  const matched = cityList.length ? findBestCityMatch(cityList, raw) : raw;
  return { raw, matched };
};

interface SortedCityResult {
  sortedCities: string[];
  nearbyCities: Set<string>;
  userCity: string | null;
  userCityRaw: string | null;
}

const getCityCoordsSync = (city: string): Coordinates | null =>
  getCityCenter(city) || getCachedCityCoords(city);

const pickGeocodeCandidates = (cities: string[], userCity: string | null): string[] => {
  if (!userCity) return [];

  const normUser = normalizeCityName(userCity);
  const prefix = normUser.split(' ')[0];

  const candidates = cities.filter((city) => {
    if (getCityCoordsSync(city)) return false;
    const norm = normalizeCityName(city);
    return norm.startsWith(prefix) || norm.includes(normUser) || normUser.includes(norm);
  });

  return candidates.slice(0, MAX_GEOCODE_PER_SORT);
};

const buildSortedResult = (cities: string[], userLocation: Coordinates): SortedCityResult => {
  const ranked = cities.map((city) => {
    const center = getCityCoordsSync(city);
    const distance = center ? haversineKm(userLocation, center) : Number.POSITIVE_INFINITY;
    const isUserCity = cachedUserCity === city;
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
      .filter((r) => r.isUserCity || r.distance <= NEARBY_RADIUS_KM)
      .slice(0, NEARBY_GROUP_LIMIT)
      .map((r) => r.city),
  );

  if (cachedUserCity) nearbyCities.add(cachedUserCity);

  return {
    sortedCities: ranked.map((r) => r.city),
    nearbyCities,
    userCity: cachedUserCity,
    userCityRaw: cachedUserCityRaw,
  };
};

export const sortCitiesByProximity = async (
  cities: string[],
  userLocation: Coordinates | null,
): Promise<SortedCityResult> => {
  if (!userLocation) {
    const alpha = [...cities].sort((a, b) => a.localeCompare(b, 'he'));
    return { sortedCities: alpha, nearbyCities: new Set(), userCity: null, userCityRaw: null };
  }

  const locationKey = locationStableKey(userLocation);
  const moved = shouldRefreshCitySort(userLocation);
  const needsEnrichment = moved || lastSortLocationKey !== locationKey;

  if (moved || !cachedUserCity) {
    const { raw, matched } = await reverseGeocodeCity(userLocation, cities);
    cachedUserCityRaw = raw;
    cachedUserCity = matched;
    cachedUserCityCoords = userLocation;
  }

  if (needsEnrichment) {
    const toGeocode = [
      ...(cachedUserCity && !getCityCoordsSync(cachedUserCity) ? [cachedUserCity] : []),
      ...pickGeocodeCandidates(cities, cachedUserCity),
    ].filter((city, index, arr) => arr.indexOf(city) === index);

    if (toGeocode.length > 0) {
      await enrichCityCoordsBatch(userLocation, toGeocode);
    }
    lastSortLocationKey = locationKey;
  }

  return buildSortedResult(cities, userLocation);
};

export const resetCityProximityCache = () => {
  cachedUserCity = null;
  cachedUserCityRaw = null;
  cachedUserCityCoords = null;
  lastSortLocationKey = null;
};

export const getCityGroupLabel = (city: string, nearbyCities: Set<string>): string => {
  if (nearbyCities.has(city)) return 'קרוב אליך';
  return 'כל הערים';
};

export const shouldRefreshCitySort = (newLocation: Coordinates | null): boolean => {
  if (!newLocation) return false;
  if (!cachedUserCityCoords) return true;
  if (haversineKm(cachedUserCityCoords, newLocation) > 3) {
    cachedUserCity = null;
    cachedUserCityRaw = null;
    cachedUserCityCoords = null;
    lastSortLocationKey = null;
    return true;
  }
  return false;
};

export const continueCityCoordsEnrichment = (
  _cities: string[],
  _userLocation: Coordinates,
  _onUpdate: (result: SortedCityResult) => void,
) => {
  // מושבת — geocode ברקע גרם לעומס על שירותי geocoding
};
