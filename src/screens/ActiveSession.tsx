/**
 * ActiveSession.tsx
 *
 * Full-screen session screen. Integrates:
 *   - Real GPS tracking via useGPSTracking (browser Geolocation API)
 *   - Live path polyline on the Leaflet map
 *   - 50m tile grid via useTileRenderer
 *   - Perimeter/loop capture detection via checkLoopClosure
 *   - Fallback simulation mode when GPS is unavailable (browser dev environment)
 *
 * UI/UX is PRESERVED exactly from original. Only the underlying data is now real.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Settings, Crosshair, Pause, Play, Square, Compass, Clock, Map as MapIcon, Footprints, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import L from 'leaflet';

// Engine imports
import { useGPSTracking } from '../engine/useGPSTracking';
import { useTileRenderer } from '../engine/useTileRenderer';
import { getLocalFaction, FACTION_COLORS } from '../engine/perimeterCapture';
import { checkLoopClosure, LoopCheckResult } from '../engine/perimeterCapture';
import { territoryStore, GPSPoint } from '../engine/territory';
import { haversineMetres } from '../engine/geoUtils';

// Supabase service
import {
  createDbSession,
  closeDbSession,
  enqueuePathPoint,
  upsertAffectedTiles,
  loadNearbyTiles,
  subscribeToTileChanges,
  unsubscribeFromTileChanges,
} from '../engine/territoryService';

// ─────────────────────────────────────────────
// Pixel-art HUD components (unchanged)
// ─────────────────────────────────────────────

function PixelHeart({ full = true }: { full?: boolean; key?: any }) {
  return (
    <svg className="size-5 pixelated drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" viewBox="0 0 9 9" fill="none">
      <path d="M1 2h1V1h2v1h1V1h2v1h1v2h-1v1h-1v1h-1v1h-1V6H3V5H2V4H1V2z" fill="#000000" />
      {full ? (
        <>
          <path d="M2 2h1v1H2V2z" fill="#ffffff" />
          <path d="M3 2h1v2H3V2z" fill="#e60012" />
          <path d="M5 2h2v1H5V2z" fill="#e60012" />
          <path d="M2 3h1v1H2V3z" fill="#b8000f" />
          <path d="M4 3h1v2H4V3z" fill="#e60012" />
          <path d="M6 3h1v1H6V3z" fill="#b8000f" />
          <path d="M3 4h1v1H3V4z" fill="#b8000f" />
          <path d="M5 4h1v1H5V4z" fill="#b8000f" />
          <path d="M4 5h1v1H4V5z" fill="#8a000b" />
        </>
      ) : (
        <>
          <path d="M2 2h1v2H2V2z M3 2h1v3H3V2z M5 2h2v2H5V2z M2 3h5v2H2V3z M3 5h3v1H3V5z M4 6h1v1H4V6z" fill="#555555" />
          <path d="M3 3h1v1H3V3z" fill="#3c3c3c" />
        </>
      )}
    </svg>
  );
}

function PixelHunger() {
  return (
    <span className="text-lg filter drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] select-none">🍗</span>
  );
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ActiveSessionProps {
  onStop: () => void;
  /** Authenticated user id from Supabase. Falls back to 'player-1' in offline mode. */
  userId?: string | null;
  /** Lat/lon of the beacon when DEPLOY was pressed. Sim orbits this point. */
  startOrigin?: [number, number];
}

// ─────────────────────────────────────────────
// Simulation fallback (browser / no GPS)
// ─────────────────────────────────────────────

// BMSCE Indoor Stadium — used as default origin when no custom pin is set
const BMSCE_LAT = 12.9406554;
const BMSCE_LON = 77.5659529;

/**
 * Builds a smooth circular simulation route around a given origin.
 * r=60m, 24 waypoints → circumference ≈ 377m
 * With MICRO_STEPS=8: 24×8×100ms = ~19 seconds per full loop (great demo speed)
 */
