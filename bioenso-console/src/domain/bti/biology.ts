import type { BiologicalObservation, FarmBaseline, HazardType, BiologicalBehavior } from './types';
import { HEAT_BIOLOGICAL_FEATURES, FLOOD_BIOLOGICAL_FEATURES } from './config';

// 1. Expected Biological Response (EBR)
export function estimateExpectedBiologicalResponse(
  baseline: FarmBaseline,
): BiologicalBehavior {
  // In a real system, this adjusts the baseline based on current time/season/env
  // For the prototype, we simply return the baseline expected behavior.
  return { ...baseline.expectedBehavior };
}

// 2. Biological Residual (Z-score logic)
export function calculateBiologicalResiduals(
  observed: BiologicalObservation,
  expected: BiologicalBehavior,
  variability: BiologicalBehavior
): Record<keyof BiologicalBehavior, number> {
  const residuals: Partial<Record<keyof BiologicalBehavior, number>> = {};
  const keys = Object.keys(observed.behavior) as Array<keyof BiologicalBehavior>;
  
  for (const key of keys) {
    const obsVal = observed.behavior[key];
    const expVal = expected[key];
    const varVal = variability[key] || 1; // Prevent div by 0
    
    residuals[key] = (obsVal - expVal) / varVal;
  }
  
  return residuals as Record<keyof BiologicalBehavior, number>;
}

// 3. Normalized Biological Deviation Score (B) -> 0.0 to 1.0
export function calculateBiologicalDeviation(
  residuals: Record<keyof BiologicalBehavior, number>,
  hazard: HazardType
): { score: number, overallSigma: number } {
  if (hazard === "NONE") return { score: 0, overallSigma: 0 };
  
  const features = hazard === "HEAT" ? HEAT_BIOLOGICAL_FEATURES : FLOOD_BIOLOGICAL_FEATURES;
  
  let totalWeightedSigma = 0;
  let totalWeight = 0;
  
  for (const feature of features) {
    const key = feature.key as keyof BiologicalBehavior;
    const residual = residuals[key];
    const weight = feature.weight;
    
    // Check if deviation is in the adverse direction
    let adverseSigma = 0;
    if (feature.adverseDirection === "INCREASE" && residual > 0) {
      adverseSigma = residual;
    } else if (feature.adverseDirection === "DECREASE" && residual < 0) {
      adverseSigma = Math.abs(residual);
    }
    
    totalWeightedSigma += adverseSigma * weight;
    totalWeight += weight;
  }
  
  const overallSigma = totalWeight > 0 ? (totalWeightedSigma / totalWeight) : 0;
  
  // Normalize sigma to 0-1 scale. Assume sigma=3 is max deviation (1.0).
  const score = Math.min(1.0, overallSigma / 3.0);
  
  return { score, overallSigma };
}
