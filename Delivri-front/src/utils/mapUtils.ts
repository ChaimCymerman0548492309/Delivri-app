import * as maplibregl from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useState } from 'react';
import { logger } from './logger';

export const initializeMap = (container: HTMLElement, onLoad: () => void) => {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
        },
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    },
    // center: [34.8739, 32.0876],
    center: [35.5, 32.7],
    zoom: 10,
  });

  map.on('load', onLoad);
  return map;
};

export const cleanupMap = (map: Map | null) => {
  map?.remove();
};

export const useGeolocation = () => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

const getCurrentLocation = async (): Promise<[number, number]> => {
  if (!navigator.geolocation) {
    throw new Error('דפדפן זה לא תומך במיקום גיאוגרפי');
  }

  // בדוק הרשאה
  const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
  if (perm.state === 'denied') {
    alert('יש לאשר גישה למיקום כדי להשתמש באפליקציה');
    throw new Error('גישה למיקום נדחתה');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        resolve(coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          alert('אנא אשר גישה למיקום בדפדפן');
        }
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
};


  const startWatchingLocation = (onUpdate: (loc: [number, number], accuracy: number) => void) => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setCurrentLocation(coords);
        setLocationAccuracy(position.coords.accuracy);
        onUpdate(coords, position.coords.accuracy);
      },
      (error) => logger.error('Geolocation watch failed', error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    return watchId;
  };

  return { currentLocation, locationAccuracy, getCurrentLocation, startWatchingLocation };
};
