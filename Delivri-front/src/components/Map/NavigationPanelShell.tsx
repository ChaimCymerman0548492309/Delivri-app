import { Drawer, useMediaQuery } from '@mui/material';
import NavigationPanel from '../NavigationPanel';
import type { DeliveryStop, NavigationStep } from '../../types/types';

interface NavigationPanelShellProps {
  isMobile: boolean;
  mobileOpen: boolean;
  onClosePanel: () => void;
  panelProps: {
    isNavigating: boolean;
    onStartNavigation: () => void;
    onStopNavigation: () => void;
    deliveryStops: DeliveryStop[];
    currentStopIndex: number;
    onCompleteStop: (id: string) => void;
    onRemoveStop: (id: string) => void;
    onPostponeStop: (id: string) => void;
    navigationSteps: NavigationStep[];
    totalDistance: number;
    totalDuration: number;
    onAddStop: (address: string, coords: [number, number]) => void;
    currentLocation: [number, number] | null;
    locationAccuracy: number | null;
    ready: boolean;
    routeLoading: boolean;
    routeError: string | null;
    postponeDialogOpen: boolean;
    pendingStop: DeliveryStop | null;
    onConfirmPostpone: () => void;
    onCancelPostpone: () => void;
    onUpdateStop: (stopId: string, updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>>) => void;
    onFocusOnMap: (coords: [number, number]) => void;
  };
}

const NavigationPanelShell = ({
  isMobile,
  mobileOpen,
  onClosePanel,
  panelProps,
}: NavigationPanelShellProps) => {
  const isCompact = useMediaQuery('(max-width:1024px)');

  const panelSx = {
    width: '100%',
    maxWidth: '100%',
    minWidth: { xs: 0, sm: 280 },
    flexShrink: 0,
    display: mobileOpen ? 'flex' : 'none',
  };

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClosePanel}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '100%',
            maxWidth: 440,
            minWidth: 0,
          },
        }}>
        <NavigationPanel {...panelProps} onClosePanel={onClosePanel} />
      </Drawer>
    );
  }

  return (
    <NavigationPanel
      {...panelProps}
      onClosePanel={onClosePanel}
      sx={{
        ...panelSx,
        width: isCompact ? 'min(380px, 36vw)' : 'min(420px, 32vw)',
      }}
    />
  );
};

export default NavigationPanelShell;
