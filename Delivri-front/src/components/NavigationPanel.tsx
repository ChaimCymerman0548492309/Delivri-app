// src/components/NavigationPanel.tsx
import {
  Close as CloseIcon,
  Directions as DirectionsIcon,
  MyLocation as MyLocationIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  type SxProps,
  type Theme,
} from '@mui/material';
import { useMemo } from 'react';
import CityStreetSelector from '../services/CityStreetSelector';
import StatsAPI from '../services/StatsAPI';
import type { DeliveryStop, NavigationStep } from '../types/types';
import { logger } from '../utils/logger';
import { useRouteOptimization } from '../utils/utils';
import StopsTable from './Stops/StopsTable';
import InlineLoader from './ui/InlineLoader';

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
  onAddStop: (address: string, coords: [number, number]) => void;
  currentLocation: [number, number] | null;
  locationAccuracy: number | null;
  ready?: boolean;
  routeLoading: boolean;
  routeError: string | null;
  postponeDialogOpen: boolean;
  pendingStop: DeliveryStop | null;
  onConfirmPostpone: () => void;
  onCancelPostpone: () => void;
  onUpdateStop: (stopId: string, updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>>) => void;
  onFocusOnMap: (coords: [number, number]) => void;
  onClosePanel: () => void;
  sx?: SxProps<Theme>;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  onStartNavigation,
  onStopNavigation,
  deliveryStops,
  currentStopIndex,
  onCompleteStop,
  onRemoveStop,
  onPostponeStop,
  totalDistance,
  totalDuration,
  onAddStop,
  currentLocation,
  locationAccuracy,
  ready = false,
  routeLoading,
  routeError,
  postponeDialogOpen,
  pendingStop,
  onConfirmPostpone,
  onCancelPostpone,
  onUpdateStop,
  onFocusOnMap,
  onClosePanel,
  sx,
}) => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const { geocodeAddress } = useRouteOptimization();

  const MAX_STOPS = 10;
  const isMaxStopsReached = deliveryStops.length >= MAX_STOPS;

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ש׳ ${remainingMinutes} דק׳`;
  };

  const progressValue = useMemo(() => {
    if (!deliveryStops.length) return 0;
    return ((currentStopIndex + (isNavigating ? 1 : 0)) / deliveryStops.length) * 100;
  }, [currentStopIndex, deliveryStops.length, isNavigating]);

  // === Event Logging Helper ===
  const logEvent = async (type: string, data?: Record<string, unknown>) => {
    try {
      await StatsAPI.postEvent({ type, data });
    } catch (err) {
      logger.warn('Event log failed', { type, err });
    }
  };

  const handleStart = () => {
    const city = deliveryStops[0]?.address?.split(' ').slice(-1)[0] || 'לא ידוע';

    void logEvent('startNavigation', {
      city,
      stops: deliveryStops.length,
      currentLocation,
      routeDistanceKm: totalDistance / 1000,
      routeDurationMin: Math.round(totalDuration / 60),
      duration: Math.round(totalDuration / 60),
    });

    onStartNavigation();
  };

  const handleStop = () => {
    const city =
      deliveryStops[currentStopIndex]?.address?.split(' ').slice(-1)[0] ||
      deliveryStops[0]?.address?.split(' ').slice(-1)[0] ||
      'לא ידוע';

    void logEvent('sessionEnd', {
      city,
      completedStops: currentStopIndex,
      totalStops: deliveryStops.length,
      routeDistanceKm: totalDistance / 1000,
      routeDurationMin: Math.round(totalDuration / 60),
      duration: Math.round(totalDuration / 60),
    });

    onStopNavigation();
  };

  const handleAddStop = (fullAddress: string, coords: [number, number], city?: string) => {
    if (isMaxStopsReached) {
      alert(`בגרסה הנוכחית ניתן להוסיף עד ${MAX_STOPS} תחנות בלבד`);
      return;
    }

    void logEvent('addStop', { address: fullAddress, coords, city });
    onAddStop(fullAddress, coords);
  };

  const handleCompleteStop = (id: string) => {
    void logEvent('completeStop', { stopId: id });
    onCompleteStop(id);
  };

  const handleRemoveStop = (id: string) => {
    void logEvent('removeStop', { stopId: id });
    onRemoveStop(id);
  };

  const handlePostponeStop = (id: string) => {
    void logEvent('postponeStop', { stopId: id });
    onPostponeStop(id);
  };

  return (
    <Paper
      elevation={isMobile ? 0 : 2}
      sx={{
        width: '100%',
        height: isMobile ? '100vh' : '100%',
        maxHeight: isMobile ? '100vh' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        direction: 'rtl',
        borderRight: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper',
        minWidth: 0,
        ...sx,
      }}>
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          minHeight: 40,
          background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <DirectionsIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
            מנהל מסלול
          </Typography>
        </Box>
        <Tooltip title="סגירה">
          <IconButton color="inherit" onClick={onClosePanel} size="small" sx={{ p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Location Status */}
      {currentLocation && (
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            bgcolor: 'primary.dark',
            color: 'white',
            flexShrink: 0,
          }}>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem' }}>
            <MyLocationIcon sx={{ fontSize: 12, ml: 0.5 }} />
            מיקום זמין
            {locationAccuracy && ` · ~${Math.round(locationAccuracy)} מ׳`}
          </Typography>
        </Box>
      )}

      {/* Navigation Progress */}
      {isNavigating && (
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            bgcolor: 'primary.light',
            height: 4,
            '& .MuiLinearProgress-bar': { bgcolor: 'white' },
            flexShrink: 0,
          }}
        />
      )}

      {/* Controls */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}>
        {routeLoading && <InlineLoader label="מחשב מסלול..." size="xs" />}
        <Button
          fullWidth
          variant={isNavigating ? 'outlined' : 'contained'}
          color={isNavigating ? 'error' : 'primary'}
          size="small"
          startIcon={
            isNavigating ? (
              <StopIcon fontSize="small" />
            ) : routeLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <PlayArrowIcon fontSize="small" />
            )
          }
          onClick={isNavigating ? handleStop : handleStart}
          disabled={routeLoading || !ready || (!isNavigating && (!currentLocation || deliveryStops.length === 0))}
          sx={{ py: 0.75, fontSize: '0.8125rem', fontWeight: 600 }}>
          {isNavigating ? 'עצור' : `התחל ניווט · ${deliveryStops.length}`}
        </Button>

        {routeError && (
          <Alert severity="error" sx={{ mt: 0.75, py: 0, fontSize: '0.75rem', '& .MuiAlert-message': { py: 0.5 } }}>
            {routeError}
          </Alert>
        )}

        {isMaxStopsReached && (
          <Alert
            severity="warning"
            icon={<WarningIcon fontSize="small" />}
            sx={{ mt: 0.75, py: 0, fontSize: '0.75rem', '& .MuiAlert-message': { py: 0.5 } }}>
            מקסימום {MAX_STOPS} תחנות
          </Alert>
        )}

        {isNavigating && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              mt: 0.75,
              px: 0.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            }}>
            <Typography variant="caption" color="text.secondary">
              {(totalDistance / 1000).toFixed(1)} ק״מ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(totalDuration)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentStopIndex + 1}/{deliveryStops.length}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add Stop */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          minWidth: 0,
          width: '100%',
        }}>
        <CityStreetSelector
          currentLocation={currentLocation}
          disabled={isMaxStopsReached}
          onSelect={async (city, street, houseNumber) => {
            if (isMaxStopsReached) {
              alert(`בגרסה הנוכחית ניתן להוסיף עד ${MAX_STOPS} תחנות בלבד`);
              return;
            }

            const fullAddress = `${street} ${houseNumber || ''} ${city}`.trim();
            const result = await geocodeAddress(fullAddress);
            if (result) await handleAddStop(fullAddress, result, city);
            else alert('לא הצלחנו לאתר את הכתובת שבחרת');
          }}
        />
      </Box>

      {/* Stops List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
          minHeight: 0,
        }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1,
            fontSize: '0.68rem',
            lineHeight: 1.3,
            opacity: 0.85,
          }}>
          עד {MAX_STOPS} תחנות · {deliveryStops.length}/{MAX_STOPS}
        </Typography>

        <StopsTable
          stops={deliveryStops}
          currentStopIndex={currentStopIndex}
          isNavigating={isNavigating}
          onComplete={handleCompleteStop}
          onRemove={handleRemoveStop}
          onPostpone={handlePostponeStop}
          onUpdate={onUpdateStop}
          onFocusOnMap={onFocusOnMap}
        />
      </Box>

      {/* Postpone Dialog */}
      <Dialog open={postponeDialogOpen} onClose={onCancelPostpone} fullScreen={isMobile}>
        <DialogTitle sx={{ direction: 'rtl' }}>דחיית תחנה</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Typography>
            {pendingStop ? `האם ברצונך לדחות את "${pendingStop.address}" לסוף?` : 'האם לדחות את התחנה לסוף המסלול?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl', gap: 1, p: 2 }}>
          <Button onClick={onCancelPostpone} color="inherit" size={isMobile ? 'large' : 'medium'} fullWidth={isMobile}>
            ביטול
          </Button>
          <Button
            onClick={onConfirmPostpone}
            variant="contained"
            color="primary"
            size={isMobile ? 'large' : 'medium'}
            fullWidth={isMobile}>
            דחייה
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NavigationPanel;
