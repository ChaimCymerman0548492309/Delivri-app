import { Card, CardContent, Typography, Box, Paper, Chip } from '@mui/material';
import { Navigation as NavigationIcon } from '@mui/icons-material';

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

const InstructionsOverlay: React.FC<InstructionsOverlayProps> = ({ steps, currentStepIndex, isNavigating }) => {
  if (!isNavigating || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const nextSteps = steps.slice(currentStepIndex + 1, currentStepIndex + 3);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'depart':
        return '🚀';
      case 'arrive':
        return '🎯';
      case 'turn':
        return '↪️';
      case 'continue':
        return '➡️';
      default:
        return '📌';
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 80,
        left: 16,
        right: 16,
        zIndex: 1000,
        maxWidth: 400,
        margin: '0 auto',
      }}>
      {/* Current Instruction */}
      <Card elevation={4} sx={{ mb: 1 }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <NavigationIcon color="primary" />
            <Typography variant="h6" component="div" fontWeight="bold">
              הוראה נוכחית
            </Typography>
            <Chip label={`${currentStepIndex + 1}/${steps.length}`} size="small" color="primary" />
          </Box>

          <Typography variant="body1" sx={{ mb: 1, fontSize: '1.1rem' }}>
            {getStepIcon(currentStep.type)} {currentStep.instruction}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              📏 {(currentStep.distance / 1000).toFixed(1)} ק"מ
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ⏱️ {Math.round(currentStep.duration / 60)} דקות
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Next Instructions */}
      {nextSteps.length > 0 && (
        <Paper elevation={2} sx={{ p: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            הוראות הבאות:
          </Typography>
          {nextSteps.map((step, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                borderBottom: index < nextSteps.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}>
              <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center' }}>
                {getStepIcon(step.type)}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                {step.instruction}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(step.distance / 1000).toFixed(1)}ק"מ
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default InstructionsOverlay;
