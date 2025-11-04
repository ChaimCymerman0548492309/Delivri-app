import { Box, LinearProgress, Typography, Paper } from '@mui/material';

interface FooterProps {
  totalStops: number;
  completedStops: number;
  currentStopIndex: number;
  totalDistance: number;
  totalDuration: number;
  isNavigating: boolean;
}

const Footer: React.FC<FooterProps> = ({
  totalStops,
  completedStops,
  currentStopIndex,
  totalDistance,
  totalDuration,
  isNavigating,
}) => {
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes} דקות`;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: 0,
      }}>
      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          '& .MuiLinearProgress-bar': {
            backgroundColor: isNavigating ? '#4caf50' : '#1976d2',
          },
        }}
      />

      {/* Stats Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
        }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              התקדמות
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {completedStops}/{totalStops}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              תחנה נוכחית
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {currentStopIndex + 1}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              מרחק
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {(totalDistance / 1000).toFixed(1)} ק"מ
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              זמן
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatTime(totalDuration)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default Footer;
