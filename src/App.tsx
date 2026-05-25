import { useState } from 'react';
import { Navigation } from './components/Navigation';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Central Mock Database states
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [alerts, setAlerts] = useState<AlertNotification[]>(initialAlerts);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(initialSupportRequests);
  const [recentActivity, setRecentActivity] = useState<DashboardCapture[]>(initialRecentActivity);

  const startSession = () => setIsSessionActive(true);
  
  const stopSession = () => {
    setIsSessionActive(false);
    // Add completed conquest run activity to logs
    const completedSectorName = activeTab === 'territory' ? 'Sunset Heights' : 'Sector 7-G (Cubbon Park)';
    const newLoot: DashboardCapture = {
      name: `${completedSectorName} Circuit`,
      stats: '1.2 km run • Just now',
      gain: '+0.5 SQ KM',
      img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=120&h=120&fit=crop'
    };
    setRecentActivity(prev => [newLoot, ...prev]);

    // Add alert notification
    const newAlert: AlertNotification = {
      id: `alert-${Date.now()}`,
      type: 'info',
      title: 'Conquest Completed',
      message: `Completed run at ${completedSectorName}! Area secure.`,
      time: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev]);

    // Reward user XP and stamina
    setUser(prev => ({
      ...prev,
      level: prev.level + 1,
      stats: {
        ...prev.stats,
        distance: Number((prev.stats.distance + 1.2).toFixed(1)),
        capturedArea: Number((prev.stats.capturedArea + 0.5).toFixed(1)),
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

  return (
    <div className="min-h-screen bg-background-dark font-sans text-slate-100 flex flex-col mx-auto w-full">
      {/* Content Area */}
      <div className="flex-1 relative">
        {activeTab === 'dashboard' && (
          <Dashboard 
            user={user}
            alerts={alerts}
            recentActivity={recentActivity}
            onStartConquest={startSession} 
            onNavigate={setActiveTab}
            onAddSupportRequest={handleAddSupportRequest}
            onDeleteAlert={handleDeleteAlert}
          />
        )}
        {activeTab === 'map' && (
          <TacticalMap 
            onDeploy={startSession} 
          />
        )}
        {activeTab === 'territory' && (
          <TerritoryView 
            sectors={sectors}
            stamina={user.stats.stamina}
            onStartConquest={startSession} 
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
        <ActiveSession onStop={stopSession} />
      )}
    </div>
  );
}
