import { Trophy, Shield, Map as MapIcon, Zap, User } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', icon: Zap, label: 'Quest Log' },
    { id: 'map', icon: MapIcon, label: 'Arena' },
    { id: 'territory', icon: Shield, label: 'My Sectors' },
    { id: 'leaderboard', icon: Trophy, label: 'Scoreboard' },
    { id: 'profile', icon: User, label: 'Inventory' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-50 flex flex-col items-center bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
      {/* Active Item Name overlay (Minecraft style popup text) */}
      <div className="h-6 mb-2">
        <span className="font-pixel text-[10px] text-mc-gold tracking-wider drop-shadow-[2px_2px_0_rgba(0,0,0,1)] uppercase animate-bounce">
          {navItems.find((item) => item.id === activeTab)?.label}
        </span>
      </div>

      {/* Hotbar Container */}
      <div className="flex items-center justify-center bg-mc-dark/90 p-1 border-4 border-mc-stone shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
        <div className="flex gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex size-12 items-center justify-center transition-all cursor-pointer select-none ${
                  isActive ? 'mc-slot-inset-active scale-110 z-10' : 'mc-slot-inset hover:bg-white/10'
                }`}
                title={item.label}
              >
                <Icon
                  className={`size-6 transition-transform pixelated ${
                    isActive ? 'text-mc-gold scale-110 drop-shadow-[0_0_4px_rgba(225,193,110,0.8)]' : 'text-slate-400'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {/* Subtle active frame highlight */}
                {isActive && (
                  <div className="absolute inset-0 border-2 border-mc-gold/50 pointer-events-none"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
