# Delivri — אפיון מלא (Product Spec / System Prompt)

> **מטרת המסמך:** תיאור **מדויק** של כל הפונקציונליות הקיימת בפרויקט Delivri נכון לקוד ב-repo, כולל **כל קריאות ה-API**, מגבלות, מודלים, זרימות, והודעות.  
> ניתן להשתמש במסמך זה כ-**prompt לבנייה מחדש**, הרחבה, או QA.

---

## 0. הגדרת המוצר (System Prompt)

```text
אתה בונה/מתחזק את Delivri — אפליקציית Web RTL בעברית לנהגי משלוח בישראל.

יכולות חובה:
- מפה (MapLibre GL + OSM tiles) עם markers לתחנות ולמשתמש
- הוספת עד 10 תחנות דרך בחירת עיר+רחוב מ-data.gov.il + geocoding
- GPS: הרשאה, מעקב, סמן על המap
- אופטימיזציית סדר תחנות (TSP heuristic) + חישוב מסלול נסיעה
- ניווט: קו מסלול, הוראות, voice guidance, progress bar
- ניהול תחנות: בוצע / דחייה / מחיקה / עריכה / הערות
- אנליטיקה מקומית (localStorage) + דשבורד UI
- Backend נפרד (Express+PostgreSQL) ל-BI — קיים אך Frontend לא שולח אליו events כיום

מגבלות קשיחות:
- MAX_STOPS = 10
- Coordinates תמיד [longitude, latitude]
- Map container תמיד direction: ltr
- UI כללי direction: rtl
- Photon: אין lang=he
- Nominatim: rate limit 1.5s, block 60s on 429
```

---

## 1. קבועים גלובליים (Hard-coded)

| קבוע | ערך | מיקום |
|------|-----|--------|
| `MAX_STOPS` | `10` | `NavigationPanel.tsx` |
| Map default center | `[35.5, 32.7]` (lng, lat) | `mapUtils.ts` |
| Map default zoom | `10` | `mapUtils.ts` |
| Route layer color | `#0d9488`, width `5`, opacity `0.85` | `useRouteLoader.ts` |
| Route fitBounds padding | `100`, duration `1000ms` | `useRouteLoader.ts` |
| Route retry | עד `2` retries, delay `2000ms` | `useRouteLoader.ts` |
| GPS throttle (tracking) | `0.05` km (~50m) | `useLocationTracking.ts` |
| GPS throttle (navigation) | `0.02` km (~20m) | `useLocationTracking.ts` |
| City proximity radius | `45` km | `cityProximity.ts` |
| Nearby cities max | `25` | `cityProximity.ts` |
| Geocode cities per sort | `8` max | `cityProximity.ts` |
| City sort refresh distance | `3` km | `cityProximity.ts` |
| Location stable key precision | `3` decimals (~111m) | `geoUtils.ts` |
| City geocode batch delay | `350ms` between cities | `cityCoordsCache.ts` |
| Failed geocode TTL | `24` hours | `cityCoordsCache.ts` |
| Nominatim min interval | `1500ms` | `geocodeRateLimit.ts` |
| Nominatim 429 block | `60000ms` | `geocodeRateLimit.ts` |
| Analytics max local events | `5000` | `StatsAPI.ts` |
| Mobile breakpoint | `768px` | `MapViewEnhanced.tsx` |
| Compact panel breakpoint | `1024px` | `NavigationPanelShell.tsx` |
| Route error snackbar auto-hide | `6000ms` | `RouteErrorHandler.tsx` |
| Geolocation timeout | `15000ms` (get), `20000ms` (watch) | `mapUtils.ts` / tracking |

---

## 2. מודל נתונים

### 2.1 `DeliveryStop`

```typescript
interface DeliveryStop {
  id: string;              // `stop-${Date.now()}`
  address: string;         // e.g. "הרצל 12 אבן יהודה"
  coordinates: [number, number]; // [lng, lat] — חובה
  completed: boolean;      // default false
  order: number;           // 0-based index at creation
  estimatedTime?: number;
  distanceFromPrevious?: number;
  postponed?: boolean;     // set implicitly on postpone flow
  note?: string;
}
```

**Persistence:** `localStorage` key `"deliveryStops"` (JSON array).

### 2.2 `NavigationStep`

```typescript
interface NavigationStep {
  instruction: string;   // עברית
  distance: number;      // meters
  duration: number;      // seconds
  type: string;          // always 'continue' from route loader
  coordinates?: [number, number];
}
```

### 2.3 Analytics Event (local)

