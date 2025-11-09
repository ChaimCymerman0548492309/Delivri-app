import { Analytics as AnalyticsIcon, Menu as MenuIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import { AppBar, Badge, Box, IconButton, Toolbar, Typography } from '@mui/material';


interface HeaderProps {
  onMenuToggle: () => void;
  onLocationFocus: () => void;
  onShowAnalytics: () => void;
  setOpenAnalyticsDashboard: () => void;
  deliveryStopsCount: number;
  isNavigating: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  onLocationFocus,
  onShowAnalytics,
  setOpenAnalyticsDashboard,
  deliveryStopsCount,
  isNavigating,
}) => {
  // const isMobile = useMediaQuery('(max-width:768px)');
  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={onMenuToggle} sx={{ mr: 2 }}>
          <Badge badgeContent={deliveryStopsCount} color="secondary">
            <MenuIcon />
          </Badge>
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          🚚 ניהול משלוחים
          {isNavigating && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                ml: 1,
                bgcolor: 'rgba(255,255,255,0.2)',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}>
              במצב ניווט
            </Typography>
          )}
        </Typography>{' '}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton color="inherit" onClick={onShowAnalytics}>
            <AnalyticsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={setOpenAnalyticsDashboard}>
            <AnalyticsIcon />
          </IconButton>

          <IconButton color="inherit" onClick={onLocationFocus}>
            <MyLocationIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
