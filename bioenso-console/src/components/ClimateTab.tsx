import type { Farm } from '../AppState';
import { ArrowRight, Thermometer, Droplets, MapPin, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClimateTab({ farm }: { farm: Farm }) {
  const { currentEnvironment: environment, currentClimate: climate } = farm;
  
  // Generating a deterministic mock temperature curve for the farm
  const mockTemperatureData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${i}:00`,
    temp: (environment.temperature - 5) + Math.sin((i / 24) * Math.PI) * 10 + Math.random() * 1.5,
    baseline: (environment.temperature - 5 - climate.temperatureAnomaly) + Math.sin((i / 24) * Math.PI) * 10
  }));
  
  const isFlood = farm.hazard === "FLOOD";
  const exposureLevel = isFlood ? (environment.waterLevel && environment.waterLevel > 0.5 ? "HIGH" : "MODERATE") : (environment.thi && environment.thi > 78 ? "HIGH" : "MODERATE");

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Climate Context</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">ENVIRONMENTAL OBSERVATION</h1>
      </header>

      <div className="grid grid-cols-3 gap-8 mb-12">
        {/* ENSO Context */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <Globe className="absolute -bottom-10 -right-10 text-white/5" size={160} />
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6 relative z-10">ENSO Context</h3>
          
          <div className="space-y-6 relative z-10">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">State</div>
              <div className="font-bold text-white text-lg">{climate.ensoState}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Regional Signal</div>
              <div className="font-bold text-rose-400 text-lg">{climate.regionalSignal}</div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Data Source: Demo Climate Feed</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <ArrowRight size={32} className="text-white/20 mx-auto mb-2" />
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Drives</div>
          </div>
        </div>

        {/* Expected Farm Exposure */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <MapPin className="absolute -bottom-10 -right-10 text-white/5" size={160} />
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6 relative z-10">Farm Exposure</h3>
          
          <div className="space-y-6 relative z-10">
            {isFlood ? (
              <>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Rainfall Anomaly</div><div className="text-[9px] font-bold text-white/30">DERIVED</div></div>
                  <div className="font-bold text-rose-400 text-lg">+{climate.rainfallAnomaly}%</div>
                </div>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Rainfall</div><div className="text-[9px] font-bold text-white/30">OBSERVED</div></div>
                  <div className="font-bold text-blue-400 text-lg">{environment.rainfall} mm</div>
                </div>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Flood Exposure</div><div className="text-[9px] font-bold text-white/30">INFERRED</div></div>
                  <div className="font-bold text-rose-400 text-lg">{exposureLevel}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Temperature Anomaly</div><div className="text-[9px] font-bold text-white/30">DERIVED</div></div>
                  <div className="font-bold text-rose-400 text-lg">{climate.temperatureAnomaly > 0 ? "+" : ""}{climate.temperatureAnomaly}°C</div>
                </div>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">THI</div><div className="text-[9px] font-bold text-white/30">DERIVED</div></div>
                  <div className="font-bold text-orange-400 text-lg">{environment.thi}</div>
                </div>
                <div>
                  <div className="flex justify-between items-baseline"><div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Heat Exposure</div><div className="text-[9px] font-bold text-white/30">INFERRED</div></div>
                  <div className="font-bold text-rose-400 text-lg">{exposureLevel}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sensor Timeseries */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase">Farm Sensor Timeseries</h3>
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <Thermometer size={16} className="text-white/40" />
              <span className="text-sm font-bold text-white">{environment.temperature}°C <span className="text-[9px] text-white/30 ml-2">OBSERVED · SHT31</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <Droplets size={16} className="text-white/40" />
              <span className="text-sm font-bold text-white">{environment.humidity}% <span className="text-[9px] text-white/30 ml-2">OBSERVED · SHT31</span></span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTemperatureData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickMargin={10} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fillOpacity={1} fill="url(#colorBase)" name="Baseline" strokeWidth={2} />
              <Area type="monotone" dataKey="temp" stroke="#fb7185" fillOpacity={1} fill="url(#colorTemp)" name="Current" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center flex justify-between items-center text-[9px] font-bold text-white/40 uppercase tracking-widest">
          <span>Observed environment relative to baseline</span>
          <span>Data from local edge node</span>
        </div>
      </div>
    </div>
  );
}
