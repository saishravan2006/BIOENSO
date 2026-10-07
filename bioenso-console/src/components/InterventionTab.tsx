import type { Farm } from '../AppState';
import { ArrowDown, Cpu, Server, Wifi, Activity } from 'lucide-react';
import clsx from 'clsx';

export default function InterventionTab({ farm }: { farm: Farm }) {
  const { bti, hazard, intervention } = farm;
  
  const isCritical = bti.severity === "CRITICAL";
  const isRecovery = intervention.active;
  const isFlood = hazard === "FLOOD";
  
  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <header className="mb-12">
        <h2 className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Intervention Control</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter">HARDWARE ORCHESTRATION</h1>
      </header>

      <div className="grid grid-cols-2 gap-12">
        
        {/* Left Side: Decision & Architecture */}
        <div className="space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6">Current State</h3>
            
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Risk</div>
                <div className="text-5xl font-black text-white leading-none tracking-tighter">{bti.score} <span className="text-2xl text-white/30">/ 100</span></div>
              </div>
              <div className={clsx(
                "px-4 py-1 rounded-full border text-xs font-black tracking-widest uppercase",
                isCritical ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : 
                isRecovery ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/10 border-white/10 text-white/50"
              )}>
                {isCritical ? "Action Required" : isRecovery ? "Active Intervention" : "Monitoring"}
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Recommended Action</div>
              <div className="text-xl font-bold text-white">
                {isFlood && isCritical ? "Relocate Herd" : 
                 isCritical ? "Activate cooling" : "Maintain normal operations"}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Target Zone</div>
              <div className="text-sm font-bold text-white">{isFlood ? "Elevated Zone B" : "Zone A"}</div>
            </div>
          </div>
          
          {/* Architecture flow */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-8">Hardware Actuation Pipeline</h3>
            
            <div className="space-y-1 relative">
              <div className="absolute left-6 top-6 bottom-6 w-px bg-white/10" />
              
              <FlowStep icon={<Server size={14} />} label="BioENSO Engine" active={true} />
              <FlowStep icon={<Activity size={14} />} label="Decision" active={isCritical || isRecovery} highlight={isCritical && !isRecovery} />
              <FlowStep icon={<Cpu size={14} />} label="Edge Controller" active={isCritical || isRecovery} />
              <FlowStep icon={<Wifi size={14} />} label="LoRa Link" active={isCritical || isRecovery} />
              <FlowStep icon={<Cpu size={14} />} label="ESP32 Module" active={isCritical || isRecovery} />
              <FlowStep icon={<Activity size={14} />} label="MOSFET / Relay" active={isRecovery} />
              <FlowStep icon={<ArrowDown size={14} />} label={isFlood ? "Gates / Alarms" : "Cooling Hardware"} active={isRecovery} />
            </div>
          </div>

        </div>

        {/* Right Side: Hardware State & Controls */}
        <div className="space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className={clsx(
              "absolute inset-0 transition-opacity duration-1000",
              isRecovery ? "bg-emerald-500/10 opacity-100" : "opacity-0"
            )} />
            
            <div className="relative z-10 flex justify-between items-center mb-8">
              <h3 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase">Hardware State</h3>
              {isRecovery && <div className="text-[10px] font-black text-emerald-400 tracking-[0.2em] uppercase flex items-center space-x-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/><span>Active</span></div>}
            </div>
            
            {isFlood ? (
              <div className="space-y-4 relative z-10">
                <HardwareRow label="Evacuation Gates" state={isRecovery ? "OPEN" : "CLOSED"} active={isRecovery} />
                <HardwareRow label="Siren" state={isRecovery ? "ACTIVE" : "READY"} active={isRecovery} />
                <HardwareRow label="Edge Node" state="ONLINE" active={true} />
                <HardwareRow label="LoRa Link" state="ONLINE" active={true} />
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <HardwareRow label="Fan 1" state={isRecovery ? "ON" : "OFF"} active={isRecovery} />
                <HardwareRow label="Fan 2" state={isRecovery ? "ON" : "OFF"} active={isRecovery} />
                <HardwareRow label="Mister" state="READY" active={false} />
                <HardwareRow label="Edge Node" state="ONLINE" active={true} />
                <HardwareRow label="LoRa Link" state="ONLINE" active={true} />
              </div>
            )}
            
            <div className="mt-12 flex space-x-4 relative z-10">
              <button 
                disabled={true}
                className={clsx(
                  "flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all",
                  isRecovery ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default" :
                  isCritical ? "bg-white/10 text-white cursor-not-allowed border border-white/20" : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                {isFlood ? (isRecovery ? "Evacuating" : "Activate via Global Network Simulation") : (isRecovery ? "Cooling Active" : "Activate via Global Network Simulation")}
              </button>
            </div>
            
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-6 text-center relative z-10">
              Network level controls manage intervention state.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function FlowStep({ icon, label, active, highlight = false }: { icon: any, label: string, active: boolean, highlight?: boolean }) {
  return (
    <div className="flex items-center space-x-6 relative z-10 py-3">
      <div className={clsx(
        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
        highlight ? "bg-rose-500/20 border-rose-500 text-rose-400" :
        active ? "bg-white/10 border-white text-white" : "bg-[#050505] border-white/10 text-white/30"
      )}>
        {icon}
      </div>
      <span className={clsx(
        "text-sm font-bold tracking-wide transition-colors duration-500",
        highlight ? "text-rose-400" :
        active ? "text-white" : "text-white/30"
      )}>{label}</span>
    </div>
  );
}

function HardwareRow({ label, state, active }: { label: string, state: string, active: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-3">
      <span className="text-sm font-bold text-white/70">{label}</span>
      <span className={clsx("text-sm font-black tracking-widest uppercase", active ? "text-emerald-400" : "text-white/40")}>{state}</span>
    </div>
  );
}
