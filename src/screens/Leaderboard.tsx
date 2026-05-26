import React, { useState } from 'react';
import type { ComponentType } from 'react';
import { Menu, Trophy, Medal, Gift, Lock, X, Flame, Zap, Star, Shield, MapPin, Wind, Clock, Target } from 'lucide-react';

// Pixel Art Golden Apple Component
function PixelGoldenApple() {
  return (
    <span className="text-xl filter drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] select-none">🍎</span>
  );
}

// Pixel Art Iron Ingot Component
function PixelIronIngot() {
  return (
    <span className="text-xl filter drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] select-none">🪙</span>
  );
}

// Pixel Art Coal Component
function PixelCoal() {
  return (
    <span className="text-xl filter drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] select-none">🪨</span>
  );
}

// ────────────────────────────────────────────
// Advancement data
// ────────────────────────────────────────────

type AdvStatus = 'unlocked' | 'progress' | 'locked';

interface Adv {
  name: string;
  desc: string;
  status: AdvStatus;
  icon: ComponentType<{ className?: string }>;
  color: string;       // icon + border colour
  bgColor: string;     // card bg
  progress?: number;   // 0-100 for in-progress
  progressLabel?: string;
}

const ADVANCEMENTS: Adv[] = [
  // ── Unlocked ───────────────────────────────
  {
    name: 'Earth Master',
    desc: 'Top 1% Global Rank',
    status: 'unlocked',
    icon: Medal,
    color: 'text-mc-gold',
    bgColor: 'bg-[#2d2d2d] border-mc-gold/50',
  },
  {
    name: 'Century Rider',
    desc: '100 km conquered in a single loop',
    status: 'unlocked',
    icon: Trophy,
    color: 'text-mc-xp',
    bgColor: 'bg-[#1e2d1e] border-mc-xp/50',
  },
  {
    name: 'First Blood',
    desc: 'Captured your first territory tile',
    status: 'unlocked',
    icon: Flame,
    color: 'text-mc-red',
    bgColor: 'bg-[#2d1e1e] border-mc-red/50',
  },
  {
    name: 'Speed Demon',
    desc: 'Completed a loop in under 10 minutes',
    status: 'unlocked',
    icon: Zap,
    color: 'text-[#a78bfa]',
    bgColor: 'bg-[#1e1a2d] border-[#a78bfa]/50',
  },
  {
    name: 'Biome Explorer',
    desc: 'Visited 5 different zone types',
    status: 'unlocked',
    icon: MapPin,
    color: 'text-mc-sky',
    bgColor: 'bg-[#1a222d] border-mc-sky/50',
  },
  // ── In Progress ────────────────────────────
  {
    name: 'Night Owl',
    desc: 'Complete 10 sessions after 10 PM',
    status: 'progress',
    icon: Star,
    color: 'text-mc-gold',
    bgColor: 'bg-[#2a2416] border-mc-gold/25',
    progress: 60,
    progressLabel: '6 / 10 night sessions',
  },
  {
    name: 'Iron Boots',
    desc: 'Walk 500 km total distance',
    status: 'progress',
    icon: Shield,
    color: 'text-slate-300',
    bgColor: 'bg-[#222222] border-slate-600/40',
    progress: 38,
    progressLabel: '190 / 500 km',
  },
  {
    name: 'Wind Chaser',
    desc: 'Maintain avg pace under 4:30 /km for 30 min',
    status: 'progress',
    icon: Wind,
    color: 'text-mc-sky',
    bgColor: 'bg-[#1a222d] border-mc-sky/25',
    progress: 72,
    progressLabel: '21 / 30 min sustained',
  },
  {
    name: 'Endurance King',
    desc: 'Complete 50 active sessions',
    status: 'progress',
    icon: Clock,
    color: 'text-[#fb923c]',
    bgColor: 'bg-[#2a1f14] border-[#fb923c]/25',
    progress: 20,
    progressLabel: '10 / 50 sessions',
  },
  // ── Locked ─────────────────────────────────
  {
    name: 'Global Conqueror',
    desc: 'Capture 10,000 km² total territory',
    status: 'locked',
    icon: Target,
    color: 'text-slate-600',
    bgColor: 'bg-[#1a1a1a] border-slate-800/60',
  },
  {
    name: 'Faction Warlord',
    desc: 'Lead your faction to #1 in a region',
    status: 'locked',
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-[#1a1a1a] border-slate-800/60',
  },
  {
    name: 'Diamond Strider',
    desc: 'Reach Diamond tier in global rankings',
    status: 'locked',
    icon: Star,
    color: 'text-slate-600',
    bgColor: 'bg-[#1a1a1a] border-slate-800/60',
  },
  {
    name: 'World Sprinter',
    desc: 'Log 1,000 km of total movement',
    status: 'locked',
    icon: Zap,
    color: 'text-slate-600',
    bgColor: 'bg-[#1a1a1a] border-slate-800/60',
  },
];

function AdvancementCard({ adv }: { adv: Adv; key?: React.Key }) {
  const Icon = adv.icon;
  const isUnlocked = adv.status === 'unlocked';
  const isProgress = adv.status === 'progress';
  const isLocked = adv.status === 'locked';

  return (
    <div className={`mc-panel p-3 border flex items-center gap-4 transition-opacity ${adv.bgColor} ${isLocked ? 'opacity-45' : ''}`}>
      {/* Icon slot */}
      <div className={`size-12 shrink-0 mc-slot-inset flex items-center justify-center bg-[#111111] ${isUnlocked || isProgress ? `border ${adv.color.replace('text-', 'border-')}` : ''}`}>
        {isLocked
          ? <Lock className="w-6 h-6 text-slate-600" />
          : <Icon className={`w-6 h-6 ${adv.color}`} />
        }
      </div>

      {/* Text + progress */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className={`font-pixel text-[8px] leading-none ${isLocked ? 'text-slate-500' : isProgress ? 'text-mc-sky' : 'text-mc-gold'}`}>
          {isLocked ? 'Locked Goal' : isProgress ? 'In Progress...' : 'Advancement Made!'}
        </span>
        <span className={`font-pixel text-[9px] mt-1 leading-normal ${isLocked ? 'text-slate-400' : 'text-white'}`}>{adv.name}</span>
        <span className={`text-xs font-mono leading-none ${isLocked ? 'text-slate-500' : 'text-slate-400'}`}>{adv.desc}</span>

        {isProgress && adv.progress !== undefined && (
          <div className="mt-2">
            <div className="relative h-2 w-full bg-[#111111] border border-slate-700 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-700 ${adv.color.replace('text-', 'bg-')}`}
                style={{ width: `${adv.progress}%` }}
              />
            </div>
            <span className="font-pixel text-[7px] text-slate-500 mt-0.5 block">{adv.progressLabel} · {adv.progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'global' | 'local'>('global');
  const [showInfo, setShowInfo] = useState(false);
  const [showAdvancements, setShowAdvancements] = useState(false); // hidden by default

  const globalUsers = [
    { rank: 1, name: "RunnerPulse", area: "8,110", loop: "210", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/24.jpg", color: "text-mc-gold" },
    { rank: 2, name: "Velocity King", area: "7,940", loop: "185", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/42.jpg", color: "text-slate-300" },
    { rank: 3, name: "TrailBlazer", area: "7,200", loop: "155", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/73.jpg", color: "text-[#d8874f]" },
    { rank: 4, name: "Mira Run", area: "6,850", loop: "142", tier: "Platinum", img: "https://xsgames.co/randomusers/assets/avatars/female/12.jpg", color: "text-slate-500" },
  ];

  const localUsers = [
    { rank: 1, name: "BLR_SprintKing", area: "2,410", loop: "85", tier: "Platinum", img: "https://xsgames.co/randomusers/assets/avatars/male/33.jpg", color: "text-mc-gold" },
    { rank: 2, name: "CubbonParkRacer", area: "1,980", loop: "64", tier: "Gold", img: "https://xsgames.co/randomusers/assets/avatars/female/45.jpg", color: "text-slate-300" },
    { rank: 3, name: "WhitefieldJogger", area: "1,520", loop: "48", tier: "Gold", img: "https://xsgames.co/randomusers/assets/avatars/male/22.jpg", color: "text-[#d8874f]" },
    { rank: 4, name: "UlsoorSailor", area: "1,210", loop: "32", tier: "Silver", img: "https://xsgames.co/randomusers/assets/avatars/male/11.jpg", color: "text-slate-500" },
  ];

  const activeUsers = activeTab === 'global' ? globalUsers : localUsers;

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden min-h-screen pb-28 bg-[#141414] text-slate-200">
      {/* Header (Server Leaderboard Title) */}
      <header className="sticky top-0 z-40 bg-[#212121] border-b-4 border-mc-stone">
        <div className="flex items-center p-4 justify-between w-full">
          <button 
            onClick={() => setShowInfo(true)}
            className="mc-btn mc-btn-dark size-10 flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-pixel text-white leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,1)] text-center flex-1">
            Server Scoreboard
          </h2>
          <div className="flex size-10 items-center justify-end">
            <div className="mc-slot-inset size-10 flex items-center justify-center bg-[#1a1a1a]">
              <Trophy className="w-5 h-5 text-mc-gold" />
            </div>
          </div>
        </div>
        
        {/* Tabs styled as Minecraft signs */}
        <div className="flex px-4 gap-2 w-full pb-2">
          <button 
            onClick={() => setActiveTab('global')}
            className={`flex-1 mc-btn py-2 text-[9px] uppercase cursor-pointer ${
              activeTab === 'global' ? 'mc-btn-green' : 'mc-btn-dark'
            }`}
          >
            Global Chunks
          </button>
          <button 
            onClick={() => setActiveTab('local')}
            className={`flex-1 mc-btn py-2 text-[9px] uppercase cursor-pointer ${
              activeTab === 'local' ? 'mc-btn-green' : 'mc-btn-dark'
            }`}
          >
            Local Biomes
          </button>
        </div>
      </header>

      {/* Main Scoreboard Content */}
      <main className="flex-1 w-full flex flex-col gap-1 p-4 max-w-2xl mx-auto">
        
        {/* User Rank Card (Highlighted Row in Server list) */}
        <div className="mc-panel p-4 flex items-center gap-4 bg-[#233523] border-2 border-mc-grass shadow-[0_0_12px_rgba(93,187,99,0.15)] mb-4">
          <div className="relative shrink-0">
            <div className="size-14 mc-slot-inset border-mc-grass flex items-center justify-center p-1 bg-[#1a1a1a]">
              <img 
                src="https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=150&h=150&fit=crop" 
                className="size-full object-cover pixelated"
                alt="You Avatar"
              />
            </div>
            <div className="absolute -bottom-2 -right-1 bg-mc-grass border border-black font-pixel text-[8px] text-black px-1 py-0.5 font-bold">YOU</div>
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex justify-between items-start">
              <p className="font-pixel text-[11px] text-mc-grass drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">Alex Shadow</p>
              <p className="font-pixel text-mc-red text-sm drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">#14</p>
            </div>
            <div className="flex gap-4 mt-2 font-pixel text-[8px] text-slate-400">
              <div className="flex flex-col">
                <span>Area</span>
                <span className="text-white font-pixel-tall text-base mt-1">4,250 <span className="text-[10px] font-sans">km²</span></span>
              </div>
              <div className="flex flex-col border-l border-slate-700 pl-4">
                <span>Loop</span>
                <span className="text-white font-pixel-tall text-base mt-1">124 <span className="text-[10px] font-sans">km</span></span>
              </div>
              <div className="flex flex-col border-l border-slate-700 pl-4">
                <span>Tier</span>
                <span className="text-mc-gold font-pixel text-[8px] mt-1.5 uppercase">Diamond</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scoreboard List Panel */}
        <div className="mc-panel bg-[#212121] border border-mc-stone p-2 flex flex-col gap-1.5">
          <div className="flex justify-between px-3 py-1 font-pixel text-[8px] text-slate-400 border-b border-slate-700 pb-2 mb-1">
            <span>Player Rank</span>
            <span>Stats Score</span>
          </div>

          {activeUsers.map((user) => (
            <div 
              key={user.rank} 
              className="flex items-center gap-3 bg-black/25 hover:bg-black/45 border border-transparent hover:border-mc-stone transition-all p-3 rounded-sm"
            >
              {/* Rank Icon columns */}
              <div className="shrink-0 flex items-center justify-center w-8 text-center">
                {user.rank === 1 && <PixelGoldenApple />}
                {user.rank === 2 && <PixelIronIngot />}
                {user.rank === 3 && <PixelCoal />}
                {user.rank > 3 && (
                  <span className="font-pixel text-[#ff4444] text-sm drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
                    {user.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="size-10 mc-slot-inset shrink-0 overflow-hidden bg-[#1a1a1a]">
                <img 
                  src={user.img}
                  className="size-full object-cover pixelated" 
                  alt={user.name}
                />
              </div>

              {/* Player details */}
              <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <p className="font-pixel text-[10px] text-slate-100">{user.name}</p>
                  <p className="font-pixel-tall text-sm text-slate-400 mt-1">{user.area} km² Area • {user.loop} km Loop</p>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0 sm:justify-end">
                  <span className="font-pixel text-[8px] px-2 py-0.5 bg-black/60 border border-slate-700 text-mc-gold uppercase">
                    {user.tier}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rewards Section styled as Minecraft Advancements */}
        <section className="mt-6 mb-4">
          <button
            onClick={() => setShowAdvancements(a => !a)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h3 className="font-pixel text-[10px] text-mc-gold uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Advancements Unlocked
              <span className="text-mc-xp text-[8px] ml-1">[{ADVANCEMENTS.filter(a => a.status === 'unlocked').length} / {ADVANCEMENTS.length}]</span>
            </h3>
            <span className="font-pixel text-[8px] text-slate-400 group-hover:text-white transition-colors">
              {showAdvancements ? '▲ HIDE' : '▼ SHOW'}
            </span>
          </button>

          {showAdvancements && (
            <div className="flex flex-col gap-2">
              {ADVANCEMENTS.map((adv, i) => (
                <AdvancementCard key={i} adv={adv} />
              ))}
            </div>
          )}
        </section>

        
      </main>

      {/* Rules Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mc-panel border-mc-stone w-full max-w-sm overflow-hidden shadow-2xl p-4 bg-[#2e2e2e]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-700 mb-4 bg-black/20 p-2">
              <h3 className="font-pixel text-[9px] text-mc-gold flex items-center gap-2">
                📖 Scoreboard Rules
              </h3>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 font-mono text-xs text-slate-300 leading-relaxed">
              <p><span className="text-mc-gold">Diamond Tier:</span> Top 5% overall (Area &gt; 5000 km²)</p>
              <p><span className="text-mc-gold">Platinum Tier:</span> Top 15% overall (Area &gt; 2000 km²)</p>
              <p><span className="text-mc-gold">Gold Tier:</span> Top 30% overall (Area &gt; 1000 km²)</p>
              <p><span className="text-mc-gold">Silver Tier:</span> Top 60% overall (Area &gt; 500 km²)</p>
              <p className="mt-2 text-mc-xp">Complete runs to capture chunks and increase your ranks!</p>
            </div>

            <button 
              onClick={() => setShowInfo(false)}
              className="w-full mc-btn py-3 text-[9px] uppercase cursor-pointer mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
