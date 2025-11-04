import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';

interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];
  completed: boolean;
  order: number;
}

interface DeliveryMarkersProps {
  map: maplibregl.Map | null;
  deliveryStops: DeliveryStop[];
  currentStopIndex: number;
  isNavigating: boolean;
  onMarkerClick?: (stop: DeliveryStop) => void;
}

const DeliveryMarkers: React.FC<DeliveryMarkersProps> = ({
  map,
  deliveryStops,
  currentStopIndex,
  isNavigating,
  onMarkerClick,
}) => {
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // נקה מרקרים קודמים
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // הוסף מרקרים חדשים
    deliveryStops.forEach((stop, index) => {
      const isCurrent = index === currentStopIndex && isNavigating;

      const el = document.createElement('div');
      el.className = `delivery-marker ${stop.completed ? 'completed' : 'pending'} ${isCurrent ? 'current' : ''}`;
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${stop.completed ? '#4caf50' : isCurrent ? '#ff9800' : '#f44336'};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: ${isCurrent ? 1000 : 100};
      `;
      el.innerHTML = (index + 1).toString();

      // הוסף tooltip עם פרטי הכתובת
      el.title = `תחנה ${index + 1}: ${stop.address}`;

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat(stop.coordinates)
        .addTo(map);

      // הוסף event listener ללחיצה
      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(stop));
      }

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [map, deliveryStops, currentStopIndex, isNavigating, onMarkerClick]);

  return null;
};

export default DeliveryMarkers;
