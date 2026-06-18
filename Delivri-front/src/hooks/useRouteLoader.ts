/* eslint-disable @typescript-eslint/no-explicit-any */
import * as maplibregl from 'maplibre-gl';
import { useCallback, useState } from 'react';
import type { DeliveryStop, NavigationStep } from '../types/types';
import { getRouteData, optimizeRouteWithTSP } from '../services/routeService';

interface UseRouteLoaderOptions {
  mapRef: React.RefObject<maplibregl.Map | null>;
  ready: boolean;
  currentLocation: [number, number] | null;
  deliveryStops: DeliveryStop[];
  trackApiCall: <T>(fn: () => Promise<T>, label: string) => Promise<T>;
}

export const useRouteLoader = ({
  mapRef,
  ready,
  currentLocation,
  deliveryStops,
  trackApiCall,
}: UseRouteLoaderOptions) => {
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const drawRouteOnMap = useCallback(
    (routeData: { geometry: GeoJSON.LineString }, optimizedCoords: [number, number][]) => {
      const map = mapRef.current;
      if (!map) return;

      const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        geometry: routeData.geometry,
        properties: {},
      };

      const routeSourceId = 'route';
      const existing = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(routeFeature);
      } else {
        map.addSource(routeSourceId, { type: 'geojson', data: routeFeature });
        map.addLayer({
          id: 'route-layer',
          type: 'line',
          source: routeSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#0d9488', 'line-width': 5, 'line-opacity': 0.85 },
        });
      }

      const bounds = optimizedCoords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(optimizedCoords[0], optimizedCoords[0]),
      );
      map.fitBounds(bounds, { padding: 100, duration: 1000 });
    },
    [mapRef],
  );

  const loadRoute = useCallback(
    async (retryCount = 0): Promise<boolean> => {
      if (!ready || !mapRef.current || !currentLocation) {
        setRouteError('מפה או מיקום לא זמינים');
        return false;
      }

      setRouteLoading(true);

      try {
        const coords: [number, number][] = [currentLocation, ...deliveryStops.map((s) => s.coordinates)];
        if (coords.length < 2) {
          setRouteError('נדרשות לפחות שתי נקודות למסלול');
          return false;
        }

        const optimizedCoords = await trackApiCall(() => optimizeRouteWithTSP(coords), 'אופטימיזציית מסלול');
        const routeData = await trackApiCall(() => getRouteData(optimizedCoords), 'טעינת נתיב');

        if (!routeData) throw new Error('לא התקבלו נתוני מסלול');

        setTotalDistance(routeData.distance);
        setTotalDuration(routeData.duration);
        setRouteError(null);

        const steps: NavigationStep[] =
          routeData.steps?.map((s) => ({
            instruction: s.instruction || 'המשך ישר',
            distance: s.distance || 0,
            duration: s.duration || 0,
            type: 'continue',
          })) ?? [];

        setNavigationSteps(steps);
        drawRouteOnMap(routeData, optimizedCoords);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה בטעינת המסלול';
        setRouteError(message);

        if (retryCount < 2) {
          setTimeout(() => loadRoute(retryCount + 1), 2000);
        }
        return false;
      } finally {
        setRouteLoading(false);
      }
    },
    [ready, mapRef, currentLocation, deliveryStops, trackApiCall, drawRouteOnMap],
  );

  return {
    navigationSteps,
    totalDistance,
    totalDuration,
    routeError,
    routeLoading,
    setRouteError,
    loadRoute,
  };
};
