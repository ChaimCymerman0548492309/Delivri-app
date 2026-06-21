import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { DeliveryStop } from '../types/types';
import { createStopMarkerElement, getStopMarkerVariant } from '../utils/stopMarkerFactory';

export const useStopMarkers = (
  mapRef: React.RefObject<maplibregl.Map | null>,
  mapReady: boolean,
  deliveryStops: DeliveryStop[],
  currentStopIndex: number,
  isNavigating = false,
) => {
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const clearMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };

    const updateMarkers = () => {
      clearMarkers();

      deliveryStops.forEach((stop, i) => {
        if (!stop.coordinates || stop.coordinates.some((c) => Number.isNaN(c))) return;

        const variant = getStopMarkerVariant(stop, i, currentStopIndex, isNavigating);
        const el = createStopMarkerElement(i, variant);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(stop.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.once('load', updateMarkers);
    }

    return () => {
      map.off('load', updateMarkers);
      clearMarkers();
    };
  }, [mapRef, mapReady, deliveryStops, currentStopIndex, isNavigating]);
};
