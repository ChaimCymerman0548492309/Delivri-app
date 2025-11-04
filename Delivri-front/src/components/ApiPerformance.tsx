import { Paper, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';

interface ApiPerformanceProps {
  timings: { [key: string]: number };
  loading: boolean;
}

const ApiPerformance: React.FC<ApiPerformanceProps> = ({ timings, loading }) => {
  const getTimingColor = (ms: number) => {
    if (ms < 1000) return 'success';
    if (ms < 3000) return 'warning';
    return 'error';
  };

  const getTimingLabel = (ms: number) => {
    if (ms < 1000) return 'מהיר';
    if (ms < 3000) return 'בינוני';
    return 'איטי';
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'background.default',
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SpeedIcon color="action" />
        <Typography variant="h6" component="h3">
          ביצועי API
        </Typography>
        {loading && <Chip label="טוען..." size="small" color="primary" variant="outlined" />}
      </Box>

      {Object.keys(timings).length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          אין נתוני זמן טעינה עדיין
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(timings).map(([name, duration]) => (
            <Box key={name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={getTimingLabel(duration)}
                    size="small"
                    color={getTimingColor(duration)}
                    variant="outlined"
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {duration.toFixed(0)}ms
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(duration / 50, 100)}
                color={getTimingColor(duration)}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default ApiPerformance;
