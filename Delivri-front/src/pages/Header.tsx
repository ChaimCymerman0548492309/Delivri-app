import {
  Analytics as AnalyticsIcon,
  BarChart as BarChartIcon,
  LocalShipping as TruckIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { AppBar, Badge, Box, Chip, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';

interface HeaderProps {
  onMenuToggle: () => void;
  onLocationFocus: () => void;
  onShowLocalAnalytics: () => void;
  onShowServerAnalytics: () => void;
  deliveryStopsCount: number;
  isNavigating: boolean;
  panelOpen: boolean;
}

const Header = ({
  onMenuToggle,
  onLocationFocus,
  onShowLocalAnalytics,
  onShowServerAnalytics,
  deliveryStopsCount,
  isNavigating,
  panelOpen,
}: HeaderProps) => (
  <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
    <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
      <Tooltip title={panelOpen ? 'הסתר פאנל' : 'הצג פאנל מסלול'}>
        <IconButton color="inherit" onClick={onMenuToggle} edge="start">
          <Badge badgeContent={deliveryStopsCount} color="secondary" max={99}>
            {panelOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <TruckIcon sx={{ display: { xs: 'none', sm: 'block' }, opacity: 0.9 }} />

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          Delivri
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }}>
          ניהול מסלולי משלוח
        </Typography>
      </Box>

      {isNavigating && (
        <Chip
          label="בניווט"
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, animation: 'pulse 2s infinite' }}
        />
      )}

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="סטטיסטיקות מקומיות">
          <IconButton color="inherit" onClick={onShowLocalAnalytics}>
            <AnalyticsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="דשבורד שרת">
          <IconButton color="inherit" onClick={onShowServerAnalytics}>
            <BarChartIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="מרכז על המיקום שלי">
          <IconButton color="inherit" onClick={onLocationFocus}>
            <MyLocationIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header;
