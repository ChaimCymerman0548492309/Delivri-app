import { logger } from '../utils/logger';

export interface EventPayload {
  userId?: string;
  type: string;
  data?: Record<string, unknown>;
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

interface StoredEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

const STORAGE_KEYS = {
  events: 'delivri.analytics.events.v1',
  clientId: 'delivri.analytics.client-id.v1',
} as const;

const MAX_STORED_EVENTS = 5000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const getOrCreateClientId = (): string => {
  const storage = getStorage();
  if (!storage) {
    return 'anonymous-client';
  }

  const existing = storage.getItem(STORAGE_KEYS.clientId);
  if (existing) {
    return existing;
  }

  const next = createId();
  storage.setItem(STORAGE_KEYS.clientId, next);
  return next;
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTrimmedString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, current) => sum + current, 0) / values.length;
};

const readEvents = (): StoredEvent[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(STORAGE_KEYS.events);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry): StoredEvent | null => {
        if (!isRecord(entry)) {
          return null;
        }

        const eventType = toTrimmedString(entry.event_type);
        if (!eventType) {
          return null;
        }

        const createdAtRaw = toTrimmedString(entry.created_at);
        const createdAt = Number.isNaN(Date.parse(createdAtRaw)) ? new Date().toISOString() : createdAtRaw;

        return {
          id: toTrimmedString(entry.id) || createId(),
          user_id: toTrimmedString(entry.user_id) || getOrCreateClientId(),
          event_type: eventType,
          event_data: isRecord(entry.event_data) ? entry.event_data : {},
          created_at: createdAt,
        };
      })
      .filter((entry): entry is StoredEvent => entry !== null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch (error) {
    logger.warn('Failed to parse local analytics events, resetting storage', error);
    storage.removeItem(STORAGE_KEYS.events);
    return [];
  }
};

const writeEvents = (events: StoredEvent[]): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  } catch (error) {
    logger.error('Failed to persist local analytics events', error);
  }
};

const appendEvent = (payload: EventPayload): StoredEvent => {
  const nextEvent: StoredEvent = {
    id: createId(),
    user_id: payload.userId?.trim() || getOrCreateClientId(),
    event_type: payload.type.trim(),
    event_data: payload.data ?? {},
    created_at: new Date().toISOString(),
  };

  const current = readEvents();
  current.push(nextEvent);

  if (current.length > MAX_STORED_EVENTS) {
    current.splice(0, current.length - MAX_STORED_EVENTS);
  }

  writeEvents(current);
  return nextEvent;
};

const getEventDataValue = (event: StoredEvent, key: string): unknown => event.event_data[key];

const asDateKey = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const asHourKey = (isoDate: string): number | null => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours();
};

export const postEvent = async (payload: EventPayload): Promise<{ success: boolean }> => {
  const eventType = payload.type?.trim();
  if (!eventType) {
    throw new Error('Event type is required');
  }

  const event = appendEvent({ ...payload, type: eventType });
  logger.debug('Analytics event saved locally', {
    type: event.event_type,
    createdAt: event.created_at,
  });

  return { success: true };
};

export const getStats = async (): Promise<StatsSummary> => {
  const events = readEvents();
  const users = new Set(events.map((event) => event.user_id));

  return {
    total_events: events.length,
    total_users: users.size,
    total_searches: events.filter((event) => event.event_type === 'search').length,
    total_navigations: events.filter((event) => event.event_type === 'startNavigation').length,
  };
};

