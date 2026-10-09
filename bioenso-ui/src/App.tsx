import { useState, useEffect, useRef } from 'react'
import { Camera, Home, List, Bell, Settings } from 'lucide-react'
import clsx from 'clsx'

import HomeScreen from './components/HomeScreen'
import LiveScreen from './components/LiveScreen'
import AnimalsScreen from './components/AnimalsScreen'
import AlertsScreen from './components/AlertsScreen'
import FarmScreen from './components/FarmScreen'

import { parseLegacyBiologyResponse, extractBehaviouralFeatures, detectBiologicalEvents, TemporalEventCorrelationLayer } from 'bioenso-shared';
import { SimulatedEnvironmentalSource, LiveApiEnvironmentalSource, EnvironmentHistoryBuffer, extractClimateFeatures, ClimateKMeans } from 'bioenso-shared';
import type { EnvironmentalConnectionState } from 'bioenso-shared';
import { getScenarioState } from './AppState'
import type { ScenarioType } from './AppState'
type TabType = "home" | "live" | "animals" | "alerts" | "farm";

export default function App() {
  const [scenario, setScenario] = useState<ScenarioType>("NORMAL");
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [activeAction, setActiveAction] = useState(false);
  const [recoveryRisk, setRecoveryRisk] = useState<number | null>(null);
  const [liveBiology, setLiveBiology] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [envSourceType, setEnvSourceType] = useState<"SIMULATED" | "LIVE">("SIMULATED");
  const [liveEnv, setLiveEnv] = useState<any>(null);
  // Tracks connection status separately from observation validity.
  // null = never attempted (SIMULATED mode). Object = live mode with state.
  const [envConnectionState, setEnvConnectionState] = useState<EnvironmentalConnectionState | null>(null);
  const [climateFeatures, setClimateFeatures] = useState<any>(null);
  const envHistoryRef = useRef(new EnvironmentHistoryBuffer());
  const climateKMeansRef = useRef(new ClimateKMeans({ k: 3, maxIterations: 50, featuresToUse: ["meanTemperature", "meanHumidity", "temperatureVariability"], version: "0.1-PROVISIONAL" }));
  const historyRef = useRef<any[]>([]);
  const correlationLayer = useRef(new TemporalEventCorrelationLayer());

  // Poll Environmental API
  useEffect(() => {
    const edgeApiUrl = import.meta.env.VITE_EDGE_API_URL || 'http://localhost:8000';
    let liveSource: LiveApiEnvironmentalSource | null = null;
    let source: SimulatedEnvironmentalSource | LiveApiEnvironmentalSource;

    if (envSourceType === "LIVE") {
      liveSource = new LiveApiEnvironmentalSource(edgeApiUrl + '/api/v1/observations/environment');
      source = liveSource;
    } else {
      source = new SimulatedEnvironmentalSource();
      // In SIMULATED mode, clear any stale live-connection state
      setEnvConnectionState(null);
    }

    const interval = setInterval(async () => {
      try {
        const obs = await source.getLatest();
        setLiveEnv(obs);
        envHistoryRef.current.addObservation(obs);

        // Expose live connection state when in live mode
        if (liveSource) {
          setEnvConnectionState(liveSource.getConnectionState());
        }

        try {
          const features = extractClimateFeatures(envHistoryRef.current.getValidHistory(), 30);
          setClimateFeatures(features);
          // Clustering is contextual info only, not a replacement for the BTI risk score
          try {
            const histForClustering = envHistoryRef.current.getValidHistory();
            if (histForClustering.length >= 10) {
              const allClimateFeatures = [];
              for (let i = 0; i < Math.min(histForClustering.length, 30); i++) {
                allClimateFeatures.push(extractClimateFeatures(histForClustering.slice(0, i+1), 30));
              }
              climateKMeansRef.current.fit(allClimateFeatures);
            }
          } catch (e) {
            // Insufficient data for clustering — silently skip; do NOT invent a cluster
          }
        } catch (e) {
          setClimateFeatures(null); // Insufficient history
        }
      } catch (err) {
        // Connection failed — explicitly track disconnect; do NOT substitute simulated data
        if (liveSource) {
          setEnvConnectionState(liveSource.getConnectionState());
        }
        // liveEnv remains at its last valid value so UI can show "stale" rather than zero
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [envSourceType]);

  // Poll Vision API
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
        // Handle gracefully if vision script is offline
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Recovery transition logic
  useEffect(() => {
    if (activeAction && (scenario === "CRITICAL_HEAT" || scenario === "FLOOD_RISK")) {
      const timer = setTimeout(() => {
        setScenario("RECOVERY");
        setRecoveryRisk(86);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeAction, scenario]);

  useEffect(() => {
    if (scenario === "RECOVERY" && recoveryRisk !== null) {
      if (recoveryRisk > 32) {
        const timer = setTimeout(() => {
          let nextRisk = recoveryRisk;
          if (recoveryRisk === 86) nextRisk = 78;
          else if (recoveryRisk === 78) nextRisk = 69;
          else if (recoveryRisk === 69) nextRisk = 57;
          else if (recoveryRisk === 57) nextRisk = 44;
          else if (recoveryRisk === 44) nextRisk = 32;
          setRecoveryRisk(nextRisk);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [scenario, recoveryRisk]);

  const appState = getScenarioState(scenario, recoveryRisk ?? undefined, liveBiology, candidates, liveEnv, climateFeatures, envSourceType, envConnectionState);

  const getThemeClasses = () => {
    if (appState.riskState.level === "ACT NOW" && scenario === "CRITICAL_HEAT") return "from-rose-500 to-red-900";
    if (appState.riskState.level === "ACT NOW" && scenario === "FLOOD_RISK") return "from-blue-600 to-slate-900";
    if (appState.riskState.level === "WATCH") return "from-amber-400 to-orange-700";
    if (scenario === "RECOVERY") {
      if (appState.riskState.score !== null && appState.riskState.score < 40) return "from-emerald-400 to-teal-900";
      return "from-emerald-600 to-blue-900";
    }
    if (scenario === "OFFLINE") return "from-slate-400 to-slate-800";
    return "from-emerald-400 to-teal-900";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-0 sm:p-6">
      <div className="w-full h-full sm:h-[850px] max-w-md flex flex-col overflow-hidden bg-black relative sm:rounded-[40px] sm:shadow-[0_0_0_12px_rgba(30,41,59,1),0_0_60px_rgba(0,0,0,0.5)] sm:border sm:border-slate-700">

        {/* App Shell Background */}
        <div className={clsx("absolute inset-0 bg-gradient-to-br transition-colors duration-1000 ease-in-out", getThemeClasses())} />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar">
          {activeTab === "home" && <HomeScreen appState={appState} activeAction={activeAction} setActiveAction={setActiveAction} />}
          {activeTab === "live" && <LiveScreen appState={appState} />}
          {activeTab === "animals" && <AnimalsScreen appState={appState} />}
          {activeTab === "alerts" && <AlertsScreen appState={appState} />}
          {activeTab === "farm" && <FarmScreen appState={appState} setScenario={(s: ScenarioType) => { setScenario(s); setRecoveryRisk(null); }} setActiveAction={setActiveAction} envSourceType={envSourceType} setEnvSourceType={setEnvSourceType} />}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-6 left-0 w-full px-6 z-50">
          <nav className="w-full bg-black/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-full px-2 py-2">
            <div className="flex justify-between items-center h-14">
              {[
                { id: "home", icon: Home },
                { id: "live", icon: Camera },
                { id: "animals", icon: List },
                { id: "alerts", icon: Bell, badge: ["HEAT_RISK", "CRITICAL_HEAT", "FLOOD_RISK"].includes(scenario) },
                { id: "farm", icon: Settings }
              ].map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={clsx(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
                      isActive ? "bg-white/20 text-white shadow-inner" : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    )}
                  >
                    <div className="relative">
                      <Icon size={24} className={isActive ? "stroke-[2.5]" : "stroke-2"} />
                      {item.badge && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

