import { API } from '../config/api';

type Coordinates = [number, number];

const NOMINATIM_HEADERS = { 'User-Agent': 'DelivriApp/1.0' };

const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const geocodeWithPhoton = async (addr: string): Promise<Coordinates | null> => {
  try {
    const data = await fetchJson<{ features?: Array<{ geometry?: { coordinates?: Coordinates } }> }>(
      API.PHOTON_GEOCODE(addr),
    );
    const coords = data.features?.[0]?.geometry?.coordinates;
    return coords ? [coords[0], coords[1]] : null;
  } catch {
    return null;
  }
};

export const geocodeWithNominatim = async (addr: string): Promise<Coordinates | null> => {
  try {
    const data = await fetchJson<Array<{ lon: string; lat: string }>>(API.NOMINATIM_GEOCODE(addr), {
      headers: NOMINATIM_HEADERS,
    });
    const location = data[0];
    return location ? [parseFloat(location.lon), parseFloat(location.lat)] : null;
  } catch {
    return null;
  }
};

export const geocodeAddress = async (addr: string): Promise<Coordinates | null> => {
  let result = (await geocodeWithPhoton(addr)) || (await geocodeWithNominatim(addr));

  if (!result) {
    await sleep(700);
    result = (await geocodeWithNominatim(addr)) || (await geocodeWithPhoton(addr));
  }

  return result;
};
