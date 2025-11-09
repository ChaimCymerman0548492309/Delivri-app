/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  // Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendIcon,
  CheckCircle as CheckIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';

interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];
  completed: boolean;
  order: number;
  estimatedTime?: number;
  distanceFromPrevious?: number;
}

interface SafeAnalyticsDashboardProps {
  open: boolean;
  onClose: () => void;
  deliveryStops: DeliveryStop[];
  totalDistance: number;
  totalDuration: number;
  isNavigating: boolean;
}

const SafeAnalyticsDashboard: React.FC<SafeAnalyticsDashboardProps> = ({
  open,
  onClose,
  deliveryStops,
  totalDistance,
  totalDuration,
  isNavigating,
}) => {
  const completedStops = deliveryStops.filter((stop) => stop.completed).length;
  const pendingStops = deliveryStops.length - completedStops;
  const completionRate = deliveryStops.length > 0 ? (completedStops / deliveryStops.length) * 100 : 0;

  const averageTimePerStop = deliveryStops.length > 0 ? totalDuration / deliveryStops.length : 0;

  const averageDistancePerStop = deliveryStops.length > 0 ? totalDistance / deliveryStops.length : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות ${remainingMinutes} דקות`;
  };

  const StatsCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // נתונים פשוטים להצגה ויזואלית
  const statusData = [
    { name: 'הושלמו', value: completedStops, color: '#4caf50' },
    { name: 'ממתינים', value: pendingStops, color: '#ff9800' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight="bold">
            📊 לוח בקרה ומדדים עצמי
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid   >
            <StatsCard
              title="סה״כ תחנות"
              value={deliveryStops.length}
              icon={<ShippingIcon />}
              color="#1976d2"
              subtitle={`${completedStops} הושלמו`}
            />
          </Grid>

          <Grid    >
            <StatsCard
              title="שיעור השלמה"
              value={`${Math.round(completionRate)}%`}
              icon={<CheckIcon />}
              color="#4caf50"
              subtitle={`${pendingStops} נותרו`}
            />
          </Grid>

          <Grid    >
            <StatsCard
              title="זמן ממוצע"
              value={formatTime(averageTimePerStop)}
              icon={<TimeIcon />}
              color="#ff9800"
              subtitle="לכל תחנה"
            />
          </Grid>

          <Grid    >
            <StatsCard
              title="מרחק ממוצע"
              value={`${(averageDistancePerStop / 1000).toFixed(1)} ק"מ`}
              icon={<TrendIcon />}
              color="#9c27b0"
              subtitle="בין תחנות"
            />
          </Grid>

          {/* Progress */}
          <Grid  >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  התקדמות במסלול
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress variant="determinate" value={completionRate} sx={{ height: 12, borderRadius: 6 }} />
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {Math.round(completionRate)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Visual Status - ללא recharts */}
          <Grid    >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  סטטוס תחנות
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center', height: 120 }}>
                  {statusData.map((item, index) => (
                    <Box key={index} sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          bgcolor: item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          mb: 1,
                          boxShadow: 2,
                        }}>
                        {item.value}
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Route Summary */}
          <Grid    >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  סיכום מסלול
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 2,
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}>
                    <Typography variant="body1">מרחק כולל:</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      {(totalDistance / 1000).toFixed(1)} ק"מ
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 2,
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}>
                    <Typography variant="body1">זמן משוער:</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      {formatTime(totalDuration)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}>
                    <Typography variant="body1">סטטוס ניווט:</Typography>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={isNavigating ? 'success.main' : 'text.secondary'}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <NavigationIcon fontSize="small" />
                      {isNavigating ? 'פעיל' : 'לא פעיל'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Time Distribution - ללא recharts */}
          <Grid >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  חלוקת זמן בין תחנות
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {deliveryStops.slice(0, 5).map((stop, index) => (
                    <Box
                      key={stop.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: stop.completed ? 'success.light' : 'background.default',
                        borderRadius: 1,
                        border: stop.completed ? 1 : 0,
                        borderColor: 'success.main',
                      }}>
                      <Typography variant="body2">
                        תחנה {index + 1}: {stop.address.slice(0, 30)}...
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          ⏱️ {stop.estimatedTime ? formatTime(stop.estimatedTime) : '--'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📏 {stop.distanceFromPrevious ? `${(stop.distanceFromPrevious / 1000).toFixed(1)}ק"מ` : '--'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {deliveryStops.length > 5 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      ...ועוד {deliveryStops.length - 5} תחנות
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default SafeAnalyticsDashboard;
