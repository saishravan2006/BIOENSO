import type { ClimateObservation, HazardType } from './types';

// Calculate Climate Context (C) -> 0.0 to 1.0
export function calculateClimateContextScore(climate: ClimateObservation, hazard: HazardType): number {
  if (hazard === "NONE") return 0;
  
  // Base climate relevance (e.g. from ENSO + regional connection)
  let score = climate.regionalClimateRelevance;
  
  // Add hazard-specific modifiers based on anomalies
  if (hazard === "HEAT" && climate.temperatureAnomaly > 0) {
    // e.g. Anomaly of +4C adds up to 0.4 to the climate score
    score += Math.min(climate.temperatureAnomaly / 10, 0.4);
  }
  
  if (hazard === "FLOOD" && climate.rainfallAnomaly > 0) {
    // e.g. Anomaly of +50% adds up to 0.4 to the climate score
    score += Math.min(climate.rainfallAnomaly / 100, 0.4);
  }

  return Math.min(Math.max(score, 0.0), 1.0);
}
