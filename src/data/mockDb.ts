export interface UserStats {
  distance: number;
  capturedArea: number;
  streak: number;
  stamina: number; // HP
  armor: number;   // AP
}

export interface GearItem {
  id: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  requirement: string;
  desc: string;
}

export interface InventoryItem {
  name: string;
  qty: string;
  unlocked: boolean;
  desc: string;
  emoji?: string;
  icon?: any;
}

export interface UserProfile {
  username: string;
  email: string;
  faction: string;
  createdAt: string;
  level: number;
  stats: UserStats;
  gear: {
    helmet: GearItem;
    chest: GearItem;
    legs: GearItem;
    boots: GearItem;
  };
  inventory: InventoryItem[];
}

export interface Sector {
  id: string;
  name: string;
  type: 'allies' | 'rivals' | 'neutral';
  health: number;
  decayRate: number;
  lastRun: string;
  statusEffect: 'REGEN' | 'WITHER' | 'SLOWNESS' | 'NONE';
  imageUrl: string;
  lat: number;
  lon: number;
  details: string;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  emoji: string;
  details: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  area: string;
  loop: string;
  tier: string;
  img: string;
  color: string;
}

export interface Advancement {
  id: string;
  title: string;
  desc: string;
  type: 'medal' | 'trophy' | 'lock';
  unlocked: boolean;
}

export interface DashboardCapture {
  name: string;
  stats: string;
  gain: string;
  img: string;
}

export interface AlertNotification {
  id: string;
  type: 'siege' | 'info' | 'decay';
  title: string;
  message: string;
  time: string;
}

export interface SupportRequest {
  id: string;
  sectorId: string;
  sectorName: string;
  requestType: 'reinforcements' | 'repair' | 'bug_report';
  status: 'active' | 'resolved';
  description: string;
  timestamp: string;
}

// ----------------------------------------------------
// Initial Production-Like Mock Data
// ----------------------------------------------------

export const initialUser: UserProfile = {
  username: 'Alex Shadow',
  email: 'alex.shadow@vanguard.sys',
  faction: 'Blue Vanguard',
  createdAt: '2026-04-20',
  level: 42,
  stats: {
    distance: 1240.8,
    capturedArea: 42.5,
    streak: 15,
    stamina: 10,
    armor: 8,
  },
  gear: {
    helmet: { id: 'helmet', name: 'Netherite Helmet', emoji: '🪖', unlocked: false, requirement: 'Requires 100km total run distance.', desc: 'Provides active HUD environmental scanning protection.' },
    chest: { id: 'chest', name: 'Iron Chestplate', emoji: '👕', unlocked: false, requirement: 'Requires 500km total run distance.', desc: 'High defense chassis layer for sector fortification.' },
    legs: { id: 'legs', name: 'Diamond Leggings', emoji: '👖', unlocked: true, requirement: 'Earned by travelling 1,000km total.', desc: 'High agility reinforcement trousers crafted from diamond carbon.' },
    boots: { id: 'boots', name: 'Swiftness Boots', emoji: '🥾', unlocked: true, requirement: 'Unlocked via active streak > 10 days.', desc: 'Custom lightweight runners fitted with redstone GPS sensors.' },
  },
  inventory: [
    { name: "Distance Compass", qty: "1.2k", unlocked: true, desc: "Total travel logs", emoji: "🧭" },
    { name: "Tactical map", qty: "42", unlocked: true, desc: "Captured sectors count", emoji: "🛡️" },
    { name: "Survival Clock", qty: "15", unlocked: true, desc: "Active daily streak logs", emoji: "⏰" },
    { name: "Credentials Book", qty: "1", unlocked: true, desc: "Secure token certificates", emoji: "🪪" },
    { name: "Anvil Key", qty: "1", unlocked: true, desc: "Security bypass code key", emoji: "🔑" },
    { name: "Ender Pearl", qty: "64", unlocked: true, desc: "Teleport scan coordinate beads", emoji: "🔮" },
    { name: "Redstone Dust", qty: "32", unlocked: true, desc: "Session tracking circuits", emoji: "🔴" },
    { name: "Golden Apple", qty: "3", unlocked: true, desc: "Advancement quest rewards", emoji: "🍎" },
    { name: "Diamond Sword", qty: "1", unlocked: true, desc: "Faction combat rating weapon", emoji: "⚔️" },
  ],
};

export const initialSectors: Sector[] = [
  {
    id: '7G',
    name: 'Sector 7G (Cubbon Park)',
    type: 'allies',
    health: 85,
    decayRate: 2,
    lastRun: '2d ago • 4.2km',
    statusEffect: 'REGEN',
    imageUrl: 'https://images.unsplash.com/photo-1555529733-0e67056058e3?w=150&h=150&fit=crop',
    lat: 12.9716,
    lon: 77.5946,
    details: 'Cubbon Park Sector is secure and currently regenerating health due to active allied runs in the park boundary.',
  },
  {
    id: 'heights',
    name: 'Sunset Heights (Indiranagar)',
    type: 'rivals',
    health: 42,
    decayRate: 4,
    lastRun: '5d ago • 3.5km',
    statusEffect: 'WITHER',
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=150&h=150&fit=crop',
    lat: 12.9634,
    lon: 77.6412,
    details: ' Sunset Heights is currently occupied by Rivals (Speed_99 faction) and losing durability. Initiate defense run soon.',
  },
  {
    id: 'ulsoor',
    name: 'Ulsoor Lake',
    type: 'neutral',
    health: 61,
    decayRate: 5,
    lastRun: '8d ago • 2.1km',
    statusEffect: 'SLOWNESS',
    imageUrl: 'https://images.unsplash.com/photo-1549646452-f19b265bceef?w=150&h=150&fit=crop',
    lat: 12.9818,
    lon: 77.6210,
    details: 'Ulsoor Lake has decayed to neutral and has a high decay rate. Complete a run around the lake to claim it.',
  },
];

