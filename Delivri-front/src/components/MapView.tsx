/* eslint-disable @typescript-eslint/no-explicit-any */
// components/MapView.tsx
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationIcon,
  Menu as MenuIcon,
  MoreTime as MoreTimeIcon,
  // Schedule ,
  MyLocation as MyLocationIcon,
  // Navigation as NavigationIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { API } from '../config/api';

import {
  AppBar,
  // Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  // TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  useMediaQuery,
} from '@mui/material';
import * as maplibregl from 'maplibre-gl';
import { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import CityStreetSelector from '../services/CityStreetSelector';

const useRouteOptimization = () => {
  // ===== אופטימיזציה אמיתית של המסלול =====
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

      // הפקת סדר הנקודות האופטימלי
      const orderedIndices = data.routes[0].steps.map((s: any) => s.job).filter((id: number) => id !== undefined);
      const optimizedCoords = [coords[0], ...orderedIndices.map((id: number) => coords[id])];

      console.log('🧭 סדר אופטימלי:', optimizedCoords);
      return optimizedCoords;
    } catch (err) {
      console.error('TSP optimization error:', err);
      return coords; // fallback לסדר המקורי
    }
  };

  // ===== שליפת מסלול בפועל =====
  const getRouteData = async (coords: [number, number][]) => {
    try {
      if (!coords || coords.length < 2) throw new Error('לפחות שתי נקודות נדרשות');

      const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson?api_key=${API.ORS_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: coords,
          instructions: true,
          language: 'he',
        }),
      });

      const data = await res.json();
      const route = data.features?.[0];
      if (!route) throw new Error('Missing geometry in ORS response');

      return {
        distance: route.properties?.summary?.distance,
        duration: route.properties?.summary?.duration,
        geometry: route.geometry,
        steps:
          route.properties?.segments?.flatMap((s: any) =>
            (s.steps ?? []).map((st: any) => ({
              instruction: st.instruction || 'המשך ישר',
              distance: st.distance,
              duration: st.duration,
            })),
          ) ?? [],
      };
    } catch (err) {
      console.error('getRouteData error:', err);
      return null;
    }
  };

  return { optimizeRouteWithTSP, getRouteData };
};

// ============ Interfaces ============
interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];
  completed: boolean;
  order: number;
  estimatedTime?: number;
  distanceFromPrevious?: number;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
}

// interface RouteData {
//   distance: number;
//   duration: number;
//   geometry: any;
//   legs: any[];
// }

export interface AutocompleteOption {
  display_name: string;
  lat: string;
  lon: string;
}

// ============ Map Manager ============
const initializeMap = (container: HTMLDivElement, onLoad: () => void): Map => {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    center: [34.7818, 32.0853],
    zoom: 12,
  });

  map.on('load', onLoad);
  return map;
};

const cleanupMap = (map: Map | null) => {
  if (map) {
    map.remove();
  }
};

// ============ Custom Hooks ============
const useGeolocation = () => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const getCurrentLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setCurrentLocation(location);
          setLocationAccuracy(pos.coords.accuracy);
          resolve(location);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const startWatchingLocation = (onLocationUpdate: (location: [number, number], accuracy: number) => void) => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const location: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCurrentLocation(location);
        setLocationAccuracy(pos.coords.accuracy);
        onLocationUpdate(location, pos.coords.accuracy);
      },
      (err) => console.error('Error watching location:', err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return watchId;
  };

  return {
    currentLocation,
    locationAccuracy,
    getCurrentLocation,
    setCurrentLocation,
    startWatchingLocation,
  };
};

// ============ Components ============
interface StopMarkerProps {
  stop: DeliveryStop;
  map: Map;
  isCurrent?: boolean;
}

