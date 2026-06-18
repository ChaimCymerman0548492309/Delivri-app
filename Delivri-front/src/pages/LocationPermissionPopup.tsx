import { LocationOn as LocationIcon } from '@mui/icons-material';
import {
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
  alpha,
} from '@mui/material';
import { useState } from 'react';
import TermsDialog from './TermsDialog';

interface LocationPermissionPopupProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LocationPermissionPopup = ({ open, onClose, onConfirm }: LocationPermissionPopupProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleConfirm = () => {
    if (acceptedTerms) {
      onConfirm();
      onClose();
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <LocationIcon color="primary" />
        <Typography variant="h6" component="span" fontWeight={700}>
          גישה למיקום
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" color="text.secondary" paragraph>
          Delivri זקוקה למיקום שלך כדי לחשב מסלולים, לנווט בין תחנות ולעקוב אחר ההתקדמות.
        </Typography>

        <Box
          sx={{
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            p: 2,
            borderRadius: 2,
            mb: 2,
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
          }}>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ m: 0, pr: 2 }}>
            <li>ניווט מדויק לתחנות המשלוח</li>
            <li>מעקב אחר התקדמות במסלול</li>
            <li>חישוב זמני הגעה משוערים</li>
          </Typography>
        </Box>

        <FormControlLabel
          control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} color="primary" />}
          label={
            <Typography variant="body2">
              אני מאשר/ת את{' '}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setTermsOpen(true);
                }}>
                תנאי השימוש
              </Link>{' '}
              ומאפשר/ת גישה למיקום
            </Typography>
          }
        />
        <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={handleConfirm} variant="contained" size="large" fullWidth disabled={!acceptedTerms}>
          אשר והמשך
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPermissionPopup;
