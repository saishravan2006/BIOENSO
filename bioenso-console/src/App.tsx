import { useState, useEffect } from 'react';
import { Network, Activity, Settings, LayoutDashboard, Cloud, ShieldAlert, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { getNetworkState } from './AppState';
import type { NetworkScenario } from './AppState';
import ObservatoryHome from './components/ObservatoryHome';
import OverviewTab from './components/OverviewTab';
import ClimateTab from './components/ClimateTab';
import BiologyTab from './components/BiologyTab';
import EngineTab from './components/EngineTab';
import InterventionTab from './components/InterventionTab';
import RecoveryTab from './components/RecoveryTab';

export type FarmTab = "OVERVIEW" | "ENVIRONMENT" | "BIOLOGY" | "ENGINE" | "INTERVENTION" | "RECOVERY";

function App() {
  const [networkScenario, setNetworkScenario] = useState<NetworkScenario>("NETWORK_HEAT_EVENT");
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [activeFarmTab, setActiveFarmTab] = useState<FarmTab>("OVERVIEW");
  const [liveBiology, setLiveBiology] = useState<any>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/observations/biology');
        if (res.ok) {
          const data = await res.json();
          setLiveBiology(data.biology);
        }
      } catch (err) {
        // Ignore API errors gracefully when vision script is offline
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const farms = getNetworkState(networkScenario, liveBiology);
  const selectedFarm = selectedFarmId ? farms.find(f => f.id === selectedFarmId) : null;

  return (
    <div className="flex h-screen bg-[#050505] text-[#e5e5e5] font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-white/10 flex flex-col justify-between bg-black/50 z-20 relative shrink-0">
        <div>
          <div className="p-6 pb-8">
            <h1 className="text-xl font-black tracking-widest uppercase">BioENSO<br/><span className="text-white/50 text-xs tracking-[0.3em]">Console</span></h1>
          </div>
          
          <nav className="space-y-1 px-3 mb-8">
            <div className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase px-4 mb-2">Network Level</div>
            <button
              onClick={() => setSelectedFarmId(null)}
              className={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors text-left",
                selectedFarmId === null ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
            >
              <Network size={18} />
              <span>Observatory</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors text-left text-white/20 cursor-not-allowed">
              <LayoutDashboard size={18} />
              <span>Farms</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors text-left text-white/20 cursor-not-allowed">
              <Cloud size={18} />
              <span>Climate</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors text-left text-white/20 cursor-not-allowed">
              <ShieldAlert size={18} />
              <span>Events</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors text-left text-white/20 cursor-not-allowed">
              <Settings size={18} />
              <span>System</span>
            </button>
          </nav>
          
          {selectedFarm && (
            <nav className="space-y-1 px-3">
              <div className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase px-4 mb-2 mt-4 border-t border-white/10 pt-4">Farm Intelligence</div>
              <div className="px-4 mb-4 text-xs font-bold text-white flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{selectedFarm.name}</span>
              </div>
              
              {[
                { id: "OVERVIEW", label: "Overview" },
                { id: "ENVIRONMENT", label: "Environment" },
                { id: "BIOLOGY", label: "Biology" },
                { id: "ENGINE", label: "Engine" },
                { id: "INTERVENTION", label: "Intervention" },
                { id: "RECOVERY", label: "Recovery" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFarmTab(tab.id as FarmTab)}
                  className={clsx(
                    "w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors text-left",
                    activeFarmTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  )}
                >
                  <span className={clsx("w-1 h-1 rounded-full", activeFarmTab === tab.id ? "bg-white" : "bg-transparent")} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Demo Control */}
        <div className="p-6 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex items-center space-x-2 mb-3 text-white/50">
              <Activity size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Global Scenario</span>
            </div>
            <select 
              value={networkScenario}
              onChange={(e) => setNetworkScenario(e.target.value as NetworkScenario)}
              className="w-full bg-black/50 border border-white/20 text-white text-xs font-bold p-2 rounded-lg outline-none"
            >
              <option value="NETWORK_NORMAL">Network Normal</option>
              <option value="NETWORK_HEAT_EVENT">Network Heat Event</option>
              <option value="NETWORK_FLOOD_EVENT">Network Flood Event</option>
              <option value="NETWORK_RECOVERY">Network Recovery</option>
              <option value="NETWORK_OFFLINE">Network Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto relative bg-[#050505] hide-scrollbar">
        {selectedFarmId === null ? (
          <div className="relative z-10 min-h-full p-10">
            <ObservatoryHome farms={farms} onSelectFarm={setSelectedFarmId} />
          </div>
        ) : selectedFarm ? (
          <div className="relative z-10 min-h-full p-10 flex flex-col">
            <button 
              onClick={() => setSelectedFarmId(null)}
              className="flex items-center space-x-2 text-[10px] font-black tracking-widest uppercase text-white/50 hover:text-white mb-8 transition-colors self-start"
            >
              <ArrowLeft size={14} />
              <span>Back to Observatory</span>
            </button>
            <div className="flex-1">
              {activeFarmTab === "OVERVIEW" && <OverviewTab farm={selectedFarm} setActiveTab={setActiveFarmTab} />}
              {activeFarmTab === "ENVIRONMENT" && <ClimateTab farm={selectedFarm} />}
              {activeFarmTab === "BIOLOGY" && <BiologyTab farm={selectedFarm} />}
              {activeFarmTab === "ENGINE" && <EngineTab farm={selectedFarm} />}
              {activeFarmTab === "INTERVENTION" && <InterventionTab farm={selectedFarm} />}
              {activeFarmTab === "RECOVERY" && <RecoveryTab farm={selectedFarm} />}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
