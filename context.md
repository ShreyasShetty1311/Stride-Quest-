# Stride Quest — Master Project Context

> **Last updated:** 2026-05-26  
> **Stack:** Vite + React 18 + TypeScript · Leaflet (maps) · Supabase (Postgres + Realtime + Auth) · Tailwind CSS  
> **Dev location hardcode:** BMSCE Indoor Stadium, 12.9406554° N, 77.5659529° E

---

## 1. What Stride Quest Is

A **geo-social territory game** running in the browser.  
Players physically walk or run; their GPS path is drawn live on a dark tactical map. When a player closes a loop they **capture the enclosed 50 m-grid territory tiles**. Territory is persisted to Supabase and visible to all players in real time.

The game is themed in a **Minecraft-meets-tactical-HUD** aesthetic — pixel fonts, dark panels, coloured faction tiles, HP/AP bars, and a bottom hotbar navigation.

---

## 2. Architecture

```
src/
├── App.tsx                   # Root — useAuth, tab routing, session state, user state
├── engine/
│   ├── territory.ts          # In-memory reactive store + all GPSPoint / Session types
│   ├── perimeterCapture.ts   # Loop detection, tile capture, getTileStyle, FACTION_COLORS
│   ├── territoryService.ts   # Supabase persistence: tiles, sessions, realtime
│   ├── geoUtils.ts           # haversineMetres, polygonArea, pointInPolygon, snapToTile
│   ├── useGPSTracking.ts     # GPS hook — watchPosition + anti-cheat filters
│   └── useTileRenderer.ts    # Leaflet tile layer management (draw/clear tile grid)
├── hooks/
│   └── useAuth.ts            # Supabase anonymous auth → persistent userId
├── lib/
│   └── supabaseClient.ts     # Supabase singleton (VITE_SUPABASE_URL / ANON_KEY)
├── screens/
│   ├── TacticalMap.tsx       # Main map view: Leaflet, GPS, Arena header, HUD, search
│   ├── ActiveSession.tsx     # Full-screen run overlay: start/pause/end + live telemetry
│   ├── Dashboard.tsx         # Home: stats, notifications, settings, survival HUD
│   ├── Leaderboard.tsx       # Rankings + Minecraft-style advancements
│   ├── Profile.tsx           # Character bitmoji, inventory, faction picker, XP
│   └── TerritoryView.tsx     # Sector health, fortification, territory detail cards
├── components/
│   └── Navigation.tsx        # Minecraft hotbar bottom-tab bar
└── data/
    └── mockDb.ts             # Static mock data (notifications, sectors, leaderboard)
```

---

## 3. UI / UX Design System

### 3.1 Visual Aesthetic
- **Theme**: Dark tactical Minecraft — `#141414` backgrounds, `#2d2d2d` panels, `#3d3d3d` borders
- **Font**: `font-pixel` (Press Start 2P via Google Fonts) for all HUD text
- **Icons**: Lucide React (`size-4` / `size-6`) + pixel-art SVG characters
- **Colors** (Tailwind aliases in `index.css`):
  - `mc-gold` `#e1c16e` — headers, highlights
  - `mc-xp` `#55ff55` — XP, success
  - `mc-red` `#ef4444` — damage, rivals
  - `mc-sky` `#5ac8fa` — coordinates, HUD accents
  - `mc-stone` `#5a5a5a` — panel borders
- **Micro-animations**: `animate-pulse`, `animate-bounce`, `animate-ping` used for beacons, GPS dots, and status effects

### 3.2 Navigation (Bottom Hotbar)
```
[Quest Log] [Arena ▶] [My Sectors] [Scoreboard] [Inventory]
```
- Implemented in `Navigation.tsx` as a Minecraft hotbar
- Active tab: gold icon + gold border + label pops above bar
- Map tab label: **"Arena"**

### 3.3 Screens

#### Dashboard (Quest Log)
- Survival HUD: **Stamina** (HP hearts) + **Territory Defense** (AP bars)
  - Stamina restores 1 HP per run completed, depletes when fortifying sectors
  - Defense decays 5% per day of inactivity on owned tiles
- Settings dropdown: Account (Profile, Faction), Gameplay (Notifications, Sound, Map Mode), Support (Beacon, Disconnect)
- Notification bell: 10 rich real-time-style alerts (siege, decay, XP rewards)
- Recent activity captures list

