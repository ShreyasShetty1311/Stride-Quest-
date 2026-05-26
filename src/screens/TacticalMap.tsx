import React, { useEffect, useRef, useState } from 'react';
import { Search, Compass, Terminal, ZoomIn, ZoomOut, RefreshCw, Info, MapPin } from 'lucide-react';
import L from 'leaflet';
import { territoryStore } from '../engine/territory';
import { getTileDisplayType, getTileStyle, getLocalFaction, FACTION_COLORS } from '../engine/perimeterCapture';

// BMSCE Indoor Stadium, 6th Main Rd, Basavanagudi, Bengaluru 560019
const BMSCE_LAT = 12.9406554;
const BMSCE_LON = 77.5659529;

/**
 * Set to true while testing to lock the player beacon + all GPS state
 * to BMSCE Indoor Stadium, regardless of real device GPS output.
 * Flip to false before production deployment.
 */
const FORCE_BMSCE_OVERRIDE = true;

interface TacticalMapProps {
  /** Called with the current beacon lat/lon when the player hits DEPLOY */
  onDeploy: (origin: [number, number]) => void;
  isSessionActive?: boolean;
}

interface MapZone {
  name: string;
  type: 'allies' | 'rivals' | 'neutral';
  coords: [number, number][];
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  dashArray?: string;
}

const hotspots = [
  { name: 'Whitefield', lat: 12.9698, lon: 77.7500, typeWeight: { allies: 0.2, rivals: 0.6, neutral: 0.2 } },
  { name: 'Electronic City', lat: 12.8452, lon: 77.6633, typeWeight: { allies: 0.1, rivals: 0.7, neutral: 0.2 } },
  { name: 'Koramangala', lat: 12.9352, lon: 77.6244, typeWeight: { allies: 0.5, rivals: 0.3, neutral: 0.2 } },
  { name: 'HSR Layout', lat: 12.9121, lon: 77.6446, typeWeight: { allies: 0.3, rivals: 0.5, neutral: 0.2 } },
  { name: 'Indiranagar', lat: 12.9634, lon: 77.6412, typeWeight: { allies: 0.4, rivals: 0.4, neutral: 0.2 } },
  { name: 'Hebbal', lat: 13.0354, lon: 77.5988, typeWeight: { allies: 0.3, rivals: 0.3, neutral: 0.4 } },
  { name: 'Yelahanka', lat: 13.1007, lon: 77.5963, typeWeight: { allies: 0.6, rivals: 0.2, neutral: 0.2 } },
  { name: 'Marathahalli', lat: 12.9569, lon: 77.7011, typeWeight: { allies: 0.2, rivals: 0.4, neutral: 0.4 } },
  { name: 'Bellandur', lat: 12.9304, lon: 77.6784, typeWeight: { allies: 0.3, rivals: 0.5, neutral: 0.2 } },
  { name: 'JP Nagar', lat: 12.9063, lon: 77.5857, typeWeight: { allies: 0.4, rivals: 0.3, neutral: 0.3 } },
  { name: 'Jayanagar', lat: 12.9292, lon: 77.5824, typeWeight: { allies: 0.7, rivals: 0.1, neutral: 0.2 } },
  { name: 'Banashankari', lat: 12.9250, lon: 77.5460, typeWeight: { allies: 0.3, rivals: 0.5, neutral: 0.2 } },
  { name: 'Rajajinagar', lat: 12.9900, lon: 77.5562, typeWeight: { allies: 0.5, rivals: 0.3, neutral: 0.2 } },
  { name: 'Malleshwaram', lat: 13.0031, lon: 77.5701, typeWeight: { allies: 0.6, rivals: 0.2, neutral: 0.2 } },
  { name: 'RR Nagar', lat: 12.9260, lon: 77.5200, typeWeight: { allies: 0.4, rivals: 0.3, neutral: 0.3 } },
  { name: 'KR Puram', lat: 13.0120, lon: 77.7000, typeWeight: { allies: 0.2, rivals: 0.5, neutral: 0.3 } },
  { name: 'MG Road', lat: 12.9734, lon: 77.6068, typeWeight: { allies: 0.4, rivals: 0.2, neutral: 0.4 } },
  { name: 'Shivajinagar', lat: 12.9850, lon: 77.6000, typeWeight: { allies: 0.3, rivals: 0.3, neutral: 0.4 } },
  { name: 'Manyata Tech', lat: 13.0450, lon: 77.6200, typeWeight: { allies: 0.3, rivals: 0.5, neutral: 0.2 } }
];