```typescript
interface StoredEvent {
  id: string;              // UUID
  user_id: string;         // delivri.analytics.client-id.v1
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;      // ISO8601
}
```

### 2.4 Backend Event (PostgreSQL)

```typescript
// POST /api/events body
{ type: string; data?: Record<string, any> }

// DB: events(event_type, event_data jsonb, user_id, created_at)
// DB: users(client_id, ip_hash, user_agent, first_seen, last_seen)
```

---

## 3. מסכים ופונקציונליות UI (מדויק)

### 3.1 `LocationPermissionPopup` — דיאלוג onboarding

**Trigger:** `locationPopupOpen === true` (default at app start).

**UI elements:**
- Title: `גישה למיקום`
- Body text + bullet list (3 items)
- Checkbox: `אני מאשר/ת את תנאי השימוש ומאפשר/ת גישה למיקום`
- Link opens `TermsDialog`
- Button: `אשר והמשך` (disabled until checkbox checked)

**On confirm:**
1. Calls `handleLocationConfirm()` → `navigator.geolocation.getCurrentPosition`
2. Success: `currentLocation` set, `tracking=true`, popup closes
3. Failure: Alert `אין הרשאה למיקום. אנא אשר גישה בדפדפן.`

**Geolocation options (getCurrentLocation):**
```javascript
{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
```

**Pre-checks:**
- Requires `window.isSecureContext`
- Requires `navigator.geolocation`
- Checks `navigator.permissions.query({ name: 'geolocation' })` — if `denied`, throws Hebrew error

---

### 3.2 `Header`

| אלמנט | פעולה |
|--------|--------|
| Menu badge | Toggle `panelOpen`; badge = `deliveryStopsCount` |
| Title | `Delivri` + subtitle `ניהול מסלולי משלוח` |
| Chip | `בניווט` when `isNavigating` |
| Analytics icon | Opens `SafeAnalyticsDashboard` |
| BarChart icon | Opens `AnalyticsDashboard` |
| MyLocation icon | `focusOnUserLocation()` → flyTo zoom 15 |

---

### 3.3 `NavigationPanel` — פאנל מסלול

#### Header bar
- Title: `מנהל מסלול`
- Close button → `onClosePanel`

#### Location status (if GPS available)
- Text: `מיקום זמין · ~{accuracy} מ׳`

#### Navigation progress (if navigating)
- `LinearProgress` value = `(currentStopIndex + 1) / deliveryStops.length * 100`

#### Primary button
| State | Label | Action |
|-------|-------|--------|
| Idle | `התחל ניווט · {count}` | `handleStart()` → `onStartNavigation()` |
| Navigating | `עצור` | `handleStop()` → `onStopNavigation()` |

**Disabled when:**
- `routeLoading` OR `!ready` OR (not navigating AND (`!currentLocation` OR `deliveryStops.length === 0`))

#### Stats row (navigating only)
- `{totalDistance/1000} ק״מ` | `{formatTime(totalDuration)}` | `{currentStopIndex+1}/{count}`

#### `CityStreetSelector` — see §4.2

#### `StopsTable` — see §3.4

#### Postpone Dialog
- Title: `דחיית תחנה`
- Confirm moves stop to end of array

---

### 3.4 `StopsTable` + `StopDetailDialog`

#### Table columns
| # | כתובת | סטטוס |

#### Status labels
| Condition | Label | Color |
|-----------|-------|-------|
| `completed` | `בוצע` | success |
| `postponed` | `נדחה` | default |
| `isCurrent && isNavigating` | `פעיל` | warning |
| else | `ממתין` | primary |

#### Row click → `StopDetailDialog`

**Dialog features:**
- Static map preview URL:
  ```
  https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lng}&zoom=15&size=400x160&maptype=mapnik&markers={lat},{lng},red-pushpin
  ```
- Edit address → re-geocode on save
- Edit note (multiline)
- Actions: map focus, postpone, complete (if current+navigating), delete
- Save calls `onUpdate(stopId, { address?, coordinates?, note? })`

---

### 3.5 `MapCanvas`

| Overlay | Condition | Position |
|---------|-----------|----------|
| Loading spinner | `!ready && !mapLoadError` | full overlay |
| Map error | `mapLoadError` | Alert + reload button |
| `InstructionsOverlay` | `ready && isNavigating` | top center |
| `ApiPerformance` | `ready && showApiPerformance && !isMobile` | top-end, width 280px |
| Inline loader | `apiLoading && ready` | bottom-end |

**Map container CSS:** `direction: ltr` (mandatory).

---