#### Arena (Tactical Map)
- **Header bar** (always visible): `STRIDE QUEST · ▶ ARENA` | faction-coloured compass icon | GPS status dot
- **Map source**: CartoDB Dark Matter tiles — `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - Free, no API key needed, globally available dark basemap
  - Attribution: © OpenStreetMap contributors, © CARTO
- **Initial centre**: BMSCE Indoor Stadium — `[12.9406554, 77.5659529]` zoom 17
- **Right-side controls** (fixed, z-60, top 52px): Info toggle, Locate Me, Zoom In, Zoom Out, Reset View
  - Hidden when a session is active (`isSessionActive` prop)
- **HUD panel** (ℹ toggle): Coordinates, Zoom, Biome, Territory tile counts, GPS/Session status
- **Zone polygons**: 78 procedurally-generated sector polygons across 19 Bengaluru hotspots (Whitefield, Koramangala, JP Nagar, Jayanagar, etc.) using a seeded pseudo-random LCG
- **Faction tiles**: Player's own tiles rendered in their faction color (via `getTileStyle('self')`)
- **Search bar**: Nominatim/OpenStreetMap geocoding via `/scan <place>` command

#### Active Session (Deploy)
- Full-screen overlay `z-50` — TacticalMap buttons hide under it
- Live path polyline (red/glowing) on dark Leaflet map
- Telemetry HUD: distance, pace, time elapsed, tiles captured
- GPS tracking: real `watchPosition` → fallback to **BMSCE simulation** if GPS denied
- **Simulation mode**: auto-starts if GPS unavailable — see §7 below

#### My Sectors (Territory View)
- Allied / Rival / Neutral sector cards
- Fortify button costs 1 HP Stamina, adds +10% health to sector

#### Scoreboard (Leaderboard)
- Global + Local tabs
- Minecraft-style advancement/trophy cards

#### Inventory (Profile)
- **Bitmoji figurine**: pixel-art SVG character — torso/arms coloured by current faction
- **Faction Allegiance panel**: colour picker → updates bitmoji + map beacon + conquered tile color
- **Inventory Chest** (3×9 grid): hover any item → Minecraft enchantment-table tooltip (name, rarity, description, qty); closes on mouse-leave
- Account panel: username rename ("Anvil"), security seed ("Crafting Table")
- Support beacon dispatch form

---

## 4. GPS System

### 4.1 Hardcoded Starting Location
```
BMSCE Indoor Stadium
Lat: 12.9406554
Lon: 77.5659529
Address: 6th Main Rd, Basavanagudi, Bengaluru, Karnataka 560019
```

Both `TacticalMap.tsx` and `ActiveSession.tsx` use:
```ts
const BMSCE_LAT = 12.9406554;
const BMSCE_LON = 77.5659529;
```

### 4.2 Acquisition Flow
1. `getCurrentPosition` — fast first fix (timeout 8s)
2. `watchPosition` — continuous updates
3. **Double-pass** after 350ms: `map.invalidateSize()` + `map.setView([BMSCE_LAT, BMSCE_LON], 17)` if no real fix yet
4. On GPS denied/unavailable: beacon pinned to BMSCE, simulation auto-starts in ActiveSession

### 4.3 Filters (useGPSTracking)
| Filter | Value |
|--------|-------|
| Max valid speed | 5.6 m/s (≈20 km/h) |
| Max accuracy | 50 m |
| Min point distance | 3 m (jitter filter) |
| Max point distance | 200 m (teleport detection) |
| Throttle interval | 2 s |

### 4.4 Faction Color on Map
- Player's own captured tiles → `FACTION_COLORS[getLocalFaction()]` (not hardcoded green)
- Polled every 500 ms in TacticalMap so beacon + header update immediately on faction change
- `perimeterCapture.ts → getTileStyle('self')` uses `getLocalFaction()` dynamically

---

## 5. Factions

| Faction | Hex Color | Description |
|---------|-----------|-------------|
| Unaffiliated | `#6b7280` | No allegiance |
| Crimson | `#ef4444` | Aggressors |
| Verdant | `#22c55e` | Naturalists |
| Cobalt | `#3b82f6` | Strategists |
| Amber | `#f59e0b` | Merchants |

Stored in `FACTION_COLORS` in `perimeterCapture.ts`.  
Faction change in Profile → updates: bitmoji shirt, map beacon, arena "ARENA" label, GPS acquiring banner, conquered tile fill color.

---

## 6. Territory Engine

- **Tile size**: 50 m × 50 m (`TILE_SIZE_DEG_LAT = 50/111320`)
- **Loop closure**: reconnect within 25 m of any earlier path point (skipping last 8 to avoid false positives)
- **Minimum loop area**: 1000 m² (≈32 × 32 m)
- **Control score**: perimeter-metres contributed → cumulative score per tile per user
- **Contested**: top-2 players within 20% of each other's score
- **Tile decay**: pg_cron nightly — decays `strength` by 5 for tiles inactive >48h; resets ownership at 0

