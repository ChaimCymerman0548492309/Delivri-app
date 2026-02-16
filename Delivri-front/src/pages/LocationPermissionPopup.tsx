// LocationPermissionPopup.tsx
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Typography,
} from '@mui/material';
import { useState, type MouseEvent } from 'react';
import TermsDialog from './TermsDialog';

interface LocationPermissionPopupProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
}

const LocationPermissionPopup: React.FC<LocationPermissionPopupProps> = ({ open, onClose, onConfirm }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (acceptedTerms && !isSubmitting) {
      setIsSubmitting(true);
      setSubmitError(null);

      const errorMessage = await onConfirm();
      if (!errorMessage) {
        setIsSubmitting(false);
        setSubmitError(null);
        setAcceptedTerms(false);
        setTermsOpen(false);
        onClose();
        return;
      }

      setSubmitError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked);
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleCloseTerms = () => {
    if (!isSubmitting) {
      setTermsOpen(false);
    }
  };

  const handleOpenTerms = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!isSubmitting) {
      setTermsOpen(true);
    }
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          📍 גישה למיקום שלך
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" paragraph>
          כדי להשתמש בתכונת המיקום, אנחנו זקוקים להרשאתך לגשת למיקום המכשיר שלך.
        </Typography>

        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>שימוש במיקום שלך:</strong>
            <br />• ניווט מדויק לתחנות המשלוח
            <br />• מעקב אחר התקדמות במסלול
            <br />• חישוב זמני הגעה משוערים
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => handleTermsChange(e.target.checked)}
              color="primary"
              disabled={isSubmitting}
            />
          }
          label={
            <Typography variant="body2">
              אני מאשר/ת את
              <Link
                href="#"
                onClick={handleOpenTerms}>
                תנאי השימוש
              </Link>
              <TermsDialog open={termsOpen} onClose={handleCloseTerms} />
              ומאפשר/ת גישה למיקום שלי
            </Typography>
          }
        />

        {submitError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {submitError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleConfirm} variant="contained" disabled={!acceptedTerms || isSubmitting}>
          אשר גישה למיקום
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPermissionPopup;
