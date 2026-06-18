import * as maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from '../utils/mapUtils';

export const useLocationTracking = (mapRef: React.RefObject<maplibregl.Map | null>, mapReady: boolean) => {
  const watchIdRef = useRef<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [tracking, setTracking] = useState(false);
  const [locationPopupOpen, setLocationPopupOpen] = useState(true);
  const { locationAccuracy, getCurrentLocation } = useGeolocation();

  const handleLocationConfirm = useCallback(async (): Promise<string | null> => {
    try {
      const pos = await getCurrentLocation();
      setCurrentLocation(pos);
      setTracking(true);
      setLocationPopupOpen(false);
      return null;
    } catch {
      return 'אין הרשאה למיקום. אנא אשר גישה בדפדפן.';
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    if (!tracking || !mapRef.current || !mapReady) return;
    const map = mapRef.current;
    let marker: maplibregl.Marker | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCurrentLocation(coords);

        if (!marker) {
          const el = document.createElement('div');
          el.className = 'user-location-arrow';
          el.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="#0d9488" stroke="white" stroke-width="2"><path d="M12 2 L19 21 L12 17 L5 21 Z"/></svg>`;
          marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map', anchor: 'center' })
            .setLngLat(coords)
            .addTo(map);
        } else {
          marker.setLngLat(coords);
        }
      },
      (err) => console.error('שגיאת מיקום:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, mapReady, mapRef]);

  const startNavigationWatch = useCallback(() => {
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCurrentLocation(coords);
        mapRef.current?.flyTo({ center: coords, zoom: 15, essential: true });
      },
      (err) => console.error('Location watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [mapRef]);

  const stopNavigationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const focusOnUserLocation = useCallback(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({ center: currentLocation, zoom: 15, essential: true });
    }
  }, [mapRef, currentLocation]);

  return {
    currentLocation,
    locationAccuracy,
    locationPopupOpen,
    setLocationPopupOpen,
    handleLocationConfirm,
    startNavigationWatch,
    stopNavigationWatch,
    focusOnUserLocation,
  };
};