const generateZones = (): MapZone[] => {
  const list: MapZone[] = [];
  let seed = 12345; // Fixed seed for reproducible zone generations

  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // 1. Cubbon Park (Allies) - Handcrafted original
  list.push({
    name: 'Sector 7G (Cubbon Park)',
    type: 'allies',
    coords: [
      [12.9770, 77.5900],
      [12.9740, 77.5980],
      [12.9700, 77.5950],
      [12.9730, 77.5870]
    ],
    color: '#10b981',
    fillColor: '#10b981',
    fillOpacity: 0.22,
    weight: 2
  });

  // 2. Indiranagar (Rivals) - Handcrafted original
  list.push({
    name: 'Sunset Heights (Indiranagar)',
    type: 'rivals',
    coords: [
      [12.9700, 77.6320],
      [12.9700, 77.6460],
      [12.9580, 77.6460],
      [12.9580, 77.6320]
    ],
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.18,
    weight: 2,
    dashArray: '5, 5'
  });

  hotspots.forEach((h, index) => {
    // Generate 4 dynamic zones per hotspot center (total: 76 generated zones)
    for (let z = 0; z < 4; z++) {
      const randType = pseudoRandom();
      let type: 'allies' | 'rivals' | 'neutral' = 'neutral';
      if (randType < h.typeWeight.allies) {
        type = 'allies';
      } else if (randType < h.typeWeight.allies + h.typeWeight.rivals) {
        type = 'rivals';
      }

      // Varying offsets from hotspot centers to distribute them realistically
      const latOffset = (pseudoRandom() - 0.5) * 0.024;
      const lonOffset = (pseudoRandom() - 0.5) * 0.024;

      const zoneCenterLat = h.lat + latOffset;
      const zoneCenterLon = h.lon + lonOffset;

      // Sizing mix (small, medium, large, hotspot overlaps)
      let sizeDeg = 0.003;
      if (z === 0) {
        sizeDeg = 0.0012 + pseudoRandom() * 0.0012; // Small isolated captures
      } else if (z === 1 || z === 3) {
        sizeDeg = 0.0028 + pseudoRandom() * 0.0022; // Medium clusters
      } else {
        sizeDeg = 0.0055 + pseudoRandom() * 0.0035; // Larger regions
      }

      // Parallelogram shape details
      const w = sizeDeg;
      const hSize = sizeDeg * (0.75 + pseudoRandom() * 0.5);
      const slant = (pseudoRandom() - 0.5) * 0.0015;

      const coords: [number, number][] = [
        [zoneCenterLat - hSize / 2, zoneCenterLon - w / 2],
        [zoneCenterLat + hSize / 2, zoneCenterLon - w / 2 + slant],
        [zoneCenterLat + hSize / 2, zoneCenterLon + w / 2],
        [zoneCenterLat - hSize / 2, zoneCenterLon + w / 2 - slant]
      ];

      // Opacity/color variation to match visual styles cleanly
      let color = '#f59e0b';
      let fillColor = '#f59e0b';
      let fillOpacity = 0.11 + pseudoRandom() * 0.11;
      let weight = 1.5 + pseudoRandom() * 0.8;
      let dashArray: string | undefined = undefined;

      if (type === 'allies') {
        const hue = pseudoRandom();
        color = hue < 0.35 ? '#10b981' : hue < 0.65 ? '#059669' : '#34d399';
        fillColor = color;
      } else if (type === 'rivals') {
        const hue = pseudoRandom();
        color = hue < 0.35 ? '#ef4444' : hue < 0.65 ? '#dc2626' : '#f87171';
        fillColor = color;
        if (pseudoRandom() < 0.45) {
          dashArray = pseudoRandom() < 0.5 ? '4, 4' : '6, 3';
        }
      } else {
        const hue = pseudoRandom();
        color = hue < 0.35 ? '#f59e0b' : hue < 0.65 ? '#d97706' : '#fbbf24';
        fillColor = color;
        if (pseudoRandom() < 0.25) {
          dashArray = '2, 2';
        }
      }

      const zoneName = `${h.name} Area Sector ${z + 1} [Ch. ${100 + index * 4 + z}]`;

      list.push({
        name: zoneName,
        type,
        coords,
        color,
        fillColor,
        fillOpacity,
        weight,
        dashArray
      });
    }
  });

  return list;
};

const capturedZones: MapZone[] = generateZones();

