import { useState } from 'react';
import { Settings, Bell, Shield, Map as MapIcon, Map, X, User, LogOut, Compass, Clock, Zap, MessageSquare } from 'lucide-react';
import { UserProfile, AlertNotification, DashboardCapture } from '../data/mockDb';

interface DashboardProps {
  user: UserProfile;
  alerts: AlertNotification[];
  recentActivity: DashboardCapture[];
  onStartConquest: () => void;
  onNavigate: (tab: string) => void;
  onAddSupportRequest: (sectorId: string, requestType: 'reinforcements' | 'repair' | 'bug_report', description: string) => void;
  onDeleteAlert: (alertId: string) => void;
}

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

// Pixel Art Armor (Chestplate) Component
function PixelArmor({ full = true }: { full?: boolean; key?: any }) {
  return (
    <svg className="size-5 pixelated drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" viewBox="0 0 9 9" fill="none">
      <path d="M2 1h5v1H2V1z M1 2h7v1H1V2z M1 3h7v1H1V3z M2 4h5v1H2V4z M2 5h5v1H2V5z M3 6h3v1H3V6z M3 7h3v1H3V7z" fill="#000000" />
      {full ? (
        <>
          <path d="M3 2h3v1H3V2z M2 3h5v2H2V3z M3 5h3v2H3V5z" fill="#e1e1e1" />
          <path d="M2 2h1v1H2V2z M3 3h1v1H3V3z" fill="#ffffff" /> {/* Highlights */}
          <path d="M6 2h1v1H6V2z M5 3h1v1H5V3z" fill="#b5b5b5" /> {/* Shadows */}
        </>
      ) : (
        <>
          <path d="M3 2h3v1H3V2z M2 3h5v2H2V3z M3 5h3v2H3V5z" fill="#555555" />
          <path d="M6 2h1v1H6V2z M5 3h1v1H5V3z" fill="#3c3c3c" />
        </>
      )}
    </svg>
  );
}

