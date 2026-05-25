import { useState } from 'react';
import { Shield, Bell, Grid, Castle, Swords, Expand, Play, Activity, X } from 'lucide-react';
import { Sector } from '../data/mockDb';

interface TerritoryViewProps {
  sectors: Sector[];
  stamina: number;
  onStartConquest: () => void;
  onNavigate: (tab: string) => void;
  onFortify: (sectorId: string) => void;
}

export function TerritoryView({ sectors, stamina, onStartConquest, onNavigate, onFortify }: TerritoryViewProps) {
  // Find individual sectors from database array
  const sector7G = sectors.find(s => s.id === '7G') || sectors[0];
  const sunsetHeights = sectors.find(s => s.id === 'heights') || sectors[1];
  const ulsoorLake = sectors.find(s => s.id === 'ulsoor') || sectors[2];

  // Modal / overlay states
  const [selectedDetails, setSelectedDetails] = useState<'none' | '7G' | 'heights' | 'ulsoor'>('none');
  const [showNotifications, setShowNotifications] = useState(false);

  // Helper to get durability bar width and color based on health percentage
  const getDurabilityStyle = (health: number) => {
    const width = `${health}%`;
    let color = 'bg-mc-grass'; // >70% is Green
    if (health < 30) {
      color = 'bg-mc-red'; // <30% is Red
    } else if (health < 70) {
      color = 'bg-mc-gold'; // 30-70% is Gold/Yellow
    }
    return { width, color };
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-28 bg-[#141414] text-slate-200">
      {/* Header Section (Chest Title Bar) */}
      <header className="sticky top-0 z-40 flex items-center bg-[#212121] p-4 justify-between border-b-4 border-mc-stone">
        <div className="flex items-center gap-3">
          <div className="text-mc-gold flex size-11 items-center justify-center mc-slot-inset">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-pixel text-white leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Sectors Chest</h1>
            <p className="text-[9px] font-pixel text-slate-400 mt-1.5">TERRARUN GLOBAL INVENTORY</p>
          </div>
        </div>
        <button 
          onClick={() => setShowNotifications(true)}
          className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
        >
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Stats Overview styled as Chest Inventory Grid slots */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {/* Regions */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex flex-col items-center text-center">
          <div className="size-11 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Grid className="w-6 h-6 text-mc-grass" />
          </div>
          <p className="font-pixel text-[8px] text-slate-400 uppercase mt-2">Chunks</p>
          <p className="font-pixel-tall text-2xl text-white mt-1">12</p>
          <p className="text-[9px] font-pixel text-mc-grass mt-1">+2</p>
        </div>
        
        {/* Forts */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex flex-col items-center text-center">
          <div className="size-11 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Castle className="w-6 h-6 text-mc-stone" />
          </div>
          <p className="font-pixel text-[8px] text-slate-400 uppercase mt-2">Forts</p>
          <p className="font-pixel-tall text-2xl text-white mt-1">8</p>
          <p className="text-[9px] font-pixel text-slate-400 mt-1">Lvl 4</p>
        </div>
        
        {/* Contests */}
        <div className="mc-panel p-3 bg-[#2d2d2d] flex flex-col items-center text-center border-mc-red">
          <div className="size-11 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
            <Swords className="w-6 h-6 text-mc-red animate-pulse" />
          </div>
          <p className="font-pixel text-[8px] text-slate-400 uppercase mt-2">Sieges</p>
          <p className="font-pixel-tall text-2xl text-mc-red mt-1">3</p>
          <p className="text-[9px] font-pixel text-mc-red mt-1 animate-pulse">WAR!</p>
        </div>
      </div>

      {/* Map Quick Look styled as a Map in a Wooden Item Frame */}
      <div className="px-4 pb-2">
        <div className="relative h-44 w-full bg-[#1e2230] border-4 border-slate-700/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80" 
            className="absolute inset-0 w-full h-full object-cover opacity-35 grayscale pixelated"
            alt="Item Frame Map"
          />
          {/* Soft grid lines for map coordinates */}
          <div className="absolute inset-0 bg-transparent opacity-10 bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10"></div>
          
          <div className="absolute bottom-3 left-3 z-20">
            <div className="bg-[#2e2e2e] border-2 border-mc-stone px-2 py-1 font-pixel text-[8px] text-white">
              MAP ITEM #12
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate('map')}
            className="absolute bottom-3 right-3 mc-btn mc-btn-dark size-9 flex items-center justify-center z-20"
            title="Expand Map"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Owned Sectors Grid */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <h2 className="font-pixel text-[10px] text-slate-300 uppercase tracking-wider">Storage Contents</h2>
          <span className="font-pixel text-[7px] text-mc-gold mt-1">Stamina (HP): {stamina} available</span>
        </div>
        <button 
          onClick={() => onNavigate('leaderboard')}
          className="text-mc-gold font-pixel text-[9px] hover:underline cursor-pointer"
        >
          Catalog View
        </button>
      </div>
      
      <div className="flex flex-col gap-4 px-4">
        {/* Sector 1: Stable */}
        <div className="mc-panel p-4 flex flex-col gap-3 bg-[#2d2d2d] border border-slate-700">
          <div className="flex gap-4 items-start">
            {/* Slot Inset with Durability Bar */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="size-16 mc-slot-inset flex items-center justify-center p-1 bg-[#1a1a1a]">
                <img 
                  src={sector7G.imageUrl} 
                  className="size-full object-cover pixelated"
                  alt="Sector 7G Grass block"
                />
              </div>
              {/* Minecraft Durability Indicator */}
              <div className="h-2 w-16 bg-black border border-slate-700 rounded-sm overflow-hidden p-0.5">
                <div 
                  className={`h-full ${getDurabilityStyle(sector7G.health).color}`} 
                  style={{ width: getDurabilityStyle(sector7G.health).width }}
                ></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-pixel text-[11px] text-white leading-none">Sector 7G</h4>
                  <p className="text-slate-400 text-xs mt-1.5 font-mono">Last Run: {sector7G.lastRun}</p>
                </div>
                {/* Potion status effects representation */}
                <div className="flex items-center gap-1 bg-mc-dark border border-slate-700 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 bg-mc-grass rounded-full animate-ping"></span>
                  <span className="font-pixel text-[7px] text-mc-grass">{sector7G.statusEffect}</span>
                </div>
              </div>
              <div className="flex justify-between mt-2.5 font-pixel text-[8px] text-slate-400">
                <span>Health: {sector7G.health}%</span>
                <span>Decay: -{sector7G.decayRate}%/d</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button 
              onClick={() => onFortify(sector7G.id)}
              className="mc-btn mc-btn-green py-2 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Fortify (cost 1 HP)
            </button>
            <button 
              onClick={() => setSelectedDetails('7G')}
              className="mc-btn mc-btn-dark py-2 text-[9px] uppercase cursor-pointer"
            >
              Details
            </button>
          </div>
        </div>

        {/* Sector 2: Contested Under Siege */}
        <div className="mc-panel p-4 flex flex-col gap-3 bg-[#33221a] border-2 border-mc-red/45 shadow-[inset_0_0_12px_rgba(239,68,68,0.15)]">
          <div className="flex gap-4 items-start">
            {/* Slot Inset with Durability Bar */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="size-16 mc-slot-inset border-mc-red flex items-center justify-center p-1 bg-[#1a1a1a]">
                <img 
                  src={sunsetHeights.imageUrl} 
                  className="size-full object-cover pixelated"
                  alt="Sunset Heights Nether block"
                />
              </div>
              {/* Minecraft Durability Indicator */}
              <div className="h-2 w-16 bg-black border border-slate-700 rounded-sm overflow-hidden p-0.5">
                <div 
                  className={`h-full ${getDurabilityStyle(sunsetHeights.health).color}`} 
                  style={{ width: getDurabilityStyle(sunsetHeights.health).width }}
                ></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-pixel text-[11px] text-mc-red leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">Sunset Heights</h4>
                  <p className="text-mc-gold text-[9px] mt-1.5 font-pixel leading-normal">Seized by: Speed_99</p>
                </div>
                {/* Potion status effects representation */}
                <div className="flex items-center gap-1 bg-mc-dark border border-mc-red/40 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 bg-mc-red rounded-full animate-pulse"></span>
                  <span className="font-pixel text-[7px] text-mc-red">{sunsetHeights.statusEffect}</span>
                </div>
              </div>
              <div className="flex justify-between mt-2.5 font-pixel text-[8px] text-mc-red">
                <span>Health: {sunsetHeights.health}%</span>
                <span className="animate-pulse">6h remaining</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button 
              onClick={onStartConquest}
              className="mc-btn mc-btn-red py-2 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" /> Defend
            </button>
            <button 
              onClick={() => setSelectedDetails('heights')}
              className="mc-btn mc-btn-dark py-2 text-[9px] uppercase cursor-pointer"
            >
              Log File
            </button>
          </div>
        </div>

        {/* Sector 3: Decaying */}
        <div className="mc-panel p-4 flex flex-col gap-3 bg-[#2d2d2d] border border-slate-700 opacity-75">
          <div className="flex gap-4 items-start">
            {/* Slot Inset with Durability Bar */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="size-16 mc-slot-inset flex items-center justify-center p-1 bg-[#1a1a1a]">
                <img 
                  src={ulsoorLake.imageUrl} 
                  className="size-full object-cover pixelated"
                  alt="Oceanic Pier stone block"
                />
              </div>
              {/* Minecraft Durability Indicator */}
              <div className="h-2 w-16 bg-black border border-slate-700 rounded-sm overflow-hidden p-0.5">
                <div 
                  className={`h-full ${getDurabilityStyle(ulsoorLake.health).color}`} 
                  style={{ width: getDurabilityStyle(ulsoorLake.health).width }}
                ></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-pixel text-[11px] text-slate-300 leading-none">Ulsoor Lake</h4>
                  <p className="text-slate-400 text-xs mt-1.5 font-mono">Last Run: {ulsoorLake.lastRun}</p>
                </div>
                {/* Potion status effects representation */}
                <div className="flex items-center gap-1 bg-mc-dark border border-slate-700 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 bg-slate-500 rounded-full"></span>
                  <span className="font-pixel text-[7px] text-slate-400">{ulsoorLake.statusEffect}</span>
                </div>
              </div>
              <div className="flex justify-between mt-2.5 font-pixel text-[8px] text-slate-400">
                <span>Health: {ulsoorLake.health}%</span>
                <span>Decay: -{ulsoorLake.decayRate}%/d</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button 
              onClick={onStartConquest}
              className="mc-btn mc-btn-green py-2 text-[9px] uppercase cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Reclaim Route
            </button>
            <button 
              onClick={() => setSelectedDetails('ulsoor')}
              className="mc-btn mc-btn-dark py-2 text-[9px] uppercase cursor-pointer"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Details Popup Modal */}
      {selectedDetails !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                📂 Sector Registry Ledger
              </h3>
              <button onClick={() => setSelectedDetails('none')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 font-mono text-xs text-slate-300">
              {selectedDetails === '7G' && (
                <>
                  <p><span className="text-mc-gold">Sector:</span> {sector7G.name}</p>
                  <p><span className="text-mc-gold">Coordinates:</span> {sector7G.lat.toFixed(4)}° N / {sector7G.lon.toFixed(4)}° E</p>
                  <p><span className="text-mc-gold">Owner:</span> Allies (Blue Vanguard faction)</p>
                  <p><span className="text-mc-gold">Status:</span> SECURED ({sector7G.statusEffect} active)</p>
                  <p><span className="text-mc-gold">Registry Notes:</span> {sector7G.details}</p>
                </>
              )}
              {selectedDetails === 'heights' && (
                <>
                  <p><span className="text-mc-gold">Sector:</span> {sunsetHeights.name}</p>
                  <p><span className="text-mc-gold">Coordinates:</span> {sunsetHeights.lat.toFixed(4)}° N / {sunsetHeights.lon.toFixed(4)}° E</p>
                  <p><span className="text-mc-gold">Owner:</span> Rivals (Speed_99 faction)</p>
                  <p><span className="text-mc-gold">Status:</span> UNDER SIEGE ({sunsetHeights.statusEffect} active)</p>
                  <p><span className="text-mc-gold">Threat Details:</span> {sunsetHeights.details}</p>
                </>
              )}
              {selectedDetails === 'ulsoor' && (
                <>
                  <p><span className="text-mc-gold">Sector:</span> {ulsoorLake.name}</p>
                  <p><span className="text-mc-gold">Coordinates:</span> {ulsoorLake.lat.toFixed(4)}° N / {ulsoorLake.lon.toFixed(4)}° E</p>
                  <p><span className="text-mc-gold">Owner:</span> Neutral</p>
                  <p><span className="text-mc-gold">Status:</span> DECAYING ({ulsoorLake.statusEffect} active)</p>
                  <p><span className="text-mc-gold">Capture Ledger:</span> {ulsoorLake.details}</p>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => setSelectedDetails('none')}
                className="flex-1 mc-btn py-3 text-[9px] uppercase cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => { setSelectedDetails('none'); onNavigate('map'); }}
                className="flex-1 mc-btn mc-btn-green py-3 text-[9px] uppercase cursor-pointer"
              >
                Inspect Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                🔔 Sector Alerts
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              <div className="p-2 border border-slate-700 bg-black/40 rounded text-left animate-pulse">
                <p className="text-[10px] font-pixel text-mc-red mb-1 leading-normal">Sector Attacked!</p>
                <p className="text-xs text-slate-400 font-mono">Sunset Heights is under siege. Defend now!</p>
              </div>
              <div className="p-2 border border-slate-700 bg-black/40 rounded text-left">
                <p className="text-[10px] font-pixel text-slate-300 mb-1 leading-normal">Decay Warning</p>
                <p className="text-xs text-slate-400 font-mono">Ulsoor Lake health is dropping below 65%.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowNotifications(false)}
              className="w-full mc-btn py-3 text-[9px] uppercase cursor-pointer mt-4"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
