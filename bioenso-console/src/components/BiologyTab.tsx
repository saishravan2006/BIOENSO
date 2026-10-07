import type { Farm } from '../AppState';
import clsx from 'clsx';
import { Camera, Thermometer, Map as MapIcon, Dna } from 'lucide-react';

export default function BiologyTab({ farm }: { farm: Farm }) {
  const { currentBiology: biology, baseline } = farm;
  
  const shadeSeekingDelta = biology.behavior.shadeSeeking - baseline.expectedBehavior.shadeSeeking;
  const waterDemandDelta = biology.behavior.waterDemand - baseline.expectedBehavior.waterDemand;
  const movementDelta = biology.behavior.movement - baseline.expectedBehavior.movement;
  const grazingDelta = biology.behavior.grazing - baseline.expectedBehavior.grazing;
  const ruminationDelta = biology.behavior.ruminating - baseline.expectedBehavior.ruminating;
  const thermalResponseDelta = biology.behavior.thermalResponse - baseline.expectedBehavior.thermalResponse;
  
  const isFlood = farm.hazard === "FLOOD";
  
  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Livestock Observation</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">BIOLOGICAL DEVIATION</h1>
      </header>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Current State */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative">
          <div className="absolute top-6 right-6 text-[9px] font-black text-white/30 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">INFERRED · VISION</div>
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8">Current Herd State</h3>
          
          <div className="flex items-end space-x-3 mb-8">
            <span className="text-6xl font-black tracking-tighter leading-none">{biology.animalsDetected}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 pb-2">Animals<br/>Detected</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white/70">Resting</span>
              <span className="text-lg font-black">{biology.behavior.resting}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white/70">Moving</span>
              <span className="text-lg font-black">{biology.behavior.movement}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white/70">Drinking</span>
              <span className="text-lg font-black">{biology.behavior.drinking}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white/70">Grazing</span>
              <span className="text-lg font-black">{biology.behavior.grazing}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white/70">Ruminating</span>
              <span className="text-lg font-black">{biology.behavior.ruminating}</span>
            </div>
          </div>
        </div>

        {/* Deviation */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-6 right-6 z-20 text-[9px] font-black text-white/30 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">DERIVED · BIOENSO</div>
          <Dna className="absolute -bottom-10 -right-10 text-white/5" size={160} />
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8 relative z-10">Current vs Farm Baseline</h3>
          
          <div className="space-y-4 relative z-10">
            <DeviationRow label="Shade seeking" diff={shadeSeekingDelta} />
            <DeviationRow label="Water demand" diff={waterDemandDelta} />
            <DeviationRow label="Movement" diff={movementDelta} />
            <DeviationRow label="Grazing" diff={grazingDelta} />
            <DeviationRow label="Rumination" diff={ruminationDelta} />
            <DeviationRow label="Thermal response" diff={thermalResponseDelta} />
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/10 text-center relative z-10">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Elevated stress indicators</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* CV Camera */}
        <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center space-x-2">
              <Camera size={14} className="text-white/50" />
              <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Biological Vision</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Demo Inference</span>
            </div>
          </div>
          <div className="flex-1 p-6 relative">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale contrast-125 opacity-40 mix-blend-screen" />
            
            {/* Fake CV Bounding Boxes */}
            <div className="relative z-10 h-full flex flex-col justify-end">
              <div className="bg-black/60 border border-white/20 p-3 rounded-lg mb-4 inline-block backdrop-blur-sm self-start shadow-xl">
                <div className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Cow 07 • Track #07</div>
                <div className="font-bold text-emerald-400 text-xs">RUMINATING 91%</div>
              </div>
              <div className="bg-black/60 border border-white/20 p-3 rounded-lg inline-block backdrop-blur-sm self-end shadow-xl">
                <div className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Cow 12 • Track #12</div>
                <div className="font-bold text-emerald-400 text-xs">DRINKING 89%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Thermal */}
        <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center space-x-2">
              <Thermometer size={14} className="text-white/50" />
              <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Thermal Sensor</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">● Simulated</span>
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div className="h-32 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-900 via-rose-600 to-amber-400 relative">
               <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
            </div>
            <div className="mt-6 space-y-3">
              <div className="text-[10px] font-black text-white/50 tracking-widest uppercase mb-2">Herd Thermal Dist</div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Median</span><span className="font-bold text-white">37.8°C</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">90th Percentile</span><span className="font-bold text-white">39.1°C</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Elevated</span><span className="font-bold text-rose-400">8 / {biology.animalsDetected}</span></div>
            </div>
          </div>
        </div>

        {/* Spatial */}
        <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center space-x-2">
              <MapIcon size={14} className="text-white/50" />
              <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Spatial Biology</span>
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div className="h-32 rounded-xl border border-white/20 bg-[#050505] relative overflow-hidden flex items-center justify-center perspective-[1000px]">
               <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-lg transform-gpu rotate-x-[60deg] rotate-z-[-45deg] relative">
                 <div className="absolute top-1 left-1 w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded flex items-center justify-center"><span className="text-[6px] font-bold text-emerald-300">SAFE</span></div>
                 {isFlood && <div className="absolute inset-0 bg-blue-500/40 backdrop-blur-sm" />}
               </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Low Ground</span><span className={clsx("font-bold text-xs uppercase", isFlood ? "text-blue-400" : "text-white")}>{isFlood ? "Flooded" : "Clear"}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Safe Zone</span><span className="font-bold text-emerald-400 text-xs uppercase">Elevated</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70">Flow</span><span className="font-bold text-white text-xs uppercase">→ Safe Zone</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviationRow({ label, diff }: { label: string, diff: number }) {
  if (diff === 0) {
    return (
      <div className="flex justify-between items-center border-b border-white/10 pb-2">
        <span className="text-sm font-bold text-white/70">{label}</span>
        <span className="text-lg font-black text-white/30">—</span>
      </div>
    );
  }
  
  const isPositive = diff > 0;
  const isBad = label === "Movement" || label === "Grazing" || label === "Rumination" ? diff < 0 : diff > 0;
  
  return (
    <div className="flex justify-between items-center border-b border-white/10 pb-2">
      <span className="text-sm font-bold text-white/70">{label}</span>
      <span className={clsx("text-lg font-black", isBad ? "text-rose-400" : "text-emerald-400")}>
        {isPositive ? "+" : ""}{diff}%
      </span>
    </div>
  );
}
