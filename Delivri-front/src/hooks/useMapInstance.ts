import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { cleanupMap, initializeMap } from '../utils/mapUtils';

export const useMapInstance = () => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      mapRef.current = initializeMap(containerRef.current, () => {
        setReady(true);
        setMapLoadError(null);
      });

      mapRef.current.on('error', () => setMapLoadError('שגיאה בטעינת המפה'));
    } catch {
      setMapLoadError('שגיאה באתחול המפה');
    }

    return () => {
      cleanupMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  return { mapRef, containerRef, ready, mapLoadError, setMapLoadError };
};
