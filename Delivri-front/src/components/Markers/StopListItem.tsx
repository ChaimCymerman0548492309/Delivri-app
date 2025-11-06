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
  Schedule as ScheduleIcon,
  NearMe as DistanceIcon, // ← שינוי כאן
  AccessTime as AccessTimeIcon,
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
  Collapse,
  Divider,
  Fade,
} from '@mui/material';
import {  useState } from 'react';
import type { DeliveryStop } from '../../types/types';
// import CityStreetSelector from '../services/CityStreetSelector';
// import { useRouteOptimization } from '../utils/utils';
// import type { DeliveryStop,  } from '../types/types';

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
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = () => {
    if (stop.completed) return 'success';
    if (stop.postponed) return 'secondary';
    if (isCurrent && isNavigating) return 'warning';
    return 'primary';
  };

  const getStatusText = () => {
    if (stop.completed) return 'בוצע';
    if (stop.postponed) return 'נדחה';
    if (isCurrent && isNavigating) return 'בניווט';
    return 'ממתין';
  };

  const getStatusIcon = () => {
    if (stop.completed) return <CheckCircleIcon fontSize="small" />;
    if (stop.postponed) return <MoreTimeIcon fontSize="small" />;
    if (isCurrent && isNavigating) return <NavigationIcon fontSize="small" />;
    return <LocationIcon fontSize="small" />;
  };

  const formatTime = (seconds: number | undefined) => {
    if (seconds == null) return 'טוען...';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} ש׳ ${remainingMinutes} דק׳` : `${hours} ש׳`;
  };

  const formatDistance = (meters: number | undefined) => {
    if (meters == null) return 'טוען...';
    if (meters < 1000) return `${Math.round(meters)} מ׳`;
    return `${(meters / 1000).toFixed(1)} ק״מ`;
  };

  const getProgressValue = () => {
    if (!stop.estimatedTime || !isCurrent) return 0;
    // Simulate progress based on time - in real app this would come from GPS
    return Math.min(85, Math.round((index / (index + 3)) * 100));
  };

  const getTimeRemaining = () => {
    if (!stop.estimatedTime || !isCurrent) return null;
    // Simulate time remaining - in real app this would come from navigation service
    return Math.max(0, stop.estimatedTime - (stop.estimatedTime * getProgressValue()) / 100);
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Fade in timeout={500}>
      <ListItem
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setShowDetails(!showDetails)}
        sx={{
          border: 2,
          borderColor:
            isCurrent && isNavigating
              ? 'warning.main'
              : stop.completed
              ? 'success.main'
              : stop.postponed
              ? 'grey.400'
              : 'divider',
          borderRadius: 3,
          mb: 2,
          bgcolor:
            isCurrent && isNavigating
              ? 'warning.50'
              : stop.completed
              ? 'success.50'
              : stop.postponed
              ? 'grey.50'
              : 'background.paper',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          direction: 'rtl',
          transform: isHovered ? 'translateY(-2px) scale(1.01)' : 'none',
          boxShadow: isHovered ? 3 : 1,
          overflow: 'hidden',
          position: 'relative',
          '&::before':
            isCurrent && isNavigating
              ? {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 4,
                  height: '100%',
                  bgcolor: 'warning.main',
                }
              : {},
        }}>
        {/* Active Navigation Progress Bar */}
        {isCurrent && isNavigating && (
          <LinearProgress
            variant="determinate"
            value={getProgressValue()}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              left: 0,
              height: 3,
              bgcolor: 'warning.light',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'warning.main',
                transition: 'transform 0.4s ease',
              },
            }}
          />
        )}

        {/* Stop Number Indicator */}
        <ListItemIcon sx={{ minWidth: 44, ml: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor:
                isCurrent && isNavigating
                  ? 'warning.main'
                  : stop.completed
                  ? 'success.main'
                  : stop.postponed
                  ? 'grey.500'
                  : 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: 3,
              position: 'relative',
              transition: 'all 0.3s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}>
            {index + 1}

            {/* Pulsing dot for active stop */}
            {isCurrent && isNavigating && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                  border: '2px solid white',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': {
                      transform: 'scale(0.8)',
                      opacity: 1,
                    },
                    '70%': {
                      transform: 'scale(1.5)',
                      opacity: 0.7,
                    },
                    '100%': {
                      transform: 'scale(0.8)',
                      opacity: 1,
                    },
                  },
                }}
              />
            )}
          </Box>
        </ListItemIcon>

        {/* Main Content */}
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 'medium',
                  flex: 1,
                  textDecoration: stop.completed ? 'line-through' : 'none',
                  opacity: stop.completed ? 0.7 : 1,
                  lineHeight: 1.4,
                }}>
                {stop.address}
              </Typography>
              <Chip
                icon={getStatusIcon()}
                label={getStatusText()}
                size="small"
                color={getStatusColor()}
                variant={isCurrent ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 'bold',
                  minWidth: 80,
                  '& .MuiChip-icon': {
                    color: 'inherit !important',
                  },
                }}
              />
            </Box>
          }
          secondary={
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1.5, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Estimated Time */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        זמן משוער:
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="medium">
                      {formatTime(stop.estimatedTime)}
                    </Typography>
                  </Box>

                  {/* Distance from Previous */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DistanceIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        מרחק מהקודמת:
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDistance(stop.distanceFromPrevious)}
                    </Typography>
                  </Box>

                  {/* Progress and Time Remaining for Active Navigation */}
                  {isCurrent && isNavigating && timeRemaining !== null && (
                    <>
                      <Divider />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="warning.main" fontWeight="bold">
                            זמן נותר:
                          </Typography>
                          <Typography variant="body2" color="warning.main" fontWeight="bold">
                            {formatTime(timeRemaining)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress
                            size={16}
                            thickness={6}
                            variant="determinate"
                            value={getProgressValue()}
                            color="warning"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {getProgressValue()}% הושלם
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}

                  {/* Current Location Info */}
                  {isCurrent && isNavigating && currentLocation && (
                    <Alert
                      severity="info"
                      icon={<MyLocationIcon fontSize="small" />}
                      sx={{
                        py: 0.5,
                        mt: 1,
                        '& .MuiAlert-message': {
                          padding: '4px 0',
                        },
                      }}>
                      <Typography variant="body2">ניווט פעיל לנקודה זו</Typography>
                    </Alert>
                  )}
                </Box>
              </Box>
            </Collapse>
          }
          sx={{
            '& .MuiListItemText-secondary': {
              display: 'block',
            },
          }}
        />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mr: 1 }}>
          {isCurrent && isNavigating && !stop.completed && (
            <Tooltip title="סימון כבוצע">
              <IconButton
                size="small"
                color="success"
                onClick={(event) => {
                  event.stopPropagation();
                  onComplete();
                }}
                sx={{
                  bgcolor: 'success.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'success.dark' },
                  boxShadow: 2,
                  transition: 'all 0.2s ease',
                }}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {!stop.completed && !stop.postponed && !isCurrent && (
            <Tooltip title="דחייה לסוף הרשימה">
              <IconButton
                size="small"
                color="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  onPostpone();
                }}
                sx={{
                  bgcolor: 'grey.300',
                  '&:hover': { bgcolor: 'grey.400' },
                  boxShadow: 2,
                  transition: 'all 0.2s ease',
                }}>
                <MoreTimeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="הסרה מהמסלול">
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': { bgcolor: 'error.dark' },
                boxShadow: 2,
                transition: 'all 0.2s ease',
              }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Subtle Hover Effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            bgcolor: 'primary.main',
            opacity: isHovered ? 0.03 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      </ListItem>
    </Fade>
  );
};

export default StopListItem;
