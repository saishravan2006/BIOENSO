import type { Farm } from '../AppState';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus, CloudRain, ThermometerSun, Map, Info } from 'lucide-react';
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts';

export default function ObservatoryHome({ farms, onSelectFarm }: { farms: Farm[], onSelectFarm: (id: string) => void }) {
  const criticalFarms = farms.filter(f => f.bti.severity === "CRITICAL");
  const elevatedFarms = farms.filter(f => f.bti.severity === "ELEVATED");
  const watchFarms = farms.filter(f => f.bti.severity === "WATCH");
  const normalFarms = farms.filter(f => f.bti.severity === "NORMAL");
  
  const medianBti = farms.length > 0 ? [...farms].sort((a,b)=>a.bti.score - b.bti.score)[Math.floor(farms.length/2)].bti.score : 0;
  const maxBti = farms.length > 0 ? Math.max(...farms.map(f => f.bti.score)) : 0;
  
  const sortedByBti = [...farms].sort((a,b) => b.bti.score - a.bti.score);

  // Mock trend data
  const mockTrendData = Array.from({length: 24}).map((_, i) => ({
    time: i,
    value: 40 + Math.sin(i / 3) * 10 + (i > 15 ? (i - 15) * 3 : 0) // Rising at the end
  }));

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Distributed biological climate monitoring across farms</h2>
          <h1 className="text-3xl font-black text-white tracking-tighter">BIOENSO OBSERVATORY</h1>
        </div>
        <div className="flex space-x-6 text-right">
          <div>
            <div className="text-[10px] font-black text-white/40 tracking-widest uppercase mb-1">ENSO Context</div>
            <div className="text-sm font-bold text-white">El Niño</div>
          </div>
          <div>
            <div className="text-[10px] font-black text-white/40 tracking-widest uppercase mb-1">Regional Impact</div>
            <div className="text-sm font-bold text-rose-400">ELEVATED</div>
          </div>
          <div>
            <div className="text-[10px] font-black text-white/40 tracking-widest uppercase mb-1">Farms Monitored</div>
            <div className="text-sm font-bold text-white">{farms.length}</div>
          </div>
        </div>
      </header>

      {/* Network Overview Grid */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        
        {/* Main Map Visualization */}
        <div className="col-span-8 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase">Regional Farm Map</h3>
            <div className="flex space-x-4">
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-white/40"><span className="w-2 h-2 rounded-full bg-rose-500"/><span>Critical</span></span>
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-white/40"><span className="w-2 h-2 rounded-full bg-orange-500"/><span>Elevated</span></span>
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-white/40"><span className="w-2 h-2 rounded-full bg-amber-500"/><span>Watch</span></span>
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-white/40"><span className="w-2 h-2 rounded-full bg-white/20"/><span>Normal</span></span>
            </div>
          </div>
          
          <div className="flex-1 min-h-[350px] relative border border-white/5 rounded-2xl bg-[#0a0a0a] overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-screen" />
            <Map className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5" size={200} strokeWidth={1} />
            
            {/* Map Plotting (simulated with random positions based on lat/lng) */}
            {farms.map((farm) => {
              // Normalize lat 8-14, lng 76-81 to 0-100%
              const top = `${100 - ((farm.location.latitude - 8) / 6) * 100}%`;
              const left = `${((farm.location.longitude - 76) / 5) * 100}%`;
              
              const colorClass = farm.bti.severity === "CRITICAL" ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]" :
                                 farm.bti.severity === "ELEVATED" ? "bg-orange-500" :
                                 farm.bti.severity === "WATCH" ? "bg-amber-500" : "bg-white/30";
                                 
              return (
                <button 
                  key={farm.id}
                  onClick={() => onSelectFarm(farm.id)}
                  className={clsx("absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 hover:z-20 transition-all group", colorClass)}
                  style={{ top, left }}
                >
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-30 transition-opacity">
                    <div className="text-xs font-bold text-white">{farm.name}</div>
                    <div className="text-[10px] text-white/50">{farm.location.district}</div>
                    <div className="mt-1 text-xs font-black"><span className={clsx("text-white")}>BTI {farm.bti.score}</span></div>
                  </div>
                </button>
              )
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black text-white/30 tracking-widest uppercase">
            <span>● System Operational (Updated 18s ago)</span>
            <span>Prototype Severity Bands</span>
          </div>
        </div>
        
        {/* Right Column: Key Stats & Attention List */}
        <div className="col-span-4 flex flex-col space-y-6">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-4">Network Biological Impact</h3>
            <div className="grid grid-cols-2 gap-2">
              <SeverityCount label="CRITICAL" count={criticalFarms.length} color="text-rose-400" />
              <SeverityCount label="ELEVATED" count={elevatedFarms.length} color="text-orange-400" />
              <SeverityCount label="WATCH" count={watchFarms.length} color="text-amber-400" />
              <SeverityCount label="NORMAL" count={normalFarms.length} color="text-white/40" />
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-[11px] font-black text-rose-400 tracking-[0.2em] uppercase mb-4">Farms Requiring Attention</h3>
            <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-2">
              {sortedByBti.slice(0, 5).map((farm) => (
                <button 
                  key={farm.id} 
                  onClick={() => onSelectFarm(farm.id)}
                  className="w-full text-left bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/20 p-3 rounded-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs font-bold text-white">{farm.name}</div>
                    <div className={clsx("text-xs font-black", farm.bti.severity === "CRITICAL" ? "text-rose-400" : farm.bti.severity === "ELEVATED" ? "text-orange-400" : "text-white/50")}>
                      BTI {farm.bti.score}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                    {farm.bti.trend === "RISING" ? <ArrowUpRight size={10} className="text-rose-400" /> : farm.bti.trend === "FALLING" ? <ArrowDownRight size={10} className="text-emerald-400" /> : <Minus size={10} />}
                    <span>{farm.hazard === "FLOOD" ? "Flood Risk" : "Heat Risk"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      
      {/* Network Metrics & Table */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Side: Stats */}
        <div className="col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-4">Active Climate Events</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3"><ThermometerSun className="text-orange-400" size={16} /><span className="text-sm font-bold text-white">Heat Event</span></div>
                <span className="text-xs font-bold text-white/50">{farms.filter(f => f.hazard === "HEAT" && f.bti.severity !== "NORMAL").length} farms</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3"><CloudRain className="text-blue-400" size={16} /><span className="text-sm font-bold text-white">Flood Event</span></div>
                <span className="text-xs font-bold text-white/50">{farms.filter(f => f.hazard === "FLOOD" && f.bti.severity !== "NORMAL").length} farms</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-4">Network BTI Trend</h3>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTrendData}>
                  <defs>
                    <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={[0, 100]} hide />
                  <Area type="monotone" dataKey="value" stroke="#fb7185" fillOpacity={1} fill="url(#trendColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-end mt-2">
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Network Median BTI</div>
                <div className="text-xl font-bold text-white">{medianBti}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Highest BTI</div>
                <div className="text-xl font-bold text-rose-400">{maxBti}</div>
              </div>
            </div>
          </div>
          
          {/* Important Scientific Story Panel */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative">
            <Info className="absolute top-6 right-6 text-indigo-400" size={16} />
            <h3 className="text-[11px] font-black text-indigo-400 tracking-[0.2em] uppercase mb-4">Scientific Context</h3>
            <p className="text-xs font-bold text-white/70 leading-relaxed mb-4">
              The same regional climate event produces <strong className="text-white">different biological impacts</strong> due to varying local farm exposures and baseline resilience.
            </p>
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-bold text-white/60 space-y-1">
              <div>Farm A: High Exp + High Biol. Deviation = <span className="text-rose-400 font-black">BTI {farms.find(f => f.id === "FARM_01")?.bti.score ?? 86}</span></div>
              <div>Farm H: Low Exp + Low Biol. Deviation = <span className="text-white/40 font-black">BTI {farms.find(f => f.id === "FARM_08")?.bti.score ?? 34}</span></div>
            </div>
          </div>
        </div>

        {/* Right Side: Network Table */}
        <div className="col-span-8 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col">
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6">Farm Network Status</h3>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] font-black text-white/30 uppercase tracking-widest border-b border-white/10">
                  <th className="pb-3 font-medium">Farm</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Exposure</th>
                  <th className="pb-3 font-medium">Bio Signal</th>
                  <th className="pb-3 font-medium">BTI</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedByBti.slice(0, 10).map((farm) => {
                  const exposureLevel = farm.hazard === "FLOOD" ? (farm.currentEnvironment.waterLevel && farm.currentEnvironment.waterLevel > 0.5 ? "HIGH" : "MODERATE") : (farm.currentEnvironment.thi && farm.currentEnvironment.thi > 78 ? "HIGH" : "MODERATE");

                  return (
                    <tr key={farm.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSelectFarm(farm.id)}>
                      <td className="py-3 text-xs font-bold text-white">{farm.name}</td>
                      <td className="py-3 text-xs font-bold text-white/50">{farm.location.district}</td>
                      <td className="py-3 text-xs font-bold text-white/70">{farm.hazard === "FLOOD" ? "Flood Risk" : exposureLevel}</td>
                      <td className="py-3 text-xs font-bold text-white/70">+{farm.bti.residual}σ</td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className={clsx("text-sm font-black", farm.bti.severity === "CRITICAL" ? "text-rose-400" : farm.bti.severity === "ELEVATED" ? "text-orange-400" : "text-white")}>{farm.bti.score}</span>
                          {farm.bti.trend === "RISING" ? <ArrowUpRight size={10} className="text-rose-400" /> : farm.bti.trend === "FALLING" ? <ArrowDownRight size={10} className="text-emerald-400" /> : null}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          farm.bti.severity === "CRITICAL" ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : 
                          farm.bti.severity === "ELEVATED" ? "bg-orange-500/20 border-orange-500/30 text-orange-400" : 
                          farm.bti.severity === "WATCH" ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : 
                          "bg-white/5 border-white/10 text-white/30"
                        )}>{farm.bti.severity}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function SeverityCount({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
      <div className={clsx("text-2xl font-black mb-1", color)}>{count}</div>
      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">{label}</div>
    </div>
  );
}
