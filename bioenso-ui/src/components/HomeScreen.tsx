import { useState } from 'react';
import { Wind, Droplets, Thermometer, CheckCircle2, ChevronRight, CloudRain, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { AppState } from '../AppState';

export default function HomeScreen({ appState, activeAction, setActiveAction }: { appState: AppState, activeAction: boolean, setActiveAction: any }) {
  const [showWhy, setShowWhy] = useState(false);
  const { scenario, environment, animalState, riskState } = appState;
  const isOffline = scenario === "OFFLINE";
  const isRecovery = scenario === "RECOVERY";

  return (
    <div className="flex flex-col min-h-full pb-32 pt-14 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mix-blend-overlay">BIOENSO</h1>
          <p className="text-sm font-bold text-white/60 tracking-wide mt-1">Green Valley Farm</p>
        </div>
        <div className={clsx(
          "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
          isOffline ? "bg-black/30 border-white/10 text-white/50" : "bg-white/10 border-white/20 text-white"
        )}>
          <div className={clsx("w-1.5 h-1.5 rounded-full", isOffline ? "bg-white/30" : "bg-green-400 animate-pulse")} />
          <span>{isOffline ? "Offline" : "Live"}</span>
        </div>
      </div>

      {/* Main Status */}
      <div className="mt-12">
        <h2 className={clsx(
          "text-[14px] font-black tracking-widest uppercase mb-2",
          (riskState.level === "ACT NOW") ? "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" : 
          (isRecovery) ? "text-emerald-400" : "text-white/60"
        )}>
          {riskState.level === "ACT NOW" ? (
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-rose-400 relative" />
              <span>{riskState.level}</span>
            </span>
          ) : riskState.level}
        </h2>
        <p className="text-3xl font-bold text-white leading-tight tracking-tight drop-shadow-sm max-w-[280px]">
          {riskState.message}
        </p>
      </div>

      {/* Recovery Chart & Effectiveness */}
      {isRecovery && (
        <div className="mt-8 bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-2xl rounded-[32px] p-6 shadow-2xl">
          {riskState.score <= 32 ? (
            <div className="animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">Intervention Effectiveness</div>
                  <div className="text-sm font-bold text-white mt-1">Biological recovery detected.</div>
                </div>
                <CheckCircle2 size={24} className="text-emerald-300 shrink-0" />
              </div>
              
              <div className="space-y-4 font-bold text-white text-sm mb-2">
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2"><span className="text-white/50">Cooling activated</span><span>14:32</span></div>
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2"><span className="text-white/50">Risk before</span><span className="text-rose-400 line-through">86</span></div>
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2"><span className="text-white/50">Risk now</span><span className="text-emerald-400">32</span></div>
                <div className="flex justify-between items-center pt-2"><span className="text-white/50 uppercase tracking-widest text-[10px]">Estimated effect</span><span className="text-emerald-400 tracking-widest uppercase">High</span></div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">Biological Recovery</div>
                  <div className="text-sm font-bold text-white mt-1">Animal stress indicators are returning toward baseline.</div>
                </div>
                <Wind size={24} className="text-emerald-300 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              
              <div className="mt-6 flex items-end h-24 space-x-2">
                <div className="w-1/4 bg-white/20 rounded-t-lg h-[86%]" />
                <div className="w-1/4 bg-emerald-400/30 rounded-t-lg h-[69%]" />
                <div className="w-1/4 bg-emerald-400/70 rounded-t-lg h-[57%]" />
                <div className="w-1/4 bg-emerald-400 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: `${riskState.score}%` }} />
                <div className="flex-1 flex flex-col justify-end pb-2 pl-4">
                  <span className="text-white/50 line-through font-bold text-sm">86</span>
                  <span className="text-emerald-300 font-black text-2xl tracking-tighter">{riskState.score}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Score Pill (Hidden during recovery to prefer chart) */}
      {!isRecovery && (
        <div className="mt-8">
          <div className="relative inline-block">
            <div className="flex items-start">
              <span className="text-[140px] leading-none font-black text-white tracking-tighter drop-shadow-2xl">
                {riskState.score}
              </span>
              <div className="flex flex-col mt-4 ml-2">
                <span className="text-2xl font-black text-white/50 leading-none">/100</span>
              </div>
            </div>
            <div className="absolute -bottom-2 right-0 flex items-center space-x-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-xs font-black tracking-widest uppercase text-white/90">LIVESTOCK RISK</span>
            </div>
          </div>
        </div>
      )}

      {/* Why? Button & Explanation */}
      {(scenario === "HEAT_RISK" || scenario === "CRITICAL_HEAT" || scenario === "FLOOD_RISK") && !activeAction && (
        <div className="mt-8">
          <button 
            onClick={() => setShowWhy(!showWhy)}
            className="w-full flex items-center justify-between bg-black/20 backdrop-blur-md border border-white/10 rounded-full px-6 py-4 shadow-lg active:scale-95 transition-all"
          >
            <span className="font-black text-[11px] tracking-[0.2em] text-white/70 uppercase">Why is BioENSO alerting you?</span>
            <ChevronRight className={clsx("text-white/50 transition-transform", showWhy && "rotate-90")} size={20} />
          </button>
          
          {showWhy && (
            <div className="mt-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
              <div className="space-y-6">
                
                <div>
                  <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Environment</h4>
                  <div className="flex items-start space-x-4 mb-3">
                    <Thermometer className="text-rose-400 mt-0.5" size={20} />
                    <div>
                      <div className="font-bold text-white">Temperature {environment.temperature}°C</div>
                      <div className="text-xs font-bold text-white/70 mt-1">↑ Above your farm baseline (+{environment.tempDiff}°C)</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <CloudRain className="text-rose-400 mt-0.5" size={20} />
                    <div>
                      <div className="font-bold text-white">Humidity {environment.humidity}%</div>
                      <div className="text-xs font-bold text-white/70 mt-1">↑ Elevated</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Animal Behavior</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold text-white/70">Shade seeking</div>
                      <div className="font-bold text-rose-300">↑ {animalState.shadeOccupancyDiff}%</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/70">Water visits</div>
                      <div className="font-bold text-rose-300">↑ {animalState.waterDemandDiff}%</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/70">Movement</div>
                      <div className="font-bold text-orange-300">↓ {Math.abs(animalState.movementDiff)}%</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Persistence</h4>
                  <div className="flex items-center space-x-3">
                    <Clock className="text-white/50" size={16} />
                    <span className="text-sm font-bold text-white">Changes observed for 19 minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">BioENSO Conclusion</h4>
                <p className="text-sm font-bold text-white">
                  Animal behavior is changing consistently with increasing {scenario === "FLOOD_RISK" ? "flood risk" : "thermal stress"}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Section */}
      {!["NORMAL", "OFFLINE"].includes(scenario) && !isRecovery && (
        <div className="mt-10">
          <h2 className="text-[11px] font-black text-white/50 mb-4 tracking-[0.2em] uppercase">Action Now</h2>
          <div className="bg-black/20 backdrop-blur-2xl rounded-[32px] p-6 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
            <ul className="space-y-4 mb-8">
              {scenario === "HEAT_RISK" || scenario === "CRITICAL_HEAT" ? (
                <>
                  <li className="flex items-center space-x-4">
                    <div className={clsx("w-6 h-6 rounded-md border-2 flex items-center justify-center", activeAction ? "bg-emerald-500 border-emerald-500" : "border-white/30")}>
                      {activeAction && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <span className={clsx("font-medium text-lg tracking-tight", activeAction ? "text-white/50 line-through" : "text-white")}>Start cooling</span>
                  </li>
                  <li className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-md border-2 border-white/30" />
                    <span className="text-white font-medium text-lg tracking-tight">Ensure drinking water</span>
                  </li>
                  <li className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-md border-2 border-white/30" />
                    <span className="text-white font-medium text-lg tracking-tight">Move animals to shade</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-md border-2 border-white/30" />
                    <span className="text-white font-medium text-lg tracking-tight">Move livestock to elevated area</span>
                  </li>
                  <li className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-md border-2 border-white/30" />
                    <span className="text-white font-medium text-lg tracking-tight">Protect feed</span>
                  </li>
                  <li className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-md border-2 border-white/30" />
                    <span className="text-white font-medium text-lg tracking-tight">Check electrical equipment</span>
                  </li>
                </>
              )}
            </ul>
            
            {!activeAction && (
              <button
                onClick={() => setActiveAction(true)}
                className={clsx(
                  "w-full py-5 rounded-[24px] font-black tracking-widest uppercase text-lg transition-all active:scale-95 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex items-center justify-center space-x-3",
                  "bg-white text-rose-600"
                )}
              >
                <Wind size={24} />
                <span>{riskState.primaryAction.toUpperCase()}</span>
              </button>
            )}

            {activeAction && (
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center space-x-3 mb-6 text-emerald-400">
                  <Wind size={20} className="animate-spin" style={{ animationDuration: '2s' }} />
                  <span className="font-black uppercase tracking-widest text-sm">Action Active</span>
                </div>
                
                {scenario === "FLOOD_RISK" ? (
                  <div className="space-y-3 font-bold text-white text-sm">
                    <div className="flex justify-between items-center"><span className="text-white/50">Animals Relocated</span><span className="text-emerald-400">27 / 30</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/50">Safe Zone Occupancy</span><span className="text-emerald-400">90%</span></div>
                  </div>
                ) : (
                  <div className="space-y-3 font-bold text-white text-sm">
                    <div className="flex justify-between items-center"><span className="text-white/50">Fan 1</span><span className="text-emerald-400">ON</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/50">Fan 2</span><span className="text-emerald-400">ON</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/50">Water point</span><span className="text-emerald-400">READY</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/50">Herd zone</span><span className="text-emerald-400">B → A</span></div>
                  </div>
                )}
                <p className="text-[10px] font-black text-emerald-200/70 mt-6 border-t border-emerald-500/20 pt-4 uppercase tracking-widest">Initiating biological recovery...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sensor Data Pills */}
      <div className="px-6 mt-10">
        <h2 className="text-[11px] font-black text-white/50 mb-4 tracking-[0.2em] uppercase">Simulated Environment</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar">
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 min-w-[140px] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex flex-col justify-between">
            <Thermometer size={24} className="text-white/60 mb-6" />
            <div>
              <div className="text-4xl font-black text-white tracking-tighter">{environment.temperature}&deg;</div>
              <div className="text-xs font-bold text-white/50 tracking-wide mt-1">TEMP</div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 min-w-[140px] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex flex-col justify-between">
            <Wind size={24} className="text-white/60 mb-6" />
            <div>
              <div className="text-4xl font-black text-white tracking-tighter">{environment.humidity}%</div>
              <div className="text-xs font-bold text-white/50 tracking-wide mt-1">HUMIDITY</div>
            </div>
          </div>

          {scenario === "FLOOD_RISK" && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 min-w-[140px] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex flex-col justify-between">
              <Droplets size={24} className="text-orange-300 mb-6" />
              <div>
                <div className="text-4xl font-black text-orange-300 tracking-tighter">{environment.rainfall}<span className="text-xl">mm</span></div>
                <div className="text-xs font-bold text-white/50 tracking-wide mt-1">RAIN</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
