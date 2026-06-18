import { Box, LinearProgress, Paper, Tooltip, Typography, alpha } from '@mui/material';
import { formatDistance, formatDuration } from '../utils/formatters';

interface FooterProps {
  totalStops: number;
  completedStops: number;
  currentStopIndex: number;
  totalDistance: number;
  totalDuration: number;
  isNavigating: boolean;
}

const Stat = ({ label, value, tooltip }: { label: string; value: string; tooltip: string }) => (
  <Tooltip title={tooltip} arrow placement="top">
    <Box
      sx={{
        textAlign: 'center',
        minWidth: 56,
        cursor: 'help',
        px: 0.5,
        borderRadius: 1,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
      }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: '0.8125rem' }}>
        {value}
      </Typography>
    </Box>
  </Tooltip>
);

const Footer = ({
  totalStops,
  completedStops,
  currentStopIndex,
  totalDistance,
  totalDuration,
  isNavigating,
}: FooterProps) => {
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        borderTop: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
      }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 3,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
          '& .MuiLinearProgress-bar': {
            bgcolor: isNavigating ? 'success.main' : 'primary.main',
            transition: 'transform 0.4s ease',
          },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          px: 1.5,
          py: 0.75,
          bgcolor: 'background.paper',
        }}>
        <Stat
          label="התקדמות"
          value={`${completedStops}/${totalStops}`}
          tooltip="מספר התחנות שסומנו כבוצעו, מתוך סך התחנות במסלול"
        />
        <Stat
          label="תחנה"
          value={totalStops > 0 ? `${currentStopIndex + 1}` : '—'}
          tooltip="מספר התחנה הנוכחית בניווט (לפי סדר המסלול)"
        />
        <Stat
          label="מרחק"
          value={totalDistance > 0 ? formatDistance(totalDistance) : '—'}
          tooltip="סך המרחק המשוער של המסלול המלא"
        />
        <Stat
          label="זמן"
          value={totalDuration > 0 ? formatDuration(totalDuration) : '—'}
          tooltip="זמן הנסיעה המשוער למסלול המלא"
        />
      </Box>
    </Paper>
  );
};

export default Footer;
