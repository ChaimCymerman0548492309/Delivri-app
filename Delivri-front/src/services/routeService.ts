/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LineString } from 'geojson';
import { API } from '../config/api';
import type { RouteStep } from '../types/types';

type Coordinates = [number, number];

export interface RouteSummary {
  distance: number;
  duration: number;
  geometry: LineString;
  steps: RouteStep[];
}

const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
};

export const optimizeRouteWithTSP = async (coords: Coordinates[]): Promise<Coordinates[]> => {
  if (coords.length <= 2) return coords;

  try {
    const data = await fetchJson<{ durations?: number[][] }>(API.OSRM_TABLE(coords));
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

export const getRouteData = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  try {
    if (!Array.isArray(coords) || coords.length < 2) {
      throw new Error('At least two coordinates are required.');
    }

    const url = API.ORS_ROUTE_GEOJSON();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: coords, language: 'he', instructions: true }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ORS API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature?.geometry?.coordinates) {
      throw new Error('Invalid ORS response — no valid geometry.');
    }

    const geometryCoords = feature.geometry.coordinates as Coordinates[];
    const props = feature.properties;

    const steps: RouteStep[] =
      props?.segments?.flatMap((segment: any) =>
        (segment.steps ?? []).map((step: any) => ({
          instruction: step.instruction || 'המשך ישר',
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
