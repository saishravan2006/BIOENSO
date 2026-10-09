import { useState, useEffect, useRef } from 'react';
import { Network, Activity, Settings, LayoutDashboard, Cloud, ShieldAlert, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { parseLegacyBiologyResponse, extractBehaviouralFeatures, detectBiologicalEvents, TemporalEventCorrelationLayer } from 'bioenso-shared';
import { SimulatedEnvironmentalSource, LiveApiEnvironmentalSource, EnvironmentHistoryBuffer, extractClimateFeatures, ClimateKMeans } from 'bioenso-shared';
import type { EnvironmentalConnectionState } from 'bioenso-shared';
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
    const [candidates, setCandidates] = useState<any[]>([]);
      const [envSourceType, setEnvSourceType] = useState<"SIMULATED" | "LIVE">("SIMULATED");
  const [_liveEnv, setLiveEnv] = useState<any>(null);
  const [_envConnectionState, setEnvConnectionState] = useState<EnvironmentalConnectionState | null>(null);
  const [_climateFeatures, setClimateFeatures] = useState<any>(null);
  const envHistoryRef = useRef(new EnvironmentHistoryBuffer());
  const climateKMeansRef = useRef(new ClimateKMeans({ k: 3, maxIterations: 50, featuresToUse: ["meanTemperature", "meanHumidity", "temperatureVariability"], version: "0.1-PROVISIONAL" }));
  const historyRef = useRef<any[]>([]);
    const correlationLayer = useRef(new TemporalEventCorrelationLayer());
  
  // Poll Environmental API (same contract as bioenso-ui)
  useEffect(() => {
    const edgeApiUrl = import.meta.env.VITE_EDGE_API_URL || 'http://localhost:8000';
    let liveSource: LiveApiEnvironmentalSource | null = null;
    let source: SimulatedEnvironmentalSource | LiveApiEnvironmentalSource;

    if (envSourceType === "LIVE") {
      liveSource = new LiveApiEnvironmentalSource(edgeApiUrl + '/api/v1/observations/environment');
      source = liveSource;
    } else {
      source = new SimulatedEnvironmentalSource();
      setEnvConnectionState(null);
    }

    const interval = setInterval(async () => {
      try {
        const obs = await source.getLatest();
        setLiveEnv(obs);
        envHistoryRef.current.addObservation(obs);
        if (liveSource) setEnvConnectionState(liveSource.getConnectionState());

        try {
          const features = extractClimateFeatures(envHistoryRef.current.getValidHistory(), 30);
          setClimateFeatures(features);
          try {
            const histForClustering = envHistoryRef.current.getValidHistory();
            if (histForClustering.length >= 10) {
              const allClimateFeatures = [];
              for (let i = 0; i < Math.min(histForClustering.length, 30); i++) {
                allClimateFeatures.push(extractClimateFeatures(histForClustering.slice(0, i+1), 30));
              }
              climateKMeansRef.current.fit(allClimateFeatures);
            }
          } catch (e) { /* Insufficient data for clustering � do NOT invent one */ }
        } catch (e) {
          setClimateFeatures(null);
        }
      } catch (err) {
        // Connection failed � do NOT substitute simulated data in live mode
        if (liveSource) setEnvConnectionState(liveSource.getConnectionState());
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [envSourceType]);

    useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch((import.meta.env.VITE_EDGE_API_URL || 'http://localhost:8000') + '/api/v1/observations/biology');
        if (res.ok) {
          const data = await res.json();
          const parsed = parseLegacyBiologyResponse(data);
            setLiveBiology(parsed);
            
            historyRef.current.push(parsed);
            if (historyRef.current.length > 60) historyRef.current.shift();
            
            if (historyRef.current.length >= 2) {
               const features = extractBehaviouralFeatures(historyRef.current.slice(0, Math.floor(historyRef.current.length/2)), historyRef.current.slice(Math.floor(historyRef.current.length/2)), 60);
               const events = detectBiologicalEvents(features, parsed);
               const cands = correlationLayer.current.processInterval(features, events, undefined, new Date().toISOString());
               if (cands.length > 0) {
                   setCandidates(prev => {
                       const active = cands.filter((c: any) => c.status === "ACTIVE" || c.status === "INSUFFICIENT_EVIDENCE");
                       return active.length > 0 ? active : prev;
                   });
               }
            }
        }
      } catch (err) {
        // Ignore API errors gracefully when vision script is offline
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const farms = getNetworkState(networkScenario, liveBiology, candidates as any, _liveEnv, _envConnectionState, envSourceType);
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

            <div className="flex items-center space-x-2 mt-4 mb-3 text-white/50">
              <Activity size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Environment Source</span>
            </div>
            <select 
              value={envSourceType}
              onChange={(e) => setEnvSourceType(e.target.value as "SIMULATED" | "LIVE")}
              className="w-full bg-black/50 border border-white/20 text-white text-xs font-bold p-2 rounded-lg outline-none"
            >
              <option value="SIMULATED">Simulated</option>
              <option value="LIVE">Live (Edge API)</option>
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

