// src/components/NavigationPanel.tsx
import {
  Add as AddIcon,
  Close as CloseIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
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
  type SxProps,
  type Theme,
} from '@mui/material';
import { useMemo } from 'react';
import CityStreetSelector from '../services/CityStreetSelector';
import StatsAPI from '../services/StatsAPI';
import type { DeliveryStop, NavigationStep } from '../types/types';
import { logger } from '../utils/logger';
import { useRouteOptimization } from '../utils/utils';
import StopListItem from './Markers/StopListItem';
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
          p: 2,
          background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
            מנהל מסלול
          </Typography>
        </Box>
        <Tooltip title="סגירה">
          <IconButton color="inherit" onClick={onClosePanel} size={isMobile ? 'small' : 'medium'}>
            <CloseIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Location Status */}
      {currentLocation && (
        <Box
          sx={{
            px: isMobile ? 1.5 : 2,
            py: 1,
            bgcolor: 'primary.dark',
            color: 'white',
            flexShrink: 0,
          }}>
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
            flexShrink: 0,
          }}
        />
      )}

      {/* Controls */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          position: 'relative',
        }}>
        {routeLoading && (
          <Box sx={{ mb: 1 }}>
            <InlineLoader label="מחשב מסלול..." size="xs" fullWidth />
          </Box>
        )}
        <Button
          fullWidth
          variant={isNavigating ? 'outlined' : 'contained'}
          color={isNavigating ? 'error' : 'primary'}
          size={isMobile ? 'medium' : 'large'}
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
          sx={{
            py: isMobile ? 1 : 1.2,
            mb: 1,
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}>
          {isNavigating ? 'עצור ניווט' : `התחל (${deliveryStops.length})`}
        </Button>

        {routeError && (
          <Alert severity="error" sx={{ textAlign: 'right', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
            {routeError}
          </Alert>
        )}

        {isMaxStopsReached && (
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            sx={{
              textAlign: 'right',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              mt: 1,
            }}>
            הגעת למקסימום {MAX_STOPS} תחנות בגרסה זו
          </Alert>
        )}

        {isNavigating && (
          <Card
            sx={{
              bgcolor: 'primary.light',
              color: 'white',
              mt: 1,
              '& .MuiCardContent-root': { py: isMobile ? 1.5 : 2 },
            }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: isMobile ? 1 : 2,
                }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant={isMobile ? 'caption' : 'body2'}>מרחק</Typography>
                  <Typography variant={isMobile ? 'body2' : 'h6'} fontWeight="bold">
                    {(totalDistance / 1000).toFixed(1)} ק״מ
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant={isMobile ? 'caption' : 'body2'}>משך</Typography>
                  <Typography variant={isMobile ? 'body2' : 'h6'} fontWeight="bold">
                    {formatTime(totalDuration)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant={isMobile ? 'caption' : 'body2'}>תחנה</Typography>
                  <Typography variant={isMobile ? 'body2' : 'h6'} fontWeight="bold">
                    {currentStopIndex + 1}/{deliveryStops.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Add Stop */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          minWidth: 0,
          width: '100%',
        }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}>
          <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          הוספת תחנה {isMaxStopsReached && `(מקסימום ${MAX_STOPS})`}
        </Typography>
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
          p: isMobile ? 1.5 : 2,
          minHeight: 0, // Important for flexbox scrolling
        }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}>
          <LocationIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
          בגרסה הנוכחית ניתן להוסיף עד 10 תחנות  ({deliveryStops.length}/{MAX_STOPS})
        </Typography>

        <List sx={{ py: 0 }}>
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
              // compact={isMobile}
            />
          ))}
        </List>
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
