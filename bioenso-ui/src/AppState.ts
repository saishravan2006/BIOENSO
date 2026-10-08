export type ScenarioType = "NORMAL" | "HEAT_RISK" | "CRITICAL_HEAT" | "FLOOD_RISK" | "RECOVERY" | "OFFLINE";

export interface AppState {
  scenario: ScenarioType;
  environment: {
    temperature: number;
    humidity: number;
    rainfall: number;
    tempDiff: number;
  };
  animalState: {
    total: number;
    normal: number;
    elevated: number;
    critical: number;
    shadeOccupancyDiff: number;
    waterDemandDiff: number;
    movementDiff: number;
    grazingDiff: number;
    waterDemandNormal: number;
    waterDemandNow: number;
  };
  riskState: {
    score: number;
    level: string;
    message: string;
    primaryAction: string;
  };
}

export function getScenarioState(scenario: ScenarioType, riskOverride?: number, liveBiology?: any): AppState {
  // Base configuration
  const base = {
    scenario,
    environment: { temperature: 32.1, humidity: 55, rainfall: 0, tempDiff: 0 },
    animalState: {
      total: 128,
      normal: 112,
      elevated: 11,
      critical: 5,
      shadeOccupancyDiff: 0,
      waterDemandDiff: 0,
      movementDiff: 0,
      grazingDiff: 0,
      waterDemandNormal: 1180,
      waterDemandNow: 1180,
    },
    riskState: {
      score: 24,
      level: "SAFE TODAY",
      message: "Livestock conditions are normal.",
      primaryAction: ""
    }
  };

  let baseState: AppState = base;

  switch (scenario) {
    case "NORMAL":
      baseState = {
        ...base,
        animalState: { ...base.animalState, normal: 122, elevated: 6, critical: 0 },
      };
      break;
    case "HEAT_RISK":
      baseState = {
        ...base,
        environment: { temperature: 34.2, humidity: 62, rainfall: 0, tempDiff: 2.1 },
        animalState: { 
          ...base.animalState, 
          normal: 90, elevated: 34, critical: 4,
          shadeOccupancyDiff: 18, waterDemandDiff: 12, movementDiff: -10, grazingDiff: -8,
          waterDemandNow: 1320
        },
        riskState: { score: 62, level: "WATCH", message: "Heat conditions are high.", primaryAction: "Ensure drinking water" }
      };
      break;
    case "CRITICAL_HEAT":
      baseState = {
        ...base,
        environment: { temperature: 36.4, humidity: 71, rainfall: 0, tempDiff: 4.3 },
        animalState: { 
          ...base.animalState, 
          normal: 34, elevated: 69, critical: 25,
          shadeOccupancyDiff: 31, waterDemandDiff: 20, movementDiff: -19, grazingDiff: -16,
          waterDemandNow: 1420
        },
        riskState: { score: 86, level: "ACT NOW", message: "Your livestock are experiencing high thermal stress.", primaryAction: "Start cooling" }
      };
      break;
    case "FLOOD_RISK":
      baseState = {
        ...base,
        environment: { temperature: 26.5, humidity: 95, rainfall: 42, tempDiff: -5.6 },
        animalState: { 
          ...base.animalState, 
          normal: 80, elevated: 40, critical: 8,
          shadeOccupancyDiff: -10, waterDemandDiff: -5, movementDiff: 24, grazingDiff: -40,
          waterDemandNow: 1100
        },
        riskState: { score: 88, level: "ACT NOW", message: "Flood conditions detected on farm.", primaryAction: "Move livestock to Zone B" }
      };
    case "RECOVERY":
      // If a riskOverride is provided (simulating the 86->32 drop), use it. Otherwise default to a middle value.
      const currentRisk = riskOverride ?? 44;
      
      // Interpolate animal state based on risk score (86 to 32)
      // At 86, critical is 25. At 32, critical is 2.
      const progress = Math.max(0, Math.min(1, (86 - currentRisk) / (86 - 32))); // 0 at start of recovery, 1 at end
      
      const currentCritical = Math.round(25 - (progress * 23));
      const currentElevated = Math.round(69 - (progress * 50));
      const currentNormal = 128 - currentCritical - currentElevated;

      baseState = {
        ...base,
        environment: { temperature: 33.5, humidity: 65, rainfall: 0, tempDiff: 1.4 },
        animalState: { 
          ...base.animalState, 
          normal: currentNormal, elevated: currentElevated, critical: currentCritical,
          shadeOccupancyDiff: Math.round(31 - (progress * 25)),
          waterDemandDiff: Math.round(20 - (progress * 15)),
          movementDiff: Math.round(-19 + (progress * 15)),
          grazingDiff: Math.round(-16 + (progress * 10)),
          waterDemandNow: Math.round(1420 - (progress * 200))
        },
        riskState: { 
          score: currentRisk, 
          level: currentRisk < 40 ? "NORMALIZED" : currentRisk < 60 ? "CONDITIONS IMPROVING" : "RECOVERING", 
          message: currentRisk < 40 ? "Conditions have returned toward normal." : "Animal stress indicators are returning toward baseline.", 
          primaryAction: "" 
        }
      };
      break;
    case "OFFLINE":
      baseState = {
        ...base,
        riskState: { score: 45, level: "OFFLINE", message: "Local protection active.", primaryAction: "" }
      };
      break;
    default:
      baseState = base;
  }

  // --- HACKATHON LIVE OVERRIDE ---
  // If we receive real-time data from the Python Vision API, inject it into the app state!
  if (liveBiology && liveBiology.status === "ACTIVE") {
      const active = liveBiology.active_animals;
      baseState.animalState.total = active > 0 ? active : 128; // fallback to 128 if no cows on screen
      
      // Calculate diffs from baseline
      baseState.animalState.shadeOccupancyDiff = liveBiology.shade_pct - 15; // Assuming 15% is normal
      baseState.animalState.waterDemandDiff = liveBiology.water_pct - 10; // Assuming 10% is normal
      baseState.animalState.movementDiff = Math.round((liveBiology.movement_index * 100) - 50); // Map index to diff
      baseState.animalState.grazingDiff = liveBiology.grazing_pct - 75;
      
      // Dynamically calculate risk score based on live stress signals (Shade + Low Movement)
      let liveRisk = 24; // Base normal risk
      if (liveBiology.shade_pct > 60) liveRisk += 25;
      if (liveBiology.movement_index < 0.2) liveRisk += 20; // Lethargy
      if (liveBiology.water_pct > 40) liveRisk += 20;
      
      baseState.riskState.score = liveRisk > 100 ? 100 : liveRisk;
      
      if (baseState.riskState.score > 70) {
          baseState.riskState.level = "CRITICAL RISK";
          baseState.riskState.message = "LIVE: Herd is showing severe signs of heat stress!";
          baseState.riskState.primaryAction = "Deploy Sprinklers Now";
          baseState.animalState.critical = Math.floor(baseState.animalState.total * 0.4);
      } else if (baseState.riskState.score > 40) {
          baseState.riskState.level = "ELEVATED RISK";
          baseState.riskState.message = "LIVE: Animals are clustering in shade.";
          baseState.animalState.elevated = Math.floor(baseState.animalState.total * 0.3);
      } else {
          baseState.riskState.level = "SAFE TODAY";
          baseState.riskState.message = "LIVE: Herd behavior is normal.";
      }
  }

  return baseState;
}