const StopMarker: React.FC<StopMarkerProps> = ({ stop, map, isCurrent = false }) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.className = `delivery-marker ${stop.completed ? 'completed' : 'pending'} ${isCurrent ? 'current' : ''}`;
    el.style.cssText = `
      width: 36px;
      height: 36px;
      background-color: ${stop.completed ? '#4caf50' : isCurrent ? '#ff9800' : '#f44336'};
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
    el.innerHTML = (stop.order + 1).toString();

    const marker = new maplibregl.Marker({ element: el }).setLngLat(stop.coordinates).addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [stop, map, isCurrent]);

  return null;
};

interface UserLocationMarkerProps {
  location: [number, number];
  map: Map;
  accuracy?: number;
}

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ location, map, accuracy }) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const accuracyCircleRef = useRef<any | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      background-color: #2196f3;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    `;

    const marker = new maplibregl.Marker({ element: el }).setLngLat(location).addTo(map);

    markerRef.current = marker;

    // Add accuracy circle if accuracy is provided
    if (accuracy && accuracy < 1000) {
      // Only show if accuracy is reasonable
      const accuracyInDegrees = accuracy / 111000; // Rough conversion from meters to degrees

      if (!map.getSource('user-location-accuracy')) {
        map.addSource('user-location-accuracy', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: location,
            },
            properties: {
              accuracy: accuracyInDegrees,
            },
          },
        });

        map.addLayer({
          id: 'user-location-accuracy',
          type: 'circle',
          source: 'user-location-accuracy',
          paint: {
            'circle-radius': {
              property: 'accuracy',
              type: 'exponential',
              stops: [
                [0, 0],
                [0.001, 10],
                [0.01, 100],
              ],
            },
            'circle-color': '#2196f3',
            'circle-opacity': 0.2,
            'circle-stroke-color': '#2196f3',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.3,
          },
        });

        accuracyCircleRef.current = map.getLayer('user-location-accuracy') as any;
      } else {
        const source = map.getSource('user-location-accuracy') as maplibregl.GeoJSONSource;
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: location,
          },
          properties: {
            accuracy: accuracyInDegrees,
          },
        });
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (accuracyCircleRef.current && map.getLayer('user-location-accuracy')) {
        map.removeLayer('user-location-accuracy');
        map.removeSource('user-location-accuracy');
      }
    };
  }, [location, map, accuracy]);

  return null;
};

interface StopListItemProps {
  stop: DeliveryStop;
  index: number;
  isCurrent: boolean;
  isNavigating: boolean;
  onComplete: () => void;
  onRemove: () => void;
  onPostpone: () => void;
  currentLocation: [number, number] | null;
}

const StopListItem: React.FC<StopListItemProps> = ({
  stop,
  index,
  isCurrent,
  isNavigating,
  onComplete,
  onRemove,
  onPostpone,
  currentLocation,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (stop.completed) return 'success';
    if (isCurrent && isNavigating) return 'warning';
    return 'default';
  };

  const getStatusText = () => {
    if (stop.completed) return 'בוצע';
    if (isCurrent && isNavigating) return 'נוכחי';
    return 'ממתין';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes} דקות`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} מטרים`;
    return `${(meters / 1000).toFixed(1)} ק"מ`;
  };

  return (
    <ListItem
      sx={{
        border: 2,
        borderColor: isCurrent && isNavigating ? 'warning.main' : stop.completed ? 'success.main' : 'divider',
        borderRadius: 2,
        mb: 1,
        bgcolor: isCurrent && isNavigating ? 'warning.light' : stop.completed ? 'success.light' : 'background.paper',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: isCurrent && isNavigating ? 'warning.light' : stop.completed ? 'success.light' : 'grey.50',
        },
      }}
      onClick={() => setShowDetails(!showDetails)}>
      <ListItemIcon>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: stop.completed ? 'success.main' : isCurrent && isNavigating ? 'warning.main' : 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: 2,
          }}>
          {index + 1}
        </Box>
      </ListItemIcon>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
              {stop.address}
            </Typography>
            <Chip
              label={getStatusText()}
              size="small"
              color={getStatusColor()}
              variant={isCurrent && isNavigating ? 'filled' : 'outlined'}
            />
          </Box>
        }
        secondary={
          showDetails ? (
            <Box sx={{ mt: 1 }}>
              {stop.estimatedTime && (
                <Typography component="div" variant="body2" color="text.secondary">
                  ⏱️ זמן משוער: {formatTime(stop.estimatedTime)}
                </Typography>
              )}
              {stop.distanceFromPrevious && (
                <Typography component="div" variant="body2" color="text.secondary">
                  📏 מרחק: {formatDistance(stop.distanceFromPrevious)}
                </Typography>
              )}
              {isCurrent && isNavigating && currentLocation && (
                <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                  🎯 אתה נמצא בקרבת מקום
                </Typography>
              )}
            </Box>
          ) : (
            <Typography component="div" variant="body2" color="text.secondary">
              {stop.completed ? '✅ משלוח הושלם' : isCurrent && isNavigating ? '🎯 הגעת ליעד' : '⏳ ממתין לטיפול'}
            </Typography>
          )
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
        {isCurrent && isNavigating && !stop.completed && (
          <IconButton
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            sx={{ bgcolor: 'success.light' }}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        )}

        {!stop.completed && (
          <IconButton
            size="small"
            color="info"
            onClick={(e) => {
              e.stopPropagation();
              onPostpone();
            }}
            sx={{ bgcolor: 'info.light' }}>
            <MoreTimeIcon fontSize="small" />
          </IconButton>
        )}

        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          sx={{ bgcolor: 'error.light' }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </ListItem>
  );
};

