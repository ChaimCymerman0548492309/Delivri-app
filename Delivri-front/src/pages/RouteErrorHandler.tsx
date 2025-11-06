import { Alert, Snackbar, Button, Box } from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useState } from 'react';

interface RouteErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const RouteErrorHandler: React.FC<RouteErrorHandlerProps> = ({ error, onRetry, onDismiss }) => {
  const [open, setOpen] = useState(!!error);

  const handleClose = () => {
    setOpen(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    setOpen(false);
    onRetry?.();
  };

  if (!error) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert
        severity="warning"
        variant="filled"
        onClose={handleClose}
        sx={{
          width: '100%',
          '& .MuiAlert-message': {
            flex: 1,
          },
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onRetry && (
              <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={handleRetry}>
                נסה שוב
              </Button>
            )}
            <Button color="inherit" size="small" onClick={handleClose}>
              <CloseIcon />
            </Button>
          </Box>
        }>
        <div>
          <strong>בעיה בטעינת המסלול</strong>
          <br />
          {error}
        </div>
      </Alert>
    </Snackbar>
  );
};

export default RouteErrorHandler;
