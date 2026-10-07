import { useState, useEffect, useRef } from 'react';
import { Map, Waves, AlertCircle, ThermometerSun, Eye } from 'lucide-react';
import clsx from 'clsx';
import type { AppState } from '../AppState';

function ThermalCamera({ isCritical }: { isCritical: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setHasPermission(false);
      }
    };

    startCamera();

    const drawThermal = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Calculate brightness
            const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            // Map brightness to thermal colors
            if (brightness < 64) {
              data[i] = 0; // R
              data[i + 1] = 0; // G
              data[i + 2] = brightness * 4; // B
            } else if (brightness < 128) {
              data[i] = 0;
              data[i + 1] = (brightness - 64) * 4;
              data[i + 2] = 255 - (brightness - 64) * 4;
            } else if (brightness < 192) {
              data[i] = (brightness - 128) * 4;
              data[i + 1] = 255;
              data[i + 2] = 0;
            } else {
              data[i] = 255;
              data[i + 1] = 255 - (brightness - 192) * 4;
              data[i + 2] = 0;
            }

            // If critical scenario, add a red tint to warmer areas
            if (isCritical && brightness > 100) {
              data[i] = Math.min(255, data[i] + 40); 
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }
      }
      animationFrame = requestAnimationFrame(drawThermal);
    };

    drawThermal();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrame);
    };
  }, [isCritical]);

  if (hasPermission === false) {
    return <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold p-6 text-center">Camera access denied. Please allow camera permissions to view the live thermal demo.</div>;
  }

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover mix-blend-screen opacity-90 blur-[1px]" />
    </>
  );
}

function AICamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setHasPermission(false);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (hasPermission === false) {
    return <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold p-6 text-center">Camera access denied.</div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-t-[32px] bg-black">
      <video 
        ref={videoRef} 
        playsInline 
        muted 
        className="w-full h-full object-cover opacity-80 mix-blend-luminosity grayscale contrast-150 brightness-75"
      />
      {/* Scanning Line */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,1)] animate-[ping_3s_linear_infinite] absolute top-1/2" />
      </div>
      
      {/* Animated Bounding Boxes */}
      <div className="absolute border border-emerald-400/80 bg-emerald-400/10 w-24 h-24 flex flex-col justify-end animate-bounce" style={{ left: '20%', top: '30%', animationDuration: '4s' }}>
        <div className="bg-emerald-500 text-white text-[9px] font-black px-1 uppercase tracking-widest w-fit">Resting 94%</div>
      </div>
      
      <div className="absolute border border-orange-400/80 bg-orange-400/10 w-32 h-32 flex flex-col justify-end animate-pulse" style={{ left: '60%', top: '40%', animationDuration: '2s' }}>
        <div className="bg-orange-500 text-white text-[9px] font-black px-1 uppercase tracking-widest w-fit">Moving 82%</div>
      </div>
      
      <div className="absolute border border-emerald-400/80 bg-emerald-400/10 w-16 h-16 flex flex-col justify-end" style={{ left: '10%', top: '70%' }}>
        <div className="bg-emerald-500 text-white text-[9px] font-black px-1 uppercase tracking-widest w-fit">Feeding 88%</div>
      </div>
    </div>
  );
}