### 3.6 `Footer` (fixed bottom)

| Stat | Tooltip source |
|------|----------------|
| `התקדמות` `{completed}/{total}` | completed stops |
| `תחנה` `{currentStopIndex+1}` | current index |
| `מרחק` | `formatDistance(totalDistance)` |
| `זמן` | `formatDuration(totalDuration)` |

---

### 3.7 `InstructionsOverlay`

- Shows when `isNavigating && steps.length > 0`
- Current step: `steps[currentStepIndex]` (fallback `steps[0]`)
- Next 2 steps preview
- Chip: `{currentStepIndex+1}/{steps.length}`

---

### 3.8 `RouteErrorHandler`

- Snackbar bottom-center, severity `warning`
- Title: `בעיה בטעינת המסלול`
- Actions: `נסה שוב` (calls `onRetry`), dismiss
- Auto-hide: 6000ms

---

### 3.9 Dashboards

#### `SafeAnalyticsDashboard` (local session data)
- Opens from Header analytics icon
- Shows: completion rate, distance/time averages, stop status breakdown
- **No HTTP** — uses props from current session

#### `AnalyticsDashboard` (localStorage analytics)
- Calls `StatsAPI.*` methods (all local, no HTTP)
- Tabs: users, events, cities, searches, routes
- Charts: Recharts
- Filter UI: `time: '7d'`, `city: 'all'` (UI state)

---

## 4. זרימות עסקיות (State Machines)

### 4.1 הוספת תחנה

```text
[User selects city] → streetOptions filtered by CITY_FIELD === selectedCity
[User selects street] → optional houseNumber
[Click "הוספת התחנה למסלול"]
  → fullAddress = `${street} ${houseNumber||''} ${city}`.trim()
  → geocodeAddress(fullAddress)  // see API §5.3
  → if null: alert('לא הצלחנו לאתר את הכתובת שבחרת')
  → if count >= 10: alert('בגרסה הנוכחית ניתן להוסיף עד 10 תחנות בלבד')
  → handleAddStop(fullAddress, coords)
  → StatsAPI.postEvent('addStop', { address, coords, city })
  → localStorage deliveryStops updated
  → useStopMarkers re-renders pins
  → mobile: panel closes
```

### 4.2 `CityStreetSelector` — data.gov.il

**On mount — single fetch:**
```
GET https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&limit=50000
```

**Response path:** `result.records[]`

**Fields used:**
- `שם_ישוב` → city (trimmed via `replace(/\s+/g,' ').trim()`)
- `שם_רחוב` → street (trimmed)

**City sort (when GPS available):**
- Trigger: `locationKey = locationStableKey(currentLocation)` changes
- Calls `sortCitiesByProximity(cities, location)`
- Groups in Autocomplete: `קרוב אליך` | `כל הערים`

**Street filter:**
```javascript
streetRecords.filter(r => r['שם_ישוב'] === selectedCity)
```

---

### 4.3 התחלת ניווט

```text
startNavigation():
  IF deliveryStopsCount === 0 → error 'אנא הוסף לפחות תחנה אחת...'
  loadRoute():
    coords = [currentLocation, ...stops.coordinates]
    IF coords.length < 2 → error
    optimizedCoords = optimizeRouteWithTSP(coords)     // OSRM Table + TSP
    routeData = getRouteData(optimizedCoords)           // ORS → OSRM → leg-by-leg
    drawRouteOnMap(routeData.geometry)
    setNavigationSteps, totalDistance, totalDuration
  IF success:
    isNavigating = true
    currentStopIndex = 0
    mapFlyTo(currentLocation)
    startNavigationWatch()  // flyTo zoom 15 on move
    StatsAPI.postEvent('startNavigation', {...})
    mobile: close panel
```

### 4.4 עצירת ניווט

```text
stopNavigation():
  isNavigating = false
  stopNavigationWatch()
  StatsAPI.postEvent('sessionEnd', {...})
```

### 4.5 השלמת תחנה

```text
handleCompleteStop(stopId):
  stop.completed = true
  IF index === currentStopIndex AND not last → currentStopIndex++
  IF last stop → isNavigating=false, stopNavigationWatch()
  StatsAPI.postEvent('completeStop', { stopId })
```

### 4.6 דחיית תחנה

```text
handlePostponeStop → dialog
handleConfirmPostpone:
  remove stop from array, append to end
  StatsAPI.postEvent('postponeStop', { stopId })
```

---

## 5. APIs — Frontend (כל קריאת HTTP מדויקת)

