import { API } from '../config/api';
import { normalizeGeocodeQuery } from '../utils/geoUtils';
import { isNominatimBlocked, markNominatimRateLimited, waitForNominatimSlot } from './geocodeRateLimit';

type Coordinates = [number, number];

const NOMINATIM_HEADERS = { 'User-Agent': 'DelivriApp/1.0' };

export const geocodeWithPhoton = async (addr: string, bias?: Coordinates): Promise<Coordinates | null> => {
  const query = normalizeGeocodeQuery(addr);
  try {
    const url = bias ? API.PHOTON_GEOCODE(query, bias) : API.PHOTON_GEOCODE(query);
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      features?: Array<{ geometry?: { coordinates?: Coordinates } }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    return coords ? [coords[0], coords[1]] : null;
  } catch {
    return null;
  }
};

export const geocodeWithNominatim = async (addr: string): Promise<Coordinates | null> => {
  if (isNominatimBlocked()) return null;

  const allowed = await waitForNominatimSlot();
  if (!allowed) return null;

  const query = normalizeGeocodeQuery(addr);
  try {
    const response = await fetch(API.NOMINATIM_GEOCODE(query), { headers: NOMINATIM_HEADERS });
    if (response.status === 429) {
      markNominatimRateLimited();
      return null;
    }
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{ lon: string; lat: string }>;
    const location = data[0];
    return location ? [parseFloat(location.lon), parseFloat(location.lat)] : null;
  } catch {
    return null;
  }
};

/** geocode לכתובת — Photon בלבד כברירת מחדל; Nominatim רק כ-fallback נדיר */
export const geocodeAddress = async (addr: string): Promise<Coordinates | null> => {
  const query = normalizeGeocodeQuery(addr);
  const photon = await geocodeWithPhoton(query);
  if (photon) return photon;

  if (isNominatimBlocked()) return null;
  return geocodeWithNominatim(query);
};
