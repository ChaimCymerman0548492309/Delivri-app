# Delivri — מדריך פרויקט מפורט

> **Delivri** הוא אפליקציית Web לניהול מסלולי משלוח בישראל: הוספת תחנות, אופטימיזציית סדר ביקורים, הצגת מסלול על מפה, ניווט ומעקב התקדמות — עם ממשק **RTL מלא** בעברית.

מסמך זה משלים את [`README.md`](README.md) ומסביר **לעומק** את כל חלקי המערכת: ארכיטקטורה, קבצים, זרימות, API חיצוניים, והגדרות סביבה.

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורת המערכת](#2-ארכיטקטורת-המערכת)
3. [מבנה המונורפו](#3-מבנה-המונורפו)
4. [Frontend — Delivri-front](#4-frontend--delivri-front)
5. [Backend — Delivri-beck](#5-backend--delivri-beck)
6. [Firebase Functions](#6-firebase-functions)
7. [שירותים חיצוניים ו-Proxies](#7-שירותים-חיצוניים-ו-proxies)
8. [זרימות משתמש עיקריות](#8-זרימות-משתמש-עיקריות)
9. [אלגוריתם מסלול ו-TSP](#9-אלגוריתם-מסלול-ו-tsp)
10. [Geocoding וערים קרובות](#10-geocoding-וערים-קרובות)
11. [אנליטיקה ואירועים](#11-אנליטיקה-ואירועים)
12. [RTL, UI ו-Theme](#12-rtl-ui-ו-theme)
13. [מפה, Markers ו-MapLibre](#13-מפה-markers-ו-maplibre)
14. [LocalStorage ו-Persistence](#14-localstorage-ו-persistence)
15. [משתני סביבה](#15-משתני-סביבה)
16. [הרצה מקומית — מדריך שלב-אחר-שלב](#16-הרצה-מקומית--מדריך-שלב-אחר-שלב)
17. [Build, Deploy ו-CI](#17-build-deploy-ו-ci)
18. [פתרון בעיות נפוצות](#18-פתרון-בעיות-נפוצות)
19. [מגבלות ידועות](#19-מגבלות-ידועות)
20. [Roadmap / הרחבות עתידיות](#20-roadmap--הרחבות-עתידיות)

---

## 1. סקירה כללית

### מה האפליקציה עושה?

| יכולת | תיאור |
|--------|--------|
| **מיקום GPS** | בקשת הרשאה, מעקב מיקום, סמן חץ על המפה |
| **הוספת תחנות** | בחירת עיר + רחוב מ-data.gov.il, geocoding, עד 10 תחנות |
| **אופטימיזציה** | סידור תחנות לפי זמן נסיעה (TSP: Nearest Neighbor + 2-opt) |
| **מסלול על מפה** | קו מסלול ירוק, fit bounds, הוראות ניווט |
| **ניהול תחנות** | טבלה קומפקטית, popup לעריכה/הערות/מחיקה/דחייה |
| **סימון בוצע** | Markers ירוקים עם ✓, pulse לתחנה פעילה |
| **אנליטיקה** | דשבורד מקומי (localStorage) + API שרת (PostgreSQL) |
| **RTL** | ממשק עברי מלא, Emotion RTL plugin, MapLibre ב-LTR |

### קהל יעד

- שליחים / נהגים עם מספר תחנות ביום
- מפעילי לוגיסטיקה קטנים שצריכים מסלול מהיר בלי מערכת ERP

### Tech Stack — תמצית

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 19, TypeScript, Vite 7, MUI 7, MapLibre GL 5 |
| Backend | Express 5, Drizzle ORM, PostgreSQL, Zod, Pino |
| Serverless | Firebase Cloud Functions (proxy) |
| Maps/Routing | OSRM, OpenRouteService (אופציונלי), Photon, Nominatim |
| Data | data.gov.il (רשימת ערים/רחובות) |

---

## 2. ארכיטקטורת המערכת

```mermaid
flowchart TB
    subgraph Browser["דפדפן (Delivri-front)"]
        UI[React UI RTL]
        Hooks[Custom Hooks]
        Map[MapLibre GL]
        LS[(localStorage)]
    end

    subgraph DevProxy["Vite Dev Proxy (localhost)"]
        P1[/photon]
        P2[/nominatim]
        P3[/osrm]
        P4[/ors]
    end

    subgraph External["שירותים חיצוניים"]
        OSRM[OSRM Router]
        ORS[OpenRouteService]
        Photon[Photon Geocoding]
        Nominatim[Nominatim]
        DataGov[data.gov.il]
        OSM[OpenStreetMap Tiles]
    end

    subgraph Backend["Delivri-beck API"]
        API[Express REST]
        DB[(PostgreSQL)]
    end

    subgraph Firebase["Firebase Functions"]
        FP[proxyPhoton]
        FN[proxyNominatim]
    end

    UI --> Hooks
    Hooks --> Map
    Hooks --> LS
    Hooks --> DevProxy
    DevProxy --> OSRM
    DevProxy --> ORS
    DevProxy --> Photon
    DevProxy --> Nominatim
    UI --> DataGov
    Map --> OSM
    UI -->|אירועים BI| API
    API --> DB
    Browser -.->|Production CORS| Firebase
```

### עקרון הפרדה

- **Frontend** — כל הלוגיקה של UX, מפה, routing client-side
- **Delivri-beck** — איסוף אירועים ו-BI בלבד (לא מנהל מסלולים)
- **Functions** — proxy לעקיפת CORS ב-production (אופציונלי)
- **שירותי מפה** — ציבוריים; בפיתוח עוברים דרך Vite proxy

---

## 3. מבנה המונורפו

```text
Delivri/
├── Delivri-front/          # אפליקציית React (הליבה)
│   ├── src/
│   │   ├── components/     # UI: מפה, פאנל, תחנות, דשבורד
│   │   ├── hooks/          # לוגיקת state: מפה, מסלול, GPS
│   │   ├── services/       # geocoding, routing, TSP, ערים
│   │   ├── pages/          # Header, Footer, Popups, Analytics
│   │   ├── theme/          # MUI theme + RTL
│   │   ├── config/         # URL-ים ל-API
│   │   ├── data/           # קואורדינטות ערים סטטיות
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # geo, map, markers, formatters
│   ├── public/
│   ├── vite.config.ts      # Proxies לפיתוח
│   └── package.json
│
├── Delivri-beck/           # Express API + PostgreSQL
│   └── src/server.ts       # כל ה-API בקובץ אחד
│
├── functions/              # Firebase proxy functions
│   └── src/index.ts
│
├── .github/workflows/      # CI — GitHub Pages
├── firebase.json
├── README.md               # README קצר (אנגלית)
└── README-DETAILED.md      # מסמך זה
```

---

## 4. Frontend — Delivri-front

### 4.1 נקודת כניסה

| קובץ | תפקיד |
|------|--------|
| `index.html` | `lang="he" dir="rtl"`, פונט Rubik |
| `src/main.tsx` | `RtlProvider` → `ThemeProvider` → `MapViewEnhanced` |
| `src/components/MapViewEnhanced.tsx` | **Orchestrator** — מחבר את כל ה-hooks |

### 4.2 רכיבים עיקריים

#### מפה ו-Layout

| קובץ | תיאור |
|------|--------|
| `components/Map/MapCanvas.tsx` | Container למפה, overlays (API perf, הוראות) |
| `components/Map/NavigationPanelShell.tsx` | Drawer במובייל / Panel בדסקטופ |
| `components/NavigationPanel.tsx` | פאנל מסלול: כפתורי ניווט, הוספת תחנה, רשימה |
| `pages/Header.tsx` | AppBar: תפריט, אנליטיקה, מיקום |
| `pages/Footer.tsx` | סטטיסטיקות מסלול בתחתית |

#### תחנות

| קובץ | תיאור |
|------|--------|
| `services/CityStreetSelector.tsx` | Autocomplete עיר/רחוב מ-data.gov.il |
| `components/Stops/StopsTable.tsx` | טבלה קומפקטית של תחנות |
| `components/Stops/StopDetailDialog.tsx` | Popup: כתובת, הערה, מפה, פעולות |

#### דיאלוגים ו-UX

| קובץ | תיאור |
|------|--------|
| `pages/LocationPermissionPopup.tsx` | הרשאת GPS + תנאי שימוש |
| `pages/RouteErrorHandler.tsx` | שגיאות מסלול + retry |
| `pages/TermsDialog.tsx` | תנאי שימוש |
| `components/InstructionsOverlay.tsx` | הוראות ניווט על המפה |
| `components/ui/InlineLoader.tsx` | Loader קטן/overlay |

#### אנליטיקה

| קובץ | תיאור |
|------|--------|
| `components/Dashboard/SafeAnalyticsDashboard.tsx` | דשבורד מקומי (localStorage) |
| `components/Dashboard/AnalyticsDashboard.tsx` | דשבורד שרת (API) |
| `pages/ApiPerformance.tsx` | זמני תגובת API על המפה |

### 4.3 Custom Hooks — ליבת הלוגיקה

| Hook | קובץ | אחריות |
|------|------|--------|
| `useMapInstance` | `hooks/useMapInstance.ts` | יצירת MapLibre, `ready`, cleanup |
| `useLocationTracking` | `hooks/useLocationTracking.ts` | GPS watch, סמן משתמש, popup |
| `useDeliveryStops` | `hooks/useDeliveryStops.ts` | CRUD תחנות + localStorage |
| `useRouteLoader` | `hooks/useRouteLoader.ts` | TSP + ציור מסלול על המפה |
| `useNavigation` | `hooks/useNavigation.ts` | start/stop ניווט |
| `useVoiceGuidance` | `hooks/useNavigation.ts` | הדרכה קולית (Speech API) |
| `useStopMarkers` | `hooks/useStopMarkers.ts` | Markers לכל תחנה |
| `useApiTimer` | `hooks/useApiTimer.ts` | מדידת latency ל-API calls |

#### תלות בין Hooks (ב-MapViewEnhanced)

```text
useMapInstance → ready, mapRef
useLocationTracking(mapRef, ready) → currentLocation
useDeliveryStops → deliveryStops
useRouteLoader(mapRef, ready, currentLocation, stops) → loadRoute, routeError
useNavigation(loadRoute, ...) → isNavigating
useStopMarkers(mapRef, ready, stops, ...) → markers על המפה
useVoiceGuidance(isNavigating, steps, ...)
```

> **חשוב:** `useStopMarkers` חייב `mapReady` — markers נוצרים רק אחרי `map.on('load')`.

### 4.4 Services

| Service | קובץ | תיאור |
|---------|------|--------|
| Routing | `services/routeService.ts` | OSRM/ORS route, fallback chain |
| TSP | `services/tspOptimizer.ts` | Nearest Neighbor + 2-opt |
| Geocoding | `services/geocoding.ts` | Photon → Nominatim (fallback) |
| Rate limit | `services/geocodeRateLimit.ts` | הגבלת קצב Nominatim |
| City proximity | `services/cityProximity.ts` | מיון ערים לפי קרבה |
| City coords cache | `services/cityCoordsCache.ts` | cache geocoding ב-localStorage |
| Stats | `services/StatsAPI.ts` | אנליטיקה **מקומית** |
| City selector | `services/CityStreetSelector.tsx` | UI + data.gov.il |

### 4.5 Config ו-Utils

| קובץ | תיאור |
|------|--------|
| `config/api.ts` | כל URL-י ה-API; ב-localhost משתמש ב-Vite proxy |
| `utils/geoUtils.ts` | haversine, normalize שמות, geocode query |
| `utils/mapUtils.ts` | `initializeMap`, geolocation hook |
| `utils/stopMarkerFactory.ts` | DOM elements ל-markers |
| `utils/formatters.ts` | פורמט מרחק/זמן |
| `utils/logger.ts` | logging מרוכז |
| `data/israeliCityCenters.ts` | ~45 ערים עם קואורדinates |

### 4.6 Types

```typescript
// src/types/types.ts
interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];  // [lng, lat]
  completed: boolean;
  order: number;
  postponed?: boolean;
  note?: string;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
}
```

---

## 5. Backend — Delivri-beck

### 5.1 מטרה

API לאיסוף **אירועי שימוש** ודוחות BI — לא לניהול מסלולים.

### 5.2 אבטחה

- Helmet + HSTS
- CORS whitelist: `localhost:5173`, `delivri.app`
- Rate limit: 200 בקשות / 15 דקות
- IP hashing (SHA-256)
- JSON body limit: 100KB

### 5.3 סכמת DB

```sql
users (
  id uuid PK,
  client_id text,
  ip_hash text,
  user_agent text,
  first_seen, last_seen timestamp
)

events (
  id uuid PK,
  user_id uuid FK → users,
  event_type text,
  event_data jsonb,
  created_at timestamp
)
```

### 5.4 Middleware — זיהוי משתמש

כל בקשה:
1. קורא `x-client-id` (או יוצר UUID)
2. מעדכן/יוצר רשומת `users`
3. מצרף `clientId` ל-request

### 5.5 Endpoints

| Method | Path | תיאור |
|--------|------|--------|
| `GET` | `/` | Health check |
| `POST` | `/api/events` | שמירת אירוע `{ type, data? }` |
| `GET` | `/api/stats` | סיכום כללי |
| `GET` | `/api/stats/top-searches` | חיפושים מובילים |
| `GET` | `/api/stats/active-users` | משתמשים פעילים |
| `GET` | `/api/stats/event-types` | התפלגות סוגי אירוע |
| `GET` | `/api/stats/city-stats` | סטטיסטיקות לפי עיר |
| `GET` | `/api/stats/daily-stats` | 30 יום אחרונים |
| `GET` | `/api/stats/usage-metrics` | KPIs |
| `GET` | `/api/stats/user-activities` | פעילות לפי user |
| `GET` | `/api/stats/time-stats` | שעות שיא (7 ימים) |
| `GET` | `/api/stats/route-metrics` | מרחק/זמן ממוצע |
| `DELETE` | `/api/events?olderThan=N` | ניקוי אירועים ישנים |

### 5.6 Validation

```typescript
// Zod
{ type: string (min 1), data?: Record<string, any> }
```

---

## 6. Firebase Functions

קובץ: `functions/src/index.ts`

| Function | תיאור |
|----------|--------|
| `proxyPhoton` | Proxy ל-`photon.komoot.io` + CORS `*` |
| `proxyNominatim` | Proxy ל-Nominatim + CORS `*` |

**שימוש:** production כש-direct fetch נחסם ב-CORS. בפיתוח — Vite proxy מספיק.

---

## 7. שירותים חיצוניים ו-Proxies

### 7.1 Vite Proxy (פיתוח)

```typescript
// vite.config.ts
'/photon'    → photon.komoot.io
'/nominatim' → nominatim.openstreetmap.org
'/osrm'      → router.project-osrm.org
'/ors'       → api.openrouteservice.org
```

### 7.2 בחירת שירות לפי סביבה

| שירות | localhost | Production |
|--------|-----------|------------|
| Photon | `/photon` | `photon.komoot.io` |
| Nominatim | `/nominatim` | `nominatim.openstreetmap.org` |
| OSRM | `/osrm` | `router.project-osrm.org` |
| ORS | `/ors` | `api.openrouteservice.org` + API key |

### 7.3 data.gov.il

- **Resource ID:** `a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3`
- **שדות:** `שם_ישוב`, `שם_רחוב`
- **שימוש:** רשימת ערים/רחובות רשמית; ~50,000 רשומות
- **נרמול:** trim רווחים (חשוב! `"אבן יהודה          "` → `"אבן יהודה"`)

### 7.4 OpenStreetMap Tiles

```javascript
tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']
```

---

## 8. זרימות משתמש עיקריות

### 8.1 Onboarding — הרשאת מיקום

```text
1. LocationPermissionPopup נפתח
2. משתמש מאשר תנאים + לוחץ "אשר והמשך"
3. navigator.geolocation.getCurrentPosition()
4. currentLocation נשמר, tracking=true
5. watchPosition מתחיל → סמן חץ על המפה
6. CityStreetSelector ממיין ערים לפי קרבה
```

### 8.2 הוספת תחנה

```text
1. בחירת עיר (Autocomplete + קבוצה "קרוב אליך")
2. בחירת רחוב (מסונן לפי עיר)
3. מספר בית (אופציונלי)
4. geocodeAddress("רחוב X עיר Y")
5. onAddStop → deliveryStops + localStorage
6. useStopMarkers → pin על המפה
7. StatsAPI.postEvent('addStop', ...)
```

### 8.3 התחלת ניווט

```text
1. לחיצה "התחל ניווט"
2. coords = [userLocation, ...stop.coordinates]
3. optimizeRouteWithTSP(coords) — OSRM Table N×N
4. getRouteData(optimizedCoords) — ORS → OSRM fallback
5. drawRouteOnMap — GeoJSON line layer
6. isNavigating=true, voice guidance, footer stats
```

### 8.4 השלמת תחנה

```text
1. לחיצה "בוצע" בטבלה / popup
2. stop.completed=true, marker → ירוק ✓
3. currentStopIndex++
4. אם תחנה אחרונה → stop navigation
```

---

## 9. אלגוריתם מסלול ו-TSP

### 9.1 שלב 1 — מטריצת זמנים (OSRM Table)

```
GET /table/v1/driving/{lon,lat;...}?annotations=duration
```

- מחזיר מטריצת N×N (לא `sources=0` שמחזיר שורה בודדת!)
- Snap coordinates מ-`destinations.location`

### 9.2 שלב 2 — TSP (`tspOptimizer.ts`)

1. **Nearest Neighbor** — מתחיל מ-index 0 (מיקום המשתמש)
2. **2-opt** — שיפור מקומי של הסדר
3. `reorderCoords` — מחזיר קואורדinates מסודרים

### 9.3 שלב 3 — Route geometry

**Fallback chain** ב-`routeService.ts`:

1. OpenRouteService (אם `VITE_ORS_API_KEY` קיים)
2. OSRM full route
3. OSRM leg-by-leg (אם full route נכשל)

### 9.4 דרישות מינימום

- לפחות **2 נקודות** למסלול (משתמש + תחנה אחת)
- עד **10 תחנות** בגרסה הנוכחית

---

## 10. Geocoding וערים קרובות

### 10.1 Geocoding כתובת (`geocoding.ts`)

```text
1. Photon (ברירת מחדל)
2. Nominatim (fallback, rate-limited 1.5s)
3. אם 429 → חסימה 60 שניות
```

> **לא** להשתמש ב-`lang=he` ב-Photon — לא נתמך!

### 10.2 מיון ערים קרובות (`cityProximity.ts`)

```text
1. Photon reverse geocode למיקום המשתמש
2. findBestCityMatch מול רשימת data.gov.il
3. geocode עד 8 ערים מועמדות (Photon + cache)
4. מיון לפי haversine
5. קבוצה "קרוב אליך" — עד 45 ק"מ, max 25 ערים
```

### 10.3 Cache

| Key | מיקום | TTL |
|-----|--------|-----|
| `delivri_city_coords_v2` | localStorage | לצמיתות |
| `delivri_city_coords_failed_v1` | sessionStorage | 24 שעות |

---

## 11. אנליטיקה ואירועים

### 11.1 אירועים שנשלחים (NavigationPanel)

| Event | מתי | data |
|-------|-----|------|
| `addStop` | הוספת תחנה | address, coords, city |
| `startNavigation` | התחלת ניווט | city, stops, routeDistanceKm, ... |
| `sessionEnd` | עצירת ניווט | completedStops, ... |
| `completeStop` | סימון בוצע | stopId |
| `removeStop` | מחיקה | stopId |
| `postponeStop` | דחייה | stopId |

### 11.2 StatsAPI — שני מצבים

| מצב | מקור | שימוש |
|-----|------|-------|
| **מקומי** | `StatsAPI.ts` → localStorage | SafeAnalyticsDashboard |
| **שרת** | Delivri-beck API | AnalyticsDashboard |

> כיום `StatsAPI.postEvent` שומר **מקומית** בלבד. חיבור לשרת דורש הרחבה.

---

## 12. RTL, UI ו-Theme

### 12.1 RTL Stack

```text
index.html dir="rtl"
  └── RtlProvider (@mui/stylis-plugin-rtl, key: muirtl)
        └── ThemeProvider (direction: 'rtl')
              └── MUI Components
```

### 12.2 כללי RTL

| אזור | כיוון |
|------|--------|
| UI כללי | RTL |
| MapLibre + markers | **LTR** (חובה!) |
| Popper/Autocomplete dropdown | `dir="rtl"` מפורש |

### 12.3 Theme (`theme/appTheme.ts`)

- Palette: teal primary (`#0d9488`)
- Font: Rubik
- Overrides: Dialog, Drawer (anchor right), Autocomplete, Alert, Table

### 12.4 Autocomplete RTL

`theme/autocompleteRtl.ts` — `slotProps` משותפים ל-popper/paper/listbox.

---

## 13. מפה, Markers ו-MapLibre

### 13.1 אתחול מפה

```javascript
// mapUtils.ts
center: [35.5, 32.7]  // צפון/מרכז ישראל
zoom: 10
style: OSM raster tiles
```

### 13.2 סוגי Markers

| Variant | מראה | תנאי |
|---------|------|------|
| `upcoming` | Pin teal + מספר | תחנה ממתינה |
| `current` | Pin כתום + pulse | ניווט + index נוכחי |
| `completed` | עיגול ירוק + ✓ | completed=true |
| User | חץ teal SVG | GPS tracking |

### 13.3 CSS חשוב (`App.css`)

```css
.map-container,
.maplibregl-map,
.maplibregl-marker {
  direction: ltr !important;
}
```

> **בלי זה** — markers לא מוצגים בדף RTL!

### 13.4 Route Layer

- Source ID: `route`
- Layer ID: `route-layer`
- Color: `#0d9488`, width: 5

---

## 14. LocalStorage ו-Persistence

| Key | תוכן |
|-----|------|
| `deliveryStops` | מערך תחנות (JSON) |
| `delivri.analytics.events.v1` | אירועי אנליטיקה |
| `delivri.analytics.client-id.v1` | UUID לקוח |
| `delivri_city_coords_v2` | cache קואורדinates ערים |

---

## 15. משתני סביבה

### Delivri-front (`.env.local`)

```env
# אופציונלי — ORS routing (ללא זה: OSRM בלבד)
VITE_ORS_API_KEY=your_openrouteservice_key

# אופציונלי — URL ל-API שרת (AnalyticsDashboard)
VITE_API_URL=http://localhost:8080/api
```

### Delivri-beck (`.env`)

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
LOG_LEVEL=debug
```

---

## 16. הרצה מקומית — מדריך שלב-אחר-שלב

### דרישות

- Node.js 22+
- npm 10+
- PostgreSQL (רק ל-backend)
- דפדפן עם HTTPS או localhost (Geolocation)

### Terminal 1 — Backend (אופציונלי)

```bash
cd Delivri-beck
npm ci
# צור .env עם DATABASE_URL
npm run dev
# → http://localhost:8080
```

### Terminal 2 — Frontend

```bash
cd Delivri-front
npm ci
npm run dev
# → http://localhost:5173
```

### Terminal 3 — Firebase (אופציונלי)

```bash
cd functions
npm ci
npm run serve
```

### בדיקה מהירה

1. פתח `http://localhost:5173`
2. אשר מיקום + תנאים
3. הוסף תחנה (עיר + רחוב)
4. ודא pin על המפה
5. לחץ "התחל ניווט" — קו מסלול ירוק

---

## 17. Build, Deploy ו-CI

### Build Frontend

```bash
cd Delivri-front
npm run build
# output: dist/
```

### GitHub Pages

Workflow: `.github/workflows/deploy-frontend-pages.yml`

- Trigger: push ל-`main`/`master` + שינויים ב-`Delivri-front/`
- Build עם `--base=/<repo-name>/`
- Secrets/Vars: `VITE_ORS_API_KEY`, `VITE_API_URL`

### Build Backend

```bash
cd Delivri-beck
npm run build
npm start
```

---

## 18. פתרון בעיות נפוצות

### Markers לא מוצגים על המפה

| סיבה | פתרון |
|------|--------|
| RTL שובר transforms | `.maplibregl-marker { direction: ltr }` |
| `useStopMarkers` לפני map ready | ודא `mapReady` ב-deps |
| אין תחנות | הוסף תחנה עם geocoding מוצלח |
| קואורדinates NaN | בדוק `deliveryStops` ב-localStorage |

### רשימת רחובות ריקה

| סיבה | פתרון |
|------|--------|
| רווחים בשם עיר מ-data.gov | `normalizeGovField` — trim |
| עיר לא תואמת לרשומות | בחר מהרשימה, לא הקלדה חופשית |

### שגיאת מסלול "לא התקבלו נתוני מסלול"

| סיבה | פתרון |
|------|--------|
| OSRM Table עם `sources=0` | השתמש ב-matrix מלא N×N |
| נקודה אחת בלבד | צריך user + לפחות תחנה 1 |
| OSRM rate limit | המתן / השתמש ב-ORS key |

### 429 / Too Many Requests (Nominatim)

| סיבה | פתרון |
|------|--------|
| יותר מדי geocoding | Photon בלבד לערים; Nominatim fallback בלבד |
| `lang=he` ב-Photon | הסר — Photon לא תומך |
| לולאת geocoding | throttle GPS + cache כשלונות |

### CORS ב-Production

- הוסף origin ל-`allowed` ב-`Delivri-beck/server.ts`
- או השתמש ב-Firebase proxy functions

### Geolocation נחסם

- localhost / HTTPS בלבד
- הגדרות דפדפן → הרשאות מיקום
- הודעה: "אין הרשאה למיקום"

### Autocomplete — תווית כפולה ("עיר עיר")

- אל תגדיר `left`/`right` ידני על `InputLabel` עם RTL plugin
- השתמש ב-`loading` prop של Autocomplete, לא endAdornment ידני

---

## 19. מגבלות ידועות

| מגבלה | פירוט |
|--------|--------|
| 10 תחנות | hardcoded ב-NavigationPanel |
| OSRM public | rate limits, לא ל-production כבד |
| Nominatim | 1 req/sec — שימוש מינימלי |
| StatsAPI | שמירה מקומית; שרת נפרד ל-BI |
| TSP | heuristic (לא optimal) — מספיק ל-10 תחנות |
| Offline | לא נתמך |
| Voice | תלוי Speech API של הדפדפן |

---

## 20. Roadmap / הרחבות עתידיות

- [ ] חיבור `StatsAPI.postEvent` ל-Delivri-beck ב-production
- [ ] הרחבת `israeliCityCenters` / precomputed coords לכל הישובים
- [ ] Service Worker + offline cache למפה
- [ ] ייצוא מסלול ל-Waze/Google Maps
- [ ] ORS Optimization API כ-fallback ל-TSP
- [ ] בדיקות E2E (Playwright)
- [ ] PWA + התקנה למobile
- [ ] Multi-tenant / משתמשים מזו�ים

---

## נספח א — מפת קבצים Frontend (מלאה)

```text
src/
├── main.tsx
├── App.css / index.css
├── config/api.ts
├── types/types.ts, statsTypes.ts
├── theme/appTheme.ts, RtlProvider.tsx, autocompleteRtl.ts
├── data/israeliCityCenters.ts
├── hooks/
│   ├── useApiTimer.ts
│   ├── useDeliveryStops.ts
│   ├── useLocationTracking.ts
│   ├── useMapInstance.ts
│   ├── useNavigation.ts
│   ├── useRouteLoader.ts
│   └── useStopMarkers.ts
├── services/
│   ├── CityStreetSelector.tsx
│   ├── StatsAPI.ts
│   ├── cityProximity.ts
│   ├── cityCoordsCache.ts
│   ├── geocoding.ts
│   ├── geocodeRateLimit.ts
│   ├── routeService.ts
│   └── tspOptimizer.ts
├── utils/
│   ├── geoUtils.ts
│   ├── mapUtils.ts
│   ├── stopMarkerFactory.ts
│   ├── formatters.ts
│   ├── logger.ts
│   └── utils.ts
├── components/
│   ├── MapViewEnhanced.tsx
│   ├── NavigationPanel.tsx
│   ├── InstructionsOverlay.tsx
│   ├── Map/MapCanvas.tsx, NavigationPanelShell.tsx
│   ├── Stops/StopsTable.tsx, StopDetailDialog.tsx
│   ├── Dashboard/SafeAnalyticsDashboard.tsx, AnalyticsDashboard.tsx
│   ├── Markers/StopListItem.tsx, UserLocationMarker.tsx
│   └── ui/InlineLoader.tsx
└── pages/
    ├── Header.tsx, Footer.tsx
    ├── LocationPermissionPopup.tsx, TermsDialog.tsx
    ├── LoadingSpinner.tsx, RouteErrorHandler.tsx
    ├── ApiPerformance.tsx, ErrorBoundary.tsx
```

---

## נספח ב — קישורים שימושיים

| משאב | URL |
|------|-----|
| MapLibre GL JS | https://maplibre.org/maplibre-gl-js/docs/ |
| OSRM API | http://project-osrm.org/docs/v5.24.0/api/ |
| OpenRouteService | https://openrouteservice.org/dev/ |
| Photon | https://photon.komoot.io/ |
| data.gov.il API | https://data.gov.il |
| MUI RTL | https://mui.com/material-ui/guides/right-to-left/ |

---

## רישיון

לא הוגדר קובץ LICENSE במאגר. יש להוסיף לפני שימוש מסחרי.

---

*מסמך זה נוצר עבור פרויקט Delivri — עדכון אחרון: יוני 2026*