### 5.1 לוגיקת Base URL (`config/api.ts`)

```javascript
const IS_LOCAL = window.location.hostname === 'localhost';

PHOTON_BASE    = IS_LOCAL ? '/photon'    : 'https://photon.komoot.io'
NOMINATIM_BASE = IS_LOCAL ? '/nominatim' : 'https://nominatim.openstreetmap.org'
OSRM_BASE      = IS_LOCAL ? '/osrm'      : 'https://router.project-osrm.org'
ORS_BASE       = IS_LOCAL ? '/ors'       : 'https://api.openrouteservice.org'
ORS_API_KEY    = import.meta.env.VITE_ORS_API_KEY   // optional
DATA_GOV_IL    = 'https://data.gov.il/api/3/action/datastore_search'
```

### 5.2 Vite Dev Proxies (`vite.config.ts`)

| Path prefix | Target |
|-------------|--------|
| `/photon` | `https://photon.komoot.io` (strip prefix) |
| `/nominatim` | `https://nominatim.openstreetmap.org` |
| `/osrm` | `https://router.project-osrm.org` |
| `/ors` | `https://api.openrouteservice.org` |

---

### 5.3 Geocoding APIs

#### A) Photon Forward Geocode

**Function:** `API.PHOTON_GEOCODE(query, bias?)`

**URL template:**
```
{PHOTON_BASE}/api/?q={encodeURIComponent(query)}&limit=1
[+ &lat={bias[1]}&lon={bias[0]} if bias provided]
```

**Query normalization (`normalizeGeocodeQuery`):**
- Collapse whitespace, trim
- If query already contains `israel` or `ישראל` → use as-is
- Else append `, Israel`

**Response used:**
```json
features[0].geometry.coordinates → [lng, lat]
```

**Used by:**
- `geocodeAddress()` — primary
- `resolveCityCoords()` — city proximity cache
- `geocodeWithPhoton(addr, bias?)`

---

#### B) Photon Reverse Geocode

**Function:** `API.PHOTON_REVERSE(lon, lat)`

**URL:**
```
{PHOTON_BASE}/reverse?lon={lon}&lat={lat}
```

**Response fields tried (priority order):**
```
properties.city | locality | county | name (if type city/town) | name
```

**Used by:** `reverseGeocodeCity()` in `cityProximity.ts`

---

#### C) Nominatim Forward Geocode

**Function:** `API.NOMINATIM_GEOCODE(query)`

**URL:**
```
{NOMINATIM_BASE}/search?format=json&q={encodeURIComponent(normalizedQuery)}&limit=1
```

**Headers:**
```
User-Agent: DelivriApp/1.0
```

**Rate limiting:**
- Min 1500ms between calls
- On HTTP 429 → block all Nominatim for 60 seconds

**Used by:** `geocodeAddress()` fallback only (after Photon fails)

---

#### D) geocodeAddress flow

```text
1. normalizeGeocodeQuery(addr)
2. geocodeWithPhoton(query) → if success return
3. if isNominatimBlocked() → return null
4. geocodeWithNominatim(query)
```

**Failure UX:** `alert('לא הצלחנו לאתר את הכתובת שבחרת')`

---

### 5.4 Routing APIs

#### A) OSRM Table (TSP matrix)

**Function:** `API.OSRM_TABLE(coords)`

**URL:**
```
{OSRM_BASE}/table/v1/driving/{lon1},{lat1};{lon2},{lat2};...?annotations=duration
```

**Important:** NO `sources=0` — must be full N×N matrix.

**Response used:**
```json
{
  "code": "Ok",
  "durations": [[0, 120, ...], ...],
  "destinations": [{ "location": [lng, lat] }, ...]
}
```

**Processing:**
1. `snapCoordsFromTable` — use snapped destinations
2. `sanitizeMatrix` — null/negative → Infinity
3. `optimizeTourOrder(matrix, start=0)` — NN + 2-opt, index 0 fixed (user location)
4. `reorderCoords(snapped, order)`

**Tracked label:** `'אופטימיזציית מסלול'`

---

#### B) OSRM Route (full path)

**Function:** `API.OSRM_ROUTE(coords)`

**URL:**
```
{OSRM_BASE}/route/v1/driving/{coords joined by ;}?overview=full&geometries=geojson&steps=true&continue_straight=default
```

**Response used:**
```json
routes[0].geometry    → GeoJSON LineString
routes[0].distance    → meters
routes[0].duration    → seconds
routes[0].legs[].steps[] → maneuver instructions
```