export const landmarksList: Landmark[] = [
  { id: 'soudha', name: 'Vidhana Soudha', lat: 12.9796, lon: 77.5906, emoji: '🏛️', details: 'Karnataka Legislative Chambers landmark' },
  { id: 'metro', name: 'MG Road Metro', lat: 12.9754, lon: 77.6068, emoji: '🚇', details: 'Namma Metro transit hub' },
  { id: 'indira', name: 'Indiranagar Crossing', lat: 12.9634, lon: 77.6412, emoji: '🛍️', details: 'Commercial shopping hub' },
  { id: 'lake', name: 'Ulsoor Lake', lat: 12.9818, lon: 77.6210, emoji: '⛵', details: 'Historical lake and wetland' },
];

export const globalLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "RunnerPulse", area: "8,110", loop: "210", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/24.jpg", color: "text-mc-gold" },
  { rank: 2, name: "Velocity King", area: "7,940", loop: "185", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/42.jpg", color: "text-slate-300" },
  { rank: 3, name: "TrailBlazer", area: "7,200", loop: "155", tier: "Diamond", img: "https://xsgames.co/randomusers/assets/avatars/male/73.jpg", color: "text-[#d8874f]" },
  { rank: 4, name: "Mira Run", area: "6,850", loop: "142", tier: "Platinum", img: "https://xsgames.co/randomusers/assets/avatars/female/12.jpg", color: "text-slate-500" },
];

export const localLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "BLR_SprintKing", area: "2,410", loop: "85", tier: "Platinum", img: "https://xsgames.co/randomusers/assets/avatars/male/33.jpg", color: "text-mc-gold" },
  { rank: 2, name: "CubbonParkRacer", area: "1,980", loop: "64", tier: "Gold", img: "https://xsgames.co/randomusers/assets/avatars/female/45.jpg", color: "text-slate-300" },
  { rank: 3, name: "WhitefieldJogger", area: "1,520", loop: "48", tier: "Gold", img: "https://xsgames.co/randomusers/assets/avatars/male/22.jpg", color: "text-[#d8874f]" },
  { rank: 4, name: "UlsoorSailor", area: "1,210", loop: "32", tier: "Silver", img: "https://xsgames.co/randomusers/assets/avatars/male/11.jpg", color: "text-slate-500" },
];

export const initialRecentActivity: DashboardCapture[] = [
  { name: "Sector 7-G (Cubbon Park)", stats: "2.4 km run • 45m ago", gain: "+0.8 SQ KM", img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=120&h=120&fit=crop" },
  { name: "Whitefield Zone B", stats: "5.1 km run • Yesterday", gain: "+1.2 SQ KM", img: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=120&h=120&fit=crop" },
];

export const initialAlerts: AlertNotification[] = [
  { id: 'alert1', type: 'siege',  title: '⚔ Sector Under Siege!',       message: 'Sunset Heights is under heavy attack by Crimson faction. 3 tiles lost in the last hour. Deploy ASAP!', time: '8m ago' },
  { id: 'alert2', type: 'decay',  title: '☠ Decay Critical — Ulsoor',   message: 'Ulsoor Lake health has dropped to 22%. No allied runs in 8 days. Territory will fall neutral in ~4h.', time: '34m ago' },
  { id: 'alert3', type: 'siege',  title: '⚔ Rival Spotted — Jayanagar', message: 'WhitefieldJogger (Gold) is actively capturing tiles near Jayanagar Circle. Sector 7H is contested.', time: '1h ago' },
  { id: 'alert4', type: 'info',   title: '✅ Conquest Rewarded',          message: 'Your last run at BMSCE perimeter captured 7 tiles and earned +350 XP. Stamina fully restored.', time: '2h ago' },
  { id: 'alert5', type: 'decay',  title: '⚠ Strength Decaying — 7G',    message: 'Sector 7G (Cubbon Park) strength has dropped to 58%. Run a lap to restore it before rivals move in.', time: '3h ago' },
  { id: 'alert6', type: 'info',   title: '🏅 New Rank Achieved',          message: 'You climbed to Rank #3 on the Bengaluru local leaderboard! Only 290 tiles behind CubbonParkRacer.', time: '5h ago' },
  { id: 'alert7', type: 'siege',  title: '🔴 Basavanagudi Contested',    message: 'Cobalt faction has flagged 4 tiles near Bull Temple Road as contested. Hold the line — tiles expire in 2h.', time: '6h ago' },
  { id: 'alert8', type: 'info',   title: '📡 Support Beacon Answered',   message: 'Allied runner BLR_SprintKing responded to your reinforcement beacon at Sunset Heights. Area defense +20%.', time: '8h ago' },
  { id: 'alert9', type: 'decay',  title: '☠ RR Nagar Sector Lost',       message: 'RR Nagar Sector Ch.112 has fully decayed to neutral. No allied activity in 12 days. Recapture recommended.', time: '10h ago' },
  { id: 'alert10', type: 'info',  title: '🎯 Daily Quest Complete',       message: 'You completed today\'s 3km daily quest. Streak: 16 days 🔥 Bonus: +2 HP Stamina restored.', time: '12h ago' },
];

export const initialSupportRequests: SupportRequest[] = [
  {
    id: 'req1',
    sectorId: 'heights',
    sectorName: 'Sunset Heights (Indiranagar)',
    requestType: 'reinforcements',
    status: 'active',
    description: 'Rivals are heavily reinforcing this zone. Requesting beacon help for double XP defense.',
    timestamp: '2026-05-25 21:00',
  },
];
