import { Navigation as NavigationIcon, TurnRight as TurnIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Paper, Typography, alpha } from '@mui/material';
import { formatDistance, formatDuration } from '../utils/formatters';

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
}

interface InstructionsOverlayProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  isNavigating: boolean;
}

const InstructionsOverlay = ({ steps, currentStepIndex, isNavigating }: InstructionsOverlayProps) => {
  if (!isNavigating || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const nextSteps = steps.slice(currentStepIndex + 1, currentStepIndex + 3);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: { xs: 'calc(100% - 32px)', sm: 380 },
        maxWidth: 420,
      }}>
      <Card
        elevation={6}
        sx={{
          mb: 1,
          borderRadius: 3,
          border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.95),
          backdropFilter: 'blur(8px)',
        }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <NavigationIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              הוראה נוכחית
            </Typography>
            <Chip label={`${currentStepIndex + 1}/${steps.length}`} size="small" color="primary" variant="outlined" />
          </Box>

          <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.5, fontWeight: 500 }}>
            {currentStep.instruction}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {formatDistance(currentStep.distance)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDuration(currentStep.duration)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {nextSteps.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
            backdropFilter: 'blur(6px)',
          }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
            הבא בתור
          </Typography>
          {nextSteps.map((step, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.75,
                borderBottom: index < nextSteps.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}>
              <TurnIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }} noWrap>
                {step.instruction}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default InstructionsOverlay;
