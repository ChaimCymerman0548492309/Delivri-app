import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationIcon,
  MoreTime as MoreTimeIcon,
  MyLocation as MyLocationIcon,
  Navigation as NavigationIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMemo, useState } from 'react';
import CityStreetSelector from '../services/CityStreetSelector';
import { useRouteOptimization } from '../utils/utils';
import type { DeliveryStop, NavigationStep } from '../types/types';

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
    if (stop.completed) return 'סומן כבוצע';
    if (isCurrent && isNavigating) return 'בביצוע';
    if (stop.postponed) return 'נדחה';
    return 'בהמתנה';
  };

  const formatTime = (seconds: number | undefined) => {
    if (seconds == null) return '—';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ש׳ ${remainingMinutes} דק׳`;
  };

  const formatDistance = (meters: number | undefined) => {
    if (meters == null) return '—';
    if (meters < 1000) return `${Math.round(meters)} מ׳`;
    return `${(meters / 1000).toFixed(1)} ק״מ`;
  };

  return (
    <ListItem
      onClick={() => setShowDetails((prev) => !prev)}
      sx={{
        border: 2,
        borderColor: isCurrent && isNavigating ? 'warning.main' : stop.completed ? 'success.main' : 'divider',
        borderRadius: 2,
        mb: 1.5,
        bgcolor: isCurrent && isNavigating ? 'warning.light' : stop.completed ? 'success.light' : 'background.paper',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        direction: 'rtl',
      }}>
      <ListItemIcon sx={{ minWidth: 36, ml: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: isCurrent && isNavigating ? 'warning.main' : stop.completed ? 'success.main' : 'primary.main',
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
              {stop.address}
            </Typography>
            <Chip label={getStatusText()} size="small" color={getStatusColor()} variant="outlined" />
          </Box>
        }
        secondary={
          showDetails ? (
            <Box sx={{ mt: 1 }}>
              <Typography component="div" variant="body2" color="text.secondary">
                זמן משוער להגעה: {formatTime(stop.estimatedTime)}
              </Typography>
              <Typography component="div" variant="body2" color="text.secondary">
                מרחק מהתחנה הקודמת: {formatDistance(stop.distanceFromPrevious)}
              </Typography>
              {isCurrent && isNavigating && currentLocation && (
                <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                  ניווט פעיל לנקודה זו
                </Typography>
              )}
            </Box>
          ) : (
            <Typography component="div" variant="body2" color="text.secondary">
              לחיצה תציג פרטים נוספים על התחנה
            </Typography>
          )
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
        {isCurrent && isNavigating && !stop.completed && (
          <Tooltip title="סימון התחנה כבוצעה">
            <IconButton
              size="small"
              color="success"
              onClick={(event) => {
                event.stopPropagation();
                onComplete();
              }}
              sx={{ bgcolor: 'success.light' }}>
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {!stop.completed && (
          <Tooltip title="דחיית התחנה לסוף המסלול">
            <IconButton
              size="small"
              color="info"
              onClick={(event) => {
                event.stopPropagation();
                onPostpone();
              }}
              sx={{ bgcolor: 'info.light' }}>
              <MoreTimeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="הסרת התחנה מהמסלול">
          <IconButton
            size="small"
            color="error"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            sx={{ bgcolor: 'error.light' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
  navigationSteps,
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
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          textAlign: 'center',
        }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <DirectionsIcon /> מנהל מסלול המשלוחים
        </Typography>
        {currentLocation && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
            <MyLocationIcon sx={{ fontSize: 14, ml: 0.5 }} />
            מיקום נוכחי זמין
            {locationAccuracy && ` (דיוק: ~${Math.round(locationAccuracy)} מ׳)`}
          </Typography>
        )}
        {isNavigating && (
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.3)', height: 6, borderRadius: 3 }}
          />
        )}
      </Box>

      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          fullWidth
          variant={isNavigating ? 'outlined' : 'contained'}
          color={isNavigating ? 'error' : 'primary'}
          size="large"
          startIcon={
            isNavigating ? <StopIcon /> : routeLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />
          }
          onClick={isNavigating ? onStopNavigation : onStartNavigation}
          disabled={!ready || routeLoading || (!isNavigating && (!currentLocation || deliveryStops.length === 0))}
          sx={{ py: 1.2 }}>
          {isNavigating ? 'עצירת הניווט' : `התחל ניווט (${deliveryStops.length} תחנות)`}
        </Button>

        {routeError && (
          <Alert severity="error" sx={{ textAlign: 'right' }}>
            {routeError}
          </Alert>
        )}

        {isNavigating && (
          <Card sx={{ mt: 1, bgcolor: 'primary.light', color: 'white' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2">מרחק כולל</Typography>
                  <Typography variant="h6">{(totalDistance / 1000).toFixed(1)} ק״מ</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">משך משוער</Typography>
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
          <AddIcon /> הוספת תחנה חדשה
        </Typography>

        <CityStreetSelector
          onSelect={async (city, street, houseNumber) => {
            const fullAddress = `${street} ${houseNumber || ''} ${city}`.trim();
            const result = await geocodeAddress(fullAddress);
            if (result) {
              onAddStop(fullAddress, result);
            } else {
              alert('לא הצלחנו לאתר את הכתובת שבחרת');
            }
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon /> תחנות המסלול
        </Typography>

        {deliveryStops.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50' }}>
            <CardContent>
              <LocationIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                עדיין לא נוספו תחנות למסלול.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                הוסף תחנה חדשה כדי להתחיל לתכנן את המסלול שלך.
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

      {isNavigating && navigationSteps.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NavigationIcon /> הנחיות אחרונות
          </Typography>

          <List dense>
            {navigationSteps.slice(0, 4).map((step, index) => (
              <ListItem
                key={`${index}-${step.instruction}`}
                sx={{
                  bgcolor: index === 0 ? 'primary.light' : 'background.default',
                  borderRadius: 1,
                  mb: 1,
                  border: index === 0 ? 2 : 1,
                  borderColor: index === 0 ? 'primary.main' : 'divider',
                  direction: 'rtl',
                }}>
                <ListItemText
                  primary={step.instruction}
                  secondary={`${(step.distance / 1000).toFixed(1)} ק״מ · ${Math.round(step.duration / 60)} דק׳`}
                  primaryTypographyProps={{
                    color: index === 0 ? 'primary.contrastText' : 'text.primary',
                    fontWeight: index === 0 ? 'bold' : 'normal',
                  }}
                  secondaryTypographyProps={{
                    color: index === 0 ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Dialog open={postponeDialogOpen} onClose={onCancelPostpone}>
        <DialogTitle sx={{ direction: 'rtl' }}>דחיית תחנה</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Typography>
            {pendingStop
              ? `האם ברצונך לדחות את התחנה "${pendingStop.address}" לסוף המסלול?`
              : 'האם ברצונך לדחות את התחנה שנבחרה לסוף המסלול?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={onCancelPostpone} color="inherit">
            ביטול
          </Button>
          <Button onClick={onConfirmPostpone} variant="contained" color="primary">
            דחיית התחנה
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NavigationPanel;
