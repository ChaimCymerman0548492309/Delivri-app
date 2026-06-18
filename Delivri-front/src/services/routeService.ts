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

const buildOsrmInstruction = (step: any): string => {
  const name = step.name?.trim();
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;

  if (type === 'arrive') return 'הגעת ליעד';
  if (type === 'depart') return name ? `צא לכיוון ${name}` : 'התחל נסיעה';
  if (modifier === 'right') return name ? `פנה ימינה ל-${name}` : 'פנה ימינה';
  if (modifier === 'left') return name ? `פנה שמאלה ל-${name}` : 'פנה שמאלה';
  if (modifier === 'straight') return name ? `המשך ישר ב-${name}` : 'המשך ישר';
  return name ? `המשך ב-${name}` : 'המשך בנסיעה';
};

const getRouteDataFromOSRM = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  const data = await fetchJson<{ routes?: any[]; code?: string }>(API.OSRM_ROUTE(coords));
  const route = data.routes?.[0];
  if (!route?.geometry) return null;

  const steps: RouteStep[] =
    route.legs?.flatMap((leg: any) =>
      (leg.steps ?? []).map((step: any) => ({
        instruction: buildOsrmInstruction(step),
        distance: step.distance ?? 0,
        duration: step.duration ?? 0,
        coordinates: step.maneuver?.location ?? coords[0],
      })),
    ) ?? [];

  return {
    distance: route.distance ?? 0,
    duration: route.duration ?? 0,
    geometry: route.geometry,
    steps,
  };
};

const getRouteDataFromORS = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  if (!API.ORS_API_KEY) return null;

  const url = API.ORS_ROUTE_GEOJSON();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: coords, language: 'he', instructions: true }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature?.geometry?.coordinates) return null;

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
};

export const getRouteData = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  try {
    const orsRoute = await getRouteDataFromORS(coords);
    if (orsRoute) return orsRoute;
  } catch {
    // fall through to OSRM
  }

  try {
    return await getRouteDataFromOSRM(coords);
  } catch (error: any) {
    console.error('getRouteData error:', error?.message || error);
    return null;
  }
};
