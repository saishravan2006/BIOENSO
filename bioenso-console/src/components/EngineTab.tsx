import type { Farm } from '../AppState';
import clsx from 'clsx';
import { ArrowDown, CheckCircle2, ShieldAlert } from 'lucide-react';
import { BTI_WEIGHTS } from '../domain/bti/config';

export default function EngineTab({ farm }: { farm: Farm }) {
  const { currentEnvironment: environment, currentBiology: biology, currentClimate: climate, bti, baseline } = farm;
  
  const isCritical = bti.severity === "CRITICAL";
  
  const shadeSeekingDelta = biology.behavior.shadeSeeking - baseline.expectedBehavior.shadeSeeking;
  const movementDelta = biology.behavior.movement - baseline.expectedBehavior.movement;
  const waterDemandDelta = biology.behavior.waterDemand - baseline.expectedBehavior.waterDemand;
  const ruminationDelta = biology.behavior.ruminating - baseline.expectedBehavior.ruminating;
  
  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Observed biological response vs expected response</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">BIOENSO ENGINE</h1>
      </header>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column: The Pipeline & Risk Calculation */}
        <div className="col-span-4 space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6">BioENSO Impact Assessment</h3>
            <div className="absolute top-6 right-6 text-[9px] font-black text-emerald-400 uppercase tracking-widest">PROTOTYPE BTI</div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Climate Context ({(BTI_WEIGHTS.CLIMATE_CONTEXT * 100).toFixed(0)}%)</span><span className="font-bold text-white text-sm">{bti.components.climateContext.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Farm Exposure ({(BTI_WEIGHTS.FARM_EXPOSURE * 100).toFixed(0)}%)</span><span className="font-bold text-white text-sm">{bti.components.farmExposure.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Bio Response ({(BTI_WEIGHTS.BIOLOGICAL_RESPONSE * 100).toFixed(0)}%)</span><span className="font-bold text-white text-sm">{bti.components.biologicalResponse.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Persistence ({(BTI_WEIGHTS.PERSISTENCE * 100).toFixed(0)}%)</span><span className="font-bold text-white text-sm">{bti.components.persistence.toFixed(2)}</span></div>
            </div>
            
            <div className="flex justify-center mb-6"><ArrowDown className="text-white/20" size={16} /></div>
            
            <div className="text-center pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">BTI</div>
              <div className="text-5xl font-black tracking-tighter text-white">{bti.score} <span className="text-xl text-white/30">/ 100</span></div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">Weights are prototype values</p>
            </div>
          </div>
          
          {/* Persistence & Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl text-center flex flex-col justify-between">
              <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Persistence</div>
              <div className="text-3xl font-black text-white mb-4">{bti.persistenceMinutes} <span className="text-sm text-white/50">min</span></div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center space-x-1">
                <span>Signal Sustained</span>
                <CheckCircle2 size={12} />
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl text-center flex flex-col justify-between">
              <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Confidence</div>
              <div className="text-3xl font-black text-white mb-4">{bti.confidence}%</div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                Data Quality<br/>{bti.dataQuality}
              </div>
            </div>
          </div>

        </div>

        {/* Middle Column: Expected vs Observed & Residual */}
        <div className="col-span-8 space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-rose-500/10 blur-[80px]" />
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8 relative z-10">Biological Climate Residual</h3>
            
            <div className="text-[80px] font-black tracking-tighter leading-none text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-4 relative z-10">
              +{bti.residual} <span className="text-4xl text-white/50">σ</span>
            </div>
            
            <div className="text-sm font-black text-rose-400 uppercase tracking-[0.2em] mb-6 relative z-10">
              Significant Deviation
            </div>
            
            <p className="text-sm font-bold text-white/70 max-w-md mx-auto relative z-10 leading-relaxed">
              Observed herd behavior is farther from the expected farm pattern than predicted from the measured environmental conditions and baseline.
            </p>
            
            <div className="mt-8 pt-4 border-t border-white/10 relative z-10">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Prototype Metric</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8">Expected vs Observed</h3>
            
            <div className="grid grid-cols-12 text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 pb-2 border-b border-white/10">
              <div className="col-span-6">Metric</div>
              <div className="col-span-3 text-center text-white/30">Expected <span className="block text-[8px]">MODEL</span></div>
              <div className="col-span-3 text-center text-emerald-400">Observed <span className="block text-[8px]">VISION</span></div>
            </div>
            
            <div className="space-y-4">
              <ComparisonRow label="Movement" expected={`${baseline.expectedBehavior.movement}%`} observed={`${biology.behavior.movement}%`} diff={movementDelta} />
              <ComparisonRow label="Shade occupancy" expected={`${baseline.expectedBehavior.shadeSeeking}%`} observed={`${biology.behavior.shadeSeeking}%`} diff={shadeSeekingDelta} />
              <ComparisonRow label="Water demand" expected={`${baseline.expectedBehavior.waterDemand}%`} observed={`${biology.behavior.waterDemand}%`} diff={waterDemandDelta} />
              <ComparisonRow label="Rumination" expected={`${baseline.expectedBehavior.ruminating}%`} observed={`${biology.behavior.ruminating}%`} diff={ruminationDelta} />
            </div>
          </div>
          
          {/* Explainability Panel */}
          <div className={clsx("border rounded-3xl p-8 shadow-2xl", isCritical ? "bg-rose-500/5 border-rose-500/20" : bti.severity === "ELEVATED" ? "bg-orange-500/5 border-orange-500/20" : "bg-white/5 border-white/10")}>
            <h3 className={clsx("text-[11px] font-black tracking-[0.2em] uppercase mb-8", isCritical ? "text-rose-400/70" : bti.severity === "ELEVATED" ? "text-orange-400/70" : "text-white/50")}>
              Engine Explanation (Why {bti.score}?)
            </h3>
            
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Environment</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-white/70">Temperature</div>
                    <div className="font-bold text-white text-sm">{(climate.temperatureAnomaly > 0 ? "+" : "")}{climate.temperatureAnomaly}°C anomaly</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/70">Exposure</div>
                    <div className="font-bold text-white text-sm">{farm.hazard === "FLOOD" && environment.waterLevel && environment.waterLevel > 0.5 ? "HIGH" : environment.thi && environment.thi > 78 ? "HIGH" : "MODERATE"}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Biology</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-white/70">Shade seeking</div>
                    <div className={clsx("font-bold text-sm", shadeSeekingDelta > 15 ? "text-rose-400" : shadeSeekingDelta > 5 ? "text-orange-400" : "text-white/70")}>{shadeSeekingDelta > 0 ? "+" : ""}{shadeSeekingDelta}%</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/70">Movement</div>
                    <div className={clsx("font-bold text-sm", movementDelta < -10 || movementDelta > 30 ? "text-orange-400" : "text-white/70")}>{movementDelta > 0 ? "+" : ""}{movementDelta}%</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Temporal</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-white/70">Persistent for</div>
                    <div className="font-bold text-white text-sm">{bti.persistenceMinutes} minutes</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={clsx("mt-8 pt-6 border-t flex items-start space-x-4", isCritical ? "border-rose-500/20" : bti.severity === "ELEVATED" ? "border-orange-500/20" : "border-white/10")}>
              <ShieldAlert className={isCritical ? "text-rose-400 shrink-0 mt-1" : bti.severity === "ELEVATED" ? "text-orange-400 shrink-0 mt-1" : "text-emerald-400 shrink-0 mt-1"} />
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">Decision Model</div>
                <div className="text-sm font-bold text-white mb-2">
                  {bti.explanation.map((line, i) => (
                    <span key={i} className="block">{line}.</span>
                  ))}
                </div>
                <div className={clsx("font-black uppercase tracking-wider text-sm", isCritical ? "text-rose-400" : bti.severity === "ELEVATED" ? "text-orange-400" : "text-emerald-400")}>
                  → {bti.severity} Climate-Related Biological Risk
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ label, expected, observed, diff }: { label: string, expected: string, observed: string, diff: number }) {
  let isBad = label === "Movement" || label === "Grazing" || label === "Rumination" ? diff < 0 : diff > 0;
  if (diff === 0) isBad = false;
  
  return (
    <div className="grid grid-cols-12 items-center border-b border-white/5 pb-3">
      <div className="col-span-6 text-sm font-bold text-white/70">{label}</div>
      <div className="col-span-3 text-center text-sm font-bold text-white/50">{expected}</div>
      <div className={clsx("col-span-3 text-center text-sm font-black", diff === 0 ? "text-white/50" : isBad ? "text-rose-400" : "text-emerald-400")}>{observed}</div>
    </div>
  );
}
