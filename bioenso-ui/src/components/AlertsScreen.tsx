import { ShieldAlert, AlertTriangle, Info, Wind, Share2 } from 'lucide-react';
import clsx from 'clsx';
import type { AppState } from '../AppState';

export default function AlertsScreen({ appState }: { appState: AppState }) {
  const { scenario, riskState } = appState;
  
  const alerts = [
    ...(scenario === "CRITICAL_HEAT" ? [
      { id: "1", time: "10:42 AM", date: "Today", severity: "CRITICAL", title: "ACT NOW", description: "Livestock heat stress is increasing.", why: ["Temperature high", "Water demand increasing", "Animals seeking shade"], action: "Start cooling.", riskScore: 86 }
    ] : []),
    ...(scenario === "HEAT_RISK" ? [
      { id: "2", time: "9:58 AM", date: "Today", severity: "WATCH", title: "WATER ALERT", description: "Drinking demand increased +12%.", why: ["Temperature rising", "Early heat stress signs"], action: "Ensure water troughs are full.", riskScore: 62 }
    ] : []),
    ...(scenario === "FLOOD_RISK" ? [
      { id: "3", time: "8:15 AM", date: "Today", severity: "CRITICAL", title: "ACT NOW", description: "Heavy rainfall and rising water levels.", why: ["Rainfall at 42 mm/hr", "Zone A water level +18cm"], action: "Move livestock to Zone B.", riskScore: 88 }
    ] : []),
    ...(scenario === "RECOVERY" ? [
      { id: "4", time: "Just now", date: "Today", severity: "INFO", title: "CONDITIONS IMPROVING", description: "Animal stress indicators returning toward baseline.", why: ["Cooling system active", "Temperature normalizing"], action: "Monitor.", riskScore: riskState.score }
    ] : []),
    { id: "5", time: "4:20 PM", date: "Yesterday", severity: "INFO", title: "HEAT NORMALIZED", description: "Temperatures returned to safe levels.", why: [], action: "", riskScore: null }
  ];

  return (
    <div className="flex flex-col min-h-full pb-32 pt-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-6 flex justify-between items-start">
        <h1 className="text-3xl font-black text-white tracking-tighter mix-blend-overlay">ALERTS</h1>
      </div>

      <div className="px-6 py-10 space-y-8">
        {alerts.map((alert, index) => {
          const showDateHeader = index === 0 || alerts[index - 1].date !== alert.date;
          return (
            <div key={alert.id}>
              {showDateHeader && <h2 className="text-[11px] font-black text-white/50 mb-4 tracking-[0.2em] uppercase">{alert.date}</h2>}
              <div className={clsx(
                "rounded-[32px] p-6 border shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl mb-4 transition-all",
                alert.severity === "CRITICAL" ? "bg-rose-500/10 border-rose-500/30" :
                alert.severity === "WATCH" ? "bg-orange-500/10 border-orange-500/30" :
                "bg-white/5 border-white/10"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                      alert.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-400" :
                      alert.severity === "WATCH" ? "bg-orange-500/20 text-orange-400" :
                      "bg-blue-500/20 text-blue-300"
                    )}>
                      {alert.severity === "CRITICAL" && <ShieldAlert size={20} />}
                      {alert.severity === "WATCH" && <AlertTriangle size={20} />}
                      {alert.severity === "INFO" && <Info size={20} />}
                    </div>
                    <span className={clsx(
                      "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest backdrop-blur-md",
                      alert.severity === "CRITICAL" ? "bg-rose-500 text-white" :
                      alert.severity === "WATCH" ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {alert.title}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white/50">{alert.time}</span>
                </div>
                
                <h3 className="font-bold text-white text-xl tracking-tight mt-1 leading-tight">{alert.description}</h3>
                
                {alert.why.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Why?</h4>
                    <ul className="space-y-2 mb-6">
                      {alert.why.map((reason, i) => (
                        <li key={i} className="flex items-center space-x-2 text-white/80 font-medium text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {alert.action && (
                  <div className={clsx(
                    "mt-4 p-4 rounded-2xl border",
                    alert.severity === "CRITICAL" ? "bg-rose-500/20 border-rose-500/30" : "bg-white/10 border-white/20"
                  )}>
                    <div className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Action</div>
                    <div className="font-bold text-white mb-4">{alert.action}</div>
                    
                    {alert.severity === "CRITICAL" && (
                      <button className="w-full bg-white text-black font-black uppercase tracking-widest py-3 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center space-x-2">
                        {scenario === "FLOOD_RISK" ? (
                          <span>SOUND ALARM</span>
                        ) : (
                          <>
                            <Wind size={18} />
                            <span>START COOLING</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
                
                {alert.severity === "CRITICAL" && (
                  <button className="mt-4 w-full flex items-center justify-center space-x-2 bg-black/20 border border-white/10 text-white/80 font-black uppercase tracking-widest py-3 rounded-xl hover:bg-white/10 transition-all active:scale-95 text-xs">
                    <Share2 size={16} />
                    <span>Share Alert via WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