**Hebrew instruction mapping (`buildOsrmInstruction`):**
| OSRM | Hebrew |
|------|--------|
| arrive | `הגעת ליעד` |
| depart + name | `צא לכיוון {name}` |
| modifier right | `פנה ימינה ל-{name}` |
| modifier left | `פנה שמאלה ל-{name}` |
| modifier straight | `המשך ישר ב-{name}` |
| default | `המשך ב-{name}` or `המשך בנסיעה` |

---

#### C) OSRM Leg-by-leg fallback

If full route fails:
```text
FOR i = 0 .. coords.length-2:
  getRouteDataFromOSRM([coords[i], coords[i+1]])
MERGE geometries + sum distance/duration
```

---

#### D) OpenRouteService Route

**Condition:** `VITE_ORS_API_KEY` must be set.

**Function:** `API.ORS_ROUTE_GEOJSON()`

**URL:**
```
{ORS_BASE}/v2/directions/driving-car/geojson?api_key={VITE_ORS_API_KEY}
```

**Method:** `POST`

**Body:**
```json
{
  "coordinates": [[lng, lat], ...],
  "language": "he",
  "instructions": true
}
```

**Response used:**
```json
features[0].geometry.coordinates
features[0].properties.summary.distance   // meters
features[0].properties.summary.duration   // seconds
features[0].properties.segments[].steps[]
```

**Priority:** ORS tried **first** in `getRouteData()`; OSRM is fallback.

**Tracked label:** `'טעינת נתיב'`

---

#### E) getRouteData fallback chain

```text
1. getRouteDataFromORS(coords)     → if ORS_API_KEY && success
2. getRouteDataFromOSRM(coords)     → full route
3. getRouteDataLegByLeg(coords)     → per-segment OSRM
```

**Errors thrown:**
- `'נדרשות לפחות שתי נקודות למסלול'`
- `'OSRM לא הצליח לחשב מסלול ({code})'`
- `'לא ניתן לחשב אף קטע במסלול'`

---

### 5.5 Map Tiles (MapLibre style)

**Embedded in `initializeMap()`:**
```
Raster tiles: https://tile.openstreetmap.org/{z}/{x}/{y}.png
tileSize: 256
attribution: © OpenStreetMap contributors
glyphs: https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf
```

**No external fetch for tiles beyond OSM CDN.**

---

### 5.6 Static Map Preview (StopDetailDialog)

```
GET https://staticmap.openstreetmap.de/staticmap.php
  ?center={lat},{lng}
  &zoom=15
  &size=400x160
  &maptype=mapnik
  &markers={lat},{lng},red-pushpin
```

---

### 5.7 data.gov.il Cities/Streets

```
GET https://data.gov.il/api/3/action/datastore_search
  ?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3
  &limit=50000
```

**No authentication.**

---

### 5.8 Browser APIs (לא HTTP)

| API | Usage | Options |
|-----|-------|---------|
| `navigator.geolocation.getCurrentPosition` | Initial location | `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }` |
| `navigator.geolocation.watchPosition` | Tracking + navigation | `{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }` |
| `speechSynthesis.speak` | Voice guidance | `new SpeechSynthesisUtterance(step.instruction)` on step change |
| `localStorage` | Stops, analytics, city cache | see §7 |
| `sessionStorage` | Failed geocode cache | `delivri_city_coords_failed_v1` |

---

## 6. Backend API — Delivri-beck (Express)

**Base URL (dev):** `http://localhost:8080`  
**CORS allowed origins:**
```
http://localhost:5173
https://delivri.app
https://www.delivri.app
```

**Rate limit:** 200 requests / 15 minutes per IP

**Note:** Frontend `StatsAPI.postEvent` **does NOT call these endpoints today** — events saved locally only. Backend is ready for integration.

---

### 6.1 `GET /`

**Response:** `🚀 Delivri API running securely` (plain text)

---

### 6.2 `POST /api/events`

**Headers (auto):**
- `x-client-id` — optional; server generates UUID if missing

**Body:**
```json
{
  "type": "string (required, min 1)",
  "data": { "optional": "object" }
}
```

**Validation:** Zod `eventSchema`

**Response 200:**
```json
{ "success": true }
```

**Response 400:**
```json
{ "error": "Invalid payload" }
```

---

### 6.3 `GET /api/stats`

**Response:**
```json
{
  "total_events": number,
  "total_users": number,
  "total_searches": number,
  "total_navigations": number
}
```

SQL filters: `event_type='search'`, `event_type='startNavigation'`

---

### 6.4 `GET /api/stats/top-searches`

