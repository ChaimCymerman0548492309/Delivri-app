/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import {
  Box,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  // Snackbar,
  Alert,
} from '@mui/material';
import * as maplibregl from 'maplibre-gl';

// Components
import Header from './Header';
import Footer from './Footer';
import InstructionsOverlay from './InstructionsOverlay';
// import AnalyticsDashboard from './SafeAnalyticsDashboard';
import ApiPerformance from './ApiPerformance';
import LoadingSpinner from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';
import RouteErrorHandler from './RouteErrorHandler';

// Hooks
import { useApiTimer } from '../hooks/useApiTimer';
import { initializeMap, cleanupMap, useGeolocation } from '../utils/mapUtils';
import type { DeliveryStop, NavigationStep } from '../types/types';
import { useRouteOptimization } from '../utils/utils';
import { NavigationPanel } from './MapView';
import SafeAnalyticsDashboard from './SafeAnalyticsDashboard';

const MapViewEnhanced = () => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { optimizeRouteWithTSP, getRouteData } = useRouteOptimization();

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
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width:768px)');
  // const isTablet = useMediaQuery('(max-width:1024px)');

  const { currentLocation, locationAccuracy, getCurrentLocation } = useGeolocation();
  const { timings, loading, trackApiCall } = useApiTimer();

  const theme = createTheme({
    direction: 'rtl',
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      error: { main: '#f44336' },
      warning: { main: '#ff9800' },
    },
  });

  // אתחול מפה עם טיפול בשגיאות
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      mapRef.current = initializeMap(containerRef.current, async () => {
        setReady(true);
        setMapLoadError(null);
        try {
          await trackApiCall(() => getCurrentLocation(), 'אתחול מיקום');
        } catch (error) {
          console.error('Failed to get initial location:', error);
          setMapLoadError('לא ניתן לאחזר מיקום נוכחי');
        }
      });

      mapRef.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapLoadError('שגיאה בטעינת המפה');
      });
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapLoadError('שגיאה באתחול המפה');
    }

    return () => {
      cleanupMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  // טעינת מסלול עם טיפול בשגיאות משופר
  const loadRoute = async (retryCount = 0): Promise<boolean> => {
    if (!ready || !mapRef.current || !currentLocation) {
      setRouteError('מפה או מיקום לא זמינים');
      return false;
    }

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
    setPostponeDialogOpen(true);
  };

  const confirmPostpone = () => {
    setDeliveryStops((prev) => {
      const stopIndex = prev.findIndex((stop) => stop.id === selectedStopId);
      if (stopIndex === -1) return prev;

      const newStops = [...prev];
      const [postponedStop] = newStops.splice(stopIndex, 1);
      newStops.push(postponedStop);

      return newStops.map((stop, index) => ({ ...stop, order: index }));
    });

    setPostponeDialogOpen(false);
    setSelectedStopId('');

    // טען מחדש את המסלול אם במוד ניווט
    if (isNavigating) {
      loadRoute();
    }
  };

  // סימון תחנה כבוצע
  const handleCompleteStop = (stopId: string) => {
    setDeliveryStops((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, completed: true } : stop)));

    const currentIndex = deliveryStops.findIndex((stop) => stop.id === stopId);
    if (currentIndex === currentStopIndex && currentIndex < deliveryStops.length - 1) {
      setCurrentStopIndex(currentIndex + 1);
    }

    if (currentIndex === deliveryStops.length - 1) {
      setIsNavigating(false);
      if (locationTimerRef.current) {
        clearInterval(locationTimerRef.current);
        locationTimerRef.current = null;
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
          <Header
            onMenuToggle={handleDrawerToggle}
            onLocationFocus={focusOnUserLocation}
            onShowAnalytics={() => setAnalyticsOpen(true)}
            deliveryStopsCount={deliveryStops.length}
            isNavigating={isNavigating}
          />

          {/* Main Content */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
            {/* Map Container */}
            <Box sx={{ flex: 1, position: 'relative' }}>
              <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
            {!isMobile && (
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
            )}

            {/* Navigation Panel - Mobile Drawer */}
            {isMobile && (
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

          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.7; }
              100% { transform: scale(1); opacity: 1; }
            }
            
            .delivery-marker {
              width: 36px;
              height: 36px;
              background-color: #f44336;
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
            }
            
            .delivery-marker.completed {
              background-color: #4caf50;
            }
            
            .delivery-marker.current {
              background-color: #ff9800;
              animation: pulse 2s infinite;
            }
            
            .user-location-marker {
              width: 20px;
              height: 20px;
              background-color: #2196f3;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            }
          `}</style>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default MapViewEnhanced;
