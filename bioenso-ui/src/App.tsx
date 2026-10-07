import { useState, useEffect } from 'react'
import { Camera, Home, List, Bell, Settings } from 'lucide-react'
import clsx from 'clsx'

import HomeScreen from './components/HomeScreen'
import LiveScreen from './components/LiveScreen'
import AnimalsScreen from './components/AnimalsScreen'
import AlertsScreen from './components/AlertsScreen'
import FarmScreen from './components/FarmScreen'

import { getScenarioState } from './AppState'
import type { ScenarioType } from './AppState'
type TabType = "home" | "live" | "animals" | "alerts" | "farm";

export default function App() {
  const [scenario, setScenario] = useState<ScenarioType>("NORMAL");
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [activeAction, setActiveAction] = useState(false);
  const [recoveryRisk, setRecoveryRisk] = useState<number | null>(null);

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
          // Drop risk down progressively: 86 -> 78 -> 69 -> 57 -> 44 -> 32
          let nextRisk = recoveryRisk;
          if (recoveryRisk === 86) nextRisk = 78;
          else if (recoveryRisk === 78) nextRisk = 69;
          else if (recoveryRisk === 69) nextRisk = 57;
          else if (recoveryRisk === 57) nextRisk = 44;
          else if (recoveryRisk === 44) nextRisk = 32;
          
          setRecoveryRisk(nextRisk);
        }, 1500); // 1.5 seconds per drop for demo
        return () => clearTimeout(timer);
      }
    }
  }, [scenario, recoveryRisk]);

  const appState = getScenarioState(scenario, recoveryRisk ?? undefined);

  const getThemeClasses = () => {
    if (appState.riskState.level === "ACT NOW" && scenario === "CRITICAL_HEAT") return "from-rose-500 to-red-900";
    if (appState.riskState.level === "ACT NOW" && scenario === "FLOOD_RISK") return "from-blue-600 to-slate-900";
    if (appState.riskState.level === "WATCH") return "from-amber-400 to-orange-700";
    if (scenario === "RECOVERY") {
      if (appState.riskState.score < 40) return "from-emerald-400 to-teal-900"; // Normalized
      return "from-emerald-600 to-blue-900"; // Recovering
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
          {activeTab === "farm" && <FarmScreen appState={appState} setScenario={(s: ScenarioType) => { setScenario(s); setRecoveryRisk(null); }} setActiveAction={setActiveAction} />}
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
