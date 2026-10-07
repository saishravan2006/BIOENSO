import { ArrowRight } from 'lucide-react';
import type { Farm } from '../AppState';
import clsx from 'clsx';
import type { FarmTab } from '../App';

export default function OverviewTab({ farm, setActiveTab }: { farm: Farm, setActiveTab: (tab: FarmTab) => void }) {
  const { currentEnvironment: environment, currentClimate: climate, currentBiology: biology, bti, intervention, baseline } = farm;
  
  const isCritical = bti.severity === "CRITICAL";
  const isRecovery = bti.severity === "WATCH" && bti.trend === "FALLING" && intervention.active;
  
  const movementDelta = biology.behavior.movement - baseline.expectedBehavior.movement;
  const shadeSeekingDelta = biology.behavior.shadeSeeking - baseline.expectedBehavior.shadeSeeking;
  
  const exposureLevel = farm.hazard === "FLOOD" ? (environment.waterLevel && environment.waterLevel > 0.5 ? "HIGH" : "MODERATE") : (environment.thi && environment.thi > 78 ? "HIGH" : "MODERATE");
  
  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Biological Climate Observation</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">FARM OVERVIEW</h1>
      </header>

      {/* Main Risk Display */}
      <div className="flex flex-col items-center justify-center py-16 mb-16 border-y border-white/10">
        <h3 className="text-[14px] font-black text-white/50 tracking-[0.3em] uppercase mb-8">BioENSO Impact Index (BTI)</h3>
        
        <div className="relative">
          <div className="text-[180px] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            {bti.score}
          </div>
          <div className="absolute top-8 -right-16 text-3xl font-black text-white/30">/100</div>
        </div>
        
        <div className={clsx(
          "mt-6 px-6 py-2 rounded-full border text-sm font-black tracking-[0.2em] uppercase",
          isCritical ? "bg-rose-500/20 border-rose-500/50 text-rose-400" :
          isRecovery ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" :
          bti.severity === "ELEVATED" ? "bg-orange-500/20 border-orange-500/50 text-orange-400" :
          "bg-white/10 border-white/20 text-white/70"
        )}>
          {isCritical ? "Critical" : isRecovery ? "Recovery" : bti.severity}
        </div>

        <div className="flex space-x-12 mt-16">
          <div className="text-center">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Persistence</div>
            <div className="text-xl font-bold text-white">{bti.persistenceMinutes} min</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Confidence</div>
            <div className="text-xl font-bold text-white">{bti.confidence}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Biological Residual</div>
            <div className="text-xl font-bold text-white">+{bti.residual} σ</div>
          </div>
        </div>
      </div>

      {/* Causal Flow Signature */}
      <div className="grid grid-cols-6 gap-4">
        
        <button onClick={() => setActiveTab('ENVIRONMENT')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">ENSO</div>
          <div className="font-bold text-white text-sm mb-1">{climate.ensoState}</div>
          <div className="text-xs font-bold text-white/50">{climate.regionalSignal} context</div>
        </button>

        <div className="flex items-center justify-center opacity-30"><ArrowRight /></div>

        <button onClick={() => setActiveTab('ENVIRONMENT')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">Environment</div>
          <div className="font-bold text-white text-sm mb-1">{environment.temperature}°C / {environment.humidity}% RH</div>
          <div className="text-xs font-bold text-white/50">{farm.hazard === "FLOOD" ? "Flood exposure" : `${exposureLevel} exposure`}</div>
        </button>

        <div className="flex items-center justify-center opacity-30"><ArrowRight /></div>

        <button onClick={() => setActiveTab('BIOLOGY')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">Biology</div>
          <div className="font-bold text-white text-sm mb-1">Mov {movementDelta > 0 ? "+" : ""}{movementDelta}%</div>
          <div className="text-xs font-bold text-white/50">Shade {shadeSeekingDelta > 0 ? "+" : ""}{shadeSeekingDelta}%</div>
        </button>

        <div className="flex items-center justify-center opacity-30"><ArrowRight /></div>

        <button onClick={() => setActiveTab('ENGINE')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">Residual</div>
          <div className="font-bold text-white text-sm mb-1">+{bti.residual}σ</div>
          <div className="text-xs font-bold text-white/50">Significant</div>
        </button>

        <div className="flex items-center justify-center opacity-30"><ArrowRight /></div>

        <button onClick={() => setActiveTab('OVERVIEW')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">Risk</div>
          <div className="font-bold text-white text-sm mb-1">{bti.score}</div>
          <div className="text-xs font-bold text-white/50 capitalize">{bti.severity}</div>
        </button>

        <div className="flex items-center justify-center opacity-30"><ArrowRight /></div>

        <button onClick={() => setActiveTab('INTERVENTION')} className="bg-white/5 border border-white/10 hover:border-white/30 p-5 rounded-2xl text-left transition-all group">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">Action</div>
          <div className="font-bold text-white text-sm mb-1">{intervention.active ? "Active" : isCritical ? "Action required" : "Monitoring"}</div>
        </button>

      </div>
    </div>
  );
}
