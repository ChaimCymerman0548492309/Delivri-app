import { Box, CircularProgress, Typography, alpha } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  compact?: boolean;
}

const LoadingSpinner = ({ message = 'טוען...', size = 36, compact = false }: LoadingSpinnerProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: compact ? 1.5 : 3,
      gap: compact ? 1 : 1.5,
    }}>
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        size={size}
        thickness={4}
        sx={{ color: (t) => alpha(t.palette.primary.main, 0.25) }}
        variant="determinate"
        value={100}
      />
      <CircularProgress
        size={size}
        thickness={4}
        sx={{ color: 'primary.main', position: 'absolute', insetInlineStart: 0 }}
      />
    </Box>
    {message && (
      <Typography variant={compact ? 'caption' : 'body2'} color="text.secondary" fontWeight={500}>
        {message}
      </Typography>
    )}
  </Box>
);

export default LoadingSpinner;
