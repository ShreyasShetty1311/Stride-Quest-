import { useState, useEffect, type FormEvent } from 'react';
import { User, Mail, Shield, Key, X, PenTool, Check, Award, Compass, Clock, Eye, EyeOff, Calendar, Fingerprint, Lock, Footprints, MessageSquare, Users } from 'lucide-react';
import type { UserProfile, SupportRequest } from '../data/mockDb';
import { setLocalFaction, getLocalFaction, FACTION_COLORS, type Faction } from '../engine/perimeterCapture';

interface ProfileProps {
  user: UserProfile;
  supportRequests: SupportRequest[];
  onUpdateUser: (updatedFields: Partial<UserProfile>) => void;
  onAddSupportRequest: (sectorId: string, requestType: 'reinforcements' | 'repair' | 'bug_report', description: string) => void;
}

export function Profile({ user, supportRequests, onUpdateUser, onAddSupportRequest }: ProfileProps) {
  const [isEditUsernameOpen, setIsEditUsernameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [showSecureInfo, setShowSecureInfo] = useState(false);
  const [mockPassword, setMockPassword] = useState('Vanguard_Alpha_99');

  // Support Request modal states
  const [isSupportBeaconOpen, setIsSupportBeaconOpen] = useState(false);
  const [beaconSector, setBeaconSector] = useState('heights');
  const [beaconType, setBeaconType] = useState<'reinforcements' | 'repair' | 'bug_report'>('reinforcements');
  const [beaconDesc, setBeaconDesc] = useState('');

  const [isFactionOpen, setIsFactionOpen] = useState(false);

  // Reactive faction color — drives the bitmoji figurine shirt/arms
  const [factionColor, setFactionColor] = useState(() => FACTION_COLORS[getLocalFaction()]);

  // Interactive state for equipment armor slots
  const [selectedGear, setSelectedGear] = useState<'helmet' | 'chest' | 'legs' | 'boots' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Hover tooltip for inventory items
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);

  const handleUpdateUsername = (e: FormEvent) => {
    e.preventDefault();
    onUpdateUser({ username: newUsername });
    setIsEditUsernameOpen(false);
  };

  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    setMockPassword(newPassword);
    setPasswordChanged(true);
    setTimeout(() => {
      setIsChangePasswordOpen(false);
      setPasswordChanged(false);
      setCurrentPassword('');
      setNewPassword('');
    }, 1500);
  };

  const getIconForName = (name: string) => {
    switch (name) {
      case "Distance Compass": return Compass;
      case "Tactical map": return Shield;
      case "Survival Clock": return Clock;
      case "Credentials Book": return Fingerprint;
      case "Anvil Key": return Key;
      default: return undefined;
    }
  };

  const inventoryItems = user.inventory.map(item => ({
    ...item,
    icon: getIconForName(item.name)
  }));

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden min-h-screen pb-28 bg-[#141414] text-slate-200">
      {/* Header (Inventory UI Title) */}
      <header className="sticky top-0 z-40 bg-[#212121] p-4 justify-between border-b-4 border-mc-stone flex items-center">
        <h2 className="text-sm font-pixel text-white leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center gap-2">
          <User className="w-5 h-5 text-mc-gold" />
          Agent Inventory
        </h2>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 flex flex-col gap-6">
        
        {/* Bitmoji character figurine + character stage */}
        <section className="mc-panel p-4 flex flex-col md:flex-row gap-6 items-center bg-[#2d2d2d] border-2 border-mc-stone">

          {/* Single bitmoji figurine (left) */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="font-pixel text-[7px] text-slate-400 uppercase mb-1">Agent</span>
            {/* Pixel-art standing character */}
            <svg
              viewBox="0 0 24 48"
              width="72"
              height="144"
              className="pixelated drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              style={{ imageRendering: 'pixelated' }}
            >
              {/* Head */}
              <rect x="7" y="0" width="10" height="10" rx="1" fill="#f5cba7" />
              {/* Hair */}
              <rect x="7" y="0" width="10" height="3" rx="1" fill="#5d4037" />
              <rect x="7" y="0" width="2" height="5" fill="#5d4037" />
              {/* Eyes */}
              <rect x="9" y="4" width="2" height="2" fill="#1a1a1a" />
              <rect x="13" y="4" width="2" height="2" fill="#1a1a1a" />
              {/* Mouth */}
              <rect x="10" y="7" width="4" height="1" fill="#c0392b" />
              {/* Neck */}
              <rect x="10" y="10" width="4" height="2" fill="#f5cba7" />
              {/* Torso — faction colored */}
              <rect x="6" y="12" width="12" height="12" rx="1" fill={factionColor} />
              {/* Chest detail */}
              <rect x="9" y="14" width="6" height="4" rx="0.5" fill="rgba(0,0,0,0.25)" />
              {/* Left arm */}
              <rect x="2" y="12" width="4" height="10" rx="1" fill={factionColor} />
              <rect x="2" y="22" width="4" height="4" rx="1" fill="#f5cba7" />
              {/* Right arm */}
              <rect x="18" y="12" width="4" height="10" rx="1" fill={factionColor} />
              <rect x="18" y="22" width="4" height="4" rx="1" fill="#f5cba7" />
              {/* Pants */}
              <rect x="6" y="24" width="5" height="12" rx="1" fill="#2c3e50" />
              <rect x="13" y="24" width="5" height="12" rx="1" fill="#2c3e50" />
              {/* Shoes */}
              <rect x="5" y="36" width="6" height="4" rx="1" fill="#7f5539" />
              <rect x="13" y="36" width="6" height="4" rx="1" fill="#7f5539" />
              {/* Shadow */}
              <ellipse cx="12" cy="42" rx="7" ry="2" fill="rgba(0,0,0,0.25)" />
            </svg>
            <p className="font-pixel text-[7px] text-slate-500 text-center mt-1">{user.faction}</p>
          </div>

          {/* Center Character Preview Stage */}
          <div className="flex-1 size-full min-h-[200px] mc-slot-inset flex flex-col items-center justify-center p-4 bg-[#141414] relative">
            <div className="absolute top-2 right-2 flex gap-2">
              <span className="font-pixel text-[7px] text-mc-xp">LEVEL {user.level}</span>
              <span className="font-pixel text-[7px] text-mc-green">STATUS: HEALTHY</span>
            </div>
            
            {/* Gear/Item Tooltip description box inside character stage */}
            {(selectedGear || selectedItem) ? (
              <div className="absolute inset-x-4 bottom-4 mc-tooltip p-3 z-30 animate-in slide-in-from-bottom-2 bg-black/95">
                <div className="flex justify-between items-center pb-1 border-b border-purple-900/50 mb-1.5">
                  <h4 className="font-pixel text-[8px] text-mc-gold uppercase">
                    {selectedGear && user.gear[selectedGear].name}
                    {selectedItem && selectedItem.name}
                  </h4>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedGear(null); 
                      setSelectedItem(null); 
                    }} 
                    className="text-slate-400 hover:text-white cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] font-pixel-tall text-slate-300 leading-normal">
                  {selectedGear && (user.gear[selectedGear].unlocked ? `ACTIVE: ${user.gear[selectedGear].desc}` : `LOCKED: ${user.gear[selectedGear].requirement}`)}
                  {selectedItem && selectedItem.desc}
                </p>
              </div>
            ) : (
              <>
                <img 
                  src="https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=150&h=150&fit=crop" 
                  className="h-24 w-24 rounded-full border-4 border-mc-stone object-cover pixelated shadow-2xl"
                  alt="Avatar model"
                />
                <h3 className="font-pixel text-[11px] text-white mt-3 drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] flex items-center gap-1.5">
                  {user.username}
                  <button 
                    onClick={() => {
                      setNewUsername(user.username);
                      setIsEditUsernameOpen(true);
                    }}
                    className="p-1 mc-btn mc-btn-dark size-7 flex items-center justify-center cursor-pointer"
                    title="Rename Item (Username)"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                  </button>
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mt-1">{user.email}</p>
              </>
            )}
          </div>

          {/* Right Side Attributes (Potion Effects layout) */}
          <div className="flex flex-col gap-2 shrink-0 w-full md:w-48 bg-black/25 p-3 border-2 border-slate-800">
            <span className="font-pixel text-[7px] text-slate-400 uppercase mb-1">Active Attributes</span>
            
            {/* Faction attribute */}
            <div className="flex items-center gap-2">
              <div className="size-8 mc-slot-inset flex items-center justify-center bg-black/40">
                <Shield className="w-4 h-4 text-mc-sky" />
              </div>
              <div>
                <p className="font-pixel text-[8px] text-white leading-none">{user.faction}</p>
                <p className="text-[7px] font-pixel text-slate-400 mt-1 uppercase">Faction Banner</p>
              </div>
            </div>

            {/* Created At attribute */}
            <div className="flex items-center gap-2 mt-1">
              <div className="size-8 mc-slot-inset flex items-center justify-center bg-black/40">
                <Calendar className="w-4 h-4 text-mc-gold" />
              </div>
              <div>
                <p className="font-pixel text-[8px] text-white leading-none">{user.createdAt}</p>
                <p className="text-[7px] font-pixel text-slate-400 mt-1 uppercase">Created On</p>
              </div>
            </div>
          </div>
        </section>

        {/* Faction Allegiance Panel */}
        <section className="mc-panel p-4 flex flex-col gap-3 bg-[#2d2d2d] border-2 border-mc-stone">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest px-1">Faction Allegiance</h3>
            <button
              onClick={() => setIsFactionOpen(o => !o)}
              className="mc-btn mc-btn-dark py-1.5 px-3 text-[8px] uppercase cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3 h-3" /> Change
            </button>
          </div>

          {/* Current faction display */}
          {(() => {
            const factions: Faction[] = ['Unaffiliated','Crimson','Verdant','Cobalt','Amber'];
            const factionEmoji: Record<Faction, string> = {
              Unaffiliated: '⚪', Crimson: '🔴', Verdant: '🟢', Cobalt: '🔵', Amber: '🟡'
            };
            const factionDesc: Record<Faction, string> = {
              Unaffiliated: 'No allegiance. Solo runner.',
              Crimson: 'Aggressors. Capture first, ask questions later.',
              Verdant: 'Naturalists. Reclaim green spaces.',
              Cobalt: 'Tacticians. Precision territory control.',
              Amber: 'Merchants. Trade routes & supply lines.',
            };
            const cur: Faction = (user.faction as Faction) ?? 'Unaffiliated';
            const col = FACTION_COLORS[cur];
            return (
              <div className="flex items-center gap-3 p-3 bg-black/40 border border-slate-700">
                <div className="size-10 mc-slot-inset flex items-center justify-center text-xl" style={{ borderColor: col }}>
                  {factionEmoji[cur]}
                </div>
                <div>
                  <p className="font-pixel text-[9px] text-white" style={{ color: col }}>{cur}</p>
                  <p className="text-[9px] font-pixel-tall text-slate-400 mt-0.5">{factionDesc[cur]}</p>
                </div>
              </div>
            );
          })()}

          {/* Faction picker (inline) */}
          {isFactionOpen && (() => {
            const factions: Faction[] = ['Unaffiliated','Crimson','Verdant','Cobalt','Amber'];
            const factionEmoji: Record<Faction, string> = {
              Unaffiliated: '⚪', Crimson: '🔴', Verdant: '🟢', Cobalt: '🔵', Amber: '🟡'
            };
            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1 animate-in slide-in-from-top-1">
                {factions.map(f => {
                  const col = FACTION_COLORS[f];
                  const active = user.faction === f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        onUpdateUser({ faction: f });
                        setLocalFaction(f);
                        setFactionColor(FACTION_COLORS[f]);
                        setIsFactionOpen(false);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 border-2 cursor-pointer transition-all ${
                        active ? 'bg-black/60' : 'bg-black/30 hover:bg-black/50'
                      }`}
                      style={{ borderColor: active ? col : 'rgba(255,255,255,0.1)' }}
                    >
                      <span className="text-xl">{factionEmoji[f]}</span>
                      <span className="font-pixel text-[7px]" style={{ color: col }}>{f}</span>
                      {active && <span className="font-pixel text-[6px] text-mc-xp">ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Action Panel: Credentials and Password Modals */}
        <section className="mc-panel p-4 flex flex-col gap-3 bg-[#2d2d2d] border-2 border-mc-stone">
          <h3 className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest px-1">Security Chest</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button 
              onClick={() => {
                setNewUsername(user.username);
                setIsEditUsernameOpen(true);
              }}
              className="mc-btn mc-btn-dark py-3 px-4 text-[9px] uppercase cursor-pointer flex items-center gap-2.5 w-full text-left"
            >
              <PenTool className="w-4 h-4 text-mc-gold" /> Update Identifier
            </button>

            <button 
              onClick={() => setIsChangePasswordOpen(true)}
              className="mc-btn mc-btn-dark py-3 px-4 text-[9px] uppercase cursor-pointer flex items-center gap-2.5 w-full text-left"
            >
              <Key className="w-4 h-4 text-mc-xp" /> Alter Security Code
            </button>

            <button 
              onClick={() => {
                setBeaconDesc('');
                setIsSupportBeaconOpen(true);
              }}
              className="mc-btn mc-btn-dark py-3 px-4 text-[9px] uppercase cursor-pointer flex items-center gap-2.5 w-full text-left"
            >
              <MessageSquare className="w-4 h-4 text-mc-sky" /> Dispatch Beacon
            </button>
          </div>

          <div className="h-0.5 bg-slate-700 my-2"></div>

          {/* Secure Identity keys */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 mc-slot-inset flex items-center justify-center bg-black/40">
                  <Fingerprint className="w-5 h-5 text-mc-gold" />
                </div>
                <div>
                  <p className="font-pixel text-[9px] text-white">Identity Decryptor</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Reveal private cryptographic keys</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSecureInfo(!showSecureInfo)}
                className={`mc-btn py-2 px-3 text-[8px] uppercase cursor-pointer ${showSecureInfo ? 'mc-btn-dark' : 'mc-btn-gold'}`}
              >
                {showSecureInfo ? 'Hide Key' : 'Reveal Key'}
              </button>
            </div>

            {showSecureInfo && (
              <div className="grid grid-cols-1 gap-2 mt-1 animate-in slide-in-from-top-2">
                <div className="flex flex-col gap-1 p-3 bg-black/40 border border-slate-700 rounded-sm">
                  <p className="font-pixel text-[7px] text-slate-500 uppercase tracking-widest">Decryption ID</p>
                  <p className="text-mc-gold font-mono text-xs">{user.username.toLowerCase().replace(' ', '_')}</p>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-black/40 border border-slate-700 rounded-sm">
                  <p className="font-pixel text-[7px] text-slate-500 uppercase tracking-widest">Secret Seed</p>
                  <p className="text-mc-xp font-mono text-xs">{mockPassword}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Player Storage: 3x9 Grid Layout represent metrics */}
        <section className="mc-panel p-4 bg-[#212121] border border-mc-stone">
          <h3 className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest mb-3 px-1">Inventory Chest</h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {/* Active Items */}
            {inventoryItems.map((item, index) => {
              const Icon = item.icon;
              const isHovered = hoveredItem?.name === item.name;
              return (
                <div key={index} className="relative">
                  <button 
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => { setSelectedGear(null); setSelectedItem(selectedItem?.name === item.name ? null : item); }}
                    className={`aspect-square mc-slot-inset flex flex-col items-center justify-center relative group cursor-pointer hover:bg-white/5 bg-black/35 w-full ${
                      selectedItem?.name === item.name ? 'border-mc-gold border-2' : ''
                    } ${isHovered ? 'ring-1 ring-mc-gold/60' : ''}`}
                  >
                    {Icon ? (
                      <Icon className="w-5 h-5 text-mc-gold" />
                    ) : (
                      <span className="text-lg filter drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">{item.emoji}</span>
                    )}
                    {/* Quantity stack count */}
                    <span className="absolute bottom-0.5 right-1.5 font-pixel text-[8px] text-white drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)]">
                      {item.qty}
                    </span>
                  </button>

                  {/* Hover tooltip — Minecraft enchantment table style */}
                  {isHovered && (
                    <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-[999] w-48 pointer-events-none animate-in fade-in duration-100">
                      <div className="bg-[#100010] border border-purple-800/70 shadow-[0_0_12px_rgba(139,92,246,0.35)] p-2.5 text-left">
                        {/* Item name */}
                        <p className="font-pixel text-[9px] text-mc-gold leading-snug mb-1.5">{item.name}</p>
                        {/* Rarity badge */}
                        <span className="font-pixel text-[6px] px-1 py-0.5 bg-purple-900/60 text-purple-300 border border-purple-700/40 uppercase tracking-widest">
                          {item.unlocked ? 'Common' : 'Locked'}
                        </span>
                        {/* Divider */}
                        <div className="h-px bg-purple-900/50 my-2" />
                        {/* Description */}
                        <p className="font-pixel text-[7px] text-slate-300 leading-relaxed">{item.desc}</p>
                        {/* Quantity */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-pixel text-[7px] text-slate-500 uppercase">Qty</span>
                          <span className="font-pixel text-[8px] text-mc-xp">{item.qty}</span>
                        </div>
                      </div>
                      {/* Tooltip arrow */}
                      <div className="w-2 h-2 bg-[#100010] border-r border-b border-purple-800/70 rotate-45 mx-auto -mt-1" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty slots for full Minecraft 3x9 row layout grids */}
            {Array.from({ length: 18 }).map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="aspect-square mc-slot-inset bg-black/40 opacity-45 cursor-not-allowed"
              ></div>
            ))}
          </div>
        </section>

        {/* Active Support Beacons Panel */}
        <section className="mc-panel p-4 bg-[#212121] border border-mc-stone">
          <h3 className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest mb-3 px-1">
            Active Support Beacons
          </h3>
          {supportRequests.length === 0 ? (
            <div className="text-center py-6 bg-black/25 border border-slate-800 rounded-sm">
              <p className="font-pixel text-[8px] text-slate-500">No active support beacons dispatched.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {supportRequests.map((req) => (
                <div key={req.id} className="p-3 bg-black/45 border border-slate-800 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[8px] text-white">
                        {req.sectorName}
                      </span>
                      <span className={`font-pixel text-[7px] px-1 py-0.5 rounded leading-none uppercase ${
                        req.requestType === 'reinforcements' ? 'bg-mc-gold/20 text-mc-gold' : 
                        req.requestType === 'repair' ? 'bg-mc-xp/20 text-mc-xp' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {req.requestType}
                      </span>
                      <span className="font-pixel text-[7px] text-slate-500">
                        {req.timestamp}
                      </span>
                    </div>
                    <p className="text-[10px] font-pixel-tall text-slate-400">
                      {req.description}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="font-pixel text-[7px] px-1.5 py-0.5 bg-mc-grass/20 text-mc-grass border border-mc-grass/30 uppercase">
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Edit Username Modal styled as Minecraft Anvil Rename UI */}
      {isEditUsernameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                ⚒️ Repair & Name (Anvil)
              </h3>
              <button onClick={() => setIsEditUsernameOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUsername} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-pixel text-[8px] text-slate-400 uppercase tracking-wider">Rename Item</label>
                {/* Minecraft Styled Input box */}
                <input 
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-[#1a1a1a] border-4 border-mc-stone px-4 py-3 text-white focus:outline-none focus:border-mc-gold transition-all font-pixel text-[9px] w-full shadow-[inset_2px_2px_0_rgba(0,0,0,1)]"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>

              {/* Minecraft Anvil Cost indicators */}
              <div className="bg-black/40 border border-slate-800 p-2 text-center">
                <p className="font-pixel text-[9px] text-mc-xp drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
                  Enchantment Cost: 1 XP Level
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditUsernameOpen(false)}
                  className="flex-1 mc-btn py-3 text-[9px] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 mc-btn mc-btn-green py-3 text-[9px] uppercase cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal styled as Crafting interface popup */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                🔒 Security Coding Table
              </h3>
              <button onClick={() => setIsChangePasswordOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {passwordChanged ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 mc-slot-inset border-mc-grass bg-black/45 text-mc-grass flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-pixel text-[10px] text-white">Credentials Encoded</h4>
                  <p className="text-slate-400 text-xs mt-2 font-mono">Security seed updated in ledger successfully.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest">Current Key</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#1a1a1a] border-4 border-mc-stone px-4 py-2 text-white focus:outline-none focus:border-mc-gold transition-all font-mono text-xs w-full shadow-[inset_2px_2px_0_rgba(0,0,0,1)]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-pixel text-[8px] text-slate-400 uppercase tracking-widest">New Seed Key</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#1a1a1a] border-4 border-mc-stone px-4 py-2 text-white focus:outline-none focus:border-mc-gold transition-all font-mono text-xs w-full shadow-[inset_2px_2px_0_rgba(0,0,0,1)]"
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="flex-1 mc-btn py-3 text-[9px] uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 mc-btn mc-btn-green py-3 text-[9px] uppercase cursor-pointer"
                  >
                    Forge Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Support Request Modal */}
      {isSupportBeaconOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                📡 Dispatch Support Beacon
              </h3>
              <button onClick={() => setIsSupportBeaconOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                onAddSupportRequest(beaconSector, beaconType, beaconDesc);
                setIsSupportBeaconOpen(false);
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
                  onClick={() => setIsSupportBeaconOpen(false)}
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
