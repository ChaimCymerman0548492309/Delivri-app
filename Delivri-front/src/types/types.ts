import type { Map } from 'maplibre-gl';

export interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];
  completed: boolean;
  order: number;
  estimatedTime?: number;
  distanceFromPrevious?: number;
  postponed?: boolean;
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
  coordinates?: [number, number];
}

export interface StopMarkerProps {
  stop: DeliveryStop;
  map: Map;
  isCurrent?: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: [number, number];
}
