import { Box, CircularProgress, Typography, alpha } from '@mui/material';

type LoaderSize = 'xs' | 'sm' | 'md';

interface InlineLoaderProps {
  label?: string;
  size?: LoaderSize;
  fullWidth?: boolean;
  overlay?: boolean;
}

const SIZE_MAP: Record<LoaderSize, number> = { xs: 14, sm: 20, md: 32 };

const InlineLoader = ({ label, size = 'sm', fullWidth = false, overlay = false }: InlineLoaderProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: fullWidth ? 'center' : 'flex-start',
      gap: 1,
      py: size === 'xs' ? 0.5 : 1,
      px: overlay ? 1.5 : 0,
      width: fullWidth ? '100%' : 'auto',
      ...(overlay && {
        position: 'absolute',
        inset: 0,
        bgcolor: (t) => alpha(t.palette.background.paper, 0.75),
        backdropFilter: 'blur(4px)',
        zIndex: 2,
        borderRadius: 2,
      }),
    }}>
    <CircularProgress
      size={SIZE_MAP[size]}
      thickness={size === 'xs' ? 6 : 4}
      sx={{ color: 'primary.main', flexShrink: 0 }}
    />
    {label && (
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    )}
  </Box>
);

export default InlineLoader;