export default function LiveScreen({ appState }: { appState: AppState }) {
  const [viewMode, setViewMode] = useState<"thermal" | "biological" | "map">("thermal");
  const { scenario, animalState } = appState;
  const isFlood = scenario === "FLOOD_RISK";

  // Calculate percentages
  const thermalNormalPct = Math.round((animalState.normal / animalState.total) * 100);
  const thermalElevatedPct = Math.round((animalState.elevated / animalState.total) * 100);
  const thermalCriticalPct = Math.round((animalState.critical / animalState.total) * 100);

  return (
    <div className="flex flex-col min-h-full pb-32 pt-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-6 flex justify-between items-start">
        <h1 className="text-3xl font-black text-white tracking-tighter mix-blend-overlay">LIVE</h1>
      </div>

      <div className="px-6 mt-8">
        <div className="flex space-x-2 bg-black/20 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setViewMode("thermal")}
            className={clsx(
              "flex-1 py-3 text-xs font-black rounded-full uppercase tracking-widest transition-all",
              viewMode === "thermal" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            Thermal
          </button>
          <button
            onClick={() => setViewMode("biological")}
            className={clsx(
              "flex-1 py-3 text-xs font-black rounded-full uppercase tracking-widest transition-all",
              viewMode === "biological" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            Biological
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={clsx(
              "flex-1 py-3 text-xs font-black rounded-full uppercase tracking-widest transition-all",
              viewMode === "map" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            Farm
          </button>
        </div>
      </div>

      <div className="px-6 mt-6">
        <h2 className="text-sm font-bold text-white/80">
          {viewMode === "thermal" && "What are the animals experiencing?"}
          {viewMode === "biological" && "What are the animals doing?"}
          {viewMode === "map" && "Where is the risk?"}
        </h2>
      </div>

      {viewMode === "thermal" && !isFlood && (
        <div className="mt-6 space-y-6">
          <div className="px-6">
            <div className="aspect-[4/3] bg-gradient-to-br from-indigo-950 to-slate-900 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col p-4">
              
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <div className={clsx("w-2 h-2 rounded-full", scenario === "NORMAL" ? "bg-green-500" : "bg-red-500 animate-pulse")} />
                  <span className="text-[10px] font-black text-white/80 tracking-widest uppercase">Thermal Sensor &mdash; Simulation</span>
                </div>
              </div>
              
              {/* Live WebRTC Thermal View */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-t-[32px]">
                <ThermalCamera isCritical={scenario === "CRITICAL_HEAT"} />
                
                {/* Heat Box overlay */}
                {scenario !== "NORMAL" && (
                  <div className="absolute border-2 border-rose-400/80 rounded-xl w-32 h-32 flex flex-col justify-end p-2 z-20" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="bg-rose-500/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black text-white inline-block w-fit">Target: 41.2°C</div>
                  </div>
                )}
              </div>

              {/* Thermal Legend */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center justify-between text-[8px] font-black tracking-widest uppercase text-white/70">
                <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-blue-500"/><span>Cool</span></div>
                <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-green-500"/><span>Normal</span></div>
                <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-yellow-400"/><span>Warm</span></div>
                <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-orange-500"/><span>Hot</span></div>
                <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-red-600"/><span>Critical</span></div>
              </div>
            </div>
          </div>

          <div className="px-6">
            <h2 className="text-[11px] font-black text-white/50 mb-4 tracking-[0.2em] uppercase">Herd Thermal State</h2>
            <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-xl">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Normal</span>
                  </div>
                  <span>{thermalNormalPct}%</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-orange-400" />
                    <span>Elevated</span>
                  </div>
                  <span>{thermalElevatedPct}%</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Critical</span>
                  </div>
                  <span>{thermalCriticalPct}%</span>
                </div>
              </div>

              {(animalState.elevated > 0 || animalState.critical > 0) && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-sm font-bold text-orange-200 text-center">
                  {animalState.elevated + animalState.critical} animals showing elevated thermal response
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {viewMode === "biological" && (
        <div className="mt-6 px-6 space-y-6">
          <div className="aspect-[4/3] bg-black/40 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl relative flex flex-col">
            
            <AICamera />
            
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20">
              <Eye size={14} className="text-white/80" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">Computer Vision &mdash; Live</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-xl">
            <h2 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-6">Biological Summary</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Movement</div>
                <div className="font-bold text-white text-lg">{animalState.movementDiff > 0 ? "↑" : "↓"} {Math.abs(animalState.movementDiff)}%</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Shade Seeking</div>
                <div className="font-bold text-white text-lg">{animalState.shadeOccupancyDiff > 0 ? "↑" : "↓"} {Math.abs(animalState.shadeOccupancyDiff)}%</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Water Activity</div>
                <div className="font-bold text-white text-lg">{animalState.waterDemandDiff > 0 ? "↑" : "↓"} {Math.abs(animalState.waterDemandDiff)}%</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Grazing</div>
                <div className="font-bold text-white text-lg">{animalState.grazingDiff > 0 ? "↑" : "↓"} {Math.abs(animalState.grazingDiff)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "map" && !isFlood && (
        <div className="mt-6 px-6 space-y-6">
          <div className="bg-black/40 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl flex flex-col items-center justify-center h-80 relative overflow-hidden perspective-[1000px]">
            
            {/* 3D Isometric Map Container */}
            <div className="w-64 h-64 relative transform-gpu rotate-x-[60deg] rotate-z-[-45deg] transition-transform duration-1000" style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Base Platform */}
              <div className="absolute inset-0 bg-white/5 border border-white/20 rounded-2xl shadow-[8px_8px_0_rgba(255,255,255,0.05)]" />
              
              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 p-2">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-md border border-white/10" />
                ))}
              </div>

              {/* Zones */}
              <div className="absolute top-2 left-2 w-[45%] h-[45%] bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center transform-gpu translate-z-2 shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                <span className="text-emerald-300 font-black text-[8px] uppercase tracking-widest rotate-x-[-60deg] rotate-z-[45deg]">Open Area</span>
              </div>
              
              <div className="absolute bottom-2 right-2 w-[45%] h-[45%] bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center transform-gpu translate-z-4 shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
                <span className="text-blue-300 font-black text-[8px] uppercase tracking-widest rotate-x-[-60deg] rotate-z-[45deg]">Water Zone</span>
              </div>

              {/* Heat Pulse */}
              {(scenario === "CRITICAL_HEAT" || scenario === "HEAT_RISK") && (
                <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-rose-500/40 border border-rose-500/60 rounded-xl flex flex-col items-center justify-center transform-gpu translate-z-8 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse">
                  <span className="text-white font-black text-[12px] uppercase tracking-widest rotate-x-[-60deg] rotate-z-[45deg] drop-shadow-lg flex items-center space-x-1">
                    <ThermometerSun size={12} />
                    <span>HOT</span>
                  </span>
                </div>
              )}

              {/* Recovery Fan Effect */}
              {scenario === "RECOVERY" && (
                <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-blue-400/20 border border-blue-400/40 rounded-xl flex flex-col items-center justify-center transform-gpu translate-z-4 overflow-hidden">
                  <div className="w-full h-full bg-blue-300/30 blur-md animate-[spin_2s_linear_infinite]" />
                </div>
              )}
            </div>
          </div>
          
          {(scenario === "CRITICAL_HEAT" || scenario === "HEAT_RISK") && (
            <div className="bg-rose-500/20 border border-rose-500/30 backdrop-blur-xl rounded-[32px] p-6 shadow-xl">
              <div className="flex items-start space-x-4">
                <AlertCircle className="text-rose-400 mt-1 shrink-0" size={24} />
                <div>
                  <div className="font-black text-white text-lg tracking-tight mb-1">Hot Zone Detected</div>
                  <div className="font-medium text-rose-200 text-sm">18 animals currently concentrated in this area.</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-rose-500/20">
                <div className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-2">Recommendation</div>
                <div className="font-bold text-white text-lg">Move animals toward shaded Zone B.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {(viewMode === "map") && isFlood && (
        <div className="mt-6 px-6 space-y-6">
          <div className="bg-black/40 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl flex flex-col items-center justify-center h-80 relative overflow-hidden perspective-[1000px]">
            
            {/* 3D Isometric Flood Map */}
            <div className="w-64 h-64 relative transform-gpu rotate-x-[60deg] rotate-z-[-45deg] transition-transform duration-1000" style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Base Platform */}
              <div className="absolute inset-0 bg-slate-800/80 border border-slate-600 rounded-2xl shadow-[8px_8px_0_rgba(255,255,255,0.05)]" />
              
              {/* Elevated Ground */}
              <div className="absolute top-4 left-4 w-[60%] h-[40%] bg-emerald-600/60 border border-emerald-500/80 rounded-xl transform-gpu translate-z-12 shadow-[12px_12px_0_rgba(16,185,129,0.2)] flex items-center justify-center">
                 <span className="text-emerald-100 font-black text-[10px] uppercase tracking-widest rotate-x-[-60deg] rotate-z-[45deg] drop-shadow-md">Safe Zone B</span>
              </div>
              
              {/* Rising Flood Water */}
              <div className="absolute inset-0 bg-blue-500/60 backdrop-blur-sm border-t border-blue-400/80 rounded-2xl transform-gpu translate-z-8 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-[pulse_3s_ease-in-out_infinite]" />
              
              {/* Floating Debris / Animals */}
              <div className="absolute top-[60%] right-[30%] w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] transform-gpu translate-z-16 animate-bounce" />
              <div className="absolute top-[55%] right-[20%] w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] transform-gpu translate-z-16 animate-bounce" style={{ animationDelay: '0.2s' }} />

            </div>
          </div>
          
          <div className="bg-blue-500/20 border border-blue-500/30 backdrop-blur-xl rounded-[32px] p-6 shadow-xl grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Water Level</div>
              <div className="font-bold text-white text-lg">RISING</div>
            </div>
            <div className="border-l border-r border-blue-500/20">
              <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Safe Zone</div>
              <div className="font-bold text-white text-lg">ZONE B</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Flood Risk</div>
              <div className="font-black text-rose-400 text-lg">HIGH</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