**Response:** `[{ "query": string, "count": number }]` — top 10

---

### 6.5 `GET /api/stats/active-users`

**Response:** `[{ "user_id", "last_activity", "total_events" }]` — limit 20

---

### 6.6 `GET /api/stats/event-types`

**Response:** `[{ "event_type", "total" }]`

---

### 6.7 `GET /api/stats/city-stats`

**Response:** `[{ "city", "searches", "navigations" }]` — top 20 by searches

Uses `event_data->>'city'`

---

### 6.8 `GET /api/stats/daily-stats`

**Response:** `[{ "date": "YYYY-MM-DD", "events", "users" }]` — last 30 days

---

### 6.9 `GET /api/stats/usage-metrics`

**Response:**
```json
{
  "total_active_users": number,
  "total_sessions": number,
  "avg_session_duration_minutes": number,
  "avg_stops_per_user": number,
  "peak_usage_hour": number
}
```

Uses `event_data->>'duration'`, `->>'stops'`

---

### 6.10 `GET /api/stats/user-activities`

**Response:** up to 50 users with session/duration/stops aggregates

---

### 6.11 `GET /api/stats/time-stats`

**Response:** `[{ "hour": 0-23, "active_users", "total_sessions" }]` — last 7 days

---

### 6.12 `GET /api/stats/route-metrics`

**Response:**
```json
{
  "total_distance_km": number,
  "avg_distance_km": number,
  "avg_duration_min": number
}
```

From events `startNavigation` | `sessionEnd` using `routeDistanceKm`, `routeDurationMin`

---

### 6.13 `DELETE /api/events?olderThan=N`

**Default:** N=30 days

**Response:** `{ "deleted": number }`

---

## 7. Firebase Cloud Functions

**File:** `functions/src/index.ts`

### 7.1 `proxyPhoton`

```
HTTPS Cloud Function
Forwards: https://photon.komoot.io + req.url
Response header: Access-Control-Allow-Origin: *
Returns: raw text body, same status
```

### 7.2 `proxyNominatim`

```
HTTPS Cloud Function
Forwards: https://nominatim.openstreetmap.org + req.url
Response header: Access-Control-Allow-Origin: *
```

---

## 8. Analytics Events — Schema מדויק

### 8.1 Events logged in `NavigationPanel.logEvent`

#### `addStop`
```json
{
  "type": "addStop",
  "data": {
    "address": "string — fullAddress",
    "coords": [lng, lat],
    "city": "string"
  }
}
```

#### `startNavigation`
```json
{
  "type": "startNavigation",
  "data": {
    "city": "string — last word of first stop address or 'לא ידוע'",
    "stops": number,
    "currentLocation": [lng, lat],
    "routeDistanceKm": number,
    "routeDurationMin": number,
    "duration": number
  }
}
```

#### `sessionEnd`
```json
{
  "type": "sessionEnd",
  "data": {
    "city": "string",
    "completedStops": number,
    "totalStops": number,
    "routeDistanceKm": number,
    "routeDurationMin": number,
    "duration": number
  }
}
```

#### `completeStop`
```json
{ "type": "completeStop", "data": { "stopId": "string" } }
```

#### `removeStop`
```json
{ "type": "removeStop", "data": { "stopId": "string" } }
```

#### `postponeStop`
```json
{ "type": "postponeStop", "data": { "stopId": "string" } }
```

### 8.2 StatsAPI local methods (no HTTP)

| Method | Returns |
|--------|---------|
| `postEvent(payload)` | `{ success: true }` |
| `getStats()` | `StatsSummary` |
| `getTopSearches()` | top 10 queries from `event_type=search` |
| `getActiveUsers()` | top 20 by last activity |
| `getUserActivities()` | top 50 with aggregates |
| `getTimeStats()` | hourly buckets, 7 days |
| `getUsageMetrics()` | KPI object |
| `getEventTypeStats()` | counts by type |
| `getCityStats()` | top 20 cities |
| `getDailyStats()` | 30 days |
| `getRouteMetrics()` | distance/duration from navigation events |
| `clearOldEvents(days)` | `{ deleted: number }` |

---

## 9. Map Markers — Spec

### 9.1 User location marker

- Class: `user-location-arrow`
- SVG arrow, teal `#0d9488`
- `anchor: 'center'`, `rotationAlignment: 'map'`
- Created on first `watchPosition` callback after permission
- First fix: `map.flyTo({ center, zoom: 14 })`

### 9.2 Stop markers (`stopMarkerFactory.ts`)

