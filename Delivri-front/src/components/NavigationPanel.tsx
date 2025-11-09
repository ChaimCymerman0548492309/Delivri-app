// src/components/NavigationPanel.tsx
import {
  Add as AddIcon,
  Close as CloseIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMemo } from 'react';
import CityStreetSelector from '../services/CityStreetSelector';
import { useRouteOptimization } from '../utils/utils';
import type { DeliveryStop, NavigationStep } from '../types/types';
import StopListItem from './Markers/StopListItem';
import StatsAPI from '../services/StatsAPI';

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
  onClosePanel: () => void;
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
  onClosePanel,
}) => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const { geocodeAddress } = useRouteOptimization();

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logEvent = async (type: string, data?: Record<string, any>) => {
    try {
      await StatsAPI.postEvent({ type, data });
    } catch (err) {
      console.warn('Event log failed:', err);
    }
  };

const handleStart = async () => {
  await logEvent('startNavigation', {
    stops: deliveryStops.length,
    currentLocation,
    routeDistanceKm: totalDistance / 1000,
    routeDurationMin: Math.round(totalDuration / 60),
  });
  onStartNavigation();
};

const handleStop = async () => {
  await logEvent('sessionEnd', {
    completedStops: currentStopIndex,
    totalStops: deliveryStops.length,
    routeDistanceKm: totalDistance / 1000,
    routeDurationMin: Math.round(totalDuration / 60),
  });
  onStopNavigation();
};


  // const handleStop = async () => {
  //   await logEvent('stopNavigation', { completed: currentStopIndex });
  //   onStopNavigation();
  // };

  // const handleAddStop = async (fullAddress: string, coords: [number, number]) => {
  //   await logEvent('addStop', { address: fullAddress, coords });
  //   onAddStop(fullAddress, coords);
  // };
  const handleAddStop = async (fullAddress: string, coords: [number, number], city?: string) => {
    await logEvent('addStop', { address: fullAddress, coords, city });
    onAddStop(fullAddress, coords);
  };


  const handleCompleteStop = async (id: string) => {
    await logEvent('completeStop', { stopId: id });
    onCompleteStop(id);
  };

  const handleRemoveStop = async (id: string) => {
    await logEvent('removeStop', { stopId: id });
    onRemoveStop(id);
  };

  const handlePostponeStop = async (id: string) => {
    await logEvent('postponeStop', { stopId: id });
    onPostponeStop(id);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: isMobile ? '100%' : 420,
        height: isMobile ? 'auto' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 0 : 2,
        overflow: 'hidden',
        direction: 'rtl',
      }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsIcon />
          <Typography variant="h6">מנהל מסלול המשלוחים</Typography>
        </Box>
        <Tooltip title="סגירה">
          <IconButton color="inherit" onClick={onClosePanel}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Location Status */}
      {currentLocation && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'primary.dark', color: 'white' }}>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
            <MyLocationIcon sx={{ fontSize: 14, ml: 0.5 }} />
            מיקום נוכחי זמין
            {locationAccuracy && ` (דיוק: ~${Math.round(locationAccuracy)} מ׳)`}
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
          }}
        />
      )}

      {/* Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant={isNavigating ? 'outlined' : 'contained'}
          color={isNavigating ? 'error' : 'primary'}
          size="large"
          startIcon={
            isNavigating ? (
              <StopIcon />
            ) : routeLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <PlayArrowIcon />
            )
          }
          onClick={isNavigating ? handleStop : handleStart}
          disabled={routeLoading || !ready || (!isNavigating && (!currentLocation || deliveryStops.length === 0))}
          sx={{ py: 1.2, mb: 1 }}>
          {isNavigating ? 'עצירת הניווט' : `התחל ניווט (${deliveryStops.length})`}
        </Button>

        {routeError && (
          <Alert severity="error" sx={{ textAlign: 'right' }}>
            {routeError}
          </Alert>
        )}

        {isNavigating && (
          <Card sx={{ bgcolor: 'primary.light', color: 'white', mt: 1 }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">מרחק כולל</Typography>
                  <Typography variant="h6">{(totalDistance / 1000).toFixed(1)} ק״מ</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">משך משוער</Typography>
                  <Typography variant="h6">{formatTime(totalDuration)}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
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

      {/* Add Stop */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon /> הוספת תחנה חדשה
        </Typography>
        <CityStreetSelector
          onSelect={async (city, street, houseNumber) => {
            const fullAddress = `${street} ${houseNumber || ''} ${city}`.trim();
            const result = await geocodeAddress(fullAddress);
            if (result) handleAddStop(fullAddress, result, city);
            else alert('לא הצלחנו לאתר את הכתובת שבחרת');
          }}
        />
      </Box>

      {/* Stops List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon /> תחנות המסלול ({deliveryStops.length})
        </Typography>

        <List>
          {deliveryStops.map((stop, index) => (
            <StopListItem
              key={stop.id}
              stop={stop}
              index={index}
              isCurrent={index === currentStopIndex}
              isNavigating={isNavigating}
              onComplete={() => handleCompleteStop(stop.id)}
              onRemove={() => handleRemoveStop(stop.id)}
              onPostpone={() => handlePostponeStop(stop.id)}
              currentLocation={currentLocation}
            />
          ))}
        </List>
      </Box>

      {/* Postpone Dialog */}
      <Dialog open={postponeDialogOpen} onClose={onCancelPostpone}>
        <DialogTitle sx={{ direction: 'rtl' }}>דחיית תחנה</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Typography>
            {pendingStop ? `האם ברצונך לדחות את "${pendingStop.address}" לסוף?` : 'האם לדחות את התחנה לסוף המסלול?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl', gap: 1 }}>
          <Button onClick={onCancelPostpone} color="inherit">
            ביטול
          </Button>
          <Button onClick={onConfirmPostpone} variant="contained" color="primary">
            דחייה
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NavigationPanel;
