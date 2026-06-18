import { Box, useMediaQuery } from '@mui/material';
import { useCallback, useState } from 'react';
import { useApiTimer } from '../hooks/useApiTimer';
import { useDeliveryStops } from '../hooks/useDeliveryStops';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useMapInstance } from '../hooks/useMapInstance';
import { useNavigation, useVoiceGuidance } from '../hooks/useNavigation';
import { useRouteLoader } from '../hooks/useRouteLoader';
import { useStopMarkers } from '../hooks/useStopMarkers';
import Footer from '../pages/Footer';
import Header from '../pages/Header';
import LoadingSpinner from '../pages/LoadingSpinner';
import LocationPermissionPopup from '../pages/LocationPermissionPopup';
import RouteErrorHandler from '../pages/RouteErrorHandler';
import ErrorBoundary from '../pages/ErrorBoundary';
import MapCanvas from './Map/MapCanvas';
import NavigationPanelShell from './Map/NavigationPanelShell';
import SafeAnalyticsDashboard from './Dashboard/SafeAnalyticsDashboard';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';

const MapViewEnhanced = () => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [panelOpen, setPanelOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [serverAnalyticsOpen, setServerAnalyticsOpen] = useState(false);

  const { mapRef, containerRef, ready, mapLoadError, setMapLoadError } = useMapInstance();
  const { timings, loading: apiLoading, trackApiCall } = useApiTimer();

  const {
    deliveryStops,
    currentStopIndex,
    setCurrentStopIndex,
    postponeDialogOpen,
    pendingStop,
    handleAddStop: addStop,
    handleRemoveStop,
    handlePostponeStop,
    handleConfirmPostpone,
    handleCancelPostpone,
    handleCompleteStop: completeStop,
  } = useDeliveryStops();

  const {
    currentLocation,
    locationAccuracy,
    locationPopupOpen,
    setLocationPopupOpen,
    handleLocationConfirm,
    startNavigationWatch,
    stopNavigationWatch,
    focusOnUserLocation,
  } = useLocationTracking(mapRef, ready);

  const {
    navigationSteps,
    totalDistance,
    totalDuration,
    routeError,
    routeLoading,
    setRouteError,
    loadRoute,
  } = useRouteLoader({ mapRef, ready, currentLocation, deliveryStops, trackApiCall });

  useStopMarkers(mapRef, deliveryStops, currentStopIndex);

  const mapFlyTo = useCallback(
    (center: [number, number]) => mapRef.current?.flyTo({ center, zoom: 14, essential: true }),
    [mapRef],
  );

  const { isNavigating, setIsNavigating, startNavigation, stopNavigation } = useNavigation({
    deliveryStopsCount: deliveryStops.length,
    loadRoute,
    mapFlyTo,
    currentLocation,
    startNavigationWatch,
    stopNavigationWatch,
    setRouteError,
    setCurrentStopIndex,
    onMobileClose: isMobile ? () => setPanelOpen(false) : undefined,
  });

  useVoiceGuidance(isNavigating, navigationSteps, currentStopIndex);

  const handleAddStop = (address: string, coordinates: [number, number]) => {
    const ok = addStop(address, coordinates);
    if (!ok) setRouteError('לא ניתן למצוא את הכתובת. אנא נסה שוב.');
    else {
      setRouteError(null);
      if (isMobile) setPanelOpen(false);
    }
  };

  const handleCompleteStop = (stopId: string) => {
    completeStop(stopId, () => {
      setIsNavigating(false);
      stopNavigationWatch();
    });
  };

  const handleLocationConfirmWrapper = async () => {
    try {
      await handleLocationConfirm();
    } catch {
      setMapLoadError('אין הרשאה למיקום');
    }
  };

  const handleRetryRoute = () => {
    setRouteError(null);
    if (isNavigating) loadRoute();
    else startNavigation();
  };

  const panelProps = {
    isNavigating,
    onStartNavigation: startNavigation,
    onStopNavigation: stopNavigation,
    deliveryStops,
    currentStopIndex,
    onCompleteStop: handleCompleteStop,
    onRemoveStop: handleRemoveStop,
    onPostponeStop: handlePostponeStop,
    navigationSteps,
    totalDistance,
    totalDuration,
    onAddStop: handleAddStop,
    currentLocation,
    locationAccuracy,
    ready,
    routeLoading,
    routeError,
    postponeDialogOpen,
    pendingStop,
    onConfirmPostpone: handleConfirmPostpone,
    onCancelPostpone: handleCancelPostpone,
  };

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <LocationPermissionPopup
            open={locationPopupOpen}
            onClose={() => setLocationPopupOpen(false)}
            onConfirm={handleLocationConfirmWrapper}
          />

          <Header
            onMenuToggle={() => setPanelOpen((p) => !p)}
            onLocationFocus={focusOnUserLocation}
            onShowLocalAnalytics={() => setAnalyticsOpen(true)}
            onShowServerAnalytics={() => setServerAnalyticsOpen(true)}
            deliveryStopsCount={deliveryStops.length}
            isNavigating={isNavigating}
            panelOpen={panelOpen}
          />

          <Box sx={{ display: 'flex', flex: 1, minHeight: 0, pb: { xs: 7, sm: 7 } }}>
            <MapCanvas
              containerRef={containerRef}
              ready={ready}
              mapLoadError={mapLoadError}
              isNavigating={isNavigating}
              navigationSteps={navigationSteps}
              currentStepIndex={Math.min(currentStopIndex, Math.max(navigationSteps.length - 1, 0))}
              timings={timings}
              apiLoading={apiLoading}
              showApiPerformance={!isMobile}
            />

            <NavigationPanelShell
              isMobile={isMobile}
              mobileOpen={panelOpen}
              onClosePanel={() => setPanelOpen(false)}
              panelProps={panelProps}
            />
          </Box>

          <Footer
            totalStops={deliveryStops.length}
            completedStops={deliveryStops.filter((s) => s.completed).length}
            currentStopIndex={currentStopIndex}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            isNavigating={isNavigating}
          />

          <SafeAnalyticsDashboard
            open={analyticsOpen}
            onClose={() => setAnalyticsOpen(false)}
            deliveryStops={deliveryStops}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            isNavigating={isNavigating}
          />

          {serverAnalyticsOpen && (
            <AnalyticsDashboard open={serverAnalyticsOpen} onClose={() => setServerAnalyticsOpen(false)} />
          )}

          <RouteErrorHandler error={routeError} onRetry={handleRetryRoute} onDismiss={() => setRouteError(null)} />

          {apiLoading && (
            <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
              <LoadingSpinner message="טוען נתונים..." />
            </Box>
          )}
        </Box>
    </ErrorBoundary>
  );
};

export default MapViewEnhanced;
