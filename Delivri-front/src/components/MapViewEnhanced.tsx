/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  // Snackbar,
  Alert,
  Box,
  Button,
  Drawer,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from '@mui/material';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

// Components
import Footer from '../pages/Footer';
import Header from '../pages/Header';
import InstructionsOverlay from './InstructionsOverlay';
// import AnalyticsDashboard from './SafeAnalyticsDashboard';
import ApiPerformance from '../pages/ApiPerformance';
import ErrorBoundary from '../pages/ErrorBoundary';
import LoadingSpinner from '../pages/LoadingSpinner';
import RouteErrorHandler from '../pages/RouteErrorHandler';

// Hooks
import { useApiTimer } from '../hooks/useApiTimer';
import LocationPermissionPopup from '../pages/LocationPermissionPopup';
import type { DeliveryStop, NavigationStep } from '../types/types';
import { cleanupMap, initializeMap, useGeolocation } from '../utils/mapUtils';
import { useRouteOptimization } from '../utils/utils';
import SafeAnalyticsDashboard from './Dashboard/SafeAnalyticsDashboard';
import NavigationPanel from './NavigationPanel';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';

const MapViewEnhanced = () => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { optimizeRouteWithTSP, getRouteData } = useRouteOptimization();
  const watchIdRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [deliveryStops, setDeliveryStops] = useState<DeliveryStop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [, setSelectedStopId] = useState<string>('');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [pendingStop, setPendingStop] = useState<DeliveryStop | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [tracking, setTracking] = useState(false);
  const [locationPopupOpen, setLocationPopupOpen] = useState(true);
  const [openAnalyticsDashboard, setOpenAnalyticsDashboard] = useState<boolean>(false);
  const isMobile = useMediaQuery('(max-width:768px)');

  const theme = createTheme({
    direction: 'rtl',
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      error: { main: '#f44336' },
      warning: { main: '#ff9800' },
    },
  });

  const { locationAccuracy, getCurrentLocation } = useGeolocation();
  const { timings, loading, trackApiCall } = useApiTimer();

  const handleConfirmPostpone = () => {
    if (!pendingStop) return;
    setDeliveryStops((prev) => {
      const remaining = prev.filter((s) => s.id !== pendingStop.id);
      return [...remaining, pendingStop];
    });
    setPendingStop(null);
    setPostponeDialogOpen(false);
  };

  const handleCancelPostpone = () => {
    setPostponeDialogOpen(false);
    setPendingStop(null);
  };


  // אתחול מפה (רק פעם אחת)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    try {
      mapRef.current = initializeMap(containerRef.current, () => {
        setReady(true);
        setMapLoadError(null);
        console.log('✅ Map initialized successfully');
      });

      mapRef.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapLoadError('שגיאה בטעינת המפה');
      });
    } catch (e) {
      console.error('Map init error:', e);
      setMapLoadError('שגיאה באתחול המפה');
    }

    return () => {
      cleanupMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);
  // const handleLocateUser = () => {
  //   setLocationPopupOpen(true);
  // };

  const handleLocationConfirm = async () => {
    try {
      const pos = await getCurrentLocation();
      setCurrentLocation(pos);
      setTracking(true);
    } catch {
      setMapLoadError('אין הרשאה למיקום');
    }
  };

  useEffect(() => {
    if (!tracking || !mapRef.current) return;
    const map = mapRef.current;
    let marker: maplibregl.Marker | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCurrentLocation(coords);

        if (!marker) {
          const el = document.createElement('div');
          el.className = 'user-location-arrow';
          el.innerHTML = `
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#2196f3" stroke="white" stroke-width="2" stroke-linejoin="round">
    <path d="M12 2 L19 21 L12 17 L5 21 Z" />
  </svg>
`;

          marker = new maplibregl.Marker({
            element: el,
            rotationAlignment: 'map', // כך החץ יישאר עם כיוון המפה
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(map);
        } else {
          marker.setLngLat(coords);
        }

        map.flyTo({ center: coords, zoom: 15, essential: true });
      },
      (err) => console.error('שגיאת מיקום:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking]);

  useEffect(() => {
    localStorage.setItem('deliveryStops', JSON.stringify(deliveryStops));
  }, [deliveryStops]);

  useEffect(() => {
    const saved = localStorage.getItem('deliveryStops');
    if (saved) setDeliveryStops(JSON.parse(saved));
  }, []);
useEffect(() => {
  fetch('https://photon.komoot.io/api/?q=tel+aviv&limit=1');
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=haifa&limit=1');
}, []);

  useEffect(() => {
    if (isNavigating && navigationSteps.length > 0) {
      const step = navigationSteps[currentStopIndex];
      if (step) speechSynthesis.speak(new SpeechSynthesisUtterance(step.instruction));
    }
  }, [currentStopIndex, isNavigating]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateMarkers = () => {
      // הסר תחנות ישנות
      const style = map.getStyle();
      if (!style) return;

      const layers = style.layers || [];
      layers.forEach((layer) => {
        if (layer.id.startsWith('stop-marker') && map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      });

      const sources = style.sources || {};
      Object.keys(sources).forEach((id) => {
        if (id.startsWith('stop-marker') && map.getSource(id)) {
          map.removeSource(id);
        }
      });

      // הוסף תחנות חדשות
      deliveryStops.forEach((stop, i) => {
        // const el = document.createElement('div');

        // el.className = `delivery-marker ${stop.completed ? 'completed' : ''} ${i === currentStopIndex ? 'current' : ''}`;
        // el.innerText = `${i + 1}`;
        // new maplibregl.Marker(el).setLngLat(stop.coordinates).addTo(map);
        const el = document.createElement('div');
        el.classList.add('delivery-marker');
        if (stop.completed) el.classList.add('completed');
        if (i === currentStopIndex) el.classList.add('current');
        el.innerText = `${i + 1}`;
        new maplibregl.Marker(el).setLngLat(stop.coordinates).addTo(map);
      });
    };

    // אם הסגנון כבר טעון – הפעל מיידית, אחרת חכה לאירוע load
    if (map.isStyleLoaded()) updateMarkers();
    else map.once('load', updateMarkers);
  }, [deliveryStops, currentStopIndex]);

  // טעינת מסלול עם טיפול בשגיאות משופר
  const loadRoute = async (retryCount = 0): Promise<boolean> => {
    if (!ready || !mapRef.current || !currentLocation) {
      setRouteError('מפה או מיקום לא זמינים');
      return false;
    }
    setRouteLoading(true);

    try {
      const coords: [number, number][] = [currentLocation, ...deliveryStops.map((s) => s.coordinates)];
      if (coords.length < 2) {
        setRouteError('נדרשות לפחות שתי נקודות למסלול');
        return false;
      }

      console.log('🔄 טוען מסלול עם', coords.length, 'נקודות');

      const optimizedCoords = await trackApiCall(() => optimizeRouteWithTSP(coords), 'אופטימיזציית מסלול');

      const routeData = await trackApiCall(() => getRouteData(optimizedCoords), 'טעינת נתיב');

      if (!routeData) {
        throw new Error('לא התקבלו נתוני מסלול');
      }

      setTotalDistance(routeData.distance);
      setTotalDuration(routeData.duration);
      setRouteError(null);

      // עדכון שלבי הניווט
      const steps: NavigationStep[] =
        routeData.steps?.map((s: any) => ({
          instruction: s.instruction || 'המשך ישר',
          distance: s.distance || 0,
          duration: s.duration || 0,
          type: s.type || 'continue',
        })) ?? [];

      setNavigationSteps(steps);

      // ציור המסלול במפה
      try {
        const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          geometry: routeData.geometry,
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
            paint: {
              'line-color': '#2196f3',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });
        }

        // התאמת תצוגה למסלול
        const bounds = optimizedCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(optimizedCoords[0], optimizedCoords[0]),
        );
        map.fitBounds(bounds, { padding: 100, duration: 1000 });
      } catch (mapError) {
        console.error('Error drawing route on map:', mapError);
        setRouteError('שגיאה בציור המסלול על המפה');
      }

      return true;
    } catch (err) {
      console.error('Error loading route:', err);

      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה בטעינת המסלול';
      setRouteError(errorMessage);

      // ניסיון חוזר אוטומטי (מקסימום 2 ניסיונות)
      if (retryCount < 2) {
        console.log(`🔄 מנסה שוב... ניסיון ${retryCount + 1}`);
        setTimeout(() => loadRoute(retryCount + 1), 2000);
      }

      return false;
    } finally {
      setRouteLoading(false);
    }
  };

  // הוספת תחנה חדשה
  const handleAddStop = (address: string, coordinates: [number, number]) => {
    if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      setRouteError('לא ניתן למצוא את הכתובת. אנא נסה שוב.');
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

    // נקה שגיאות קודמות כאשר מוסיפים תחנה חדשה
    setRouteError(null);
  };

  // הסרת תחנה
  const handleRemoveStop = (stopId: string) => {
    setDeliveryStops((prev) => {
      const newStops = prev.filter((stop) => stop.id !== stopId);
      return newStops.map((stop, index) => ({ ...stop, order: index }));
    });

    // טען מחדש את המסלול אם במוד ניווט
    if (isNavigating) {
      loadRoute();
    }
  };

  // דחיית תחנה
  const handlePostponeStop = (stopId: string) => {
    setSelectedStopId(stopId);
    // const handlePostponeStop = (stopId: string) => {
    const stop = deliveryStops.find((s) => s.id === stopId);
    if (!stop) return;
    setPendingStop(stop);
    setPostponeDialogOpen(true);
    // setPostponeDialogOpen(true);
    // };
  };

  // סימון תחנה כבוצע
  const handleCompleteStop = (stopId: string) => {
    setDeliveryStops((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, completed: true } : stop)));

    const currentIndex = deliveryStops.findIndex((s) => s.id === stopId);

    if (currentIndex === currentStopIndex && currentIndex < deliveryStops.length - 1) {
      setCurrentStopIndex(currentIndex + 1);
    }

    // אם זו האחרונה – עצור ניווט ומעקב
    if (currentIndex === deliveryStops.length - 1) {
      setIsNavigating(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  };

  // התחל ניווט
  const startNavigation = async () => {
    if (deliveryStops.length === 0) {
      setRouteError('אנא הוסף לפחות תחנה אחת לפני תחילת הניווט');
      return;
    }

    const success = await loadRoute();
    if (!success) {
      setRouteError('לא ניתן לטעון את המסלול. נסה שוב.');
      return;
    }

    setIsNavigating(true);
    setCurrentStopIndex(0);

    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({ center: currentLocation, zoom: 14, essential: true });
    }

    // הפעל מעקב רציף אחר מיקום (במקום setInterval)
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setCurrentLocation(coords);
          mapRef.current?.flyTo({ center: coords, zoom: 15, essential: true });
        },
        (err) => console.error('Location watch error:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    }

    if (isMobile) setMobileOpen(false);
  };

  // עצירת ניווט
  const stopNavigation = () => {
    setIsNavigating(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
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

  const getCurrentStepIndex = () => {
    return Math.min(currentStopIndex, navigationSteps.length - 1);
  };

  const handleRetryRoute = () => {
    setRouteError(null);
    if (isNavigating) {
      loadRoute();
    } else {
      startNavigation();
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
          {/* Header */}
          {/* <Button variant="contained" color="primary" onClick={handleLocateUser}>
            📍 מצא את המיקום שלי
          </Button> */}
          <LocationPermissionPopup
            open={locationPopupOpen}
            onClose={() => setLocationPopupOpen(false)}
            onConfirm={handleLocationConfirm}
          />

          <Header
            onMenuToggle={handleDrawerToggle}
            onLocationFocus={focusOnUserLocation}
            onShowAnalytics={() => setAnalyticsOpen(true)}
            setOpenAnalyticsDashboard={() => setOpenAnalyticsDashboard(prev => !prev)}
            deliveryStopsCount={deliveryStops.length}
            isNavigating={isNavigating}
            />

          {/* Main Content */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
            {openAnalyticsDashboard && <AnalyticsDashboard open={openAnalyticsDashboard} onClose={() => setOpenAnalyticsDashboard(false)} />}
            {/* Map Container */}
            <Box sx={{ flex: 1, position: 'relative' }}>
              <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
              {/* {ready && currentLocation && mapRef.current && (
                <UserLocationMarker location={currentLocation} map={mapRef.current} accuracy={locationAccuracy} />
              )} */}
              {/* Loading Overlay for Map */}
              {!ready && !mapLoadError && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    zIndex: 999,
                  }}>
                  <LoadingSpinner message="טוען מפה..." />
                </Box>
              )}

              {/* Map Error */}
              {mapLoadError && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    zIndex: 999,
                    p: 3,
                  }}>
                  <Alert
                    severity="error"
                    action={
                      <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                        רענן
                      </Button>
                    }>
                    {mapLoadError}
                  </Alert>
                </Box>
              )}

              {/* Instructions Overlay */}
              {ready && (
                <InstructionsOverlay
                  steps={navigationSteps}
                  currentStepIndex={getCurrentStepIndex()}
                  isNavigating={isNavigating}
                />
              )}

              {/* API Performance */}
              {!isMobile && ready && (
                <Box sx={{ position: 'absolute', top: 80, right: 16, width: 300, zIndex: 1000 }}>
                  <ApiPerformance timings={timings} loading={loading} />
                </Box>
              )}
            </Box>

            {/* Navigation Panel - Desktop */}
            {!isMobile && mobileOpen && (
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
                ready={ready}
                routeLoading={routeLoading}
                routeError={routeError}
                postponeDialogOpen={postponeDialogOpen}
                pendingStop={pendingStop}
                onConfirmPostpone={handleConfirmPostpone}
                onCancelPostpone={handleCancelPostpone}
                onClosePanel={handleDrawerToggle}
              />
            )}

            {/* Navigation Panel - Mobile Drawer */}
            {isMobile && mobileOpen && (
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                  '& .MuiDrawer-paper': {
                    boxSizing: 'border-box',
                    width: '100%',
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
                  ready={ready}
                  routeLoading={routeLoading}
                  routeError={routeError}
                  postponeDialogOpen={postponeDialogOpen}
                  pendingStop={pendingStop}
                  onConfirmPostpone={handleConfirmPostpone}
                  onCancelPostpone={handleCancelPostpone}
                  onClosePanel={handleDrawerToggle}
                />
              </Drawer>
            )}
          </Box>

          {/* Footer */}
          <Footer
            totalStops={deliveryStops.length}
            completedStops={deliveryStops.filter((s) => s.completed).length}
            currentStopIndex={currentStopIndex}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            isNavigating={isNavigating}
          />

          {/* Analytics Dashboard */}
          <SafeAnalyticsDashboard
            open={analyticsOpen}
            onClose={() => setAnalyticsOpen(false)}
            deliveryStops={deliveryStops}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            isNavigating={isNavigating}
          />

          {/* Route Error Handler */}
          <RouteErrorHandler error={routeError} onRetry={handleRetryRoute} onDismiss={() => setRouteError(null)} />

          {/* Global Loading Spinner */}
          {loading && (
            <Box
              sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
              }}>
              <LoadingSpinner message="טוען נתונים..." />
            </Box>
          )}
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default MapViewEnhanced;
