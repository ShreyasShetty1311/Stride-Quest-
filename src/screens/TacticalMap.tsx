import React, { useEffect, useRef, useState } from 'react';
import { Search, Compass, Terminal, ZoomIn, ZoomOut, RefreshCw, Layers } from 'lucide-react';
import L from 'leaflet';

interface TacticalMapProps {
  onDeploy: () => void;
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

export function TacticalMap({ onDeploy }: TacticalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  
  const [zoom, setZoom] = useState(13);
  const [coords, setCoords] = useState({ lat: 12.9716, lon: 77.5946 });
  const [activeFilter, setActiveFilter] = useState<'all' | 'allies' | 'rivals' | 'neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGridOverlay, setShowGridOverlay] = useState(true);

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

    // Initialize Leaflet map centered on Bengaluru default location
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([12.9716, 77.5946], 13);

    leafletMap.current = map;

    // Add CartoDB Dark Matter tile layer (sleek, high-contrast dark tiles)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      minZoom: 10
    }).addTo(map);

    // Initialize Layer Groups
    alliesLayerGroup.current = L.layerGroup().addTo(map);
    rivalsLayerGroup.current = L.layerGroup().addTo(map);
    neutralLayerGroup.current = L.layerGroup().addTo(map);

    // Define custom SVG divIcons to prevent production static asset bundling path issues
    const allyPin = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
               <span class="text-xl">🏛️</span>
               <div class="px-2 py-0.5 bg-black/85 border border-slate-700 text-[8px] font-mono text-white whitespace-nowrap rounded mt-0.5">Vidhana Soudha</div>
             </div>`,
      className: 'custom-marker-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 20]
    });

    const rivalPin = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
               <span class="text-xl">🛍️</span>
               <div class="px-2 py-0.5 bg-black/85 border border-slate-700 text-[8px] font-mono text-white whitespace-nowrap rounded mt-0.5">Indiranagar</div>
             </div>`,
      className: 'custom-marker-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 20]
    });

    const metroPin = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
               <span class="text-xl">🚇</span>
               <div class="px-2 py-0.5 bg-black/85 border border-slate-700 text-[8px] font-mono text-white whitespace-nowrap rounded mt-0.5">MG Road Metro</div>
             </div>`,
      className: 'custom-marker-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 20]
    });

    const lakePin = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
               <span class="text-xl">⛵</span>
               <div class="px-2 py-0.5 bg-black/85 border border-slate-700 text-[8px] font-mono text-white whitespace-nowrap rounded mt-0.5">Ulsoor Lake</div>
             </div>`,
      className: 'custom-marker-icon',
      iconSize: [80, 40],
      iconAnchor: [40, 20]
    });

    const playerPin = L.divIcon({
      html: `<div class="relative flex items-center justify-center size-8">
               <div class="absolute inset-0 bg-[#55ff55]/30 rounded-full animate-ping"></div>
               <div class="absolute size-3.5 bg-[#55ff55] border-2 border-black rotate-45 shadow-[0_0_6px_rgba(85,255,85,0.8)]"></div>
             </div>`,
      className: 'custom-player-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Add Markers to corresponding Layer Groups
    L.marker([12.9796, 77.5906], { icon: allyPin }).addTo(alliesLayerGroup.current);
    L.marker([12.9634, 77.6412], { icon: rivalPin }).addTo(rivalsLayerGroup.current);
    L.marker([12.9754, 77.6068], { icon: metroPin }).addTo(neutralLayerGroup.current);
    L.marker([12.9818, 77.6210], { icon: lakePin }).addTo(neutralLayerGroup.current);
    
    // Add Player pointer directly to map
    L.marker([12.9716, 77.5946], { icon: playerPin }).addTo(map);

    // Add all captured zones to Layer Groups programmatically
    capturedZones.forEach(zone => {
      const polygon = L.polygon(zone.coords, {
        color: zone.color,
        fillColor: zone.fillColor,
        fillOpacity: zone.fillOpacity,
        weight: zone.weight,
        dashArray: zone.dashArray
      });

      // Bind custom styled tooltip for interactivity
      polygon.bindTooltip(zone.name, {
        sticky: true,
        className: 'font-pixel text-[8px] bg-black/90 border border-slate-700 text-white p-1'
      });

      if (zone.type === 'allies') {
        polygon.addTo(alliesLayerGroup.current!);
      } else if (zone.type === 'rivals') {
        polygon.addTo(rivalsLayerGroup.current!);
      } else if (zone.type === 'neutral') {
        polygon.addTo(neutralLayerGroup.current!);
      }
    });

    // Listen to Map dragging/zooming updates to update HUD values
    map.on('move', () => {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lon: center.lng });
      setZoom(map.getZoom());
    });

    // Cleanup Leaflet instance on unmount
    return () => {
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

  // Search Submit Navigation
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const map = leafletMap.current;
    if (!map) return;

    const q = searchQuery.toLowerCase();
    if (q.includes('cubbon') || q.includes('park') || q.includes('vidhana') || q.includes('soudha')) {
      map.flyTo([12.9796, 77.5906], 15);
    } else if (q.includes('indira') || q.includes('crossing') || q.includes('100')) {
      map.flyTo([12.9634, 77.6412], 15);
    } else if (q.includes('ulsoor') || q.includes('lake')) {
      map.flyTo([12.9818, 77.6210], 15);
    } else if (q.includes('mg road') || q.includes('metro')) {
      map.flyTo([12.9754, 77.6068], 15);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden pb-24 bg-[#141414] text-slate-200">
      
      {/* Map Header styled as F3 Debug Overlay */}
      <div className="absolute top-4 left-4 z-40 flex flex-col font-pixel text-[8px] text-[#ffffff] bg-black/75 p-3 border border-slate-700 max-w-xs leading-relaxed pointer-events-none drop-shadow-md">
        <p className="text-mc-gold font-bold">Stride Quest OS [Version 4.2]</p>
        <p>Satellite Uplink: Active</p>
        <p className="mt-1 text-mc-sky">XYZ: {coords.lat.toFixed(4)} / 920.0 / {coords.lon.toFixed(4)}</p>
        <p>Biome: {getBiomeName(coords.lat, coords.lon)}</p>
        <p>Zoom Scale: {zoom.toFixed(1)}x</p>
        <p className="text-mc-xp">Light: 15 (15 sky, 0 block)</p>
      </div>

      {/* Floating Map Zoom & Toggle Controls */}
      <div className="absolute right-4 top-4 z-40 flex flex-col gap-2">
        <button 
          onClick={() => {
            const map = leafletMap.current;
            if (map) map.zoomIn();
          }} 
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer font-bold text-base"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            const map = leafletMap.current;
            if (map) map.zoomOut();
          }} 
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer font-bold text-base"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            const map = leafletMap.current;
            if (map) map.setView([12.9716, 77.5946], 13);
          }} 
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
          title="Reset View"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowGridOverlay(!showGridOverlay)} 
          className={`mc-btn size-10 flex items-center justify-center cursor-pointer ${showGridOverlay ? 'mc-btn-green' : 'mc-btn-dark'}`}
          title="Toggle Grid Overlay"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Main Map Container styled as a modern subtle pixel-frame map */}
      <div className="relative flex-1 m-4 mt-20 bg-[#161a24] border-4 border-slate-700/60 shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Leaflet DOM Node target */}
        <div ref={mapRef} className="w-full h-full relative z-0" />

        {/* Soft grid lines for map coordinates */}
        {showGridOverlay && (
          <div className="absolute inset-0 bg-transparent opacity-[0.05] bg-[linear-gradient(to_right,#55ff55_1px,transparent_1px),linear-gradient(to_bottom,#55ff55_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10" />
        )}

        {/* Outer overlay vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45))] pointer-events-none z-20" />

        {/* Search Overlay styled as Chat Box Command Line */}
        <div className="absolute bottom-24 left-4 right-4 z-35 max-w-md mx-auto">
          <form onSubmit={handleSearchSubmit} className="flex w-full items-stretch bg-black/85 border border-slate-700 h-10 shadow-2xl">
            <div className="text-mc-gold flex items-center justify-center pl-3">
              <Terminal className="size-4" />
              <span className="font-pixel text-[8px] ml-1.5">/scan</span>
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex w-full flex-1 border-none bg-transparent text-slate-100 focus:ring-0 focus:outline-none placeholder:text-slate-600 px-3 text-xs font-mono font-bold" 
              placeholder="Search: Cubbon Park, Indiranagar, Ulsoor..."
            />
            <button type="submit" className="flex items-center px-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
              <Search className="size-4" />
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
                <h3 className="font-pixel text-[10px] text-white mt-1.5 leading-none">Bengaluru HQ, KA</h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="h-2 w-2 bg-mc-xp border border-black rounded-sm"></span>
                  <span className="text-[8px] font-pixel text-mc-xp">XP Boost: 2.4x</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onDeploy}
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
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'allies' ? 'mc-btn-green' : 'mc-btn-dark'
          }`}
        >
          <span className="size-2 bg-white rounded-sm"></span>
          Allies
        </button>
        <button 
          onClick={() => setActiveFilter('rivals')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'rivals' ? 'mc-btn-red' : 'mc-btn-dark'
          }`}
        >
          <span className="size-2 bg-black/40 rounded-sm"></span>
          Rivals
        </button>
        <button 
          onClick={() => setActiveFilter('neutral')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'neutral' ? 'mc-btn-gold' : 'mc-btn-dark'
          }`}
        >
          <span className="size-2 bg-slate-500 rounded-sm"></span>
          Neutral
        </button>
        <button 
          onClick={() => setActiveFilter('all')}
          className={`mc-btn px-4 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'all' ? 'mc-btn-green border-mc-gold' : 'mc-btn-dark'
          }`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
