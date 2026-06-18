import { StickyNote2 as NoteIcon } from '@mui/icons-material';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material';
import { useState } from 'react';
import type { DeliveryStop } from '../../types/types';
import StopDetailDialog from './StopDetailDialog';

interface StopsTableProps {
  stops: DeliveryStop[];
  currentStopIndex: number;
  isNavigating: boolean;
  onComplete: (stopId: string) => void;
  onRemove: (stopId: string) => void;
  onPostpone: (stopId: string) => void;
  onUpdate: (stopId: string, updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>>) => void;
  onFocusOnMap: (coords: [number, number]) => void;
}

const getStatus = (stop: DeliveryStop, isCurrent: boolean, isNavigating: boolean) => {
  if (stop.completed) return { label: 'בוצע', color: 'success' as const };
  if (stop.postponed) return { label: 'נדחה', color: 'default' as const };
  if (isCurrent && isNavigating) return { label: 'פעיל', color: 'warning' as const };
  return { label: 'ממתין', color: 'primary' as const };
};

const truncate = (text: string, max = 28) => (text.length > max ? `${text.slice(0, max)}…` : text);

const StopsTable = ({
  stops,
  currentStopIndex,
  isNavigating,
  onComplete,
  onRemove,
  onPostpone,
  onUpdate,
  onFocusOnMap,
}: StopsTableProps) => {
  const [selectedStop, setSelectedStop] = useState<{ stop: DeliveryStop; index: number } | null>(null);

  if (stops.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
        אין תחנות עדיין — הוסף כתובת למעלה
      </Typography>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 1.5, boxShadow: 'none', overflow: 'hidden' }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }}>
              <TableCell sx={{ width: 32, py: 0.75, px: 1, fontSize: '0.68rem', fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ py: 0.75, px: 1, fontSize: '0.68rem', fontWeight: 700 }}>כתובת</TableCell>
              <TableCell sx={{ width: 58, py: 0.75, px: 0.5, fontSize: '0.68rem', fontWeight: 700 }} align="center">
                סטטוס
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stops.map((stop, index) => {
              const isCurrent = index === currentStopIndex;
              const status = getStatus(stop, isCurrent, isNavigating);

              return (
                <TableRow
                  key={stop.id}
                  hover
                  onClick={() => setSelectedStop({ stop, index })}
                  sx={{
                    cursor: 'pointer',
                    '&:last-child td': { borderBottom: 0 },
                    bgcolor: isCurrent && isNavigating
                      ? (t) => alpha(t.palette.warning.main, 0.08)
                      : stop.completed
                        ? (t) => alpha(t.palette.success.main, 0.05)
                        : 'transparent',
                    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                  }}>
                  <TableCell sx={{ py: 0.6, px: 1 }}>
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: isCurrent && isNavigating ? 'warning.main' : stop.completed ? 'success.main' : 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}>
                      {index + 1}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 0.6, px: 1, overflow: 'hidden' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: isCurrent ? 600 : 400,
                        textDecoration: stop.completed ? 'line-through' : 'none',
                        opacity: stop.completed ? 0.65 : 1,
                        lineHeight: 1.3,
                      }}
                      noWrap
                      title={stop.address}>
                      {truncate(stop.address)}
                    </Typography>
                    {stop.note && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
                        <NoteIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
                          {truncate(stop.note, 20)}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 0.6, px: 0.5 }} align="center">
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.75 } }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <StopDetailDialog
        stop={selectedStop?.stop ?? null}
        index={selectedStop?.index ?? 0}
        open={!!selectedStop}
        isCurrent={selectedStop?.index === currentStopIndex}
        isNavigating={isNavigating}
        onClose={() => setSelectedStop(null)}
        onUpdate={onUpdate}
        onComplete={onComplete}
        onRemove={onRemove}
        onPostpone={onPostpone}
        onFocusOnMap={onFocusOnMap}
      />
    </>
  );
};

export default StopsTable;