export function Dashboard({ 
  user, 
  alerts, 
  recentActivity, 
  onStartConquest, 
  onNavigate,
  onAddSupportRequest,
  onDeleteAlert
}: DashboardProps) {
  const [activeMenu, setActiveMenu] = useState<'none' | 'settings' | 'notifications'>('none');
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Support Request modal states
  const [beaconSector, setBeaconSector] = useState('heights');
  const [beaconType, setBeaconType] = useState<'reinforcements' | 'repair' | 'bug_report'>('reinforcements');
  const [beaconDesc, setBeaconDesc] = useState('');

  // Daily quest streak calculation
  const streakValue = user.stats.streak;
  const streakMax = 30;
  const xpPercent = Math.min((streakValue / streakMax) * 100, 100);

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden min-h-screen pb-28 relative bg-[#141414] text-slate-200">
      {/* Top Nav (Furnace / Interface Header look) */}
      <nav className="flex items-center bg-[#212121] sticky top-0 z-40 p-4 border-b-4 border-mc-stone justify-between">
        <div className="flex size-11 items-center justify-center mc-slot-inset">
          <Compass className="w-6 h-6 text-mc-gold animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <h2 className="text-mc-gold font-pixel text-sm tracking-wide flex-1 ml-3 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">STRIDE QUEST</h2>
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setActiveMenu(activeMenu === 'notifications' ? 'none' : 'notifications')}
            className={`mc-btn-dark size-10 flex items-center justify-center ${activeMenu === 'notifications' ? 'mc-btn-gold' : ''}`}
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2 bg-mc-red border border-black rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')}
            className={`mc-btn-dark size-10 flex items-center justify-center ${activeMenu === 'settings' ? 'mc-btn-gold' : ''}`}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Notifications Dropdown (Styled as Minecraft Tooltip box) */}
          {activeMenu === 'notifications' && (
            <div className="absolute top-12 right-0 w-72 mc-tooltip shadow-2xl overflow-hidden z-50 p-3 bg-black/95">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50 mb-2">
                <h3 className="font-pixel text-[10px] text-mc-gold">Alerts</h3>
                <button onClick={() => setActiveMenu('none')} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <p className="text-[8px] font-pixel text-slate-500 text-center py-4">No active alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-2 border border-slate-700 bg-black/40 hover:bg-black/60 rounded flex items-center justify-between gap-3 text-left transition-colors w-full"
                    >
                      <div className="flex-1">
                        <p className={`text-[10px] font-pixel mb-1 leading-normal ${
                          alert.type === 'siege' ? 'text-mc-red' : alert.type === 'decay' ? 'text-mc-gold' : 'text-mc-grass'
                        }`}>{alert.title}</p>
                        <p className="text-xs text-slate-400 font-mono leading-snug">{alert.message}</p>
                        <span className="text-[7px] text-slate-600 font-mono mt-1 block">{alert.time}</span>
                      </div>
                      <button 
                        onClick={() => onDeleteAlert(alert.id)}
                        className="text-slate-500 hover:text-white cursor-pointer p-1 shrink-0"
                        title="Dismiss Alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Dropdown (Styled as Minecraft Tooltip box) */}
          {activeMenu === 'settings' && (
            <div className="absolute top-12 right-0 w-64 mc-tooltip shadow-2xl overflow-hidden z-50 p-2 bg-black/95">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50 mb-1">
                <h3 className="font-pixel text-[10px] text-mc-gold">⚙ Command Settings</h3>
                <button onClick={() => setActiveMenu('none')} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Group: Account */}
              <p className="font-pixel text-[7px] text-slate-600 uppercase tracking-widest px-2 mt-1 mb-0.5">Account</p>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => { setActiveMenu('none'); onNavigate('profile'); }} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <User className="w-4 h-4 text-mc-gold" /> Agent Profile
                </button>
                <button onClick={() => { setActiveMenu('none'); onNavigate('profile'); }} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <Shield className="w-4 h-4 text-mc-sky" /> Change Faction
                </button>
              </div>

              {/* Group: Gameplay */}
              <div className="h-0.5 bg-purple-950/60 my-1.5" />
              <p className="font-pixel text-[7px] text-slate-600 uppercase tracking-widest px-2 mb-0.5">Gameplay</p>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => setActiveMenu('none')} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <Bell className="w-4 h-4 text-mc-grass" /> Notification Alerts
                </button>
                <button onClick={() => setActiveMenu('none')} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <Zap className="w-4 h-4 text-mc-gold" /> Sound &amp; Haptics
                </button>
                <button onClick={() => setActiveMenu('none')} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <Map className="w-4 h-4 text-mc-sky" /> Map Display Mode
                </button>
              </div>

              {/* Group: Support */}
              <div className="h-0.5 bg-purple-950/60 my-1.5" />
              <p className="font-pixel text-[7px] text-slate-600 uppercase tracking-widest px-2 mb-0.5">Support</p>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => { setActiveMenu('none'); setShowSupportModal(true); }} className="flex items-center gap-3 p-2 text-xs font-pixel text-slate-300 hover:bg-white/10 rounded transition-colors text-left w-full cursor-pointer">
                  <MessageSquare className="w-4 h-4 text-mc-gold" /> Support Beacon
                </button>
                <button onClick={() => setActiveMenu('none')} className="flex items-center gap-3 p-2 text-xs font-pixel text-mc-red hover:bg-red-950/20 rounded transition-colors text-left w-full cursor-pointer">
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Container styled as Minecraft Inventory Box */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col gap-6">
        {/* Profile Card Header */}
        <header className="mc-panel p-4 flex flex-col sm:flex-row gap-4 items-center relative overflow-hidden bg-[#2d2d2d] border-2 border-mc-stone">
          {/* Voxel grid pattern top border */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-mc-grass border-b-2 border-mc-stone"></div>
          
          <div className="relative mt-2 shrink-0">
            <div className="size-20 mc-slot-inset flex items-center justify-center p-1 bg-[#1a1a1a]">
              <img 
                src="https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=150&h=150&fit=crop" 
                className="size-full object-cover pixelated"
                alt="Agent Skin"
              />
            </div>
            {/* Level Bubble */}
            <div className="absolute -bottom-2 -right-2 bg-[#1b1b1b] border-2 border-mc-stone px-2 py-0.5 font-pixel text-[9px] text-mc-xp font-bold drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
              XP {user.level}
            </div>
          </div>
          
          <div className="flex flex-col text-center sm:text-left gap-1">
            <h1 className="text-xl font-pixel text-white leading-tight drop-shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center sm:justify-start gap-2">
              {user.username}
            </h1>
            <p className="text-slate-400 text-xs font-mono">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-slate-700 rounded font-pixel text-[9px] text-mc-gold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" /> {user.faction}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex h-2.5 w-2.5 bg-mc-xp animate-pulse border border-black rounded-sm"></span>
                <span className="text-slate-400 text-[10px] font-pixel uppercase tracking-widest">Sector Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Minecraft Health and Armor HUD Bars */}
        <section className="mc-panel p-4 flex flex-col gap-3 bg-[#2d2d2d] border border-slate-700">
          <h3 className="font-pixel text-[10px] text-slate-400 uppercase tracking-widest mb-1">Survival Status</h3>
          <div className="flex flex-col gap-4 bg-black/35 p-3 border-2 border-slate-800">
            {/* Health Bar — Stamina */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-pixel text-[9px] text-slate-300">Stamina (Hearts)</span>
                <span className="font-mono text-slate-400">{user.stats.stamina} / 10 HP</span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <PixelHeart key={i} full={i < user.stats.stamina} />
                ))}
              </div>
              {/* Context tooltip */}
              <p className="font-pixel text-[7px] text-slate-500 leading-relaxed mt-0.5">
                ❤ Hearts represent your <span className="text-mc-gold">physical stamina</span>. Each quest run
                restores +2 HP. Fortifying a sector costs 1 HP. At 0 HP you cannot deploy
                until you complete a recovery run.
              </p>
            </div>

            <div className="h-px bg-slate-700/60" />

            {/* Armor Bar — Territory Defense */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-pixel text-[9px] text-slate-300">Territory (Defense)</span>
                <span className="font-mono text-slate-400">{user.stats.armor} / 10 AP</span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <PixelArmor key={i} full={i < user.stats.armor} />
                ))}
              </div>
              {/* Context tooltip */}
              <p className="font-pixel text-[7px] text-slate-500 leading-relaxed mt-0.5">
                🛡 Armor Points reflect your <span className="text-mc-sky">territory defense strength</span>.
                Each tile you capture adds +1 AP. Rivals attacking your zones drain AP over time.
                High AP slows enemy tile decay — defend your turf!
              </p>
            </div>
          </div>

          {/* Minecraft XP Bar (Streak metric) */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[9px] text-slate-300">Daily Quest Streak</span>
              <span className="font-pixel text-[9px] text-mc-xp">{streakValue} DAYS</span>
            </div>
            {/* The XP Level Indicator Bar */}
            <div className="relative h-4 w-full bg-[#111111] border-2 border-mc-stone overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-[#55ff55] border-r-2 border-[#3fbf3f] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]" 
                style={{ width: `${xpPercent}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center font-pixel text-[9px] text-white font-bold drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)]">
                {streakValue} / {streakMax}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid styled as Inventory Items Slots */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Total Distance */}
          <div className="mc-panel p-4 flex items-center gap-3 bg-[#2d2d2d] border-2 border-mc-stone">
            <div className="size-12 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
              <Compass className="w-7 h-7 text-mc-gold" />
            </div>
            <div className="flex flex-col">
              <p className="text-[9px] font-pixel text-slate-400 uppercase tracking-wider">Distance</p>
              <p className="font-pixel-tall text-2xl text-white mt-0.5 leading-none">{user.stats.distance} <span className="text-xs font-sans text-slate-500">KM</span></p>
            </div>
          </div>

          {/* Stat 2: Land Captured */}
          <div className="mc-panel p-4 flex items-center gap-3 bg-[#2d2d2d] border-2 border-mc-stone">
            <div className="size-12 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
              <MapIcon className="w-7 h-7 text-mc-grass" />
            </div>
            <div className="flex flex-col">
              <p className="text-[9px] font-pixel text-slate-400 uppercase tracking-wider">Captured</p>
              <p className="font-pixel-tall text-2xl text-white mt-0.5 leading-none">{user.stats.capturedArea} <span className="text-xs font-sans text-slate-500">KM²</span></p>
            </div>
          </div>

          {/* Stat 3: Active Streak */}
          <div className="mc-panel p-4 flex items-center gap-3 bg-[#2d2d2d] border-2 border-mc-stone">
            <div className="size-12 shrink-0 mc-slot-inset flex items-center justify-center bg-[#1a1a1a]">
              <Clock className="w-7 h-7 text-mc-sky" />
            </div>
            <div className="flex flex-col">
              <p className="text-[9px] font-pixel text-slate-400 uppercase tracking-wider">Streak</p>
              <p className="font-pixel-tall text-2xl text-white mt-0.5 leading-none">{user.stats.streak} <span className="text-xs font-sans text-slate-500">DAYS</span></p>
            </div>
          </div>
        </section>

        {/* Main CTA Button: Start Conquest */}
        <section className="py-2">
          <button 
            onClick={onStartConquest}
            className="w-full mc-btn mc-btn-green h-16 text-xs sm:text-sm tracking-widest uppercase cursor-pointer"
          >
            Start Conquest
          </button>
        </section>

        {/* Recent Captures */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-pixel text-[10px] text-slate-300 uppercase tracking-widest">Recent Loot</h3>
            <button onClick={() => onNavigate('map')} className="mc-btn mc-btn-dark px-3 py-1.5 text-[9px] uppercase cursor-pointer flex items-center gap-1">
              <MapIcon className="w-3 h-3" /> Map log
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {recentActivity.map((capture, i) => (
              <button 
                key={i} 
                onClick={() => onNavigate('map')}
                className="mc-panel p-3 flex items-center gap-3 bg-[#2d2d2d] hover:bg-[#363636] transition-colors border border-slate-700 w-full text-left cursor-pointer"
              >
                <div className="size-12 mc-slot-inset shrink-0 overflow-hidden bg-[#1a1a1a]">
                  <img 
                    src={capture.img} 
                    className="size-full object-cover pixelated opacity-80" 
                    alt={capture.name} 
                  />
                </div>
                <div className="flex-1">
                  <p className="font-pixel text-[9px] text-white">{capture.name}</p>
                  <p className="text-slate-400 text-xs mt-1 font-mono">{capture.stats}</p>
                </div>
                <div className="text-right">
                  <p className="font-pixel text-[9px] text-mc-xp">{capture.gain}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Support Request Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                📡 Dispatch Support Beacon
              </h3>
              <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                onAddSupportRequest(beaconSector, beaconType, beaconDesc);
                setShowSupportModal(false);
                setBeaconDesc('');
                alert("Support Beacon dispatched! Check alerts and inventory log.");
              }} 
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-pixel text-[8px] text-slate-400 uppercase">Target Sector</label>
                <select 
                  value={beaconSector}
                  onChange={(e) => setBeaconSector(e.target.value)}
                  className="bg-[#1a1a1a] border-4 border-mc-stone px-2 py-2 text-xs text-white focus:outline-none focus:border-mc-gold font-mono w-full"
                >
                  <option value="7G">Sector 7G (Cubbon Park)</option>
                  <option value="heights">Sunset Heights (Indiranagar)</option>
                  <option value="ulsoor">Ulsoor Lake</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-pixel text-[8px] text-slate-400 uppercase">Beacon Type</label>
                <select 
                  value={beaconType}
                  onChange={(e) => setBeaconType(e.target.value as any)}
                  className="bg-[#1a1a1a] border-4 border-mc-stone px-2 py-2 text-xs text-white focus:outline-none focus:border-mc-gold font-mono w-full"
                >
                  <option value="reinforcements">Request Reinforcements</option>
                  <option value="repair">Request Structural Repair</option>
                  <option value="bug_report">Report Signal Malfunction</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-pixel text-[8px] text-slate-400 uppercase">Dispatch Request Notes</label>
                <textarea 
                  value={beaconDesc}
                  onChange={(e) => setBeaconDesc(e.target.value)}
                  className="bg-[#1a1a1a] border-4 border-mc-stone px-3 py-2 text-xs text-white focus:outline-none focus:border-mc-gold font-mono w-full h-20 resize-none"
                  placeholder="Details of support needed..."
                  required
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSupportModal(false)}
                  className="flex-1 mc-btn py-3 text-[9px] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 mc-btn mc-btn-green py-3 text-[9px] uppercase cursor-pointer"
                >
                  Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