export const getTopSearches = async (): Promise<TopSearch[]> => {
  const searchCounts = new Map<string, number>();

  for (const event of readEvents()) {
    if (event.event_type !== 'search') {
      continue;
    }

    const query = toTrimmedString(getEventDataValue(event, 'query'));
    if (!query) {
      continue;
    }

    searchCounts.set(query, (searchCounts.get(query) ?? 0) + 1);
  }

  return Array.from(searchCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const getActiveUsers = async (): Promise<ActiveUser[]> => {
  const byUser = new Map<string, { last_activity: string; total_events: number }>();

  for (const event of readEvents()) {
    const current = byUser.get(event.user_id) ?? { last_activity: event.created_at, total_events: 0 };
    current.total_events += 1;
    if (event.created_at > current.last_activity) {
      current.last_activity = event.created_at;
    }
    byUser.set(event.user_id, current);
  }

  return Array.from(byUser.entries())
    .map(([user_id, data]) => ({ user_id, ...data }))
    .sort((a, b) => b.last_activity.localeCompare(a.last_activity))
    .slice(0, 20);
};

export const getUserActivities = async (): Promise<UserActivity[]> => {
  const byUser = new Map<
    string,
    {
      days: Set<string>;
      totalDurationMinutes: number;
      totalStops: number;
      lastActive: string;
    }
  >();

  for (const event of readEvents()) {
    const existing = byUser.get(event.user_id) ?? {
      days: new Set<string>(),
      totalDurationMinutes: 0,
      totalStops: 0,
      lastActive: event.created_at,
    };

    const day = asDateKey(event.created_at);
    if (day) {
      existing.days.add(day);
    }

    existing.totalDurationMinutes += toNumber(getEventDataValue(event, 'duration'));
    existing.totalStops += toNumber(getEventDataValue(event, 'stops'));

    if (event.created_at > existing.lastActive) {
      existing.lastActive = event.created_at;
    }

    byUser.set(event.user_id, existing);
  }

  return Array.from(byUser.entries())
    .map(([user_id, data]) => {
      const totalSessions = data.days.size;

      return {
        user_id,
        total_sessions: totalSessions,
        total_duration_minutes: data.totalDurationMinutes,
        total_stops: data.totalStops,
        avg_stops_per_session: totalSessions > 0 ? data.totalStops / totalSessions : 0,
        avg_duration_minutes: totalSessions > 0 ? data.totalDurationMinutes / totalSessions : 0,
        last_active: data.lastActive,
      };
    })
    .sort((a, b) => b.last_active.localeCompare(a.last_active))
    .slice(0, 50);
};

export const getTimeStats = async (): Promise<TimeStats[]> => {
  const threshold = Date.now() - 7 * DAY_IN_MS;
  const hourly = new Map<number, { users: Set<string>; totalSessions: number }>();

  for (const event of readEvents()) {
    const timestamp = Date.parse(event.created_at);
    if (Number.isNaN(timestamp) || timestamp < threshold) {
      continue;
    }

    const hour = asHourKey(event.created_at);
    if (hour === null) {
      continue;
    }

    const bucket = hourly.get(hour) ?? { users: new Set<string>(), totalSessions: 0 };
    bucket.totalSessions += 1;
    bucket.users.add(event.user_id);
    hourly.set(hour, bucket);
  }

  return Array.from(hourly.entries())
    .map(([hour, data]) => ({
      hour,
      active_users: data.users.size,
      total_sessions: data.totalSessions,
    }))
    .sort((a, b) => a.hour - b.hour);
};

export const getUsageMetrics = async (): Promise<UsageMetrics> => {
  const events = readEvents();
  const durations = events.map((event) => toNumber(getEventDataValue(event, 'duration'))).filter((value) => value > 0);
  const stops = events.map((event) => toNumber(getEventDataValue(event, 'stops'))).filter((value) => value > 0);
  const users = new Set(events.map((event) => event.user_id));

  const hourCounts = new Map<number, number>();
  for (const event of events) {
    const hour = asHourKey(event.created_at);
    if (hour === null) {
      continue;
    }
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  let peakUsageHour = 0;
  let maxCount = -1;
  for (const [hour, count] of Array.from(hourCounts.entries()).sort((a, b) => a[0] - b[0])) {
    if (count > maxCount) {
      maxCount = count;
      peakUsageHour = hour;
    }
  }

  return {
    total_active_users: users.size,
    total_sessions: events.length,
    avg_session_duration_minutes: average(durations),
    avg_stops_per_user: average(stops),
    peak_usage_hour: peakUsageHour,
  };
};

export const getEventTypeStats = async (): Promise<EventTypeStats[]> => {
  const byType = new Map<string, number>();

  for (const event of readEvents()) {
    byType.set(event.event_type, (byType.get(event.event_type) ?? 0) + 1);
  }

  return Array.from(byType.entries())
    .map(([event_type, total]) => ({ event_type, total }))
    .sort((a, b) => b.total - a.total);
};

export const getCityStats = async (): Promise<CityStats[]> => {
  const byCity = new Map<string, { searches: number; navigations: number }>();

  for (const event of readEvents()) {
    const city = toTrimmedString(getEventDataValue(event, 'city'));
    if (!city) {
      continue;
    }

    const cityData = byCity.get(city) ?? { searches: 0, navigations: 0 };
    if (event.event_type === 'search') {
      cityData.searches += 1;
    }
    if (event.event_type === 'startNavigation') {
      cityData.navigations += 1;
    }

    byCity.set(city, cityData);
  }

  return Array.from(byCity.entries())
    .map(([city, values]) => ({ city, searches: values.searches, navigations: values.navigations }))
    .sort((a, b) => b.searches - a.searches || b.navigations - a.navigations)
    .slice(0, 20);
};

export const getDailyStats = async (): Promise<DailyStats[]> => {
  const threshold = Date.now() - 30 * DAY_IN_MS;
  const byDay = new Map<string, { events: number; users: Set<string> }>();

  for (const event of readEvents()) {
    const timestamp = Date.parse(event.created_at);
    if (Number.isNaN(timestamp) || timestamp < threshold) {
      continue;
    }

    const day = asDateKey(event.created_at);
    if (!day) {
      continue;
    }

    const current = byDay.get(day) ?? { events: 0, users: new Set<string>() };
    current.events += 1;
    current.users.add(event.user_id);
    byDay.set(day, current);
  }

  return Array.from(byDay.entries())
    .map(([date, values]) => ({
      date,
      events: values.events,
      users: values.users.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getRouteMetrics = async (): Promise<{
  total_distance_km: number;
  avg_distance_km: number;
  avg_duration_min: number;
}> => {
  const routeEvents = readEvents().filter(
    (event) => event.event_type === 'startNavigation' || event.event_type === 'sessionEnd',
  );

  const distanceValues = routeEvents
    .map((event) => toNumber(getEventDataValue(event, 'routeDistanceKm')))
    .filter((value) => value > 0);
  const durationValues = routeEvents
    .map((event) => toNumber(getEventDataValue(event, 'routeDurationMin')))
    .filter((value) => value > 0);

  return {
    total_distance_km: distanceValues.reduce((sum, value) => sum + value, 0),
    avg_distance_km: average(distanceValues),
    avg_duration_min: average(durationValues),
  };
};

export const clearOldEvents = async (days: number): Promise<{ deleted: number }> => {
  const normalizedDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 30;
  const threshold = Date.now() - normalizedDays * DAY_IN_MS;

  const events = readEvents();
  const keptEvents = events.filter((event) => {
    const timestamp = Date.parse(event.created_at);
    if (Number.isNaN(timestamp)) {
      return true;
    }

    return timestamp >= threshold;
  });

  const deleted = events.length - keptEvents.length;
  writeEvents(keptEvents);
  logger.info('Cleared old local analytics events', { deleted, olderThanDays: normalizedDays });

  return { deleted };
};

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
  getRouteMetrics,
  clearOldEvents,
};

export default StatsAPI;
