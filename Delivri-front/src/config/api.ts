import { normalizeGeocodeQuery } from '../utils/geoUtils';

const IS_LOCAL = window.location.hostname === 'localhost';

export const API = {
  // === בסיסי ===
  PHOTON_BASE: IS_LOCAL ? '/photon' : 'https://photon.komoot.io',
  NOMINATIM_BASE: IS_LOCAL ? '/nominatim' : 'https://nominatim.openstreetmap.org',
  OSRM_BASE: IS_LOCAL ? '/osrm' : 'https://router.project-osrm.org',
  ORS_BASE: IS_LOCAL ? '/ors' : 'https://api.openrouteservice.org',
  ORS_API_KEY: import.meta.env.VITE_ORS_API_KEY,

  // === שירותים חיצוניים ===
  DATA_GOV_IL: 'https://data.gov.il/api/3/action/datastore_search',

  // === Geocoding ===
  PHOTON_GEOCODE: (query: string, bias?: [number, number]) => {
    const base = `${API.PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&limit=1`;
    return bias ? `${base}&lat=${bias[1]}&lon=${bias[0]}` : base;
  },

  PHOTON_REVERSE: (lon: number, lat: number) =>
    `${API.PHOTON_BASE}/reverse?lon=${lon}&lat=${lat}`,

  NOMINATIM_GEOCODE: (query: string) =>
    `${API.NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(normalizeGeocodeQuery(query))}&limit=1`,

  // === OSRM ===
  OSRM_ROUTE: (coords: [number, number][]) => {
    const q = coords.map((c) => `${c[0]},${c[1]}`).join(';');
    return `${API.OSRM_BASE}/route/v1/driving/${q}?overview=full&geometries=geojson&steps=true&continue_straight=default`;
  },

  /** מטריצת זמני נסיעה מלאה (NxN) — נדרשת לאופטימיזציית TSP */
  OSRM_TABLE: (coords: [number, number][]) => {
    const q = coords.map((c) => `${c[0]},${c[1]}`).join(';');
    return `${API.OSRM_BASE}/table/v1/driving/${q}?annotations=duration`;
  },

  // === ORS ===
  ORS_ROUTE_GEOJSON: () => `${API.ORS_BASE}/v2/directions/driving-car/geojson?api_key=${API.ORS_API_KEY}`,

  ORS_OPTIMIZATION: (key: string) => `https://api.openrouteservice.org/v2/optimization?api_key=${key}`,

  ORS_MATRIX: (key: string) => `https://api.openrouteservice.org/v2/matrix/driving-car?api_key=${key}`,
};
