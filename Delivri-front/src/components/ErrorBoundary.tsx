import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon, Warning as WarningIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Application error:', error);
    console.error('Error details:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 2,
            }}>
            <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />

            <Typography variant="h5" gutterBottom color="error">
              אירעה שגיאה באפליקציה
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {this.state.error?.message || 'שגיאה לא ידועה'}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              האפליקציה נתקלה בבעיה. ניתן לרענן את הדף ולנסות שוב.
            </Typography>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              sx={{ borderRadius: 2 }}>
              רענן דף
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
