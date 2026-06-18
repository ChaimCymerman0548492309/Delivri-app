import * as maplibregl from 'maplibre-gl';
import { useEffect } from 'react';
import type { DeliveryStop } from '../types/types';

export const useStopMarkers = (
  mapRef: React.RefObject<maplibregl.Map | null>,
  deliveryStops: DeliveryStop[],
  currentStopIndex: number,
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarkers = () => {
      document.querySelectorAll('.maplibregl-marker').forEach((el) => {
        if (el.querySelector('.delivery-marker')) el.remove();
      });

      deliveryStops.forEach((stop, i) => {
        const el = document.createElement('div');
        el.classList.add('delivery-marker');
        if (stop.completed) el.classList.add('completed');
        if (i === currentStopIndex) el.classList.add('current');
        el.innerText = `${i + 1}`;
        new maplibregl.Marker(el).setLngLat(stop.coordinates).addTo(map);
      });
    };

    if (map.isStyleLoaded()) updateMarkers();
    else map.once('load', updateMarkers);
  }, [mapRef, deliveryStops, currentStopIndex]);
};
