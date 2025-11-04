/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../config/api";
import * as maplibregl from 'maplibre-gl';

export const useRouteOptimization = () => {
  const optimizeRouteWithTSP = async (coords: [number, number][]) => {
    try {
      if (!coords || coords.length < 2) throw new Error('לפחות שתי נקודות נדרשות');

      const url = `${API.ORS_BASE}/optimization?api_key=${API.ORS_API_KEY}`;

      const body = {
        jobs: coords.slice(1).map((c, i) => ({
          id: i + 1,
          location: c,
        })),
        vehicles: [
          {
            id: 1,
            profile: 'driving-car',
            start: coords[0],
            end: coords[coords.length - 1],
            return_to_depot: true,
          },
        ],
      };

      console.log('📤 שולח ל-ORS optimization:', JSON.stringify(body, null, 2));

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('❌ ORS optimization response:', res.status, txt);
        throw new Error(`ORS optimization failed: ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ תגובת ORS:', data);

      if (!data.routes?.[0]) throw new Error('אין נתיב אופטימלי בתגובה');

      const orderedIndices = data.routes[0].steps.map((s: any) => s.job).filter((id: number) => id !== undefined);
      const optimizedCoords = [coords[0], ...orderedIndices.map((id: number) => coords[id])];
      // הסרת סימונים קודמים
      document.querySelectorAll('.delivery-marker').forEach((el) => el.remove());

      // יצירת סימון לכל תחנה
      optimizedCoords.forEach(([lng, lat], index) => {
        const el = document.createElement('div');
        el.className = 'delivery-marker';
        el.textContent = (index + 1).toString();

        new maplibregl.Marker(el).setLngLat([lng, lat]).addTo(mapRef.current!);
      });

      console.log('🧭 סדר אופטימלי:', optimizedCoords);
      return optimizedCoords;
    } catch (err) {
      console.error('TSP optimization error:', err);
      return coords;
    }
  };

  const getRouteData = async (coords: [number, number][]) => {
    try {
      if (!coords || coords.length < 2) {
        throw new Error('לפחות שתי נקודות נדרשות עבור מסלול');
      }

      console.log('🗺️ מבקש מסלול עבור נקודות:', coords);

      const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

      const requestBody = {
        coordinates: coords,
        instructions: true,
        language: 'he',
        geometry: true,
        geometry_simplify: false,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: API.ORS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ ORS API error:', res.status, errorText);
        throw new Error(`ORS API failed: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ ORS route response:', data);

      const route = data.features?.[0];
      if (!route) {
        throw new Error('No route features in response');
      }

      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
        console.error('❌ Invalid route geometry:', route.geometry);
        throw new Error('Route geometry missing or invalid');
      }

      if (!route.properties?.summary) {
        console.warn('⚠️ No summary in route properties, using defaults');
      }

      const summary = route.properties?.summary || { distance: 0, duration: 0 };

      return {
        distance: summary.distance || 0,
        duration: summary.duration || 0,
        geometry: route.geometry,
        steps:
          route.properties?.segments?.flatMap((s: any) =>
            (s.steps ?? []).map((st: any) => ({
              instruction: st.instruction || 'המשך ישר',
              distance: st.distance || 0,
              duration: st.duration || 0,
              type: st.type || 'continue',
            })),
          ) ?? [],
      };
    } catch (err) {
      console.error('❌ getRouteData error:', err);

      // Fallback: יצירת גיאומטריה בסיסית במקרה של שגיאה
      const fallbackGeometry = {
        type: 'LineString' as const,
        coordinates: coords,
      };

      return {
        distance: calculateFallbackDistance(coords),
        duration: calculateFallbackDuration(coords),
        geometry: fallbackGeometry,
        steps: generateFallbackSteps(coords),
      };
    }
  };

  return { optimizeRouteWithTSP, getRouteData };
};

// פונקציות fallback למקרה של שגיאת API
const calculateFallbackDistance = (coords: [number, number][]) => {
  let totalDistance = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }
  return totalDistance;
};

const calculateFallbackDuration = (coords: [number, number][]) => {
  const distance = calculateFallbackDistance(coords);
  // הנחה: 50 קמ"ש בממוצע
  return (distance / 50000) * 3600; // שניות
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000; // רדיוס כדור הארץ במטרים
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateFallbackSteps = (coords: [number, number][]) => {
  return coords.slice(1).map((coord, index) => ({
    instruction: `המשך לתחנה ${index + 1}`,
    distance: haversineDistance(coords[index][1], coords[index][0], coord[1], coord[0]),
    duration: 300, // 5 דקות ברירת מחדל
    type: 'continue' as const,
  }));
};
