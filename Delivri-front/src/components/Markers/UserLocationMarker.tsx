import type { Feature, Point } from 'geojson';
import type { Map } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';

interface UserLocationMarkerProps {
  location: [number, number];
  map: Map;
  accuracy?: number | null;
}

const ACCURACY_SOURCE_ID = 'user-location-accuracy';

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ location, map, accuracy }) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map ) return;

    const onLoad = () => {
      const element = document.createElement('div');
      element.className = 'user-location-marker';
      element.style.cssText = `
      width: 20px;
      height: 20px;
      background-color: #2196f3;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    `;

      markerRef.current = new maplibregl.Marker({ element }).setLngLat(location).addTo(map);

      if (accuracy && accuracy < 1000) {
        const accuracyInDegrees = accuracy / 111000;

        const sourceData: Feature<Point> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: location,
          },
          properties: {
            accuracy: accuracyInDegrees,
          },
        };

        if (!map.getSource(ACCURACY_SOURCE_ID)) {
          map.addSource(ACCURACY_SOURCE_ID, { type: 'geojson', data: sourceData });
          map.addLayer({
            id: ACCURACY_SOURCE_ID,
            type: 'circle',
            source: ACCURACY_SOURCE_ID,
            paint: {
              'circle-radius': 50,
              'circle-color': '#2196f3',
              'circle-opacity': 0.2,
            },
          });
        }

        const source = map.getSource(ACCURACY_SOURCE_ID) as maplibregl.GeoJSONSource;
        source?.setData(sourceData);
      }
    };

    if (map.isStyleLoaded()) onLoad();
    else map.once('load', onLoad);

    return () => {
      if (!map) return;

      // Remove marker
      markerRef.current?.remove();

      // Safely remove layer and source
      try {
        if (map.getLayer(ACCURACY_SOURCE_ID)) {
          map.removeLayer(ACCURACY_SOURCE_ID);
        }
      } catch (error) {
        logger.debug('Layer already removed', error);
      }

      try {
        if (map.getSource(ACCURACY_SOURCE_ID)) {
          map.removeSource(ACCURACY_SOURCE_ID);
        }
      } catch (error) {
        logger.debug('Source already removed', error);
      }
    };
  }, [map, location, accuracy]);

  return null;
};

export default UserLocationMarker;
