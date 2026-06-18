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
  };
}

const NavigationPanelShell = ({
  isMobile,
  mobileOpen,
  onClosePanel,
  panelProps,
}: NavigationPanelShellProps) => {
  const isTablet = useMediaQuery('(max-width:1024px)');

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={onClosePanel}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: '100%', maxWidth: 420 } }}>
        <NavigationPanel {...panelProps} onClosePanel={onClosePanel} />
      </Drawer>
    );
  }

  return (
    <NavigationPanel
      {...panelProps}
      onClosePanel={onClosePanel}
      sx={{ width: isTablet ? 360 : 400, flexShrink: 0, display: mobileOpen ? 'flex' : 'none' }}
    />
  );
};

export default NavigationPanelShell;