---

## 7. Deploy Simulation (BMSCE Campus Loop)

When GPS is unavailable (browser desktop environment), ActiveSession auto-starts a simulated run:

```
Pace: 6 min/km → 2.78 m/s
Tick: 1 000 ms per waypoint
Route: ~1 km loop around BMSCE campus
```

### Waypoints
```ts
[12.9406554, 77.5659529]  // Indoor Stadium (start)
[12.9412,    77.5659]     // North along campus road
[12.9418,    77.5658]
[12.9424,    77.5656]     // Near main gate
[12.9430,    77.5653]     // North entrance
[12.9434,    77.5660]     // Turn east — Vivekananda Rd
[12.9434,    77.5670]
[12.9434,    77.5680]
[12.9432,    77.5690]     // East end, turn south
[12.9428,    77.5693]
[12.9422,    77.5692]
[12.9416,    77.5688]
[12.9410,    77.5684]     // South end, turn west
[12.9407,    77.5678]
[12.9406554, 77.5670]     // Back toward stadium
[12.9406554, 77.5659529]  // Close loop
```

The loop repeats continuously (`simIndexRef % SIM_COORDS.length`), captures tiles on each closure, and updates the telemetry HUD in real time.

---

## 8. Database Schema (Supabase)

Files: `supabase/schema.sql` + `supabase/schema_v2.sql`

| Table | Purpose |
|-------|---------|
| `user_profiles` | Player stats, faction, level, XP, streaks |
| `sessions` | Run sessions (start/pause/end, distance, tiles captured) |
| `path_points` | Raw GPS track per session |
| `tiles` | 50 m grid tile ownership + control score |
| `tile_control` | Per-user cumulative score per tile |
| `territory_events` | Audit log: captures, contests, decays |
| `teams` | Faction/squad definitions |
| `team_members` | Player → team membership |

### XP / Leveling
- 10 XP per tile captured, 50 XP per loop closed, 1 XP per 100 m walked
- `increment_user_stats` RPC handles atomic XP updates
- Level thresholds: L1=0, L2=100, L3=250, L4=500, L5=1 000, L6=2 000, L7=5 000, L8=10 000, L9=20 000, L10=50 000

---

## 9. Map Source — CartoDB Dark Matter

**URL template:**
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

- **Provider**: CARTO (CartoDB)
- **Style**: Dark Matter — muted dark grey/black background, white labels
- **Why chosen**: Perfectly fits the tactical HUD aesthetic; no API key required; globally available; supports retina (`{r}`)
- **Attribution**: © OpenStreetMap contributors, © CARTO
- **Zoom range**: 10–19
- **Leaflet config**: `{ maxZoom: 19, minZoom: 10 }`

Landmark pins use Leaflet `divIcon` with inline emoji + label — bypasses Vite URL bundling issues with standard marker assets.

---

## 10. Notifications

10 rich pre-seeded alerts in `mockDb.ts → initialAlerts`:
- ⚔ Siege attacks (Sunset Heights, Jayanagar, Basavanagudi)
- ☠ Decay warnings (Ulsoor 22%, Sector 7G 58%, RR Nagar lost)
- ✅ XP conquest rewards (BMSCE perimeter captured)
- 🏅 Rank achievements
- 📡 Support beacon responses
- 🎯 Daily quest completions

---

## 11. Biomes (Client-side Bounding Boxes)

| Biome | Lat range | Lon range |
|-------|-----------|-----------|
| Forest/Park (Cubbon) | 12.9660–12.9780 | 77.5860–77.5990 |
| Lake/Wetland (Ulsoor) | 12.9740–12.9860 | 77.6080–77.6250 |
| Urban/Street (Indiranagar) | 12.9550–12.9760 | 77.6260–77.6460 |
| Plains (BLR Suburbs) | default | default |

Displayed in the Arena HUD panel (ℹ toggle).

---

## 12. Environment Variables

```bash
VITE_SUPABASE_URL=https://jxiscjqlpqyhibiewfwa.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Set in `.env.local` (gitignored). Template in `.env.example`.

---

## 13. Dev Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npx tsc --noEmit     # TypeScript type-check
```

---

## 14. Known Gaps / Next Steps

- [ ] Wire Leaderboard to live Supabase data (currently mock)
- [ ] Wire Profile XP/level to live `user_profiles` row
- [ ] Anonymous → email/social account upgrade flow
- [ ] Push notifications (FCM) for siege/decay events when app is closed
- [ ] Mobile PWA manifest for home-screen install
- [ ] Add BMSCE biome bounding box to `getBiomeName()` so it shows correctly in HUD
- [ ] Revert BMSCE hardcode to real GPS before production deployment
