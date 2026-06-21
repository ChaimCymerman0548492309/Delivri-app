import { LocationOn as LocationIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Typography,
  alpha,
} from '@mui/material';
import { useState, type MouseEvent } from 'react';
import TermsDialog from './TermsDialog';

interface LocationPermissionPopupProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
}

const LocationPermissionPopup = ({ open, onClose, onConfirm }: LocationPermissionPopupProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!acceptedTerms || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const errorMessage = await onConfirm();
    if (!errorMessage) {
      setIsSubmitting(false);
      setAcceptedTerms(false);
      setTermsOpen(false);
      onClose();
      return;
    }

    setSubmitError(errorMessage);
    setIsSubmitting(false);
  };

  const handleTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked);
    if (submitError) setSubmitError(null);
  };

  const handleCloseTerms = () => {
    if (!isSubmitting) setTermsOpen(false);
  };

  const handleOpenTerms = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!isSubmitting) setTermsOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      maxWidth="sm"
      fullWidth
      dir="rtl"
      PaperProps={{ sx: { borderRadius: 3, textAlign: 'right' } }}>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
        }}>
        <LocationIcon color="primary" fontSize="small" />
        גישה למיקום
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'right' }}>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ textAlign: 'right' }}>
          Delivri זקוקה למיקום שלך כדי לחשב מסלולים, לנווט בין תחנות ולעקוב אחר ההתקדמות.
        </Typography>

        <Box
          sx={{
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            p: 2,
            borderRadius: 2,
            mb: 2,
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
            textAlign: 'right',
          }}>
          <Box component="ul" sx={{ m: 0, pr: 2.5, pl: 0, textAlign: 'right' }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              ניווט מדויק לתחנות המשלוח
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              מעקב אחר התקדמות במסלול
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              חישוב זמני הגעה משוערים
            </Typography>
          </Box>
        </Box>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
            {submitError}
          </Alert>
        )}

        <FormControlLabel
          sx={{ alignItems: 'flex-start', mr: 0, ml: 0, width: '100%' }}
          control={
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => handleTermsChange(e.target.checked)}
              color="primary"
              disabled={isSubmitting}
              sx={{ pt: 0.25 }}
            />
          }
          label={
            <Typography variant="body2" sx={{ textAlign: 'right', lineHeight: 1.6 }}>
              אני מאשר/ת את{' '}
              <Link href="#" onClick={handleOpenTerms}>
                תנאי השימוש
              </Link>{' '}
              ומאפשר/ת גישה למיקום
            </Typography>
          }
        />
        <TermsDialog open={termsOpen} onClose={handleCloseTerms} />
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0, justifyContent: 'stretch' }}>
        <Button
          onClick={handleConfirm}
          variant="contained"
          size="large"
          fullWidth
          disabled={!acceptedTerms || isSubmitting}>
          {isSubmitting ? (
            <>
              <CircularProgress size={18} color="inherit" sx={{ ml: 1 }} />
              מאמת מיקום...
            </>
          ) : (
            'אשר והמשך'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPermissionPopup;
