import type { EnvironmentObservation, HazardType } from './types';

// Calculate Farm Environmental Exposure (E) -> 0.0 to 1.0
export function calculateExposureScore(env: EnvironmentObservation, hazard: HazardType): number {
  if (hazard === "NONE") return 0;
  
  if (hazard === "HEAT") {
    // Prototype Heat Exposure formula
    // Temp: baseline 30, max 45
    const tempScore = Math.max(0, (env.temperature - 30) / 15);
    
    // THI: baseline 70, max 90
    const thi = env.thi ?? 70;
    const thiScore = Math.max(0, (thi - 70) / 20);
    
    // Radiant heat: assuming 0-100 scale, optional
    const radiantScore = (env.radiantHeat ?? 50) / 100;
    
    return Math.min(1.0, (tempScore * 0.5) + (thiScore * 0.4) + (radiantScore * 0.1));
  }
  
  if (hazard === "FLOOD") {
    // Prototype Flood Exposure formula
    const rainfallScore = Math.min(1.0, (env.rainfall ?? 0) / 200); // 200mm as severe
    const waterLevelScore = Math.min(1.0, (env.waterLevel ?? 0) / 1.5); // 1.5m as severe
    const soilScore = Math.min(1.0, (env.soilWetness ?? 0) / 100);
    
    return Math.min(1.0, (waterLevelScore * 0.5) + (rainfallScore * 0.3) + (soilScore * 0.2));
  }
  
  return 0.0;
}
