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

  const resolveGeolocationError = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case 1:
        return 'הגישה למיקום חסומה. יש לאפשר הרשאת מיקום בהגדרות הדפדפן ולנסות שוב.';
      case 2:
        return 'לא הצלחנו לזהות את המיקום. בדקו GPS/קליטה ונסו שוב.';
      case 3:
        return 'תם הזמן לקבלת מיקום. נסו שוב בעוד רגע.';
      default:
        return 'אירעה שגיאה בקבלת המיקום. נסו שוב.';
    }
  };

  const getCurrentLocation = async (): Promise<[number, number]> => {
    if (!window.isSecureContext) {
      throw new Error('גישה למיקום זמינה רק בחיבור מאובטח (HTTPS).');
    }

    if (!navigator.geolocation) {
      throw new Error('דפדפן זה לא תומך במיקום גיאוגרפי.');
    }

    let permissionState: PermissionState | null = null;
    if (navigator.permissions?.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = permissionStatus.state;
      } catch (error) {
        // בדפדפנים מסוימים (כמו Safari), permissions.query עבור geolocation לא נתמך באופן מלא.
        console.warn('Permissions API unavailable for geolocation, falling back to direct request.', error);
      }
    }

    if (permissionState === 'denied') {
      throw new Error('הגישה למיקום חסומה. יש לאפשר הרשאה בהגדרות האתר בדפדפן.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setCurrentLocation(coords);
          setLocationAccuracy(pos.coords.accuracy);
          resolve(coords);
        },
        (error) => {
          reject(new Error(resolveGeolocationError(error)));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  };


  const startWatchingLocation = (onUpdate: (loc: [number, number], accuracy: number) => void) => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return -1;
    }

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
