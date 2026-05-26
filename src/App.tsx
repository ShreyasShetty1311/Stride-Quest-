import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './screens/LoginScreen';
import { Dashboard } from './screens/Dashboard';
import { TacticalMap } from './screens/TacticalMap';
import { TerritoryView } from './screens/TerritoryView';
import { Leaderboard } from './screens/Leaderboard';
import { ActiveSession } from './screens/ActiveSession';
import { Profile } from './screens/Profile';
import { 
  initialUser, 
  initialSectors, 
  initialAlerts, 
  initialSupportRequests, 
  initialRecentActivity, 
  UserProfile, 
  Sector, 
  AlertNotification, 
  SupportRequest, 
  DashboardCapture 
} from './data/mockDb';

export default function App() {
  const { userId, isAuthenticated, markAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [deployOrigin, setDeployOrigin] = useState<[number, number]>([12.9406554, 77.5659529]);

  // Central Mock Database states
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [alerts, setAlerts] = useState<AlertNotification[]>(initialAlerts);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(initialSupportRequests);
  const [recentActivity, setRecentActivity] = useState<DashboardCapture[]>(initialRecentActivity);

  const startSession = (origin: [number, number]) => {
    setDeployOrigin(origin);
    setIsSessionActive(true);
  };
  
  const stopSession = () => {
    setIsSessionActive(false);

    // Read real session results from the territory engine
    // (session is ended by ActiveSession component — grab last event data)
    const lastEvents = (window as any).__lastSessionResult as { distanceKm: number; capturedTiles: number } | undefined;
    const distanceKm = lastEvents?.distanceKm ?? 0.5;
    const capturedTiles = lastEvents?.capturedTiles ?? 0;

    const completedSectorName = activeTab === 'territory' ? 'Sunset Heights' : 'Sector 7-G (Cubbon Park)';
    const gainText = capturedTiles > 0 ? `+${capturedTiles} tiles` : `+0.5 SQ KM`;

    const newLoot: DashboardCapture = {
      name: `${completedSectorName} Circuit`,
      stats: `${distanceKm.toFixed(2)} km run • Just now`,
      gain: gainText,
      img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=120&h=120&fit=crop'
    };
    setRecentActivity(prev => [newLoot, ...prev]);

    const newAlert: AlertNotification = {
      id: `alert-${Date.now()}`,
      type: 'info',
      title: 'Conquest Completed',
      message: `Completed run at ${completedSectorName}! ${capturedTiles > 0 ? `${capturedTiles} tiles captured.` : 'Area secure.'}`,
      time: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev]);

    setUser(prev => ({
      ...prev,
      level: prev.level + 1,
      stats: {
        ...prev.stats,
        distance: Number((prev.stats.distance + distanceKm).toFixed(1)),
        capturedArea: Number((prev.stats.capturedArea + capturedTiles * 0.0025).toFixed(3)),
        streak: prev.stats.streak + 1,
        stamina: Math.min(prev.stats.stamina + 2, 10)
      }
    }));
  };

  // Mutator Actions
  const handleUpdateUser = (updatedFields: Partial<UserProfile>) => {
    setUser(prev => ({
      ...prev,
      ...updatedFields
    }));
  };

  const handleFortifySector = (sectorId: string) => {
    // Check if player has stamina to perform fortification (cost: 1 HP)
    if (user.stats.stamina <= 0) {
      alert("No Stamina (HP) left! Complete runs to regenerate stamina.");
      return;
    }

    setSectors(prev => prev.map(sec => {
      if (sec.id === sectorId) {
        return {
          ...sec,
          health: Math.min(sec.health + 10, 100),
          statusEffect: sec.health + 10 >= 90 ? 'NONE' : sec.statusEffect
        };
      }
      return sec;
    }));

    // Deduct stamina and increase AP armor
    setUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        stamina: Math.max(prev.stats.stamina - 1, 0),
        armor: Math.min(prev.stats.armor + 1, 10)
      }
    }));

    // Post fortification alert
    const targetSector = sectors.find(s => s.id === sectorId);
    const newAlert: AlertNotification = {
      id: `alert-${Date.now()}`,
      type: 'info',
      title: 'Sector Fortified',
      message: `${targetSector?.name || 'Sector'} reinforced by +10% health.`,
      time: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleAddSupportRequest = (sectorId: string, requestType: 'reinforcements' | 'repair' | 'bug_report', description: string) => {
    const targetSector = sectors.find(s => s.id === sectorId) || sectors[0];
    const newRequest: SupportRequest = {
      id: `req-${Date.now()}`,
      sectorId: targetSector.id,
      sectorName: targetSector.name,
      requestType,
      status: 'active',
      description,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setSupportRequests(prev => [newRequest, ...prev]);

    // Dispatch beacon notification alert
    const newAlert: AlertNotification = {
      id: `alert-${Date.now()}`,
      type: 'info',
      title: 'Support Beacon Active',
      message: `Dispatched ${requestType} beacon for ${targetSector.name}.`,
      time: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleDeleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(al => al.id !== alertId));
  };

  // ── Login gate ────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="font-pixel text-[9px] text-mc-gold animate-pulse tracking-widest">BOOTING STRIDE QUEST...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={markAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-background-dark font-sans text-slate-100 flex flex-col mx-auto w-full">
      {/* Content Area */}
      <div className="flex-1 relative">
        {activeTab === 'dashboard' && (
          <Dashboard 
            user={user}
            alerts={alerts}
            recentActivity={recentActivity}
            onStartConquest={() => startSession([12.9406554, 77.5659529])} 
            onNavigate={setActiveTab}
            onAddSupportRequest={handleAddSupportRequest}
            onDeleteAlert={handleDeleteAlert}
          />
        )}
        {activeTab === 'map' && (
          <TacticalMap 
            onDeploy={startSession}
            isSessionActive={isSessionActive}
          />
        )}
        {activeTab === 'territory' && (
          <TerritoryView 
            sectors={sectors}
            stamina={user.stats.stamina}
            onStartConquest={() => startSession([12.9406554, 77.5659529])} 
            onNavigate={setActiveTab} 
            onFortify={handleFortifySector}
          />
        )}
        {activeTab === 'leaderboard' && (
          <Leaderboard />
        )}
        {activeTab === 'profile' && (
          <Profile 
            user={user}
            supportRequests={supportRequests}
            onUpdateUser={handleUpdateUser}
            onAddSupportRequest={handleAddSupportRequest}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Full Screen Modal for Active Session */}
      {isSessionActive && (
        <ActiveSession onStop={stopSession} userId={userId} startOrigin={deployOrigin} />
      )}
    </div>
  );
}
