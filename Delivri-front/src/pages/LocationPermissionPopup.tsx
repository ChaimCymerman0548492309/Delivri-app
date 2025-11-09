// LocationPermissionPopup.tsx
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
} from '@mui/material';
import { useState } from 'react';
import TermsDialog from './TermsDialog';

interface LocationPermissionPopupProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LocationPermissionPopup: React.FC<LocationPermissionPopupProps> = ({ open, onClose, onConfirm }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleConfirm = () => {
    if (acceptedTerms) {
      onConfirm();
      onClose();
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      {/* <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth> */}
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
            <Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} color="primary" />
          }
          label={
            <Typography variant="body2">
              אני מאשר/ת את
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setTermsOpen(true);
                }}>
                תנאי השימוש
              </Link>
              <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
              ומאפשר/ת גישה למיקום שלי
            </Typography>
          }
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleConfirm} variant="contained" disabled={!acceptedTerms}>
          אשר גישה למיקום
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPermissionPopup;
