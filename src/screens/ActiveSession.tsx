import React, { useEffect, useRef, useState } from 'react';
import { X, Settings, Crosshair, Layers, Pause, Play, Square, Compass, Clock, Map as MapIcon, Footprints, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import L from 'leaflet';

// Pixel Art Heart Component
function PixelHeart({ full = true }: { full?: boolean; key?: any }) {
  return (
    <svg className="size-5 pixelated drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" viewBox="0 0 9 9" fill="none">
      <path d="M1 2h1V1h2v1h1V1h2v1h1v2h-1v1h-1v1h-1v1h-1V6H3V5H2V4H1V2z" fill="#000000" />
      {full ? (
        <>
          <path d="M2 2h1v1H2V2z" fill="#ffffff" /> {/* Highlight */}
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

// Pixel Art Hunger (Drumstick) Component
function PixelHunger() {
  return (
    <span className="text-lg filter drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] select-none">🍗</span>
  );
}

interface ActiveSessionProps {
  onStop: () => void;
}

export function ActiveSession({ onStop }: ActiveSessionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);

  // Timer and telemetry states
  const [seconds, setSeconds] = useState(2535); // Start at 42 mins 15 secs
  const [isPaused, setIsPaused] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(true);

  // Active Redstone Run Path Coordinates (loop around Cubbon Park area)
  const runCoordinates: L.LatLngTuple[] = [
    [12.9750, 77.5910],
    [12.9770, 77.5950],
    [12.9730, 77.5990],
    [12.9710, 77.5940],
    [12.9720, 77.5900],
    [12.9750, 77.5910]
  ];
  
  const [playerCoordsIndex, setPlayerCoordsIndex] = useState(3); // Start near 12.9710, 77.5940

  // 1. Telemetry Clock logic
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // 2. Leaflet Map initialization
  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(runCoordinates[playerCoordsIndex], 14);

    leafletMap.current = map;

    // Add CartoDB Dark Matter tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      minZoom: 10
    }).addTo(map);

    // Draw redstone run path overlay
    L.polyline(runCoordinates, {
      color: '#ef4444',
      weight: 4,
      dashArray: '5, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Custom glowing player beacon divIcon
    const playerPin = L.divIcon({
      html: `<div class="relative flex items-center justify-center size-8">
               <div class="absolute inset-0 bg-red-600/30 rounded-full animate-ping"></div>
               <div class="absolute size-3.5 bg-red-500 border border-black rounded-sm shadow-[0_0_6px_rgba(239,68,68,0.85)]"></div>
             </div>`,
      className: 'custom-session-player',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(runCoordinates[playerCoordsIndex], { icon: playerPin }).addTo(map);
    playerMarkerRef.current = marker;

    // Add landmark pins
    const soudhaIcon = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center">
               <span class="text-base">🏛️</span>
               <div class="px-1.5 py-0.5 bg-black/85 border border-slate-700 text-[6px] font-mono text-white whitespace-nowrap rounded">Vidhana Soudha</div>
             </div>`,
      className: 'landmark-session-icon',
      iconSize: [60, 30],
      iconAnchor: [30, 15]
    });

    const metroIcon = L.divIcon({
      html: `<div class="flex flex-col items-center justify-center">
               <span class="text-base">🚇</span>
               <div class="px-1.5 py-0.5 bg-black/85 border border-slate-700 text-[6px] font-mono text-white whitespace-nowrap rounded">MG Road Metro</div>
             </div>`,
      className: 'landmark-session-icon',
      iconSize: [60, 30],
      iconAnchor: [30, 15]
    });

    L.marker([12.9750, 77.5910], { icon: soudhaIcon }).addTo(map);
    L.marker([12.9730, 77.5990], { icon: metroIcon }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  // 3. Simulating player movement along GPS track
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setPlayerCoordsIndex(prev => {
        const nextIndex = (prev + 1) % runCoordinates.length;
        if (playerMarkerRef.current) {
          playerMarkerRef.current.setLatLng(runCoordinates[nextIndex]);
        }
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Map Controls
  const handleZoomIn = () => leafletMap.current?.zoomIn();
  const handleZoomOut = () => leafletMap.current?.zoomOut();
  const handleReset = () => leafletMap.current?.setView(runCoordinates[playerCoordsIndex], 14);
  const handleCenter = () => leafletMap.current?.setView(runCoordinates[playerCoordsIndex], leafletMap.current.getZoom());

  // Helper formatting functions
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Simulating live ticks
  const distance = (5.24 + (seconds - 2535) * 0.0015).toFixed(2);
  const pace = `8'${(5 + (seconds % 3)).toString().padStart(2, '0')}"`;
  const altitude = 142 + (seconds % 4);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#141414] overflow-hidden text-slate-200">
      
      {/* Top Bar (Escape Menu Header) */}
      <div className="flex items-center bg-[#212121] p-4 border-b-4 border-mc-stone justify-between z-10">
        <button onClick={onStop} className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[8px] text-mc-gold drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] uppercase">Session Active</span>
          <h2 className="font-pixel text-[11px] text-white mt-1 leading-none">Quest Infiltration</h2>
        </div>
        <button className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Metrics Grid styled as Inventory Hotbar slots */}
      <div className="grid grid-cols-2 gap-3 p-4 shrink-0">
        {/* Metric 1: Time */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Clock className={`w-5 h-5 text-mc-sky ${isPaused ? '' : 'animate-pulse'}`} />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Time</p>
            <p className="font-pixel-tall text-xl text-mc-sky mt-1 leading-none">{formatTime(seconds)}</p>
          </div>
        </div>

        {/* Metric 2: Distance */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Compass className="w-5 h-5 text-mc-gold" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Distance</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {distance} <span className="text-xs font-sans text-slate-500">km</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Pace */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Footprints className="w-5 h-5 text-mc-grass" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Pace</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {pace} <span className="text-xs font-sans text-slate-500">/km</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Altitude */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex items-center gap-3">
          <div className="size-11 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <MapIcon className="w-5 h-5 text-mc-stone" />
          </div>
          <div>
            <p className="font-pixel text-[8px] text-slate-400 uppercase">Altitude</p>
            <p className="font-pixel-tall text-xl text-white mt-1 leading-none">
              {altitude} <span className="text-xs font-sans text-slate-500">m</span>
            </p>
          </div>
        </div>
      </div>

      {/* Map Section with Zoomable Vector Street map & Redstone Path */}
      <div className="flex px-4 py-2 relative flex-1 min-h-[220px]">
        
        {/* Floating Session Map Controls */}
        <div className="absolute right-8 top-4 z-40 flex flex-col gap-2">
          <button 
            onClick={handleZoomIn} 
            className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer font-bold text-base"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleZoomOut} 
            className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer font-bold text-base"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleReset} 
            className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-full h-full bg-[#161a24] border-4 border-slate-700/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden relative">
          
          {/* Leaflet DOM Node target */}
          <div ref={mapRef} className="w-full h-full relative z-0" />

          {/* Soft Grid Lines */}
          {showGridOverlay && (
            <div className="absolute inset-0 bg-transparent opacity-[0.05] bg-[linear-gradient(to_right,#ef4444_1px,transparent_1px),linear-gradient(to_bottom,#ef4444_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10" />
          )}
          
          {/* Vignette effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.35))] pointer-events-none z-20" />

          {/* Floating Map HUD tools */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
            <button 
              onClick={handleCenter}
              className="mc-btn mc-btn-dark size-9 flex items-center justify-center cursor-pointer"
              title="Center on Player"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowGridOverlay(!showGridOverlay)}
              className={`mc-btn size-9 flex items-center justify-center cursor-pointer ${showGridOverlay ? 'mc-btn-green' : 'mc-btn-dark'}`}
              title="Toggle Grid Overlay"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Minecraft Survival HUD Overlay (Hearts, hunger, XP) */}
      <div className="p-4 bg-[#212121] border-t-4 border-mc-stone shrink-0 flex flex-col gap-3">
        {/* Status bars row */}
        <div className="flex flex-row items-center justify-between gap-4 max-w-md mx-auto w-full px-1">
          {/* Hearts Health bar */}
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <PixelHeart key={i} full={i < 10} />
            ))}
          </div>

          {/* Hunger Drumsticks bar */}
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <PixelHunger key={i} />
            ))}
          </div>
        </div>

        {/* XP Level Status (Circuit Alpha loop tracker) */}
        <div className="max-w-md mx-auto w-full flex flex-col gap-1">
          <div className="flex justify-between items-center text-[8px] font-pixel text-slate-400">
            <span>Cubbon Park Circuit</span>
            <span>{isPaused ? 'Quest Paused' : '1.2km to completion'}</span>
          </div>

          {/* Green XP Progression Bar */}
          <div className="relative h-4 w-full bg-[#111111] border-2 border-mc-stone overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-[#55ff55] border-r-2 border-[#3fbf3f]" style={{ width: "75%" }}></div>
            <div className="absolute inset-0 flex items-center justify-center font-pixel text-[8px] text-white font-bold drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)]">
              Level 3 [75%]
            </div>
          </div>
        </div>

        {/* Escape Menu Action Buttons */}
        <div className="flex gap-4 max-w-sm mx-auto w-full mt-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
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
            onClick={onStop}
            className="flex-1 mc-btn mc-btn-red py-3.5 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Save & Quit
          </button>
        </div>
      </div>
      
    </div>
  );
}
