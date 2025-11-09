// src/api/statsApi.ts
export interface EventPayload {
  userId?: string;
  type: string; // start, stop, search, etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>; // פרטים נוספים
}

export interface StatsSummary {
  total_events: number;
  total_users: number;
  total_searches: number;
  total_navigations: number;
}

export interface TopSearch {
  query: string;
  count: number;
}

export interface ActiveUser {
  user_id: string;
  last_activity: string;
  total_events: number;
}

// === נתוני BI מתקדמים ===
export interface UserActivity {
  user_id: string;
  total_sessions: number;
  total_duration_minutes: number;
  total_stops: number;
  avg_stops_per_session: number;
  avg_duration_minutes: number;
  last_active: string;
}

export interface TimeStats {
  hour: number;
  active_users: number;
  total_sessions: number;
}

export interface UsageMetrics {
  total_active_users: number;
  total_sessions: number;
  avg_session_duration_minutes: number;
  avg_stops_per_user: number;
  peak_usage_hour: number;
}

export interface EventTypeStats {
  event_type: string;
  total: number;
}

export interface CityStats {
  city: string;
  searches: number;
  navigations: number;
}

export interface DailyStats {
  date: string;
  events: number;
  users: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// קריאה מאובטחת
const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
};

// === בסיסי ===

// רישום אירוע חדש (חיפוש, ניווט וכו')
export const postEvent = async (payload: EventPayload) =>
  fetchJson<{ success: boolean }>(`${API_BASE}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// נתוני סיכום כלליים
export const getStats = async () => fetchJson<StatsSummary>(`${API_BASE}/stats`);

// חיפושים פופולריים
export const getTopSearches = async () => fetchJson<TopSearch[]>(`${API_BASE}/stats/top-searches`);

// משתמשים פעילים
export const getActiveUsers = async () => fetchJson<ActiveUser[]>(`${API_BASE}/stats/active-users`);

// === BI מתקדמים ===

// פעילות משתמשים
export const getUserActivities = async () => fetchJson<UserActivity[]>(`${API_BASE}/stats/user-activities`);
export const getTimeStats = async () => fetchJson<TimeStats[]>(`${API_BASE}/stats/time-stats`);
export const getUsageMetrics = async () => fetchJson<UsageMetrics>(`${API_BASE}/stats/usage-metrics`);
export const getEventTypeStats = async () => fetchJson<EventTypeStats[]>(`${API_BASE}/stats/event-types`);
export const getCityStats = async () => fetchJson<CityStats[]>(`${API_BASE}/stats/city-stats`);
export const getDailyStats = async () => fetchJson<DailyStats[]>(`${API_BASE}/stats/daily-stats`);
export const getRouteMetrics = async () =>
  fetchJson<{ total_distance_km: number; avg_distance_km: number; avg_duration_min: number }>(
    `${API_BASE}/stats/route-metrics`,
  );

// ניקוי נתונים ישנים
export const clearOldEvents = async (days: number) =>
  fetchJson<{ deleted: number }>(`${API_BASE}/events?olderThan=${days}`, {
    method: 'DELETE',
  });

// ייצוא API אחיד
export const StatsAPI = {
  postEvent,
  getStats,
  getTopSearches,
  getActiveUsers,
  getUserActivities,
  getTimeStats,
  getUsageMetrics,
  getEventTypeStats,
  getCityStats,
  getDailyStats,
  clearOldEvents,
};

export default StatsAPI;
