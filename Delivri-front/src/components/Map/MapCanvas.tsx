import { Alert, Box, Button } from '@mui/material';
import LoadingSpinner from '../../pages/LoadingSpinner';
import InlineLoader from '../ui/InlineLoader';
import ApiPerformance from '../../pages/ApiPerformance';
import InstructionsOverlay from '../InstructionsOverlay';

interface MapCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  mapLoadError: string | null;
  isNavigating: boolean;
  navigationSteps: { instruction: string; distance: number; duration: number; type: string }[];
  currentStepIndex: number;
  timings: Record<string, number>;
  apiLoading: boolean;
  showApiPerformance: boolean;
}

const MapCanvas = ({
  containerRef,
  ready,
  mapLoadError,
  isNavigating,
  navigationSteps,
  currentStepIndex,
  timings,
  apiLoading,
  showApiPerformance,
}: MapCanvasProps) => (
  <Box sx={{ flex: 1, position: 'relative', minHeight: 0, direction: 'ltr' }}>
    <div
      ref={containerRef}
      className="map-container"
      style={{ width: '100%', height: '100%', direction: 'ltr' }}
    />

    {!ready && !mapLoadError && (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          zIndex: 999,
        }}>
        <LoadingSpinner message="טוען מפה..." />
      </Box>
    )}

    {mapLoadError && (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          zIndex: 999,
          p: 3,
        }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              רענן
            </Button>
          }>
          {mapLoadError}
        </Alert>
      </Box>
    )}

    {ready && (
      <InstructionsOverlay
        steps={navigationSteps}
        currentStepIndex={currentStepIndex}
        isNavigating={isNavigating}
      />
    )}

    {showApiPerformance && ready && (
      <Box sx={{ position: 'absolute', top: 16, insetInlineEnd: 16, width: 280, zIndex: 1000, opacity: 0.92 }}>
        <ApiPerformance timings={timings} loading={apiLoading} />
      </Box>
    )}

    {apiLoading && ready && (
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          insetInlineEnd: 16,
          zIndex: 1000,
          bgcolor: 'background.paper',
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          boxShadow: 2,
        }}>
        <InlineLoader label="טוען נתונים..." size="xs" />
      </Box>
    )}
  </Box>
);

export default MapCanvas;
