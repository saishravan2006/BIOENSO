import type { Farm } from '../AppState';
import clsx from 'clsx';
import { ArrowDown, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RecoveryTab({ farm }: { farm: Farm }) {
  const { bti, intervention } = farm;
  
  const isRecovery = bti.trend === "FALLING" && intervention.active;
  
  // Generating a trajectory based on current BTI
  const mockRecoveryData = Array.from({ length: 11 }).map((_, i) => ({
    time: `14:${30 + i * 5}`,
    risk: isRecovery ? Math.max(bti.score, 86 - i * 5) : (i > 5 ? bti.score + i : bti.score)
  }));
  
  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Did the intervention actually work?</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">RECOVERY ANALYTICS</h1>
      </header>

      <div className="grid grid-cols-12 gap-8 mb-8">
        
        {/* Trajectory */}
        <div className="col-span-8 bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-1">Risk Trajectory</h3>
              <div className="text-sm font-bold text-emerald-400">Intervention tracked since activation</div>
            </div>
            
            {isRecovery && (
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase flex items-center space-x-2">
                <span>Conditions Improving</span>
                <CheckCircle2 size={14} />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRecoveryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickMargin={10} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="risk" stroke="#10b981" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biological Residual Drop */}
        <div className="col-span-4 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8">Biological Residual</h3>
            
            {isRecovery ? (
              <>
                <div className="text-4xl font-black text-white/30 line-through">+0.74σ</div>
                <ArrowDown className="text-emerald-400 my-4 animate-bounce" size={24} />
                <div className="text-6xl font-black tracking-tighter text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.2)] mb-4">
                  +{bti.residual}<span className="text-3xl text-emerald-400/50">σ</span>
                </div>
                <div className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest mt-4 pt-4 border-t border-white/10 w-full">
                  Biological recovery detected ✓
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-4 mt-8">
                  +{bti.residual}<span className="text-3xl text-white/50">σ</span>
                </div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-8 pt-4 border-t border-white/10 w-full">
                  No recovery tracked yet
                </div>
              </>
            )}
            
          </div>
        </div>
        
      </div>

      <div className="grid grid-cols-2 gap-8">
        
        {/* Changing Signals */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6">Changing Biological Signals</h3>
          
          <div className="space-y-4">
            <SignalRow label="Shade seeking" direction={isRecovery ? "down" : bti.trend === "RISING" ? "up" : "stable"} />
            <SignalRow label="Water demand" direction={isRecovery ? "down" : bti.trend === "RISING" ? "up" : "stable"} />
            <SignalRow label="Thermal response" direction={isRecovery ? "down" : bti.trend === "RISING" ? "up" : "stable"} />
            <SignalRow label="Movement" direction={isRecovery ? "up" : bti.trend === "RISING" ? "down" : "stable"} />
            <SignalRow label="Rumination" direction={isRecovery ? "up" : bti.trend === "RISING" ? "down" : "stable"} />
          </div>
        </div>

        {/* Intervention Effectiveness */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {isRecovery && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
          <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6 relative z-10">Intervention Effectiveness</h3>
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white/70">Risk before</span>
              <span className="text-lg font-black text-white/40 line-through">{isRecovery ? "86" : "—"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white/70">Risk after</span>
              <span className={clsx("text-lg font-black", isRecovery ? "text-emerald-400" : "text-white")}>{bti.score}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white/70">Biological recovery</span>
              <span className={clsx("text-xs font-black tracking-widest uppercase", isRecovery ? "text-emerald-400" : "text-white/30")}>
                {isRecovery ? "Detected" : "Pending"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-white/70">Recovery status</span>
              <span className={clsx("text-lg font-black", isRecovery ? "text-emerald-400" : "text-white/30")}>
                {isRecovery ? "HIGH" : "—"}
              </span>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/10 text-center relative z-10">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
              Effectiveness scores are derived from simulated validation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function SignalRow({ label, direction }: { label: string, direction: "up" | "down" | "stable" }) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-2">
      <span className="text-sm font-bold text-white/70">{label}</span>
      <span className={clsx("font-black text-lg", direction === "down" ? "text-emerald-400" : direction === "up" ? "text-rose-400" : "text-white/30")}>
        {direction === "down" ? "↓" : direction === "up" ? "↑" : "—"}
      </span>
    </div>
  );
}
