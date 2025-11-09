/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LineString } from 'geojson';
import { API } from '../config/api';
import type { RouteStep } from '../types/types';

type Coordinates = [number, number];

interface RouteSummary {
  distance: number;
  duration: number;
  geometry: LineString;
  steps: RouteStep[];
  legs?: any[]; // optional if you plan to use it
}

const NOMINATIM_HEADERS = { 'User-Agent': 'RouteOptimizationApp/1.0' };

const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const useRouteOptimization = () => {
  const geocodeWithPhoton = async (addr: string): Promise<Coordinates | null> => {
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

  const geocodeWithNominatim = async (addr: string): Promise<Coordinates | null> => {
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

  const geocodeAddress = async (addr: string): Promise<Coordinates | null> =>
    (await geocodeWithPhoton(addr)) || (await geocodeWithNominatim(addr));


  
  const optimizeRouteWithTSP = async (coords: Coordinates[]): Promise<Coordinates[]> => {
    if (coords.length <= 2) return coords;

    try {
      const query = coords.map((c) => c.join(',')).join(';');
      const data = await fetchJson<{ durations?: number[][] }>(
        `https://router.project-osrm.org/table/v1/driving/${query}`,
      );
      const durations = data.durations;
      if (!durations) return coords;

      const visited = [0];
      const used = Array(durations.length).fill(false);
      used[0] = true;

      for (let i = 1; i < durations.length; i++) {
        const last = visited[visited.length - 1];
        let next = -1;
        let best = Number.POSITIVE_INFINITY;

        for (let j = 0; j < durations.length; j++) {
          if (!used[j] && durations[last][j] < best) {
            best = durations[last][j];
            next = j;
          }
        }

        if (next >= 0) {
          used[next] = true;
          visited.push(next);
        }
      }

      return visited.map((index) => coords[index]);
    } catch {
      return coords;
    }
  };

const getRouteData = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  try {
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('At least two coordinates are required.');

    const url = `${API.ORS_BASE}/v2/directions/driving-car/geojson?api_key=${API.ORS_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: coords,
        language: 'he',
        instructions: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ORS request failed:', response.status, errText);
      throw new Error(`ORS API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    const feature = data.features?.[0];
    if (!feature?.geometry?.coordinates) {
      console.error('Invalid GeoJSON response:', data);
      throw new Error('Invalid ORS response — no valid geometry.');
    }

    const geometryCoords = feature.geometry.coordinates as Coordinates[];
    const props = feature.properties;

    const steps: RouteStep[] =
      props?.segments?.flatMap((segment: any) =>
        (segment.steps ?? []).map((step: any) => ({
          instruction: step.instruction || 'No instruction',
          distance: step.distance || 0,
          duration: step.duration || 0,
          coordinates: geometryCoords[Math.min(step.way_points?.[0] ?? 0, geometryCoords.length - 1)],
        })),
      ) ?? [];

    return {
      distance: props?.summary?.distance ?? 0,
      duration: props?.summary?.duration ?? 0,
      geometry: feature.geometry,
      steps,
    };
  } catch (error: any) {
    console.error('getRouteData error:', error?.message || error);
    return null;
  }
};

  return { geocodeAddress, optimizeRouteWithTSP, getRouteData };
};
