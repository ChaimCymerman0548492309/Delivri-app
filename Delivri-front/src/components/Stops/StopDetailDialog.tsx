import {
  CheckCircle as DoneIcon,
  Delete as DeleteIcon,
  MoreTime as PostponeIcon,
  MyLocation as MapIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { geocodeAddress } from '../../services/geocoding';
import type { DeliveryStop } from '../../types/types';
import InlineLoader from '../ui/InlineLoader';

interface StopDetailDialogProps {
  stop: DeliveryStop | null;
  index: number;
  open: boolean;
  isCurrent: boolean;
  isNavigating: boolean;
  onClose: () => void;
  onUpdate: (stopId: string, updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>>) => void;
  onComplete: (stopId: string) => void;
  onRemove: (stopId: string) => void;
  onPostpone: (stopId: string) => void;
  onFocusOnMap: (coords: [number, number]) => void;
}

const StopDetailDialog = ({
  stop,
  index,
  open,
  isCurrent,
  isNavigating,
  onClose,
  onUpdate,
  onComplete,
  onRemove,
  onPostpone,
  onFocusOnMap,
}: StopDetailDialogProps) => {
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stop) {
      setAddress(stop.address);
      setNote(stop.note ?? '');
    }
  }, [stop]);

  if (!stop) return null;

  const [lng, lat] = stop.coordinates;
  const mapPreviewUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=400x160&maptype=mapnik&markers=${lat},${lng},red-pushpin`;

  const statusLabel = stop.completed ? 'בוצע' : stop.postponed ? 'נדחה' : isCurrent && isNavigating ? 'בניווט' : 'ממתין';
  const statusColor = stop.completed ? 'success' : stop.postponed ? 'default' : isCurrent && isNavigating ? 'warning' : 'primary';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>> = { note: note.trim() || undefined };

      if (address.trim() !== stop.address) {
        const coords = await geocodeAddress(address.trim());
        if (!coords) {
          alert('לא הצלחנו לאתר את הכתובת החדשה');
          return;
        }
        updates.address = address.trim();
        updates.coordinates = coords;
      }

      onUpdate(stop.id, updates);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
          {index + 1}
        </Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }} noWrap>
          פרטי תחנה
        </Typography>
        <Chip label={statusLabel} size="small" color={statusColor} variant="outlined" />
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Box
          component="img"
          src={mapPreviewUrl}
          alt="מיקום על המפה"
          sx={{
            width: '100%',
            height: 120,
            objectFit: 'cover',
            borderRadius: 1.5,
            mb: 1.5,
            border: (t) => `1px solid ${t.palette.divider}`,
            cursor: 'pointer',
          }}
          onClick={() => {
            onFocusOnMap(stop.coordinates);
            onClose();
          }}
        />

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {lat.toFixed(5)}, {lng.toFixed(5)} · לחץ על המפה להצגה
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="כתובת"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ mb: 1.5 }}
        />

        <TextField
          fullWidth
          size="small"
          label="הערה"
          placeholder="למשל: קומה 3, צלצול בדלת..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
        />
      </DialogContent>

      <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="הצג במפה">
            <IconButton size="small" onClick={() => { onFocusOnMap(stop.coordinates); onClose(); }}>
              <MapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!stop.completed && !stop.postponed && !isCurrent && (
            <Tooltip title="דחייה">
              <IconButton size="small" onClick={() => { onPostpone(stop.id); onClose(); }}>
                <PostponeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isCurrent && isNavigating && !stop.completed && (
            <Tooltip title="סימון כבוצע">
              <IconButton size="small" color="success" onClick={() => { onComplete(stop.id); onClose(); }}>
                <DoneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="הסרה">
            <IconButton size="small" color="error" onClick={() => { onRemove(stop.id); onClose(); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={onClose} disabled={saving}>
            ביטול
          </Button>
          <Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <InlineLoader size="xs" /> : 'שמור'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default StopDetailDialog;