| Variant | CSS class | Visual |
|---------|-----------|--------|
| `upcoming` | `stop-marker--upcoming` | Teal pin + number |
| `current` | `stop-marker--current` | Orange pin + pulse animation |
| `completed` | `stop-marker--completed` | Green circle + ✓ SVG |

- `anchor: 'bottom'`
- Hook: `useStopMarkers(mapRef, mapReady, stops, currentStopIndex, isNavigating)`
- Re-created on: stops change, index change, navigating toggle, mapReady

---

## 10. Map Route Layer — Spec

| Property | Value |
|----------|-------|
| Source ID | `route` |
| Layer ID | `route-layer` |
| Type | `line` |
| Update | `setData` if source exists, else `addSource` + `addLayer` |
| Line cap/join | `round` |

---

## 11. LocalStorage / SessionStorage Keys

| Key | Content | Written by |
|-----|---------|------------|
| `deliveryStops` | `DeliveryStop[]` | `useDeliveryStops` |
| `delivri.analytics.events.v1` | `StoredEvent[]` max 5000 | `StatsAPI` |
| `delivri.analytics.client-id.v1` | UUID string | `StatsAPI` |
| `delivri_city_coords_v2` | `{ [cityName]: [lng,lat] }` | `cityCoordsCache` |
| `delivri_city_coords_failed_v1` | `{ [cityName]: timestamp }` | sessionStorage, `cityCoordsCache` |

---

## 12. Environment Variables

| Variable | Where | Required | Effect |
|----------|-------|----------|--------|
| `VITE_ORS_API_KEY` | Delivri-front | No | Enables ORS routing as primary |
| `VITE_LOG_LEVEL` | Delivri-front | No | Logger verbosity |
| `VITE_API_URL` | Delivri-front | No | **Documented but NOT wired in StatsAPI code** |
| `DATABASE_URL` | Delivri-beck | Yes (backend) | PostgreSQL connection |
| `PORT` | Delivri-beck | No (default 8080) | Server port |
| `NODE_ENV` | Delivri-beck | No | production HTTPS redirect |
| `LOG_LEVEL` | Delivri-beck | No | Pino level |

---

## 13. RTL Specification

| Layer | Direction |
|-------|-----------|
| `html`, `body`, `#root` | `rtl` |
| MUI Theme | `direction: 'rtl'` |
| Emotion cache | `@mui/stylis-plugin-rtl`, key `muirtl` |
| MapLibre container | **`ltr` only** |
| Autocomplete Popper | `dir="rtl"` via `autocompleteRtl.ts` |
| Dialogs | `dir="rtl"` |

---

## 14. Responsive Layout

| Breakpoint | Behavior |
|------------|----------|
| `≤768px` | `NavigationPanel` in full-screen Drawer; panel closes on add stop / start nav; ApiPerformance hidden |
| `≤1024px` | Panel width `min(380px, 36vw)` |
| `>1024px` | Panel width `min(420px, 32vw)` |

Panel position: first in flex row → appears on **right** in RTL.

---

## 15. Error Messages Catalog (Hebrew)

| Context | Message |
|---------|---------|
| No GPS permission | `אין הרשאה למיקום. אנא אשר גישה בדפדפן.` |
| Geolocation denied | `הגישה למיקום חסומה. יש לאפשר הרשאה בהגדרות האתר בדפדפן.` |
| Not secure context | `גישה למיקום זמינה רק בחיבור מאובטח (HTTPS).` |
| Geocode fail (add stop) | `לא הצלחנו לאתר את הכתובת שבחרת` |
| Geocode fail (edit stop) | `לא הצלחנו לאתר את הכתובת החדשה` |
| Max stops | `בגרסה הנוכחית ניתן להוסיף עד 10 תחנות בלבד` |
| Missing city/street | `בחר עיר ורחוב לפני הוספת התחנה למסלול` |
| Start nav no stops | `אנא הוסף לפחות תחנה אחת לפני תחילת הניווט` |
| Route load fail | `לא ניתן לטעון את המסלול. נסה שוב.` |
| Map/location unavailable | `מפה או מיקום לא זמינים` |
| Need 2 points | `נדרשות לפחות שתי נקודות למסלול` |
| Map init error | `שגיאה באתחול המפה` / `שגיאה בטעינת המפה` |
| Add stop coords fail | `לא ניתן למצוא את הכתובת. אנא נסה שוב.` |

---

## 16. TSP Algorithm Spec

