import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { StopMarkerProps } from '../types/types';

const StopMarker: React.FC<StopMarkerProps> = ({ stop, map, isCurrent = false }) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const element = document.createElement('div');
    element.className = `delivery-marker ${stop.completed ? 'completed' : 'pending'} ${isCurrent ? 'current' : ''}`;
    const backgroundColor = stop.completed ? '#4caf50' : isCurrent ? '#ff9800' : stop.postponed ? '#607d8b' : '#f44336';

    element.style.cssText = `
      width: 36px;
      height: 36px;
      background-color: ${backgroundColor};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: ${isCurrent ? 1000 : 100};
    `;
    element.innerHTML = (stop.order + 1).toString();

    const marker = new maplibregl.Marker({ element }).setLngLat(stop.coordinates).addTo(map);
    markerRef.current = marker;

    return () => {
      markerRef.current?.remove();
    };
  }, [isCurrent, map, stop]);

  return null;
};

export default StopMarker;
