import type { BTIResult, ClimateObservation, EnvironmentObservation, BiologicalObservation, FarmBaseline, HazardType, Severity } from './types';
import { BTI_WEIGHTS } from './config';
import { calculateClimateContextScore } from './climateContext';
import { calculateExposureScore } from './exposure';
import { estimateExpectedBiologicalResponse, calculateBiologicalResiduals, calculateBiologicalDeviation } from './biology';
import { calculatePersistenceScore } from './persistence';
import { calculateConfidence } from './confidence';

export function calculateBTI(params: {
  climate: ClimateObservation;
  environment: EnvironmentObservation;
  biological: BiologicalObservation;
  baseline: FarmBaseline;
  hazard: HazardType;
  historyScores?: number[];
}): BTIResult {
  const { climate, environment, biological, baseline, hazard, historyScores = [] } = params;

  // 1. Calculate the 4 components
  const C = calculateClimateContextScore(climate, hazard);
  const E = calculateExposureScore(environment, hazard);
  
  const expectedBio = estimateExpectedBiologicalResponse(baseline);
  const residuals = calculateBiologicalResiduals(biological, expectedBio, baseline.variability);
  const { score: B, overallSigma } = calculateBiologicalDeviation(residuals, hazard);
  
  const P = calculatePersistenceScore(environment.durationMinutes);

  // 2. Raw BTI Calculation
  const btiRaw = 100 * (
    BTI_WEIGHTS.CLIMATE_CONTEXT * C +
    BTI_WEIGHTS.FARM_EXPOSURE * E +
    BTI_WEIGHTS.BIOLOGICAL_RESPONSE * B +
    BTI_WEIGHTS.PERSISTENCE * P
  );
  
  const score = Math.round(Math.min(Math.max(btiRaw, 0), 100));
  
  // 3. Severity
  let severity: Severity = "NORMAL";
  if (score >= 70) severity = "CRITICAL";
  else if (score >= 50) severity = "ELEVATED";
  else if (score >= 30) severity = "WATCH";

  // 4. Trend
  let trend: "RISING" | "STABLE" | "FALLING" = "STABLE";
  if (historyScores.length > 0) {
    const prev = historyScores[historyScores.length - 1];
    if (score > prev + 5) trend = "RISING";
    else if (score < prev - 5) trend = "FALLING";
  }

  // 5. Quality
  const { confidence, dataQuality } = calculateConfidence(climate, environment, biological);

  // 6. Explanation Generator
  const explanation: string[] = [];
  if (C > 0.6) explanation.push("Regional climate context is elevated");
  if (E > 0.7) explanation.push(`Farm ${hazard.toLowerCase()} exposure is high`);
  if (B > 0.5) explanation.push("Multiple biological indicators deviate significantly from baseline");
  if (P > 0.5) explanation.push(`Deviation persisted for ${environment.durationMinutes} minutes`);
  if (explanation.length === 0) explanation.push("Conditions are within normal expected bounds");

  return {
    score,
    components: {
      climateContext: Number(C.toFixed(2)),
      farmExposure: Number(E.toFixed(2)),
      biologicalResponse: Number(B.toFixed(2)),
      persistence: Number(P.toFixed(2))
    },
    confidence,
    residual: Number(overallSigma.toFixed(2)),
    persistenceMinutes: environment.durationMinutes,
    severity,
    trend,
    dataQuality,
    explanation
  };
}