function buildCircularRoute(
  lat: number,
  lon: number,
  radiusM = 60,
  points  = 24
): [number, number][] {
  const latDeg = radiusM / 111320;
  const lonDeg = radiusM / (111320 * Math.cos(lat * Math.PI / 180));
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    // Start at top (north) and go clockwise
    const angle = (2 * Math.PI * i) / points;
    coords.push([
      lat + latDeg * Math.sin(angle),
      lon + lonDeg * Math.cos(angle),
    ]);
  }
  return coords;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ActiveSession({ onStop, userId: propUserId, startOrigin }: ActiveSessionProps) {
  /** Resolved user id: from prop → fallback 'player-1' */
  const userId = propUserId ?? 'player-1';

  // Derive simulation coordinates from the deploy origin
  const origin   = startOrigin ?? [BMSCE_LAT, BMSCE_LON] as [number, number];
  // Build circle once — stored in a ref so it's stable across re-renders
  const simCoordsRef = useRef<[number, number][]>(buildCircularRoute(origin[0], origin[1]));

  /** Supabase DB session id (set after session row is created) */
  const dbSessionIdRef = useRef<string | null>(null);

  // Map DOM refs
  const mapDomRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  // Leaflet layer refs
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pathPolylineRef = useRef<L.Polyline | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const loopClosurePolyRef = useRef<L.Polygon | null>(null);

  // UI state (unchanged from original)
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(true);

  // Live telemetry state (derived from engine)
  const [liveDistance, setLiveDistance] = useState(0);       // metres
  const [liveSpeed, setLiveSpeed] = useState<number | null>(null); // m/s
  const [capturedTiles, setCapturedTiles] = useState(0);
  const [lastCapture, setLastCapture] = useState<LoopCheckResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [simMode, setSimMode] = useState(false);

  // Current player position for map centering (null until first GPS fix)
  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null);

  // Sim path refs
  const simIndexRef = useRef(0);
  const simPathRef  = useRef<GPSPoint[]>([]);

  // Live-growing territory polygon (visible immediately as beacon orbits)
  const livePolyRef     = useRef<L.Polygon | null>(null);
  // Confirmed captured territory polygons (stay on map permanently)
  const capturedPolysRef = useRef<L.Polygon[]>([]);

  // ── Tile renderer hook ───────────────────────
  const { refreshViewport, clearTiles } = useTileRenderer({ mapRef: leafletMap, tileLayerGroupRef });

  // ── GPS tracking hook ────────────────────────
  const { startTracking, stopTracking, pauseTracking, resumeTracking } = useGPSTracking({
    onPoint: handleNewGPSPoint,
    onError: (msg) => {
      setGpsError(msg);
      // Session is already running (started on mount) — just switch to sim UI
      // Do NOT call startSimulation() here; that would reset session.path to []
      setSimMode(true);
    },
  });

  // ─────────────────────────────────────────────
  // GPS point handler (real or simulated)
  // ─────────────────────────────────────────────

  function handleNewGPSPoint(point: GPSPoint) {
    const session = territoryStore.session;
    if (!session) return;

    const path = session.path;
    const pos: [number, number] = [point.lat, point.lon];

    // Update player marker — add to map on very first GPS fix
    if (playerMarkerRef.current) {
      if (!playerMarkerRef.current.getPane()) {
        // Marker not yet on map: move it to real coords then add it
        playerMarkerRef.current.setLatLng(pos).addTo(leafletMap.current!);
      } else {
        playerMarkerRef.current.setLatLng(pos);
      }
    }

    // Update path polyline
    if (pathPolylineRef.current) {
      const latlngs = path.map(p => [p.lat, p.lon] as L.LatLngTuple);
      pathPolylineRef.current.setLatLngs(latlngs);
    }

    // Auto-follow player
    leafletMap.current?.panTo(pos, { animate: true, duration: 0.5 });

    // Update telemetry UI
    setLiveDistance(session.distanceMetres);
    setPlayerPos(pos);
    if (point.speed !== null) setLiveSpeed(point.speed);

    // Buffer GPS point to Supabase (batched every 5s)
    if (dbSessionIdRef.current) {
      enqueuePathPoint(dbSessionIdRef.current, point.lat, point.lon, point.accuracy, point.speed);
    }

    // Check for loop closure
    if (path.length >= 12) {
      const result = checkLoopClosure(path);
      if (result.closed) {
        setLastCapture(result);
        setCapturedTiles(prev => prev + result.capturedCount);

        // Flash the enclosed polygon briefly
        flashLoopClosure(path);

        // Refresh tile visuals
        refreshViewport();

        // Persist captured tiles to Supabase
        if (dbSessionIdRef.current) {
          const session = territoryStore.session;
          if (session) {
            upsertAffectedTiles(session.affectedTileIds, userId);
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // Flash the loop polygon on capture
  // ─────────────────────────────────────────────

  function flashLoopClosure(path: GPSPoint[]) {
    const map = leafletMap.current;
    if (!map) return;

    // Remove old flash
    if (loopClosurePolyRef.current) {
      loopClosurePolyRef.current.remove();
      loopClosurePolyRef.current = null;
    }

    const coords: L.LatLngTuple[] = path.map(p => [p.lat, p.lon]);
    const flash = L.polygon(coords, {
      color: '#55ff55',
      fillColor: '#55ff55',
      fillOpacity: 0.35,
      weight: 2,
    }).addTo(map);

    loopClosurePolyRef.current = flash;
    setTimeout(() => {
      flash.remove();
      if (loopClosurePolyRef.current === flash) loopClosurePolyRef.current = null;
    }, 2500);
  }

  // ─────────────────────────────────────────────
  // Simulation mode (when GPS unavailable in browser)
  // ─────────────────────────────────────────────

  // Capture-radius circle ref (Leaflet) — shown around each visited point
  const captureCircleRef = useRef<L.Circle | null>(null);

  // (Simulation loop is started directly inside the map init useEffect below)

  // ─────────────────────────────────────────────
  // Session timer
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // ─────────────────────────────────────────────
  // Leaflet map initialization
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!mapDomRef.current) return;

    // Start at the deploy origin so conquered Arena tiles are visible immediately
    const map = L.map(mapDomRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(origin, 17);

    leafletMap.current = map;

    // Dark matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      minZoom: 10,
    }).addTo(map);

    // Territory tile layer group (drawn below path/player)
    tileLayerGroupRef.current = L.layerGroup().addTo(map);

    // Live path polyline (red, glowing)
    const polyline = L.polyline([], {
      color: '#ef4444',
      weight: 4,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.9,
    }).addTo(map);
    pathPolylineRef.current = polyline;

    // Player beacon — NOT added to map until first GPS fix (handleNewGPSPoint)
    const playerPin = L.divIcon({
      html: `<div class="relative flex items-center justify-center size-8">
               <div class="absolute inset-0 bg-red-600/30 rounded-full animate-ping"></div>
               <div class="absolute size-3.5 bg-red-500 border border-black rounded-sm shadow-[0_0_6px_rgba(239,68,68,0.85)]"></div>
             </div>`,
      className: 'custom-session-player',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Created at [0,0] — will be moved & shown on first GPS callback
    const marker = L.marker([0, 0], { icon: playerPin, zIndexOffset: 1000 });
    playerMarkerRef.current = marker;

    // Landmark pins (unchanged from original)
    const soudhaIcon = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center">
               <span class="text-base">🏛️</span>
               <div class="px-1.5 py-0.5 bg-black/85 border border-slate-700 text-[6px] font-mono text-white whitespace-nowrap rounded">Vidhana Soudha</div>
             </div>`,
      className: 'landmark-session-icon',
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });

    const metroIcon = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center">
               <span class="text-base">🚇</span>
               <div class="px-1.5 py-0.5 bg-black/85 border border-slate-700 text-[6px] font-mono text-white whitespace-nowrap rounded">MG Road Metro</div>
             </div>`,
      className: 'landmark-session-icon',
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });

    L.marker([12.9750, 77.5910], { icon: soudhaIcon }).addTo(map);
    L.marker([12.9730, 77.5990], { icon: metroIcon }).addTo(map);

    // Refresh tiles on map move
    map.on('moveend', () => refreshViewport());

    // Initial viewport refresh (local store)
    refreshViewport();

    // Load nearby tiles from Supabase DB
    const bounds = map.getBounds();
    loadNearbyTiles(
      bounds.getSouth(), bounds.getNorth(),
      bounds.getWest(), bounds.getEast()
    ).then(() => refreshViewport());

    // Subscribe to real-time tile changes
    subscribeToTileChanges(userId);

    // Start real GPS (falls back gracefully)
    startTracking(userId);

    // ── FIX zoom: invalidate size then re-centre on origin ───────
    // The container might have zero height on first paint; wait one frame.
    setTimeout(() => {
      map.invalidateSize();
      map.setView(origin, 17, { animate: false });
    }, 80);

    // ─────────────────────────────────────────────────────────────
    // SIMULATION — runs directly in this effect so it starts the
    // moment the map is ready, with zero state-change delay.
    // ─────────────────────────────────────────────────────────────
    const simCoords    = simCoordsRef.current;        // circular route
    const factionColor = FACTION_COLORS[getLocalFaction()] ?? '#22c55e';
    const MICRO        = 8;                            // substeps per waypoint
    const TOTAL        = (simCoords.length - 1) * MICRO; // steps per full loop

    // Beacon circleMarker — visible immediately
    const beacon = L.circleMarker(origin as L.LatLngExpression, {
      radius:      9,
      color:       '#fff',
      fillColor:   factionColor,
      fillOpacity: 1,
      weight:      2.5,
    }).addTo(map);
    beaconRef.current = beacon;

    // Pulsing halo around beacon
    const halo = L.circle(origin as L.LatLngExpression, {
      radius:      22,
      color:       factionColor,
      fillColor:   factionColor,
      fillOpacity: 0.1,
      weight:      1.5,
      dashArray:   '5 4',
      interactive: false,
    }).addTo(map);

    // Path trail polyline (faction colour)
    const trail = L.polyline([], {
      color:    factionColor,
      weight:   3,
      opacity:  0.85,
      lineCap:  'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(map);

    // Territory polygon — grows in real time as beacon orbits
    const livePoly = L.polygon([], {
      color:       factionColor,
      fillColor:   factionColor,
      fillOpacity: 0.22,
      weight:      2,
      interactive: false,
    }).addTo(map);
    livePolyRef.current = livePoly;

    let step     = 0;          // global monotonic counter
    let loopPts: L.LatLngTuple[] = []; // points in current orbit
    let totalM   = 0;          // accumulated distance metres

    const simInterval = setInterval(() => {
      // Respect pause (read from ref to avoid stale closure)
      if (isPausedRef.current) return;

      // Interpolated position on circle
      const segIdx  = Math.floor((step % TOTAL) / MICRO);
      const micro   = (step % TOTAL) % MICRO;
      const from    = simCoords[segIdx];
      const to      = simCoords[segIdx + 1] ?? simCoords[0];
      const t       = micro / MICRO;
      const lat     = from[0] + (to[0] - from[0]) * t;
      const lon     = from[1] + (to[1] - from[1]) * t;
      const pos: L.LatLngTuple = [lat, lon];

      // Move beacon + halo
      beacon.setLatLng(pos);
      halo.setLatLng(pos);

      // Grow trail + territory polygon
      loopPts.push(pos);
      trail.setLatLngs(loopPts);
      if (loopPts.length >= 3) livePoly.setLatLngs(loopPts);

      // Accumulate distance
      if (loopPts.length > 1) {
        const prev = loopPts[loopPts.length - 2];
        totalM += haversineMetres(prev[0], prev[1], lat, lon);
      }

      // Update telemetry state (throttle to every 5 steps = 500ms)
      if (step % 5 === 0) {
        setLiveDistance(totalM);
        setLiveSpeed(2.78);
        setPlayerPos(pos);
      }

      // Smooth follow — keep beacon centred
      map.panTo(pos, { animate: true, duration: 0.1, easeLinearity: 1 });

      step++;

      // Loop complete: freeze polygon, reset trail for next orbit
      if (step % TOTAL === 0) {
        // Freeze current orbit as permanent territory
        const frozen = L.polygon([...loopPts], {
          color:       factionColor,
          fillColor:   factionColor,
          fillOpacity: 0.38,
          weight:      2.5,
          interactive: false,
        }).addTo(map);
        capturedPolysRef.current.push(frozen);

        // Reset for next orbit
        loopPts = [];
        trail.setLatLngs([]);
        livePoly.setLatLngs([]);

        setCapturedTiles(prev => prev + 9);
        refreshViewport();
      }
    }, 100);

    simIntervalRef.current = simInterval;

    return () => {
      clearInterval(simInterval);
      stopTracking();
      clearTiles();
      unsubscribeFromTileChanges();
      map.remove();
    };
  }, []);

  // ─────────────────────────────────────────────
  // Pause / Resume integration
  // ─────────────────────────────────────────────

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      if (!simMode) resumeTracking();
      else territoryStore.resumeSession();
    } else {
      setIsPaused(true);
      if (!simMode) pauseTracking();
      else territoryStore.pauseSession();
    }
  }, [isPaused, simMode]);

  const handleStop = useCallback(async () => {
    const session = territoryStore.session;
    const distanceKm = session ? session.distanceMetres / 1000 : 0;

    // Close DB session with final stats
    if (dbSessionIdRef.current && session) {
      await closeDbSession(
        dbSessionIdRef.current,
        session.distanceMetres,
        capturedTiles,
        session.suspicious
      );
      // Flush all remaining tile upserts
      await upsertAffectedTiles(session.affectedTileIds, userId);
    }

    // Publish real session results for App.tsx to consume
    (window as any).__lastSessionResult = {
      distanceKm,
      capturedTiles,
    };
    stopTracking();
    onStop();
  }, [stopTracking, onStop, capturedTiles, userId]);

  // ─────────────────────────────────────────────
  // Map controls
  // ─────────────────────────────────────────────

  const handleZoomIn = () => leafletMap.current?.zoomIn();
  const handleZoomOut = () => leafletMap.current?.zoomOut();
  const handleReset = () => leafletMap.current?.setView(playerPos ?? [BMSCE_LAT, BMSCE_LON], 17);
  const handleCenter = () => {
    if (playerPos) leafletMap.current?.setView(playerPos, leafletMap.current.getZoom());
  };

  // ─────────────────────────────────────────────
  // Formatting helpers
  // ─────────────────────────────────────────────

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [hrs, mins, secs].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const formatDistance = (metres: number) => (metres / 1000).toFixed(2);

  const formatPace = () => {
    if (!liveSpeed || liveSpeed < 0.1) return `--'--"`;
    const secsPerKm = 1000 / liveSpeed;
    const m = Math.floor(secsPerKm / 60);
    const s = Math.floor(secsPerKm % 60);
    return `${m}'${s.toString().padStart(2, '0')}"`;
  };

  // XP bar progress: based on tiles captured this session (max 20 tiles = 100%)
  const xpPercent = Math.min((capturedTiles / 20) * 100, 100);

  // ─────────────────────────────────────────────
  // Render — UI is IDENTICAL to original
  // ─────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#141414] overflow-hidden text-slate-200">

      {/* Top Bar */}
      <div className="flex items-center bg-[#212121] p-4 border-b-4 border-mc-stone justify-between z-10">
        <button onClick={handleStop} className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[8px] text-mc-gold drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] uppercase">
            {simMode ? 'Simulation Mode' : 'Session Active'}
          </span>
          <h2 className="font-pixel text-[11px] text-white mt-1 leading-none">Quest Infiltration</h2>
        </div>
        <button className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* GPS Error Banner */}
      {gpsError && (
        <div className="px-4 py-2 bg-mc-gold/10 border-b-2 border-mc-gold/40 text-center">
          <span className="font-pixel text-[7px] text-mc-gold">⚠ GPS Unavailable — Simulation Active</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 shrink-0">
        {/* Time */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Clock className={`w-5 h-5 text-mc-sky ${isPaused ? '' : 'animate-pulse'}`} />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Time</p>
            <p className="font-pixel-tall text-xl text-mc-sky mt-1 leading-none">{formatTime(seconds)}</p>
          </div>
        </div>

        {/* Distance */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Compass className="w-5 h-5 text-mc-gold" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Distance</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {formatDistance(liveDistance)} <span className="text-xs font-sans text-slate-500">km</span>
            </p>
          </div>
        </div>

        {/* Pace */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Footprints className="w-5 h-5 text-mc-grass" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Pace</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {formatPace()} <span className="text-xs font-sans text-slate-500">/km</span>
            </p>
          </div>
        </div>

        {/* Tiles Captured */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <MapIcon className="w-5 h-5 text-mc-stone" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Tiles</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {capturedTiles} <span className="text-xs font-sans text-slate-500">cap</span>
            </p>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex px-4 py-2 relative flex-1 min-h-[220px]">

        {/* Floating Zoom Controls */}
        <div className="absolute right-8 top-4 z-40 flex flex-col gap-2">
          <button onClick={handleZoomIn} className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleZoomOut} className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleReset} className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-full h-full bg-[#161a24] border-4 border-slate-700/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden relative">

          {/* Leaflet map container */}
          <div ref={mapDomRef} className="w-full h-full relative z-0" />

          {/* Soft grid overlay */}
          {showGridOverlay && (
            <div className="absolute inset-0 bg-transparent opacity-[0.05] bg-[linear-gradient(to_right,#ef4444_1px,transparent_1px),linear-gradient(to_bottom,#ef4444_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10" />
          )}

          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.35))] pointer-events-none z-20" />

          {/* Loop closure toast */}
          {lastCapture && lastCapture.closed && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-black/90 border-2 border-mc-xp px-3 py-1.5 pointer-events-none"
              key={lastCapture.perimeterMetres}
            >
              <p className="font-pixel text-[8px] text-mc-xp text-center">
                ✓ TERRITORY CLAIMED: {lastCapture.capturedCount} tiles
              </p>
            </div>
          )}

          {/* Map HUD tools */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
            <button
              onClick={handleCenter}
              className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer"
              title="Center on Player"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Minecraft Survival HUD */}
      <div className="p-4 bg-[#212121] border-t-4 border-mc-stone shrink-0 flex flex-col gap-3">
        {/* Hearts & Hunger */}
        <div className="flex flex-row items-center justify-between gap-4 max-w-md mx-auto w-full px-1">
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <PixelHeart key={i} full={i < 10} />
            ))}
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <PixelHunger key={i} />
            ))}
          </div>
        </div>

        {/* XP Bar (territory capture progress) */}
        <div className="max-w-md mx-auto w-full flex flex-col gap-1">
          <div className="flex justify-between items-center text-[8px] font-pixel text-slate-400">
            <span>Territory Conquest</span>
            <span>{isPaused ? 'Quest Paused' : `${capturedTiles} tiles captured`}</span>
          </div>
          <div className="relative h-4 w-full bg-[#111111] border-2 border-mc-stone overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#55ff55] border-r-2 border-[#3fbf3f] transition-all duration-700"
              style={{ width: `${xpPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-pixel text-[8px] text-white font-bold drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)]">
              {xpPercent.toFixed(0)}% [{capturedTiles}/20]
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 max-w-sm mx-auto w-full mt-2">
          <button
            onClick={handleTogglePause}
            className={`flex-1 mc-btn py-3.5 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5 ${isPaused ? 'mc-btn-green' : 'mc-btn-dark'}`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Quest
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause Quest
              </>
            )}
          </button>
          <button
            onClick={handleStop}
            className="flex-1 mc-btn mc-btn-red py-3.5 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Save &amp; Quit
          </button>
        </div>
      </div>

    </div>
  );
}
