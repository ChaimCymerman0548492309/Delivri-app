// src/server.ts
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { count, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Pool } from 'pg';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || 'development';

/* ===== Security ===== */
app.use(express.json({ limit: '100kb' }));
app.set('trust proxy', 1);
app.use(helmet());
app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: true }));
app.disable('x-powered-by');

if (NODE_ENV === 'production')
  app.use((req, res, next) =>
    req.secure || req.header('x-forwarded-proto') === 'https'
      ? next()
      : res.redirect(`https://${req.header('host')}${req.originalUrl}`),
  );

const allowed = ['http://localhost:5173', 'https://delivri.app', 'https://www.delivri.app'];
app.use(
  cors({ origin: (o, cb) => (!o || allowed.includes(o) ? cb(null, true) : cb(new Error('CORS'))), credentials: true }),
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));

/* ===== Logging ===== */
const logger = pino({ level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug') });
app.use(pinoHttp({ logger }));

/* ===== DB ===== */
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

/* ===== Tables ===== */
const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: text('client_id'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  firstSeen: timestamp('first_seen').defaultNow(),
  lastSeen: timestamp('last_seen').defaultNow(),
});
const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  eventType: text('event_type').notNull(),
  eventData: jsonb('event_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

/* ===== Validation ===== */
const eventSchema = z.object({ type: z.string().min(1), data: z.record(z.string(), z.any()).optional() });

/* ===== Identify User ===== */
app.use(async (req, res, next) => {
  try {
    const clientId = (req.headers['x-client-id'] as string) || crypto.randomUUID();
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '').replace(
      '::ffff:',
      '',
    );
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const ua = req.headers['user-agent'] || '';

    const [user] = await db.select().from(users).where(eq(users.clientId, clientId)).limit(1);
    if (!user) await db.insert(users).values({ clientId, ipHash, userAgent: ua });
    else
      await db
        .update(users)
        .set({ lastSeen: sql`NOW()`, ipHash })
        .where(eq(users.clientId, clientId));

    (req as any).clientId = clientId;
    next();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: 'User tracking failed' });
  }
});

/* ===== Routes ===== */
app.get('/', (_req, res) => res.send('🚀 Delivri API running securely'));

app.post('/api/events', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clientId, (req as any).clientId))
      .limit(1);
    await db
      .insert(events)
      .values({ userId: user?.id || null, eventType: parsed.data.type, eventData: parsed.data.data || {} });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

/* ===== Basic Stats ===== */
app.get('/api/stats', async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT COUNT(*) AS total_events,
             COUNT(DISTINCT user_id) AS total_users,
             COUNT(*) FILTER (WHERE event_type='search') AS total_searches,
             COUNT(*) FILTER (WHERE event_type='startNavigation') AS total_navigations
      FROM events;`);
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Stats failed' });
  }
});
app.get('/api/stats/top-searches', async (_req, res) => {
  try {
    const r = await db
      .select({ query: sql<string>`event_data->>'query'`, count: count() })
      .from(events)
      .where(eq(events.eventType, 'search'))
      .groupBy(sql`event_data->>'query'`)
      .orderBy(sql`count DESC`)
      .limit(10);
    res.json(r);
  } catch {
    res.status(500).json({ error: 'Top searches failed' });
  }
});
app.get('/api/stats/active-users', async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT user_id, MAX(created_at) AS last_activity, COUNT(*) AS total_events
      FROM events WHERE user_id IS NOT NULL GROUP BY user_id ORDER BY last_activity DESC LIMIT 20;`);
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: 'Active users failed' });
  }
});

/* ===== BI endpoints ===== */
app.get('/api/stats/event-types', async (_req, res) => {
  const r = await db.execute(
    sql`SELECT event_type, COUNT(*) AS total FROM events GROUP BY event_type ORDER BY total DESC;`,
  );
  res.json(r.rows);
});
app.get('/api/stats/city-stats', async (_req, res) => {
  const r = await db.execute(sql`
    SELECT event_data->>'city' AS city,
           COUNT(*) FILTER (WHERE event_type='search') AS searches,
           COUNT(*) FILTER (WHERE event_type='startNavigation') AS navigations
    FROM events WHERE event_data->>'city' IS NOT NULL GROUP BY city ORDER BY searches DESC LIMIT 20;`);
  res.json(r.rows);
});
app.get('/api/stats/daily-stats', async (_req, res) => {
  const r = await db.execute(sql`
    SELECT TO_CHAR(created_at,'YYYY-MM-DD') AS date,
           COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
    FROM events WHERE created_at>=NOW()-INTERVAL '30 days'
    GROUP BY date ORDER BY date;`);
  res.json(r.rows);
});
app.get('/api/stats/usage-metrics', async (_req, res) => {
  const r = await db.execute(sql`
    SELECT COUNT(DISTINCT user_id) AS total_active_users,
           COUNT(*) AS total_sessions,
           AVG((event_data->>'duration')::float) AS avg_session_duration_minutes,
           AVG((event_data->>'stops')::float) AS avg_stops_per_user,
           MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM created_at)) AS peak_usage_hour
    FROM events;`);
  res.json(r.rows[0]);
});

app.get('/api/stats/user-activities', async (_req, res) => {
  const result = await db.execute(sql`
    SELECT user_id,
           COUNT(DISTINCT DATE(created_at)) AS total_sessions,
           COALESCE(SUM((event_data->>'duration')::numeric),0) AS total_duration_minutes,
           COALESCE(SUM((event_data->>'stops')::numeric),0) AS total_stops,
           COALESCE(AVG((event_data->>'stops')::numeric),0) AS avg_stops_per_session,
           COALESCE(AVG((event_data->>'duration')::numeric),0) AS avg_duration_minutes,
           MAX(created_at) AS last_active
    FROM events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY last_active DESC
    LIMIT 50;
  `);
  res.json(result.rows);
});

app.get('/api/stats/time-stats', async (_req, res) => {
  const result = await db.execute(sql`
    SELECT EXTRACT(HOUR FROM created_at) AS hour,
           COUNT(DISTINCT user_id) AS active_users,
           COUNT(*) AS total_sessions
    FROM events
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY hour
    ORDER BY hour;
  `);
  res.json(result.rows);
});
app.get('/api/stats/route-metrics', async (_req, res) => {
  try {
    const result = await db.execute(sql`
  SELECT
    COALESCE(SUM((event_data->>'routeDistanceKm')::numeric), 0) AS total_distance_km,
    COALESCE(AVG((event_data->>'routeDistanceKm')::numeric), 0) AS avg_distance_km,
    COALESCE(AVG((event_data->>'routeDurationMin')::numeric), 0) AS avg_duration_min
  FROM events
  WHERE event_type IN ('startNavigation', 'sessionEnd');
`);
    res.json(result.rows?.[0] ?? { total_distance_km: 0, avg_distance_km: 0, avg_duration_min: 0 });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Route metrics query failed' });
  }
});

app.delete('/api/events', async (req, res) => {
  const days = Number(req.query.olderThan) || 30;
  const r = await db.execute(sql`DELETE FROM events WHERE created_at < NOW() - INTERVAL '${days} days';`);
  res.json({ deleted: (r as any).rowCount ?? 0 });
});

/* ===== Error Handler ===== */
app.use((err: any, req: express.Request, res: express.Response, _next: any) => {
  req.log.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => logger.info(`🌐 Delivri API running on port ${PORT} (${NODE_ENV})`));
