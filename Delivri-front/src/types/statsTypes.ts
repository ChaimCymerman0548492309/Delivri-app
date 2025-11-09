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
