import { Activity, Droplets, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { AppState } from '../AppState';

export default function AnimalsScreen({ appState }: { appState: AppState }) {
  const { scenario, environment, animalState } = appState;
  const isFlood = scenario === "FLOOD_RISK";
  
  const showStressIndicators = animalState.critical > 0 || animalState.elevated > 0;

  return (
    <div className="flex flex-col min-h-full pb-32 pt-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mix-blend-overlay">ANIMALS</h1>
          <p className="text-[11px] font-black text-white/50 uppercase tracking-widest mt-1">{animalState.total} LIVESTOCK</p>
        </div>
      </div>

      <div className="px-6 py-10 space-y-10">
        
        {/* Your Normal vs Right Now */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase">Your Normal <span className="text-white/30 mx-2">VS</span> Right Now</h2>
          </div>
          
          {(scenario === "HEAT_RISK" || scenario === "CRITICAL_HEAT") && (
            <div className="bg-rose-500/20 border border-rose-500/30 backdrop-blur-xl rounded-[24px] p-5 shadow-xl mb-6 flex items-center space-x-3">
              <Activity className="text-rose-400" size={24} />
              <span className="font-bold text-white text-sm">The system understands what is different from this farm's normal behavior.</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Temperature */}
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Temperature</div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs font-bold text-white/70">Normal: 32.1°C</div>
                  <div className="text-xs font-bold text-white">Now: {environment.temperature}°C</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {environment.tempDiff > 0 ? <ArrowUpRight className="text-rose-400" size={16} /> : <Minus className="text-emerald-400" size={16} />}
                <span className={clsx("font-black text-lg tracking-tighter", environment.tempDiff > 0 ? "text-rose-400" : "text-white")}>
                  {environment.tempDiff > 0 ? `+${environment.tempDiff}°C` : "0.0°C"}
                </span>
              </div>
            </div>
            
            {/* Water Demand */}
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Water Demand</div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs font-bold text-white/70">Normal: {animalState.waterDemandNormal} L</div>
                  <div className="text-xs font-bold text-white">Now: {animalState.waterDemandNow} L</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {animalState.waterDemandDiff > 0 ? <ArrowUpRight className="text-rose-400" size={16} /> : <Minus className="text-emerald-400" size={16} />}
                <span className={clsx("font-black text-lg tracking-tighter", animalState.waterDemandDiff > 0 ? "text-rose-400" : "text-white")}>
                  {animalState.waterDemandDiff > 0 ? `+${animalState.waterDemandDiff}%` : "Normal"}
                </span>
              </div>
            </div>

            {/* Shade Occupancy */}
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Shade Occupancy</div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs font-bold text-white/70">Normal: 11%</div>
                  <div className="text-xs font-bold text-white">Now: {11 + animalState.shadeOccupancyDiff}%</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {animalState.shadeOccupancyDiff > 0 ? <ArrowUpRight className="text-rose-400" size={16} /> : <Minus className="text-emerald-400" size={16} />}
                <span className={clsx("font-black text-lg tracking-tighter", animalState.shadeOccupancyDiff > 0 ? "text-rose-400" : "text-white")}>
                  {animalState.shadeOccupancyDiff > 0 ? `+${animalState.shadeOccupancyDiff}%` : "Normal"}
                </span>
              </div>
            </div>

            {/* Movement */}
            <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Movement</div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs font-bold text-white/70">Normal: 74%</div>
                  <div className="text-xs font-bold text-white">Now: {74 + animalState.movementDiff}%</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {animalState.movementDiff < 0 ? <ArrowDownRight className="text-orange-400" size={16} /> : <Minus className="text-emerald-400" size={16} />}
                <span className={clsx("font-black text-lg tracking-tighter", animalState.movementDiff < 0 ? "text-orange-400" : "text-white")}>
                  {animalState.movementDiff < 0 ? `${animalState.movementDiff}%` : "Normal"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animal Status */}
        <div>
          <h2 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-4">Herd Status</h2>
          <div className="bg-white/10 backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-white/10">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                  <span className="font-bold text-white text-lg tracking-tight">Normal</span>
                </div>
                <span className="font-black text-white text-2xl drop-shadow-sm">{animalState.normal}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                  <span className="font-bold text-white text-lg tracking-tight">Watch</span>
                </div>
                <span className="font-black text-white text-2xl drop-shadow-sm">{animalState.elevated}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  <span className="font-bold text-white text-lg tracking-tight">Critical</span>
                </div>
                <span className="font-black text-white text-2xl drop-shadow-sm">{animalState.critical}</span>
              </div>
            </div>
            
            <div className="mt-8 h-4 rounded-full flex overflow-hidden shadow-inner bg-black/30">
              <div style={{ width: `${(animalState.normal / animalState.total) * 100}%` }} className="bg-emerald-400 h-full transition-all duration-1000" />
              <div style={{ width: `${(animalState.elevated / animalState.total) * 100}%` }} className="bg-orange-400 h-full transition-all duration-1000" />
              <div style={{ width: `${(animalState.critical / animalState.total) * 100}%` }} className="bg-rose-500 h-full transition-all duration-1000" />
            </div>

            {showStressIndicators && (
              <div className="mt-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <AlertTriangle className="text-rose-400 mt-0.5" size={20} />
                  <div>
                    <div className="font-bold text-white text-sm">{animalState.critical + animalState.elevated} animals affected</div>
                    <div className="text-rose-200 text-xs font-bold uppercase tracking-widest mt-1">Stress indicators elevated</div>
                  </div>
                </div>
                <ul className="text-xs text-white/70 space-y-2 pl-8 font-medium">
                  {isFlood ? (
                    <>
                      <li className="list-disc">Unusual clustering behavior</li>
                      <li className="list-disc">Increased vocalization</li>
                    </>
                  ) : (
                    <>
                      <li className="list-disc">High thermal response</li>
                      <li className="list-disc">Reduced movement</li>
                      <li className="list-disc">Repeated water-zone visits</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
