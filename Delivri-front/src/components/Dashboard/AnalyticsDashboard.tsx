/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  alpha,
  useTheme,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  People,
  TrendingUp,
  AccessTime,
  LocationOn,
  BarChart,
  PieChart,
  Search,
  CalendarToday,
  Leaderboard,
  Schedule,
  Place,
  Close as CloseIcon,
  Map,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Pie,
  PieChart as RePieChart,
  Cell,
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
} from 'recharts';
import { getRouteMetrics, StatsAPI } from '../../services/StatsAPI';



export default function AnalyticsDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState({ time: '7d', city: 'all' });
  const [d, setD] = useState<any>({});

  const load = async (r = false) => {
    try {
      // r ? setRefreshing(true) : setLoading(true);
      const [activities, times, metrics, events, cities, daily, searches, routes] = await Promise.all([
        StatsAPI.getUserActivities(),
        StatsAPI.getTimeStats(),
        StatsAPI.getUsageMetrics(),
        StatsAPI.getEventTypeStats(),
        StatsAPI.getCityStats(),
        StatsAPI.getDailyStats(),
        StatsAPI.getTopSearches(),
        getRouteMetrics(),
      ]);
      setD({
        activities,
        times,
        metrics,
        events,
        cities,
        daily: daily?.slice(-30),
        searches: searches.slice(0, 10),
        routes,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    load();
  }, [filter.time]);
  if (loading)
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );

  const c = theme.palette;
  const Stat = ({ t, v, s, i, col }: any) => (
    <Card sx={{ border: `1px solid ${col}40`, background: alpha(col, 0.03) }}>
      <CardContent>
        <Box display="flex" gap={2} alignItems="center">
          {React.cloneElement(i, { sx: { color: col, fontSize: 30 } })}
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700} color={col}>
              {v}
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {t}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {s}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onClose={onClose} fullScreen maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" gap={2} alignItems="center">
            <Leaderboard color="primary" />
            <Typography variant="h5" fontWeight="bold">
              לוח ניתוח מתקדם
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Box display="flex" justifyContent="space-between" flexWrap="wrap" mb={3}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab icon={<BarChart />} label="סקירה" />
            <Tab icon={<Map />} label="גיאוגרפיה" />
            <Tab icon={<Search />} label="חיפושים" />
          </Tabs>
          <Box display="flex" gap={2}>
            <FormControl size="small">
              <InputLabel>עיר</InputLabel>
              <Select value={filter.city} onChange={(e) => setFilter({ ...filter, city: e.target.value })}>
                <MenuItem value="all">כל הערים</MenuItem>
                {d.cities?.map((x: any) => (
                  <MenuItem key={x.city} value={x.city}>
                    {x.city}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>זמן</InputLabel>
              <Select value={filter.time} onChange={(e) => setFilter({ ...filter, time: e.target.value })}>
                {['24h', '7d', '30d', '90d'].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="רענן">
              <IconButton onClick={() => load(true)} disabled={refreshing}>
                <Refresh sx={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: '0.5s' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Stat
              t="משתמשים פעילים"
              v={d.metrics?.total_active_users}
              s="סה״כ במערכת"
              i={<People />}
              col={c.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stat
              t="סך סשנים"
              v={d.metrics?.total_sessions}
              s="הפעלות אפליקציה"
              i={<TrendingUp />}
              col={c.secondary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stat
              t="משך סשן ממוצע"
              v={`${Math.round(d.metrics?.avg_session_duration_minutes || 0)} דק׳`}
              s="זמן שימוש ממוצע"
              i={<AccessTime />}
              col={c.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stat
              t="תחנות ממוצעות"
              v={(d.metrics?.avg_stops_per_user || 0).toFixed(1)}
              s="לכל משתמש"
              i={<LocationOn />}
              col={c.warning.main}
            />
          </Grid>
        </Grid>

        {/* Route Metrics Graph */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" mb={2}>
            <Map sx={{ mr: 1 }} />
            נתוני מסלולים
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <ReBarChart
              data={[
                { name: 'סה״כ ק״מ', val: d.routes?.total_distance_km },
                { name: 'ממוצע ק״מ', val: d.routes?.avg_distance_km },
                { name: 'משך ממוצע (דק׳)', val: d.routes?.avg_duration_min },
              ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.divider} />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip />
              <Bar dataKey="val" fill={c.primary.main} radius={[6, 6, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Time & Events */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <Schedule sx={{ mr: 1 }} />
                פעילות לפי שעה
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={d.times}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.divider} />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ReTooltip />
                  <Area
                    type="monotone"
                    dataKey="active_users"
                    fill={c.primary.main}
                    fillOpacity={0.3}
                    stroke={c.primary.main}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_sessions"
                    fill={c.secondary.main}
                    fillOpacity={0.3}
                    stroke={c.secondary.main}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <PieChart sx={{ mr: 1 }} />
                פילוח אירועים
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={d.events} dataKey="total" nameKey="event_type" outerRadius={100} innerRadius={40}>
                    {d.events?.map((_: any, i: number) => (
                      <Cell key={i} fill={[c.primary.main, c.secondary.main, c.success.main, c.warning.main][i % 4]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </RePieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Cities & Searches */}
        <Grid container spacing={3} mt={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <Place sx={{ mr: 1 }} />
                פעילות לפי ערים
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>עיר</TableCell>
                      <TableCell align="right">חיפושים</TableCell>
                      <TableCell align="right">ניווטים</TableCell>
                      <TableCell align="right">סה״כ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(filter.city === 'all' ? d.cities : d.cities.filter((x: any) => x.city === filter.city))
                      ?.slice(0, 5)
                      ?.map((x: any, i: number) => (
                        <TableRow key={x.city}>
                          <TableCell>
                            <Chip label={x.city} color={i === 0 ? 'primary' : 'default'} />
                          </TableCell>
                          <TableCell align="right">{x.searches}</TableCell>
                          <TableCell align="right">{x.navigations}</TableCell>
                          <TableCell align="right">{x.searches + x.navigations}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <Search sx={{ mr: 1 }} />
                חיפושים פופולריים
              </Typography>
              {d.searches?.map((s: any, i: number) => (
                <Box key={s.query} mb={1}>
                  <Chip label={`#${i + 1}`} size="small" color="primary" />
                  <Typography ml={1} display="inline">
                    {s.query}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(s.count / d.searches[0].count) * 100}
                    sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                  />
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>

        {/* Daily Trends */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" mb={2}>
            <CalendarToday sx={{ mr: 1 }} />
            מגמות יומיות
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.divider} />
              <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} />
              <YAxis />
              <ReTooltip labelFormatter={(v) => new Date(v).toLocaleDateString('he-IL')} />
              <Line type="monotone" dataKey="events" stroke={c.primary.main} strokeWidth={3} dot />
              <Line type="monotone" dataKey="users" stroke={c.secondary.main} strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}
