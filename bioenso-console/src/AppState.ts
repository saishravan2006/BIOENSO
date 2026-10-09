import type { FarmState } from './domain/farms/farmDataset';
import { allFarms } from './domain/farms/farmDataset';
import { simulateScenario } from './domain/simulation/scenarioEngine';
import type { NetworkScenario } from './domain/simulation/scenarioEngine';
import { calculateBTI, adaptBiologicalObservation } from 'bioenso-bti';
import type { BTIResult } from 'bioenso-bti';

// The new unified Farm type that the UI expects
export interface Farm extends FarmState {
  bti: BTIResult;
  candidates?: any[];
}

export type { NetworkScenario };

// Mock history generation for demo
const mockHistoryScores = (baseScore: number, trend: "RISING" | "FALLING" | "STABLE") => {
  if (trend === "RISING") return [baseScore - 15, baseScore - 10, baseScore - 5];
  if (trend === "FALLING") return [baseScore + 15, baseScore + 10, baseScore + 5];
  return [baseScore - 1, baseScore + 1, baseScore];
};

import type { EnvironmentalConnectionState } from 'bioenso-shared';

export const getNetworkState = (
  scenario: NetworkScenario, 
  liveBiology?: any, 
  candidates?: any[],
  liveEnv?: any,
  envConnectionState?: EnvironmentalConnectionState | null,
  envSourceType?: "SIMULATED" | "LIVE"
): Farm[] => {
  // 1. Get raw simulated states
  const rawStates = simulateScenario(allFarms, scenario);

  // 2. Pass them through the BTI Intelligence Engine
  return rawStates.map(state => {
    
    // Simulate trend history based on scenario context
    let expectedTrend: "RISING" | "FALLING" | "STABLE" = "STABLE";
    if (scenario === "NETWORK_HEAT_EVENT" && state.hazard === "HEAT") expectedTrend = "RISING";
    if (scenario === "NETWORK_FLOOD_EVENT" && state.hazard === "FLOOD") expectedTrend = "RISING";
    if (scenario === "NETWORK_RECOVERY") expectedTrend = "FALLING";
    
    // In a real app we'd have actual DB history, here we mock it to drive the trend logic
    const dummyBti = calculateBTI({
      climate: state.currentClimate,
      environment: state.currentEnvironment,
      biological: state.currentBiology,
      baseline: state.baseline,
      hazard: state.hazard,
    });
    
    const history = mockHistoryScores(dummyBti.score ?? 0, expectedTrend);
    
    // Inject live biology and environment if available for FARM_01
    let currentBiology = state.currentBiology;
    let currentEnvironment = state.currentEnvironment;
    let overrideStale = false;
    
    if (state.id === "FARM_01") {
      const { observation } = adaptBiologicalObservation(liveBiology, state.baseline, !!liveBiology);
      currentBiology = observation;
      
      if (liveEnv && envSourceType === "LIVE") {
        currentEnvironment = {
          ...currentEnvironment,
          temperature: liveEnv.temperature?.value ?? currentEnvironment.temperature,
          humidity: liveEnv.humidity?.value ?? currentEnvironment.humidity,
          rainfall: liveEnv.rainfall?.value ?? currentEnvironment.rainfall
        };
      }
      
      const isUnavailable = envConnectionState?.status !== "CONNECTED";
      if (envSourceType === "LIVE" && (isUnavailable || !liveEnv)) {
        overrideStale = true;
      }
    }
    
    const bti = calculateBTI({
      climate: state.currentClimate,
      environment: currentEnvironment,
      biological: currentBiology,
      baseline: state.baseline,
      hazard: state.hazard,
      historyScores: history
    });

    if (overrideStale) {
      bti.score = null;
      bti.severity = "INSUFFICIENT";
      bti.explanation = ["Environmental telemetry is stale or unavailable. Cannot compute live risk."];
    }

    return {
      ...state,
      currentBiology,
      currentEnvironment,
      bti,
      candidates
    };
  });
};





