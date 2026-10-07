import type { ClimateObservation, EnvironmentObservation, BiologicalObservation } from './types';

export function calculateConfidence(
  climate: ClimateObservation,
  env: EnvironmentObservation,
  bio: BiologicalObservation
): { confidence: number, dataQuality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT" } {
  let score = 0;
  let maxScore = 0;
  
  // Example heuristic checks
  
  // 1. Env complete
  maxScore += 20;
  if (env.temperature !== undefined && env.humidity !== undefined) score += 20;
  
  // 2. Vision / Biology observations
  maxScore += 50;
  if (bio.animalsDetected > 10) score += 50;
  else if (bio.animalsDetected > 0) score += 20;
  
  // 3. Climate completeness
  maxScore += 30;
  if (climate.ensoState) score += 30;
  
  const pct = Math.round((score / maxScore) * 100);
  
  let dataQuality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT" = "HIGH";
  if (pct < 50) dataQuality = "INSUFFICIENT";
  else if (pct < 70) dataQuality = "LOW";
  else if (pct < 85) dataQuality = "MEDIUM";
  
  return { confidence: pct, dataQuality };
}
