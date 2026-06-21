/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LineString } from 'geojson';
import { API } from '../config/api';
import type { RouteStep } from '../types/types';
import {
  estimateTourSeconds,
  optimizeTourOrder,
  reorderCoords,
  sanitizeMatrix,
} from './tspOptimizer';

type Coordinates = [number, number];

export interface RouteSummary {
  distance: number;
  duration: number;
  geometry: LineString;
  steps: RouteStep[];
}

export interface OptimizeResult {
  coords: Coordinates[];
  order: number[];
  estimatedSeconds: number;
}

interface OsrmTableResponse {
  code?: string;
  durations?: (number | null)[][];
  destinations?: Array<{ location?: Coordinates; name?: string }>;
  message?: string;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: any[];
  message?: string;
}

const fetchJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) throw new Error(`שגיאת רשת (${response.status})`);
  return response.json() as Promise<T>;
};

const snapCoordsFromTable = (coords: Coordinates[], table: OsrmTableResponse): Coordinates[] => {
  if (!table.destinations?.length) return coords;
  return table.destinations.map((dest, i) => {
    const loc = dest.location;
    return loc && loc.length === 2 ? ([loc[0], loc[1]] as Coordinates) : coords[i];
  });
};

/** אופטימיזציית סדר תחנות — מטריצת זמנים מלאה + NN + 2-opt */
export const optimizeRouteWithTSP = async (coords: Coordinates[]): Promise<Coordinates[]> => {
  const result = await optimizeRouteWithDetails(coords);
  return result.coords;
};

export const optimizeRouteWithDetails = async (coords: Coordinates[]): Promise<OptimizeResult> => {
  if (coords.length <= 1) {
    return { coords, order: [0], estimatedSeconds: 0 };
  }
  if (coords.length === 2) {
    return { coords, order: [0, 1], estimatedSeconds: 0 };
  }

  try {
    const table = await fetchJson<OsrmTableResponse>(API.OSRM_TABLE(coords));

    if (table.code !== 'Ok' || !table.durations?.length) {
      console.warn('OSRM table failed:', table.code, table.message);
      return { coords, order: coords.map((_, i) => i), estimatedSeconds: 0 };
    }

    const snapped = snapCoordsFromTable(coords, table);
    const matrix = sanitizeMatrix(table.durations);
    const order = optimizeTourOrder(matrix, 0);

    if (order.length < coords.length) {
      console.warn('TSP incomplete tour, using original order');
      return { coords: snapped, order: snapped.map((_, i) => i), estimatedSeconds: 0 };
    }

    return {
      coords: reorderCoords(snapped, order),
      order,
      estimatedSeconds: estimateTourSeconds(order, matrix),
    };
  } catch (err) {
    console.warn('optimizeRouteWithTSP error:', err);
    return { coords, order: coords.map((_, i) => i), estimatedSeconds: 0 };
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

const parseOsrmRoute = (route: any, fallbackCoord: Coordinates): RouteSummary => {
  const steps: RouteStep[] =
    route.legs?.flatMap((leg: any) =>
      (leg.steps ?? []).map((step: any) => ({
        instruction: buildOsrmInstruction(step),
        distance: step.distance ?? 0,
        duration: step.duration ?? 0,
        coordinates: (step.maneuver?.location ?? fallbackCoord) as Coordinates,
      })),
    ) ?? [];

  return {
    distance: route.distance ?? 0,
    duration: route.duration ?? 0,
    geometry: route.geometry,
    steps,
  };
};

const mergeLineStrings = (parts: LineString[]): LineString => {
  const coordinates: Coordinates[] = [];

  for (const part of parts) {
    const segment = part.coordinates as Coordinates[];
    if (!segment.length) continue;

    if (!coordinates.length) {
      coordinates.push(...segment);
      continue;
    }

    const last = coordinates[coordinates.length - 1];
    const first = segment[0];
    const isDuplicate =
      Math.abs(last[0] - first[0]) < 0.00001 && Math.abs(last[1] - first[1]) < 0.00001;

    coordinates.push(...segment.slice(isDuplicate ? 1 : 0));
  }

  return { type: 'LineString', coordinates };
};

const getRouteDataFromOSRM = async (coords: Coordinates[]): Promise<RouteSummary> => {
  const data = await fetchJson<OsrmRouteResponse>(API.OSRM_ROUTE(coords));

  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) {
    throw new Error(data.message || `OSRM לא הצליח לחשב מסלול (${data.code ?? 'unknown'})`);
  }

  return parseOsrmRoute(data.routes[0], coords[0]);
};

/** גיבוי: מסלול רגל-רגל ואיחוד geometry */
const getRouteDataLegByLeg = async (coords: Coordinates[]): Promise<RouteSummary> => {
  const geometries: LineString[] = [];
  const allSteps: RouteStep[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const leg = await getRouteDataFromOSRM([coords[i], coords[i + 1]]);
    totalDistance += leg.distance;
    totalDuration += leg.duration;
    allSteps.push(...leg.steps);
    geometries.push(leg.geometry);
  }

  if (!geometries.length) {
    throw new Error('לא ניתן לחשב אף קטע במסלול');
  }

  return {
    distance: totalDistance,
    duration: totalDuration,
    geometry: mergeLineStrings(geometries),
    steps: allSteps,
  };
};

const getRouteDataFromORS = async (coords: Coordinates[]): Promise<RouteSummary | null> => {
  if (!API.ORS_API_KEY) return null;

  const response = await fetch(API.ORS_ROUTE_GEOJSON(), {
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

export const getRouteData = async (coords: Coordinates[]): Promise<RouteSummary> => {
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error('נדרשות לפחות שתי נקודות למסלול');
  }

  try {
    const orsRoute = await getRouteDataFromORS(coords);
    if (orsRoute) return orsRoute;
  } catch {
    // fallback to OSRM
  }

  try {
    return await getRouteDataFromOSRM(coords);
  } catch (fullRouteErr) {
    console.warn('Full OSRM route failed, trying leg-by-leg:', fullRouteErr);
    try {
      return await getRouteDataLegByLeg(coords);
    } catch (legErr) {
      const msg = legErr instanceof Error ? legErr.message : 'שגיאה בחישוב מסלול';
      throw new Error(msg);
    }
  }
};