```text
Input: durations matrix N×N from OSRM, start index = 0 (user location)

1. sanitizeMatrix — null/negative → Infinity
2. nearestNeighborTour(matrix, start=0)
3. twoOptImprove(tour, matrix) — index 0 never swapped as segment start
4. reorderCoords(originalCoords, tour)

Output: ordered coordinates array

Fallback on any error: original input order unchanged
```

---

## 17. City Proximity Algorithm Spec

```text
Input: cities[] from data.gov, userLocation [lng,lat]

1. IF no userLocation → alphabetical sort he locale
2. locationKey = lng.toFixed(3),lat.toFixed(3)
3. IF moved > 3km OR no cached user city:
     Photon reverse → findBestCityMatch(cities, rawName)
4. IF needsEnrichment:
     geocode up to 8 cities: user city + name-prefix matches
     delay 350ms between each
5. Rank all cities by haversine distance (known coords only)
6. nearbyCities = user city + cities within 45km, max 25
7. Group labels: "קרוב אליך" | "כל הערים"

Static coords: israeliCityCenters.ts (~47 cities)
Dynamic coords: delivri_city_coords_v2 localStorage
```

---

## 18. useApiTimer — Tracked API Labels

| Label (Hebrew) | Wrapped call |
|----------------|--------------|
| `אופטימיזציית מסלול` | `optimizeRouteWithTSP()` |
| `טעינת נתיב` | `getRouteData()` |

Displayed in `ApiPerformance` component on map (desktop only).

---

## 19. Acceptance Criteria (Checklist)

Use this as QA / rebuild verification:

- [ ] App loads RTL; map is LTR
- [ ] Location popup blocks until terms accepted
- [ ] GPS marker appears after permission
- [ ] Cities load from data.gov.il (~unique cities from 50k records)
- [ ] Streets filter correctly per selected city (trimmed names)
- [ ] Geocoding uses Photon first; Nominatim only as fallback
- [ ] Max 10 stops enforced
- [ ] Stop pins appear after map `ready` + stop added
- [ ] Pin variants: upcoming / current / completed
- [ ] Start navigation draws teal route line
- [ ] TSP reorders stops (not original add order)
- [ ] Instructions overlay shows during navigation
- [ ] Voice speaks instruction on step change
- [ ] Footer updates distance/time/progress
- [ ] Complete/postpone/remove stop works
- [ ] Stop detail dialog: edit address, note, map preview
- [ ] Stops persist in localStorage across refresh
- [ ] Analytics events saved locally on actions
- [ ] SafeAnalyticsDashboard shows session stats
- [ ] AnalyticsDashboard reads local StatsAPI
- [ ] Route errors show snackbar with retry
- [ ] No infinite geocoding loops
- [ ] No `lang=he` on Photon URLs

---

## 20. Known Gaps (Accurate as of code)

| Gap | Detail |
|-----|--------|
| Frontend → Backend events | `StatsAPI.postEvent` local only; `POST /api/events` not called |
| `VITE_API_URL` | Defined in README/CI but not used in `StatsAPI.ts` |
| ORS Optimization/Matrix URLs | Defined in `api.ts` but unused in routing (TSP uses OSRM) |
| `postponed` flag | Stop moved to end but `postponed:true` not explicitly set in code |
| `UserLocationMarker.tsx` | Component exists but unused; tracking in `useLocationTracking` |
| `continueCityCoordsEnrichment` | Disabled (empty function) |

---

## 21. Prompt Template — Extend Feature

```text
Context: Delivri delivery route app (see SPEC-PROMPT.md).

Task: [DESCRIBE FEATURE]

Constraints you MUST follow:
- MAX_STOPS = 10 unless explicitly changed everywhere
- coordinates = [lng, lat]
- MapLibre container direction: ltr
- UI direction: rtl
- Geocoding: Photon first, Nominatim fallback with rate limit
- Routing: ORS (if key) → OSRM full → OSRM leg-by-leg
- TSP: OSRM table full matrix + NN + 2-opt, start index 0
- data.gov.il resource_id: a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3
- Trim city/street names from data.gov before matching
- useStopMarkers requires mapReady dependency
- All user strings in Hebrew

Files likely to touch:
- components/NavigationPanel.tsx
- services/routeService.ts | geocoding.ts | cityProximity.ts
- hooks/useRouteLoader.ts | useDeliveryStops.ts | useStopMarkers.ts
- config/api.ts | vite.config.ts (if new proxy)
```

---

*מסמך אפיון זה משקף את הקוד ב-repo Delivri. לעדכון: סנכronize עם `config/api.ts`, `NavigationPanel.tsx`, `routeService.ts`, `Delivri-beck/src/server.ts`.*
