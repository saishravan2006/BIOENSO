import type { FarmState } from './domain/farms/farmDataset';
import { allFarms } from './domain/farms/farmDataset';
import { simulateScenario } from './domain/simulation/scenarioEngine';
import type { NetworkScenario } from './domain/simulation/scenarioEngine';
import { calculateBTI } from './domain/bti/engine';
import type { BTIResult } from './domain/bti/types';

// The new unified Farm type that the UI expects
export interface Farm extends FarmState {
  bti: BTIResult;
}

export type { NetworkScenario };

// Mock history generation for demo
const mockHistoryScores = (baseScore: number, trend: "RISING" | "FALLING" | "STABLE") => {
  if (trend === "RISING") return [baseScore - 15, baseScore - 10, baseScore - 5];
  if (trend === "FALLING") return [baseScore + 15, baseScore + 10, baseScore + 5];
  return [baseScore - 1, baseScore + 1, baseScore];
};

export const getNetworkState = (scenario: NetworkScenario, liveBiology?: any): Farm[] => {
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
    
    const history = mockHistoryScores(dummyBti.score, expectedTrend);
    
    // Inject live biology if available for DEMO_FARM_01
    let currentBiology = state.currentBiology;
    if (liveBiology && state.id === "DEMO_FARM_01") {
      currentBiology = {
        ...currentBiology,
        activityLevel: liveBiology.movement_index,
        shadeSeeking: liveBiology.shade_occupancy_pct / 100,
        waterDemand: liveBiology.water_zone_occupancy_pct / 100,
        stressIndicators: [
          ...currentBiology.stressIndicators,
          `CV_CONFIDENCE:${(liveBiology.confidence * 100).toFixed(0)}%`
        ]
      };
    }
    
    const bti = calculateBTI({
      climate: state.currentClimate,
      environment: state.currentEnvironment,
      biological: currentBiology,
      baseline: state.baseline,
      hazard: state.hazard,
      historyScores: history
    });

    return {
      ...state,
      currentBiology,
      bti
    };
  });
};
