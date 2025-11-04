import type { Feature, FeatureCollection, Geometry, LineString, Point } from 'geojson';
import type { Map } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { API } from '../config/api';
import type { DeliveryStop, NavigationStep, RouteStep } from '../types/types';

type Coordinates = [number, number];

type RouteData = {
  distance: number;
  duration: number;
  geometry: LineString;
  steps: RouteStep[];
};

interface UseMapHookOptions {
  mapRef: React.RefObject<Map | null>;
  currentLocation: Coordinates | null;
  deliveryStops: DeliveryStop[];
  setDeliveryStops: Dispatch<SetStateAction<DeliveryStop[]>>;
  setCurrentStopIndex: Dispatch<SetStateAction<number>>;
  isNavigating: boolean;
  setIsNavigating: Dispatch<SetStateAction<boolean>>;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
  setNavigationSteps: Dispatch<SetStateAction<NavigationStep[]>>;
  setTotalDistance: Dispatch<SetStateAction<number>>;
  setTotalDuration: Dispatch<SetStateAction<number>>;
  getRouteData: (coords: Coordinates[]) => Promise<RouteData | null>;
  optimizeRouteWithTSP: (coords: Coordinates[]) => Promise<Coordinates[]>;
  startWatchingLocation: (onUpdate: (loc: Coordinates, accuracy: number) => void) => number | null;
  isMobile?: boolean;
}

type MatrixMetrics = {
  durations: number[][];
  distances: number[][];
};

const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const ROUTE_LINE_LAYER_ID = 'route-line';
const ROUTE_ARROW_LAYER_ID = 'route-arrows';
const ROUTE_INSTRUCTIONS_LAYER_ID = 'route-instructions';
const ROUTE_SOURCE_ID = 'route-source';

