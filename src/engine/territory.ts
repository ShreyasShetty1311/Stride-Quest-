/**
 * territory.ts — Core territory engine types and in-memory state.
 *
 * This file defines all data models for:
 *   - GPS point tracking
 *   - Session lifecycle
 *   - 50m tile grid
 *   - Tile ownership (cumulative control-score model)
 *   - Territory events (captures, contests, etc.)
 *
 * State is kept in a single reactive store exported as `territoryStore`.
 * Screens/hooks subscribe and mutate via the provided helpers.
 */

// ─────────────────────────────────────────────
// GPS
// ─────────────────────────────────────────────

export interface GPSPoint {
  lat: number;
  lon: number;
  timestamp: number;   // epoch ms
  accuracy: number;    // metres
  speed: number | null; // m/s — null if unavailable
}

// ─────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────

export type SessionStatus = 'idle' | 'active' | 'paused' | 'ended';

export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  startedAt: number;    // epoch ms
  pausedAt: number | null;
  endedAt: number | null;
  path: GPSPoint[];     // ordered live path
  distanceMetres: number;
  /** ids of tiles whose control score was updated this session */
  affectedTileIds: Set<string>;
  /** ids of tiles captured (flipped to this user) this session */
  capturedTileIds: Set<string>;
  /** whether an impossible-speed / teleport was detected */
  suspicious: boolean;
}

// ─────────────────────────────────────────────
// Tile / Grid
// ─────────────────────────────────────────────

export type TileOwnership = 'neutral' | 'self' | 'enemy' | 'contested';

export interface TileControlEntry {
  userId: string;
  controlScore: number;   // cumulative perimeter-metres contributed
}

export interface Tile {
  /** Canonical ID: "lat_lon" of tile's NW corner snapped to 50m grid */
  id: string;
  /** Grid NW corner (world coords) */
  nwLat: number;
  nwLon: number;
  /** Derived SE corner */
  seLat: number;
  seLon: number;
  /** Leaflet polygon coords array (NW, NE, SE, SW) */
  bounds: [[number, number], [number, number], [number, number], [number, number]];

  ownerId: string | null;           // userId or null
  controlScore: number;             // top-owner's score
  strength: number;                 // 0–100, increases with repeated captures
  lastActivity: number | null;      // epoch ms
  contested: boolean;
  contributors: TileControlEntry[]; // all users who have contributed
}

// ─────────────────────────────────────────────
// Territory Events
// ─────────────────────────────────────────────

export type TerritoryEventType =
  | 'tile_captured'
  | 'tile_contested'
  | 'perimeter_closed'
  | 'session_started'
  | 'session_ended'
  | 'suspicious_movement';

export interface TerritoryEvent {
  id: string;
  type: TerritoryEventType;
  userId: string;
  tileId?: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// Anti-cheat thresholds
// ─────────────────────────────────────────────

/** Max allowed walking/running speed in m/s (~20 km/h). Above this = suspicious. */
export const MAX_VALID_SPEED_MS = 5.6; // ≈ 20 km/h
/** Max GPS accuracy we accept (metres). Worse readings are discarded.
 *  150 m allows desktop/laptop IP+Wi-Fi fixes; real mobile GPS is typically ≤15 m.
 *  The UI already shows a "weak signal" warning for anything over 50 m. */
export const MAX_ACCURACY_METRES = 150;
/** Min distance (metres) between consecutive accepted GPS points. Filters micro-jitter. */
export const MIN_POINT_DISTANCE_M = 3;
/** Max distance (metres) between consecutive accepted GPS points. Above = teleport. */
export const MAX_POINT_DISTANCE_M = 200;

// ─────────────────────────────────────────────
// Grid constants
// ─────────────────────────────────────────────

/** Target tile side in metres ≈ 50m. In degrees lat: 50m ÷ 111320 m/deg */
export const TILE_SIZE_DEG_LAT = 50 / 111320;
/** Minimum area (sq metres) for a perimeter loop to count as a territory capture */
export const MIN_LOOP_AREA_SQ_M = 1000; // ~32m×32m minimum
/** Path-closure tolerance: metres within which the path endpoint is considered to reconnect to an earlier segment */
export const LOOP_CLOSE_TOLERANCE_M = 25;
/** Minimum number of GPS points before we start checking for loop closure */
export const MIN_POINTS_FOR_LOOP = 12;

// ─────────────────────────────────────────────
// Reactive Store
// ─────────────────────────────────────────────

export type StoreListener = () => void;

class TerritoryStore {
  tiles: Map<string, Tile> = new Map();
  session: Session | null = null;
  events: TerritoryEvent[] = [];
  private listeners: Set<StoreListener> = new Set();

  subscribe(fn: StoreListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  // ── Session helpers ──────────────────────────

  startSession(userId: string): Session {
    const session: Session = {
      id: `session-${Date.now()}`,
      userId,
      status: 'active',
      startedAt: Date.now(),
      pausedAt: null,
      endedAt: null,
      path: [],
      distanceMetres: 0,
      affectedTileIds: new Set(),
      capturedTileIds: new Set(),
      suspicious: false,
    };
    this.session = session;
    this.addEvent({ type: 'session_started', userId, tileId: undefined });
    this.notify();
    return session;
  }

  pauseSession() {
    if (!this.session || this.session.status !== 'active') return;
    this.session.status = 'paused';
    this.session.pausedAt = Date.now();
    this.notify();
  }

  resumeSession() {
    if (!this.session || this.session.status !== 'paused') return;
    this.session.status = 'active';
    this.session.pausedAt = null;
    this.notify();
  }

  endSession(): Session | null {
    if (!this.session) return null;
    this.session.status = 'ended';
    this.session.endedAt = Date.now();
    const closed = this.session;
    this.addEvent({ type: 'session_ended', userId: closed.userId });
    this.session = null;
    this.notify();
    return closed;
  }

  // ── Event helpers ────────────────────────────

  addEvent(partial: Omit<TerritoryEvent, 'id' | 'timestamp'>) {
    const event: TerritoryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...partial,
    };
    this.events.unshift(event);
    if (this.events.length > 200) this.events.length = 200; // cap log
  }

  // ── Tile helpers ─────────────────────────────

  getOrCreateTile(id: string, nwLat: number, nwLon: number): Tile {
    if (!this.tiles.has(id)) {
      const seLat = nwLat - TILE_SIZE_DEG_LAT;
      // Longitude tile size varies with latitude: 50m / (cos(lat) * 111320)
      const tileSizeDegLon = 50 / (Math.cos((nwLat * Math.PI) / 180) * 111320);
      const seLon = nwLon + tileSizeDegLon;
      const tile: Tile = {
        id,
        nwLat,
        nwLon,
        seLat,
        seLon,
        bounds: [
          [nwLat, nwLon],
          [nwLat, seLon],
          [seLat, seLon],
          [seLat, nwLon],
        ],
        ownerId: null,
        controlScore: 0,
        strength: 0,
        lastActivity: null,
        contested: false,
        contributors: [],
      };
      this.tiles.set(id, tile);
    }
    return this.tiles.get(id)!;
  }
}

export const territoryStore = new TerritoryStore();