interface NavigationPanelProps {
  isNavigating: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  deliveryStops: DeliveryStop[];
  currentStopIndex: number;
  onCompleteStop: (stopId: string) => void;
  onRemoveStop: (stopId: string) => void;
  onPostponeStop: (stopId: string) => void;
  navigationSteps: NavigationStep[];
  totalDistance: number;
  totalDuration: number;
  onAddStop: (address: string, coordinates: [number, number]) => void;
  currentLocation: [number, number] | null;
  locationAccuracy: number | null;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  onStartNavigation,
  onStopNavigation,
  deliveryStops,
  currentStopIndex,
  onCompleteStop,
  onRemoveStop,
  onPostponeStop,
  // navigationSteps,
  totalDistance,
  totalDuration,
  onAddStop,
  currentLocation,
  locationAccuracy,
}) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  const universalGeocode = async (query: string) => {
    try {
      const photonRes = await fetch(API.PHOTON_GEOCODE(query));
      const photonData = await photonRes.json();
      const f = photonData.features?.[0];
      if (f) return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], source: 'photon' };
    } catch (e) {
      console.warn('Photon geocode failed:', e);
    }

    try {
      const nomRes = await fetch(API.NOMINATIM_GEOCODE(query));
      const nomData = await nomRes.json();
      if (nomData?.[0])
        return { lat: parseFloat(nomData[0].lat), lon: parseFloat(nomData[0].lon), source: 'nominatim' };
    } catch (e) {
      console.warn('Nominatim geocode failed:', e);
    }

    return null;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes} דקות`;
  };

  return (
    <Paper
      sx={{
        width: isMobile ? '100%' : 420,
        height: isMobile ? 'auto' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 0 : 2,
        overflow: 'hidden',
      }}
      elevation={3}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          textAlign: 'center',
        }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <DirectionsIcon /> ניהול משלוחים
        </Typography>
        {currentLocation && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
            <MyLocationIcon sx={{ fontSize: 14, mr: 0.5 }} />
            מיקום נוכחי זמין
            {locationAccuracy && ` (דיוק: ${Math.round(locationAccuracy)}m)`}
          </Typography>
        )}
      </Box>

      {/* Navigation Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {!isNavigating ? (
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={onStartNavigation}
            disabled={deliveryStops.length === 0}
            sx={{ mb: 1, py: 1.2 }}>
            התחל ניווט ({deliveryStops.length} תחנות)
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            size="large"
            startIcon={<StopIcon />}
            onClick={onStopNavigation}
            sx={{ py: 1.2 }}>
            עצור ניווט
          </Button>
        )}

        {isNavigating && (
          <Card sx={{ mt: 2, bgcolor: 'primary.light', color: 'white' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2">מרחק כולל</Typography>
                  <Typography variant="h6">{(totalDistance / 1000).toFixed(1)} ק"מ</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">זמן משוער</Typography>
                  <Typography variant="h6">{formatTime(totalDuration)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">תחנה נוכחית</Typography>
                  <Typography variant="h6">
                    {currentStopIndex + 1}/{deliveryStops.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon /> הוספת תחנה
        </Typography>

        <CityStreetSelector
          onSelect={async (city, street, houseNumber) => {
            const fullAddress = `${street} ${houseNumber || ''} ${city}`;
            const result = await universalGeocode(fullAddress);
            if (result) {
              onAddStop(fullAddress, [result.lon, result.lat]);
            } else {
              alert('לא ניתן למצוא את הכתובת');
            }
          }}
        />
      </Box>

      {/* Stops List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon /> רשימת תחנות
        </Typography>

        {deliveryStops.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50' }}>
            <CardContent>
              <LocationIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                אין תחנות במסלול
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                הוסף תחנות למעלה כדי להתחיל
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <List>
            {deliveryStops.map((stop, index) => (
              <StopListItem
                key={stop.id}
                stop={stop}
                index={index}
                isCurrent={index === currentStopIndex}
                isNavigating={isNavigating}
                onComplete={() => onCompleteStop(stop.id)}
                onRemove={() => onRemoveStop(stop.id)}
                onPostpone={() => onPostponeStop(stop.id)}
                currentLocation={currentLocation}
              />
            ))}
          </List>
        )}
      </Box>

 
    </Paper>
  );
};

// ============ Main Component ============
const MapView = () => {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [deliveryStops, setDeliveryStops] = useState<DeliveryStop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string>('');

  const isMobile = useMediaQuery('(max-width:768px)');
  const isTablet = useMediaQuery('(max-width:1024px)');
  const {
    currentLocation,
    locationAccuracy,
    getCurrentLocation,
    // setCurrentLocation
  } = useGeolocation();
  // const getDistanceMatrix = async (coords: [number, number][]) => {
  //   try {
  //     const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  //     await delay(2000); // השהיה בין בקשות

  //     const res = await fetch(`${API.ORS_BASE}/v2/matrix/driving-car`, {
  //       method: 'POST',
  //       headers: {
  //         Authorization: API.ORS_API_KEY,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         locations: coords, // [lng, lat]
  //         metrics: ['duration', 'distance'],
  //       }),
  //     });

  //     if (!res.ok) {
  //       const err = await res.text();
  //       throw new Error(`ORS error ${res.status}: ${err}`);
  //     }

  //     const data = await res.json();
  //     return data.durations[0].slice(1); // מחזיר רק מהמקור לכל יעד
  //   } catch (err) {
  //     console.error('Matrix error:', err);
  //     return [];
  //   }
  // };

  const { optimizeRouteWithTSP, getRouteData } = useRouteOptimization();

  const theme = createTheme({
    direction: 'rtl',
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });
  // מעקב GPS כל 15 שניות
  useEffect(() => {
    if (!isNavigating) return;

    // let timerId: ReturnType<typeof setInterval>;

    const updateLocation = async () => {
      try {
        const pos = await getCurrentLocation();
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: pos,
            zoom: 15,
            essential: true,
          });
        }
      } catch (err) {
        console.error('Location update failed:', err);
      }
    };

    updateLocation(); // עדכון ראשוני
    const timerId = setInterval(updateLocation, 15000); // כל 15 שניות

    return () => clearInterval(timerId);
  }, [isNavigating]);

  // אתחול מפה ומיקום
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = initializeMap(containerRef.current, async () => {
      setReady(true);
      try {
        await getCurrentLocation();
      } catch (error) {
        console.error('Failed to get initial location:', error);
      }
    });

    return () => {
      cleanupMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  // // חישוב מרחקים וזמנים כאשר המיקום או התחנות משתנים
  // useEffect(() => {
  //   if (currentLocation && deliveryStops.length > 0) {
  //     updateDistancesAndTimes();
  //   }
  // }, [currentLocation, deliveryStops]);

  // const updateDistancesAndTimes = async () => {
  //   if (!currentLocation) return;

  //   const allCoordinates: [number, number][] = [currentLocation, ...deliveryStops.map((stop) => stop.coordinates)];

  //   try {
  //     const durations = await getDistanceMatrix(allCoordinates);
  //     if (durations.length === allCoordinates.length) {
  //       const updatedStops = deliveryStops.map((stop, index) => ({
  //         ...stop,
  //         estimatedTime: durations[index + 1], // +1 because first is current location
  //         distanceFromPrevious:
  //           index === 0
  //             ? durations[1] // Distance from current location to first stop
  //             : durations[index + 1] - durations[index], // Distance between stops
  //       }));
  //       setDeliveryStops(updatedStops);
  //     }
  //   } catch (error) {
  //     console.error('Error updating distances:', error);
  //   }
  // };

  // טעינת מסלול
  const loadRoute = async () => {
    if (!ready || !mapRef.current || !currentLocation) return;

    try {
      const coords: [number, number][] = [currentLocation, ...deliveryStops.map((s) => s.coordinates)];
      if (coords.length < 2) return;

      const optimizedCoords = await optimizeRouteWithTSP(coords);
      const routeData = await getRouteData(optimizedCoords);
      if (!routeData) return;

      setTotalDistance(routeData.distance);
      setTotalDuration(routeData.duration);

      // שלבים
      const steps: NavigationStep[] =
        routeData.steps?.map((s: any) => ({
          instruction: s.instruction || 'המשך ישר',
          distance: s.distance || 0,
          duration: s.duration || 0,
          type: s.type || '',
        })) ?? [];
      setNavigationSteps(steps);

      // ציור המסלול
      const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        geometry: routeData.geometry, // ישירות מה־ORS
        properties: {},
      };

      const map = mapRef.current;
      const routeSourceId = 'route';

      const existing = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(routeFeature);
      } else {
        map.addSource(routeSourceId, { type: 'geojson', data: routeFeature });
        map.addLayer({
          id: 'route-layer',
          type: 'line',
          source: routeSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2196f3', 'line-width': 5, 'line-opacity': 0.8 },
        });
      }

      // התאמת תצוגה למסלול
      const bounds = optimizedCoords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(optimizedCoords[0], optimizedCoords[0]),
      );
      map.fitBounds(bounds, { padding: 100 });
    } catch (err) {
      console.error('Error loading route:', err);
    }
  };

  // הוספת תחנה חדשה
  const handleAddStop = (address: string, coordinates: [number, number]) => {
    if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      alert('לא ניתן למצוא את הכתובת. אנא נסה שוב.');
      return;
    }

    const newStop: DeliveryStop = {
      id: `stop-${Date.now()}`,
      address,
      coordinates,
      completed: false,
      order: deliveryStops.length,
    };

    setDeliveryStops((prev) => [...prev, newStop]);
    if (isMobile) setMobileOpen(false);
  };

  // הסרת תחנה
  const handleRemoveStop = (stopId: string) => {
    setDeliveryStops((prev) => {
      const newStops = prev.filter((stop) => stop.id !== stopId);
      // עדכון סדר התחנות
      return newStops.map((stop, index) => ({ ...stop, order: index }));
    });
  };

  // דחיית תחנה
  const handlePostponeStop = (stopId: string) => {
    setSelectedStopId(stopId);
    setPostponeDialogOpen(true);
  };

  const confirmPostpone = () => {
    setDeliveryStops((prev) => {
      const stopIndex = prev.findIndex((stop) => stop.id === selectedStopId);
      if (stopIndex === -1) return prev;

      const newStops = [...prev];
      const [postponedStop] = newStops.splice(stopIndex, 1);
      newStops.push(postponedStop);

      // עדכון סדר התחנות
      return newStops.map((stop, index) => ({ ...stop, order: index }));
    });

    setPostponeDialogOpen(false);
    setSelectedStopId('');
  };

  // סימון תחנה כבוצע
  const handleCompleteStop = (stopId: string) => {
    setDeliveryStops((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, completed: true } : stop)));

    // מעבר לתחנה הבאה אם זו התחנה הנוכחית
    const currentIndex = deliveryStops.findIndex((stop) => stop.id === stopId);
    if (currentIndex === currentStopIndex && currentIndex < deliveryStops.length - 1) {
      setCurrentStopIndex(currentIndex + 1);
    }

    // אם זו התחנה האחרונה - סיום ניווט
    if (currentIndex === deliveryStops.length - 1) {
      setIsNavigating(false);
    }
  };

  // התחל ניווט
  // מחוץ לפונקציה startNavigation
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // התחל ניווט
  const startNavigation = async () => {
    if (deliveryStops.length === 0) {
      alert('אנא הוסף לפחות תחנה אחת לפני תחילת הניווט');
      return;
    }

    await loadRoute();
    setIsNavigating(true);
    setCurrentStopIndex(0);

    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({
        center: currentLocation,
        zoom: 14,
        essential: true,
      });
    }

    // עדכון מיקום כל 15 שניות
    locationTimerRef.current = setInterval(async () => {
      try {
        const pos = await getCurrentLocation();
        if (mapRef.current) {
          mapRef.current.flyTo({ center: pos, zoom: 15, essential: true });
        }
      } catch (err) {
        console.error('Location update failed:', err);
      }
    }, 15000);

    if (isMobile) setMobileOpen(false);
  };

  // עצירת ניווט
  const stopNavigation = () => {
    setIsNavigating(false);
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current);
      locationTimerRef.current = null;
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const focusOnUserLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({
        center: currentLocation,
        zoom: 15,
        essential: true,
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Mobile App Bar */}
        {isMobile && (
          <AppBar position="static">
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}>
                <Badge badgeContent={deliveryStops.length} color="secondary">
                  <MenuIcon />
                </Badge>
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                ניהול משלוחים
              </Typography>
              <IconButton color="inherit" onClick={focusOnUserLocation}>
                <MyLocationIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}

        {/* Map */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            height: isMobile ? 'calc(100vh - 64px)' : '100vh',
          }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating Action Button for Mobile */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="מיקום נוכחי"
              onClick={focusOnUserLocation}
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
              }}>
              <MyLocationIcon />
            </Fab>
          )}

          {/* מרקרים */}
          {ready && mapRef.current && currentLocation && (
            <>
              <UserLocationMarker
                location={currentLocation}
                map={mapRef.current}
                // accuracy={locationAccuracy}
              />
              {deliveryStops.map((stop, index) => (
                <StopMarker
                  key={stop.id}
                  stop={stop}
                  map={mapRef.current!}
                  isCurrent={index === currentStopIndex && isNavigating}
                />
              ))}
            </>
          )}
        </Box>

        {/* Navigation Panel */}
        {!isMobile ? (
          <NavigationPanel
            isNavigating={isNavigating}
            onStartNavigation={startNavigation}
            onStopNavigation={stopNavigation}
            deliveryStops={deliveryStops}
            currentStopIndex={currentStopIndex}
            onCompleteStop={handleCompleteStop}
            onRemoveStop={handleRemoveStop}
            onPostponeStop={handlePostponeStop}
            navigationSteps={navigationSteps}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            onAddStop={handleAddStop}
            currentLocation={currentLocation}
            locationAccuracy={locationAccuracy}
          />
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: isTablet ? '80%' : '100%',
                maxWidth: 420,
              },
            }}>
            <NavigationPanel
              isNavigating={isNavigating}
              onStartNavigation={startNavigation}
              onStopNavigation={stopNavigation}
              deliveryStops={deliveryStops}
              currentStopIndex={currentStopIndex}
              onCompleteStop={handleCompleteStop}
              onRemoveStop={handleRemoveStop}
              onPostponeStop={handlePostponeStop}
              navigationSteps={navigationSteps}
              totalDistance={totalDistance}
              totalDuration={totalDuration}
              onAddStop={handleAddStop}
              currentLocation={currentLocation}
              locationAccuracy={locationAccuracy}
            />
          </Drawer>
        )}

        {/* Postpone Dialog */}
        <Dialog open={postponeDialogOpen} onClose={() => setPostponeDialogOpen(false)}>
          <DialogTitle>דחיית תחנה</DialogTitle>
          <DialogContent>
            <Typography>האם ברצונך לדחות תחנה זו לסוף הרשימה?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPostponeDialogOpen(false)}>ביטול</Button>
            <Button onClick={confirmPostpone} variant="contained" color="primary">
              דחה תחנה
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </ThemeProvider>
  );
};

export default MapView;
