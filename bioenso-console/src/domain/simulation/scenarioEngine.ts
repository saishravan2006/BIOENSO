import type { FarmState } from '../farms/farmDataset';

export type NetworkScenario = "NETWORK_NORMAL" | "NETWORK_HEAT_EVENT" | "NETWORK_FLOOD_EVENT" | "NETWORK_RECOVERY" | "NETWORK_OFFLINE";

export function simulateScenario(baseFarms: FarmState[], scenario: NetworkScenario): FarmState[] {
  // Deep clone to avoid mutating the base dataset
  const farms: FarmState[] = JSON.parse(JSON.stringify(baseFarms));

  if (scenario === "NETWORK_NORMAL") {
    return farms;
  }

  if (scenario === "NETWORK_HEAT_EVENT") {
    // Elevate climate relevance for all farms slightly
    farms.forEach(f => {
      f.currentClimate.temperatureAnomaly = 1.0;
      f.currentEnvironment.temperature += 1.0;
    });

    // Make Farm A (FARM_01) highly exposed and highly responsive (CRITICAL)
    const fA = farms.find(f => f.id === "FARM_01");
    if (fA) {
      fA.currentClimate.temperatureAnomaly = 3.8;
      fA.currentEnvironment.temperature = 36.8;
      fA.currentEnvironment.thi = 82.4;
      fA.currentEnvironment.radiantHeat = 80;
      fA.currentEnvironment.durationMinutes = 19;
      
      // Biological response deviation (e.g., shade seeking way up, movement down)
      fA.currentBiology.behavior.shadeSeeking = fA.baseline.expectedBehavior.shadeSeeking + 31;
      fA.currentBiology.behavior.waterDemand = fA.baseline.expectedBehavior.waterDemand + 22;
      fA.currentBiology.behavior.movement = Math.max(0, fA.baseline.expectedBehavior.movement - 19);
      fA.currentBiology.behavior.grazing = Math.max(0, fA.baseline.expectedBehavior.grazing - 16);
      fA.currentBiology.behavior.ruminating = Math.max(0, fA.baseline.expectedBehavior.ruminating - 12);
      fA.currentBiology.behavior.thermalResponse = fA.baseline.expectedBehavior.thermalResponse + 16;
    }
    
    // Make Farm B (FARM_02) slightly less exposed (ELEVATED)
    const fB = farms.find(f => f.id === "FARM_02");
    if (fB) {
      fB.currentClimate.temperatureAnomaly = 2.5;
      fB.currentEnvironment.temperature = 34.5;
      fB.currentEnvironment.thi = 78.0;
      fB.currentEnvironment.durationMinutes = 24;
      
      fB.currentBiology.behavior.shadeSeeking = fB.baseline.expectedBehavior.shadeSeeking + 15;
      fB.currentBiology.behavior.waterDemand = fB.baseline.expectedBehavior.waterDemand + 10;
      fB.currentBiology.behavior.movement = Math.max(0, fB.baseline.expectedBehavior.movement - 10);
    }
  }

  if (scenario === "NETWORK_FLOOD_EVENT") {
    const fF = farms.find(f => f.id === "FARM_06");
    if (fF) {
      fF.currentClimate.rainfallAnomaly = 45;
      fF.currentEnvironment.rainfall = 145;
      fF.currentEnvironment.waterLevel = 0.8;
      fF.currentEnvironment.soilWetness = 100;
      fF.currentEnvironment.durationMinutes = 65;
      
      fF.currentBiology.behavior.movement = fF.baseline.expectedBehavior.movement + 45; // Evacuating
      fF.currentBiology.behavior.grazing = Math.max(0, fF.baseline.expectedBehavior.grazing - 25);
      fF.currentBiology.behavior.ruminating = Math.max(0, fF.baseline.expectedBehavior.ruminating - 15);
    }
  }

  if (scenario === "NETWORK_RECOVERY") {
    // Farm A recovering
    const fA = farms.find(f => f.id === "FARM_01");
    if (fA) {
      fA.currentClimate.temperatureAnomaly = 3.8;
      fA.currentEnvironment.temperature = 36.8;
      fA.currentEnvironment.thi = 82.4;
      fA.currentEnvironment.durationMinutes = 45; // Persisted longer
      
      // But biology is recovering due to intervention
      fA.currentBiology.behavior.shadeSeeking = fA.baseline.expectedBehavior.shadeSeeking + 12;
      fA.currentBiology.behavior.waterDemand = fA.baseline.expectedBehavior.waterDemand + 8;
      fA.currentBiology.behavior.movement = Math.max(0, fA.baseline.expectedBehavior.movement - 5);
      
      fA.intervention.active = true;
      fA.intervention.type = "COOLING";
    }
  }

  return farms;
}