export const useMapHook = ({
  mapRef,
  currentLocation,
  deliveryStops,
  setDeliveryStops,
  setCurrentStopIndex,
  isNavigating,
  setIsNavigating,
  setMobileOpen,
  setNavigationSteps,
  setTotalDistance,
  setTotalDuration,
  getRouteData,
  optimizeRouteWithTSP,
  startWatchingLocation,
  isMobile = false,
}: UseMapHookOptions) => {
  const matrixLoadingRef = useRef(false);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isPostponeDialogOpen, setIsPostponeDialogOpen] = useState(false);

  const getDistanceMatrix = useCallback(
    async (coords: Coordinates[]): Promise<MatrixMetrics | null> => {
      if (matrixLoadingRef.current || coords.length < 2) {
        return null;
      }

      matrixLoadingRef.current = true;
      try {
        const data = await fetchJson<{ durations?: number[][]; distances?: number[][] }>(API.ORS_MATRIX(), {
          method: 'POST',
          headers: {
            Authorization: API.ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locations: coords, metrics: ['duration', 'distance'] }),
        });

        if (!data.durations) return null;
        return {
          durations: data.durations,
          distances: data.distances ?? [],
        };
      } catch (error) {
        console.warn('ORS matrix fetch failed', error);
        return null;
      } finally {
        window.setTimeout(() => {
          matrixLoadingRef.current = false;
        }, 2000);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isNavigating) return;

    const watchId = startWatchingLocation(() => undefined);
    return () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isNavigating, startWatchingLocation]);

  useEffect(() => {
    if (!currentLocation || deliveryStops.length === 0 || routeLoading) return;

    const coords: Coordinates[] = [
      currentLocation,
      ...deliveryStops.map((stop) => stop.coordinates),
    ];

    const timer = window.setTimeout(async () => {
      const metrics = await getDistanceMatrix(coords);
      if (!metrics) return;

      const legDurations = deliveryStops.map((_, idx) => {
        const value = metrics.durations?.[idx]?.[idx + 1];
        return Number.isFinite(value) ? Number(value) : null;
      });

      const legDistances = deliveryStops.map((_, idx) => {
        const value = metrics.distances?.[idx]?.[idx + 1];
        return Number.isFinite(value) ? Number(value) : null;
      });

      const cumulativeDurations: Array<number | null> = [];
      legDurations.forEach((value, idx) => {
        if (value == null) {
          cumulativeDurations[idx] = idx === 0 ? null : cumulativeDurations[idx - 1];
        } else {
          const prev = idx === 0 ? 0 : cumulativeDurations[idx - 1] ?? 0;
          cumulativeDurations[idx] = prev + value;
        }
      });

      setDeliveryStops((prev) =>
        prev.map((stop, idx) => ({
          ...stop,
          estimatedTime: cumulativeDurations[idx] ?? stop.estimatedTime,
          distanceFromPrevious: legDistances[idx] ?? stop.distanceFromPrevious,
        })),
      );
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [currentLocation, deliveryStops, getDistanceMatrix, routeLoading, setDeliveryStops]);

  const ensureMapReady = useCallback(async (): Promise<Map | null> => {
    while (!mapRef.current || !mapRef.current.isStyleLoaded()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return mapRef.current;
  }, [mapRef]);

  const clearRouteLayers = useCallback((map: maplibregl.Map) => {
    [ROUTE_INSTRUCTIONS_LAYER_ID, ROUTE_ARROW_LAYER_ID, ROUTE_LINE_LAYER_ID].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
    if (map.getSource(ROUTE_SOURCE_ID)) {
      map.removeSource(ROUTE_SOURCE_ID);
    }
  }, []);

  const addRouteLayers = useCallback(
    (map: maplibregl.Map, geometry: LineString, steps: RouteStep[]) => {
      clearRouteLayers(map);

      const stepFeatures: Feature<Point>[] = steps.map((step) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: step.coordinates,
          },
          properties: {
            instruction: step.instruction,
          },
        }),
      );

      const featureCollection: FeatureCollection<Geometry> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {},
          },
          ...stepFeatures,
        ],
      };

      map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: featureCollection });

      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        filter: ['==', '$type', 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#1976d2',
          'line-width': 6,
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: ROUTE_ARROW_LAYER_ID,
        type: 'symbol',
        source: ROUTE_SOURCE_ID,
        filter: ['==', '$type', 'LineString'],
        layout: {
          'symbol-placement': 'line',
          'text-field': '>',
          'text-size': 14,
          'symbol-spacing': 60,
          'text-rotation-alignment': 'map',
          'text-keep-upright': false,
        },
        paint: {
          'text-color': '#0d47a1',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      map.addLayer({
        id: ROUTE_INSTRUCTIONS_LAYER_ID,
        type: 'symbol',
        source: ROUTE_SOURCE_ID,
        filter: ['==', '$type', 'Point'],
        layout: {
          'text-field': ['get', 'instruction'],
          'text-size': 12,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-keep-upright': true,
        },
        paint: {
          'text-color': '#1b1b1b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
    },
    [clearRouteLayers],
  );

  const reorderStopsByRoute = useCallback(
    (stops: DeliveryStop[], orderedCoords: Coordinates[]): DeliveryStop[] => {
      if (!orderedCoords.length) return stops;

      const unused = stops.map((stop, index) => ({ stop, index }));
      const usedIndices = new Set<number>();
      const reordered: DeliveryStop[] = [];

      orderedCoords.forEach((coord) => {
        const key = coord.join(',');
        const matchIndex = unused.findIndex(
          ({ stop, index }) => !usedIndices.has(index) && stop.coordinates.join(',') === key,
        );
        if (matchIndex !== -1) {
          const { stop, index } = unused[matchIndex];
          usedIndices.add(index);
          reordered.push({ ...stop, order: reordered.length });
        }
      });

      unused.forEach(({ stop, index }) => {
        if (!usedIndices.has(index)) {
          reordered.push({ ...stop, order: reordered.length });
        }
      });

      return reordered;
    },
    [],
  );

  const loadRoute = useCallback(async (): Promise<boolean> => {
    if (!currentLocation || deliveryStops.length === 0) return false;

    setRouteError(null);
    setRouteLoading(true);

    try {
      const map = await ensureMapReady();
      if (!map) {
        throw new Error('מפת הניווט אינה זמינה כרגע');
      }

      const coords: Coordinates[] = [
        currentLocation,
        ...deliveryStops.map((stop) => stop.coordinates),
      ];

      const optimized = await optimizeRouteWithTSP(coords);

      const route = await getRouteData(optimized);
      if (!route) {
        throw new Error('לא התקבל מסלול תקין מהשרת');
      }

      const orderedStops = reorderStopsByRoute(
        deliveryStops,
        optimized.slice(1),
      );
      setDeliveryStops(orderedStops);

      setTotalDistance(route.distance);
      setTotalDuration(route.duration);

      const navSteps: NavigationStep[] =
        (route.steps.length
          ? route.steps
          : [
              {
                instruction: 'התחל בנסיעה לנקודת היעד הבאה',
                distance: route.distance,
                duration: route.duration,
                coordinates: optimized[1] ?? optimized[0],
              },
            ]
        ).map((step) => ({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
          type: 'step',
          coordinates: step.coordinates,
        }));

      setNavigationSteps(navSteps);
      addRouteLayers(map, route.geometry, route.steps);

      return true;
    } catch (error) {
      console.error('Route calculation failed', error);
      setNavigationSteps([]);
      setRouteError(error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה');
      return false;
    } finally {
      setRouteLoading(false);
    }
  }, [
    addRouteLayers,
    currentLocation,
    deliveryStops,
    ensureMapReady,
    getRouteData,
    optimizeRouteWithTSP,
    reorderStopsByRoute,
    setDeliveryStops,
    setNavigationSteps,
    setTotalDistance,
    setTotalDuration,
  ]);

  const handleAddStop = useCallback(
    (address: string, coords: Coordinates) => {
      setDeliveryStops((prev) => [
        ...prev,
        {
          id: `stop-${Date.now()}`,
          address,
          coordinates: coords,
          completed: false,
          order: prev.length,
        },
      ]);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [isMobile, setDeliveryStops, setMobileOpen],
  );

  const handleRemoveStop = useCallback(
    (id: string) => {
      setDeliveryStops((prev) => {
        const filtered = prev.filter((stop) => stop.id !== id);
        return filtered.map((stop, index) => ({ ...stop, order: index }));
      });
      setCurrentStopIndex(0);
    },
    [setCurrentStopIndex, setDeliveryStops],
  );

  const handlePostponeStop = useCallback((id: string) => {
    setSelectedStopId(id);
    setIsPostponeDialogOpen(true);
  }, []);

  const confirmPostpone = useCallback(() => {
    if (!selectedStopId) return;
    setDeliveryStops((prev) => {
      const index = prev.findIndex((stop) => stop.id === selectedStopId);
      if (index < 0) return prev;
      const updated = [...prev];
      const [postponed] = updated.splice(index, 1);
      const next = [...updated, { ...postponed, postponed: true }];
      return next.map((stop, idx) => ({ ...stop, order: idx }));
    });
    setSelectedStopId(null);
    setIsPostponeDialogOpen(false);
  }, [selectedStopId, setDeliveryStops]);

  const cancelPostpone = useCallback(() => {
    setSelectedStopId(null);
    setIsPostponeDialogOpen(false);
  }, []);

  const handleCompleteStop = useCallback(
    (id: string) => {
      setDeliveryStops((prev) =>
        prev.map((stop) =>
          stop.id === id
            ? { ...stop, completed: true, postponed: false }
            : stop,
        ),
      );

      const index = deliveryStops.findIndex((stop) => stop.id === id);
      if (index === -1 || index === deliveryStops.length - 1) {
        setIsNavigating(false);
      } else {
        setCurrentStopIndex(index + 1);
      }
    },
    [deliveryStops, setCurrentStopIndex, setDeliveryStops, setIsNavigating],
  );

  const startNavigation = useCallback(async () => {
    if (!deliveryStops.length || !currentLocation || routeLoading) return;

    const success = await loadRoute();
    if (!success) return;

    setIsNavigating(true);
    setCurrentStopIndex(0);
    mapRef.current?.flyTo({ center: currentLocation, zoom: 14 });
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [
    currentLocation,
    deliveryStops.length,
    isMobile,
    loadRoute,
    mapRef,
    routeLoading,
    setCurrentStopIndex,
    setIsNavigating,
    setMobileOpen,
  ]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentStopIndex(0);
    if (mapRef.current) {
      clearRouteLayers(mapRef.current);
    }
    setNavigationSteps([]);
  }, [clearRouteLayers, mapRef, setCurrentStopIndex, setIsNavigating, setNavigationSteps]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, [setMobileOpen]);

  const focusOnUserLocation = useCallback(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({ center: currentLocation, zoom: 15 });
    }
  }, [currentLocation, mapRef]);

  return {
    handleAddStop,
    handleRemoveStop,
    handlePostponeStop,
    handleCompleteStop,
    confirmPostpone,
    cancelPostpone,
    startNavigation,
    stopNavigation,
    handleDrawerToggle,
    focusOnUserLocation,
    routeLoading,
    routeError,
    postponeDialogOpen: isPostponeDialogOpen,
    selectedStopId,
  };
};