export function TacticalMap({ onDeploy, isSessionActive = false }: TacticalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const [zoom, setZoom] = useState(15);
  const [coords, setCoords] = useState({ lat: BMSCE_LAT, lon: BMSCE_LON });
  const [activeFilter, setActiveFilter] = useState<'all' | 'allies' | 'rivals' | 'neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [showHud, setShowHud] = useState(false);
  const [realPos, setRealPos] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [followMe, setFollowMe] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsState, setGpsState] = useState<'requesting' | 'granted' | 'denied' | 'unavailable'>('requesting');
  // Reactive faction color for beacon
  const [factionColor, setFactionColor] = useState(() => FACTION_COLORS[getLocalFaction()]);

  // "Set Location" pin mode — clicking the map relocates the BMSCE override
  const [setLocationMode, setSetLocationMode] = useState(false);
  const [customOrigin, setCustomOrigin] = useState<[number, number] | null>(null);
  const customOriginRef = useRef<[number, number] | null>(null);
  const setLocationModeRef = useRef(false);

  // Poll faction color so beacon updates when user changes faction
  useEffect(() => {
    const id = setInterval(() => {
      setFactionColor(FACTION_COLORS[getLocalFaction()]);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const followMeRef = React.useRef(true);
  const realPosRef = React.useRef<[number, number] | null>(null);

  // Check permission state on mount for immediate feedback
  React.useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsState('unavailable');
      return;
    }
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'denied') setGpsState('denied');
        result.onchange = () => {
          if (result.state === 'denied') setGpsState('denied');
          if (result.state === 'granted') setGpsState('granted');
        };
      });
    }
  }, []);

  // Live territory stats from engine store
  const [tileStats, setTileStats] = useState({ owned: 0, rival: 0, contested: 0, neutral: 0, total: 0 });

  // Subscribe to store changes to keep HUD stats live
  useEffect(() => {
    const update = () => {
      let owned = 0, rival = 0, contested = 0, neutral = 0;
      territoryStore.tiles.forEach(t => {
        if (t.contested) { contested++; return; }
        if (!t.ownerId) { neutral++; return; }
        if (t.ownerId === 'player-1') owned++;
        else rival++;
      });
      setTileStats({ owned, rival, contested, neutral, total: owned + rival + contested + neutral });
    };
    update();
    return territoryStore.subscribe(update);
  }, []);

  // Layer groups refs to toggle visibility dynamically
  const alliesLayerGroup = useRef<L.LayerGroup | null>(null);
  const rivalsLayerGroup = useRef<L.LayerGroup | null>(null);
  const neutralLayerGroup = useRef<L.LayerGroup | null>(null);

  // Biome Calculation based on Lat/Lon coordinates
  const getBiomeName = (lat: number, lon: number) => {
    if (lat >= 12.9660 && lat <= 12.9780 && lon >= 77.5860 && lon <= 77.5990) {
      return "Forest/Park (Cubbon)";
    }
    if (lat >= 12.9740 && lat <= 12.9860 && lon >= 77.6080 && lon <= 77.6250) {
      return "Lake/Wetland (Ulsoor)";
    }
    if (lat >= 12.9550 && lat <= 12.9760 && lon >= 77.6260 && lon <= 77.6460) {
      return "Urban/Street (Indira)";
    }
    return "Plains (BLR Suburbs)";
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Start at BMSCE — GPS will override on first fix
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([BMSCE_LAT, BMSCE_LON], 17);

    leafletMap.current = map;

    // Dark matter base layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      minZoom: 10
    }).addTo(map);

    // Double-pass: after first paint, force-recentre on BMSCE.
    // Leaflet can miscalculate container size before CSS layout settles.
    const bmsceCentreTimer = setTimeout(() => {
      map.invalidateSize();
      // Only snap to BMSCE if GPS hasn't already provided a real fix
      if (!realPosRef.current) {
        map.setView([BMSCE_LAT, BMSCE_LON], 17, { animate: false });
      }
    }, 350);

    // Layer groups for zone markers
    alliesLayerGroup.current = L.layerGroup().addTo(map);
    rivalsLayerGroup.current = L.layerGroup().addTo(map);
    neutralLayerGroup.current = L.layerGroup().addTo(map);

    // ── Zone / landmark icons ─────────────────────────────────
    const makePin = (emoji: string, label: string) => L.divIcon({
      html: `<div class="flex flex-col items-center justify-center filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
               <span class="text-xl">${emoji}</span>
               <div class="px-2 py-0.5 bg-black/85 border border-slate-700 text-[8px] font-mono text-white whitespace-nowrap rounded mt-0.5">${label}</div>
             </div>`,
      className: 'custom-marker-icon',
      iconSize: [90, 44],
      iconAnchor: [45, 22]
    });

    // Make all landmark markers non-interactive
    const markerOpts = { interactive: false };
    L.marker([12.9796, 77.5906], { icon: makePin('🏛️', 'Vidhana Soudha'), ...markerOpts }).addTo(alliesLayerGroup.current);
    L.marker([12.9634, 77.6412], { icon: makePin('🛍️', 'Indiranagar'), ...markerOpts }).addTo(rivalsLayerGroup.current);
    L.marker([12.9754, 77.6068], { icon: makePin('🚇', 'MG Road Metro'), ...markerOpts }).addTo(neutralLayerGroup.current);
    L.marker([12.9818, 77.6210], { icon: makePin('⛵', 'Ulsoor Lake'), ...markerOpts }).addTo(neutralLayerGroup.current);

    // ── Zone polygons ─────────────────────────────────────────
    capturedZones.forEach(zone => {
      const polygon = L.polygon(zone.coords, {
        color: zone.color,
        fillColor: zone.fillColor,
        fillOpacity: zone.fillOpacity,
        weight: zone.weight,
        dashArray: zone.dashArray,
        interactive: false   // not clickable
      });
      if (zone.type === 'allies') polygon.addTo(alliesLayerGroup.current!);
      else if (zone.type === 'rivals') polygon.addTo(rivalsLayerGroup.current!);
      else if (zone.type === 'neutral') polygon.addTo(neutralLayerGroup.current!);
    });

    // ── Live territory tile layer ─────────────────────────────
    const liveTileGroup = L.layerGroup().addTo(map);
    const liveTilePolygons = new Map<string, L.Polygon>();
    const renderLiveTiles = () => {
      territoryStore.tiles.forEach((tile) => {
        const type = getTileDisplayType(tile);
        const style = getTileStyle(type, tile.ownerId);
        const existing = liveTilePolygons.get(tile.id);
        if (existing) existing.setStyle(style);
        else {
          const poly = L.polygon(tile.bounds as L.LatLngTuple[], { ...style, interactive: false }).addTo(liveTileGroup);
          liveTilePolygons.set(tile.id, poly);
        }
      });
    };
    renderLiveTiles();
    const unsub = territoryStore.subscribe(renderLiveTiles);

    // ── HUD coord sync on pan/zoom ────────────────────────────
    map.on('move', () => {
      const c = map.getCenter();
      setCoords({ lat: c.lat, lon: c.lng });
      setZoom(map.getZoom());
    });

    // ── Player beacon ─────────────────────────────────────────
    // NOTE: marker and accuracy circle are NOT added to the map yet.
    // They are added only when the first real GPS fix arrives so the
    // user never sees a stale hardcoded position (e.g. Cubbon Park).
    const beaconColor = FACTION_COLORS[getLocalFaction()];
    const playerIcon = L.divIcon({
      html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
               <div style="position:absolute;inset:0;border-radius:50%;background:${beaconColor}30;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite"></div>
               <div style="position:absolute;width:14px;height:14px;background:${beaconColor};border:2px solid #000;transform:rotate(45deg);box-shadow:0 0 10px ${beaconColor}dd"></div>
             </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Created but NOT yet added to map
    const playerMarker = L.marker([0, 0], {
      icon: playerIcon,
      zIndexOffset: 1000,
      interactive: false
    });

    // Accuracy halo — also hidden until first fix
    const accuracyCircle = L.circle([0, 0], {
      radius: 50,
      color: beaconColor,
      fillColor: beaconColor,
      fillOpacity: 0.07,
      weight: 1,
      dashArray: '4 4',
      interactive: false
    });

    let beaconVisible = false;

    // ── Map click → set custom location when pin mode active ─────
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!setLocationModeRef.current) return;
      const { lat, lng } = e.latlng;
      const origin: [number, number] = [lat, lng];
      customOriginRef.current = origin;
      setCustomOrigin(origin);
      setSetLocationMode(false);
      setLocationModeRef.current = false;
      // Move beacon immediately
      playerMarker.setLatLng(origin);
      accuracyCircle.setLatLng(origin);
      if (!beaconVisible) {
        playerMarker.addTo(map);
        accuracyCircle.addTo(map);
        beaconVisible = true;
      }
      realPosRef.current = origin;
      setRealPos(origin);
      setCoords({ lat, lon: lng });
      map.flyTo(origin, 17, { animate: true, duration: 0.8 });
    });
    const tracePoints: L.LatLngTuple[] = [];

    const traceShadow = L.polyline([], {
      color: '#00ff00', weight: 8, opacity: 0.15,
      lineJoin: 'round', lineCap: 'round', interactive: false
    }).addTo(map);

    const traceLine = L.polyline([], {
      color: '#55ff55', weight: 3, opacity: 0.9,
      lineJoin: 'round', lineCap: 'round', interactive: false
    }).addTo(map);

    const dotIcon = L.divIcon({
      html: `<div style="width:6px;height:6px;background:#55ff55;border-radius:50%;border:1px solid rgba(0,0,0,0.6);box-shadow:0 0 4px rgba(85,255,85,0.8)"></div>`,
      className: '', iconSize: [6, 6], iconAnchor: [3, 3]
    });

    // ── Haversine distance helper (metres) ────────────────────
    const haversineM = (a: L.LatLngTuple, b: L.LatLngTuple) => {
      const R = 6371000;
      const dLat = (b[0] - a[0]) * Math.PI / 180;
      const dLon = (b[1] - a[1]) * Math.PI / 180;
      const s = Math.sin(dLat / 2) ** 2
        + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180)
        * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    // ── Core GPS update handler (shared by both APIs) ─────────
    let firstFix = true;
    let lastFire = 0;

    /**
     * applyRateLimit – pass false for getCurrentPosition (instant first fix)
     * so a near-simultaneous watchPosition callback can't silence the better reading.
     */
    const onPosition = (pos: GeolocationPosition, applyRateLimit = true) => {
      if (applyRateLimit) {
        const now = Date.now();
        if (now - lastFire < 2000) return;  // 2 s minimum between UI updates
        lastFire = now;
      }

      // ── BMSCE override: swap out real GPS coords for testing ──────────────
      // customOrigin (user-placed pin) takes priority over default BMSCE
      const origin = customOriginRef.current ?? [BMSCE_LAT, BMSCE_LON] as [number, number];
      let lat  = FORCE_BMSCE_OVERRIDE ? origin[0] : pos.coords.latitude;
      let lon  = FORCE_BMSCE_OVERRIDE ? origin[1] : pos.coords.longitude;
      const accuracy = FORCE_BMSCE_OVERRIDE ? 5   : pos.coords.accuracy;
      const speed    = FORCE_BMSCE_OVERRIDE ? null : pos.coords.speed;

      // Debug log
      console.debug('[GPS]', { lat, lon, accuracy, speed, forced: FORCE_BMSCE_OVERRIDE });

      // Accuracy gate: 150 m cap (matches MAX_ACCURACY_METRES in territory.ts).
      // On desktop, IP/Wi-Fi triangulation sits at ~50-120 m — still useful.
      // The "weak signal" banner already warns the user when accuracy > 50 m.
      if (!firstFix && accuracy > 150) {
        console.debug('[GPS] skipped — accuracy too low:', accuracy);
        return;
      }

      const latlng: L.LatLngTuple = [lat, lon];

      // On first real fix: reveal beacon + halo at the actual location
      if (!beaconVisible) {
        playerMarker.setLatLng(latlng).addTo(map);
        accuracyCircle.setLatLng(latlng).addTo(map);
        beaconVisible = true;
      } else {
        playerMarker.setLatLng(latlng);
        accuracyCircle.setLatLng(latlng);
      }
      accuracyCircle.setRadius(Math.max(accuracy ?? 15, 8));

      // Update React state (HUD + follow)
      setCoords({ lat, lon });
      setRealPos([lat, lon]);
      setGpsAccuracy(Math.round(accuracy ?? 0));
      setGpsState('granted');
      realPosRef.current = [lat, lon];

      // Follow mode: fly to real location on first fix, smooth pan after
      if (followMeRef.current) {
        if (firstFix) {
          map.flyTo(latlng, 18, { animate: true, duration: 1.2 });
        } else {
          map.panTo(latlng, { animate: true, duration: 0.8, easeLinearity: 0.5 });
        }
      }

      // Breadcrumb: filter jitter < 3 m
      const prev = tracePoints[tracePoints.length - 1];
      const dist = prev ? haversineM(prev, latlng) : Infinity;
      if (!prev || dist >= 3) {
        tracePoints.push(latlng);
        traceLine.setLatLngs(tracePoints as L.LatLngExpression[]);
        traceShadow.setLatLngs(tracePoints as L.LatLngExpression[]);
        if (!prev || dist >= 30) {
          L.marker(latlng, { icon: dotIcon, zIndexOffset: 900, interactive: false }).addTo(map);
        }
      }

      firstFix = false;
    };

    // ── Dual acquisition ──────────────────────────────────────
    // 1) getCurrentPosition for instant first paint
    // 2) watchPosition for continuous 2-second updates
    let watchId: number | null = null;

    if ('geolocation' in navigator) {
      // Fast first fix — no rate-limit so it always lands
      navigator.geolocation.getCurrentPosition(
        (pos) => onPosition(pos, false),
        (err) => {
          console.warn('[GPS] getCurrentPosition failed:', err.message);
          if (err.code === 1) setGpsState('denied');
          // GPS denied/unavailable — reveal beacon at BMSCE hardcoded position
          if (!beaconVisible) {
            const bmsceLatLng: L.LatLngTuple = [BMSCE_LAT, BMSCE_LON];
            playerMarker.setLatLng(bmsceLatLng).addTo(map);
            accuracyCircle.setLatLng(bmsceLatLng).addTo(map);
            beaconVisible = true;
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );

      // Continuous tracking — rate-limited to 2 s
      watchId = navigator.geolocation.watchPosition(
        (pos) => onPosition(pos, true),
        (err) => {
          console.warn('[GPS] watchPosition error:', err.message);
          if (err.code === 1) setGpsState('denied');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      // Geolocation not available — pin to BMSCE
      if (!beaconVisible) {
        const bmsceLatLng: L.LatLngTuple = [BMSCE_LAT, BMSCE_LON];
        playerMarker.setLatLng(bmsceLatLng).addTo(map);
        accuracyCircle.setLatLng(bmsceLatLng).addTo(map);
        beaconVisible = true;
      }
    }

    // Stop following when user manually pans the map
    map.on('dragstart', () => {
      followMeRef.current = false;
      setFollowMe(false);
    });


    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      clearTimeout(bmsceCentreTimer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      unsub();
      map.remove();
    };
  }, []);


  // Sync state filters to Leaflet LayerGroup visibility
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (alliesLayerGroup.current) map.removeLayer(alliesLayerGroup.current);
    if (rivalsLayerGroup.current) map.removeLayer(rivalsLayerGroup.current);
    if (neutralLayerGroup.current) map.removeLayer(neutralLayerGroup.current);

    if (activeFilter === 'all') {
      if (alliesLayerGroup.current) alliesLayerGroup.current.addTo(map);
      if (rivalsLayerGroup.current) rivalsLayerGroup.current.addTo(map);
      if (neutralLayerGroup.current) neutralLayerGroup.current.addTo(map);
    } else if (activeFilter === 'allies') {
      if (alliesLayerGroup.current) alliesLayerGroup.current.addTo(map);
    } else if (activeFilter === 'rivals') {
      if (rivalsLayerGroup.current) rivalsLayerGroup.current.addTo(map);
    } else if (activeFilter === 'neutral') {
      if (neutralLayerGroup.current) neutralLayerGroup.current.addTo(map);
    }
  }, [activeFilter]);

  // Search — real geocoding via Nominatim (OpenStreetMap)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const map = leafletMap.current;
    if (!map || !searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 16, { animate: true, duration: 1.2 });
      }
    } catch {
      // network error — silently ignore
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden pb-24 bg-[#141414] text-slate-200">

      {/* Sticky top header — always visible, shows STRIDE QUEST / ARENA */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a]/95 border-b border-slate-700/50 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 flex items-center justify-center" style={{ border: `2px solid ${factionColor}30` }}>
            <Compass className="size-4" style={{ color: factionColor }} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-pixel text-[9px] text-mc-gold tracking-widest">STRIDE QUEST</span>
            <span className="font-pixel text-[7px] tracking-widest mt-0.5" style={{ color: factionColor }}>▶ ARENA</span>
          </div>
        </div>
        {/* Live GPS dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full border border-black ${realPos ? 'animate-pulse' : 'opacity-40'}`}
            style={{ background: realPos ? factionColor : '#6b7280' }}
          />
          <span className="font-pixel text-[7px] text-slate-400">{realPos ? 'GPS LOCKED' : 'ACQUIRING'}</span>
        </div>
      </div>

      {/* HUD panel — hidden by default, revealed via ℹ button */}
      {showHud && (
        <div className="absolute top-4 left-4 z-40 flex flex-col font-pixel text-[8px] bg-black/80 p-3 border border-slate-700/60 max-w-[220px] leading-[1.75] pointer-events-none drop-shadow-md">
          {/* Header */}
          <p className="text-mc-gold font-bold tracking-wide mb-0.5">STRIDE QUEST</p>
          <p className="text-[7px] text-slate-500 font-pixel tracking-widest mb-1">▶ ARENA</p>

          {/* Coordinates block */}
          <p className="text-mc-sky">LAT  <span className="text-white">{coords.lat.toFixed(5)}</span></p>
          <p className="text-mc-sky">LON  <span className="text-white">{coords.lon.toFixed(5)}</span></p>
          <p className="text-slate-400">ALT  <span className="text-white">920.0 m</span></p>
          <p className="text-slate-400">ZOOM <span className="text-white">{zoom.toFixed(1)}x</span></p>

          {/* Divider */}
          <div className="my-1.5 border-t border-slate-700/60" />

          {/* Biome */}
          <p className="text-[#a78bfa]">ZONE  <span className="text-white">{getBiomeName(coords.lat, coords.lon)}</span></p>

          {/* Divider */}
          <div className="my-1.5 border-t border-slate-700/60" />

          {/* Territory stats — color coded per ownership type */}
          <p className="text-slate-400 tracking-widest text-[7px] mb-0.5">── TERRITORY ──</p>
          <p className="text-mc-xp">▪ OWNED    <span className="text-white">{tileStats.owned} tiles</span></p>
          <p className="text-mc-red">▪ RIVAL    <span className="text-white">{tileStats.rival} tiles</span></p>
          <p className="text-mc-gold">▪ CONTESTED <span className="text-white">{tileStats.contested} tiles</span></p>
          <p className="text-slate-400">▪ NEUTRAL  <span className="text-white">{tileStats.neutral} tiles</span></p>

          {/* Divider */}
          <div className="my-1.5 border-t border-slate-700/60" />

          {/* System status */}
          <p className="text-mc-xp">SAT UPLINK  <span className="text-mc-xp">ACTIVE</span></p>
          <p className="text-slate-400">SESSION     <span className={territoryStore.session ? 'text-mc-xp' : 'text-slate-500'}>{territoryStore.session ? 'RUNNING' : 'IDLE'}</span></p>
          <p className="text-slate-400">GPS         <span className={realPos ? 'text-mc-xp' : 'text-mc-gold'}>{realPos ? 'LOCKED' : 'ACQUIRING...'}</span></p>
          {gpsAccuracy !== null && (
            <p className="text-slate-400">ACCURACY    <span className={gpsAccuracy <= 15 ? 'text-mc-xp' : gpsAccuracy <= 35 ? 'text-mc-gold' : 'text-mc-red'}>{gpsAccuracy} m</span></p>
          )}
        </div>
      )}

      {/* Floating Map Controls — hidden while a session is active */}
      {!isSessionActive && (
      <div className="fixed right-3 z-[60] flex flex-col gap-2" style={{ top: '52px' }}>
        {/* ℹ Info / HUD toggle */}
        <button
          onClick={() => setShowHud(h => !h)}
          className={`mc-btn size-10 flex items-center justify-center cursor-pointer ${showHud ? 'mc-btn-gold' : 'mc-btn-dark'}`}
          title="Toggle Map Info"
        >
          <Info className="w-4 h-4" />
        </button>
        {/* Locate me — re-centres + re-enables follow */}
        <button
          onClick={() => {
            const pos = realPosRef.current;
            if (pos && leafletMap.current) {
              leafletMap.current.flyTo(pos, 18, { animate: true, duration: 0.8 });
            }
            followMeRef.current = true;
            setFollowMe(true);
          }}
          className={`mc-btn size-10 flex items-center justify-center cursor-pointer ${followMe ? 'mc-btn-green' : 'mc-btn-dark'}`}
          title="Locate Me"
        >
          <Compass className="w-4 h-4" />
        </button>
        {/* ⇧ Set Location — click anywhere on map to relocate beacon */}
        <button
          onClick={() => {
            const next = !setLocationMode;
            setSetLocationMode(next);
            setLocationModeRef.current = next;
            // Change cursor on map
            const map = leafletMap.current;
            if (map) map.getContainer().style.cursor = next ? 'crosshair' : '';
          }}
          className={`mc-btn size-10 flex items-center justify-center cursor-pointer ${setLocationMode ? 'mc-btn-gold' : 'mc-btn-dark'}`}
          title="Set Location — click the map to pin your position"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button
          onClick={() => { const map = leafletMap.current; if (map) map.zoomIn(); }}
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => { const map = leafletMap.current; if (map) map.zoomOut(); }}
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const pos = realPosRef.current ?? [BMSCE_LAT, BMSCE_LON];
            const map = leafletMap.current;
            if (map) map.setView(pos, 17);
          }}
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
          title="Reset View"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {/* Layers button REMOVED as requested */}
      </div>
      )} {/* end !isSessionActive buttons */}

      {/* Pin mode active banner */}
      {setLocationMode && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[65] flex items-center gap-2 px-3 py-2 bg-mc-gold/95 text-black font-pixel text-[8px] shadow-xl animate-pulse" style={{ top: '52px' }}>
          <MapPin className="w-3 h-3" />
          CLICK MAP TO SET YOUR LOCATION
        </div>
      )}

      {/* Main Map Container */}
      <div className="relative flex-1 m-4 mt-2 bg-[#161a24] border-4 border-slate-700/60 shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">

        {/* Leaflet DOM Node target */}
        <div ref={mapRef} className="w-full h-full relative z-0" />

        {/* Soft grid lines for map coordinates */}
        {showGridOverlay && (
          <div className="absolute inset-0 bg-transparent opacity-[0.05] bg-[linear-gradient(to_right,#55ff55_1px,transparent_1px),linear-gradient(to_bottom,#55ff55_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10" />
        )}

        {/* Outer overlay vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45))] pointer-events-none z-20" />

        {/* GPS status banner */}
        {gpsState === 'denied' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 bg-red-950/95 border border-red-600 text-red-300 font-pixel text-[8px] leading-relaxed max-w-[300px] shadow-xl">
            <span className="text-lg shrink-0">⛔</span>
            <div>
              <p className="text-red-200 font-bold mb-0.5">LOCATION DENIED</p>
              <p>Open browser Settings → Site Permissions → Location → Allow for this site, then reload.</p>
            </div>
          </div>
        )}
        {gpsState === 'unavailable' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-yellow-950/95 border border-yellow-600 text-yellow-300 font-pixel text-[8px] max-w-[280px] shadow-xl">
            <p className="text-yellow-200 font-bold mb-0.5">⚠ GPS UNAVAILABLE</p>
            <p>Your browser does not support the Geolocation API.</p>
          </div>
        )}
        {gpsState === 'requesting' && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-black/85 font-pixel text-[8px] shadow-xl animate-pulse"
            style={{ border: `1px solid ${factionColor}99`, color: factionColor }}
          >
            ▶ ACQUIRING GPS SIGNAL...
          </div>
        )}
        {gpsState === 'granted' && gpsAccuracy !== null && gpsAccuracy > 50 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-yellow-950/90 border border-yellow-600 text-yellow-300 font-pixel text-[8px] max-w-[280px] shadow-xl">
            <p className="text-yellow-200 font-bold mb-0.5">⚠ WEAK GPS SIGNAL — {gpsAccuracy}m accuracy</p>
            <p>Move outdoors or use a mobile device for better precision.</p>
          </div>
        )}


        {/* Search Overlay */}
        <div className="absolute bottom-24 left-4 right-4 z-35 max-w-md mx-auto">
          <form onSubmit={handleSearchSubmit} className="flex w-full items-stretch bg-black/90 border border-slate-700 h-10 shadow-2xl">
            <div className="text-mc-gold flex items-center justify-center pl-3 gap-1.5 shrink-0">
              <Terminal className="size-3.5" />
              <span className="font-pixel text-[8px]">/scan</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex w-full flex-1 border-none bg-transparent text-slate-100 focus:ring-0 focus:outline-none placeholder:text-slate-600 px-3 text-xs font-mono"
              placeholder="Search any place on Earth..."
              disabled={isSearching}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center px-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearching
                ? <span className="font-pixel text-[8px] text-mc-gold animate-pulse">...</span>
                : <Search className="size-4" />}
            </button>
          </form>
        </div>

        {/* Bottom Floating HUD Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-35 max-w-lg mx-auto">
          <div className="mc-panel p-3 flex flex-row gap-4 items-center justify-between shadow-2xl bg-[#2e2e2e]/95">
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
                <Compass className="size-6 text-mc-gold animate-pulse" />
              </div>
              <div className="flex flex-col">
                <p className="text-[8px] font-pixel text-slate-400 uppercase tracking-widest leading-none">Map Chunk</p>
                <h3 className="font-pixel text-[10px] text-white mt-1.5 leading-none">BMSCE, Basavanagudi</h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="h-2 w-2 bg-mc-xp border border-black rounded-sm"></span>
                  <span className="text-[8px] font-pixel text-mc-xp">XP Boost: 2.4x</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onDeploy(realPosRef.current ?? [BMSCE_LAT, BMSCE_LON])}
              className="mc-btn mc-btn-green px-5 py-3 text-[10px] tracking-wider uppercase cursor-pointer"
            >
              Deploy
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pills at the bottom styled as Item Tabs */}
      <div className="flex gap-2 p-3 bg-[#212121] border-t-4 border-mc-stone overflow-x-auto no-scrollbar relative z-30 justify-center">
        <button
          onClick={() => setActiveFilter('allies')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${activeFilter === 'allies' ? 'mc-btn-green' : 'mc-btn-dark'
            }`}
        >
          <span className="size-2 bg-white rounded-sm"></span>
          Allies
        </button>
        <button
          onClick={() => setActiveFilter('rivals')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${activeFilter === 'rivals' ? 'mc-btn-red' : 'mc-btn-dark'
            }`}
        >
          <span className="size-2 bg-black/40 rounded-sm"></span>
          Rivals
        </button>
        <button
          onClick={() => setActiveFilter('neutral')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${activeFilter === 'neutral' ? 'mc-btn-gold' : 'mc-btn-dark'
            }`}
        >
          <span className="size-2 bg-slate-500 rounded-sm"></span>
          Neutral
        </button>
        <button
          onClick={() => setActiveFilter('all')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${activeFilter === 'all' ? 'mc-btn-green border-mc-gold' : 'mc-btn-dark'
            }`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
