export type ScenarioType = "NORMAL" | "HEAT_RISK" | "CRITICAL_HEAT" | "FLOOD_RISK" | "RECOVERY" | "OFFLINE";

import { calculateBTI, adaptBiologicalObservation } from 'bioenso-bti';
import type { FarmBaseline } from 'bioenso-bti';

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
    score: number | null;
    level: string;
    message: string;
    primaryAction: string;
  };
  candidates?: any[];
  // Environmental source and connection metadata � explicitly distinguished from measurement validity
  // Optional because it is always set by getScenarioState() before returning, regardless of branch
  envSource?: {
    type: "SIMULATED" | "LIVE_EDGE_API" | "DISCONNECTED";
    connectionStatus: "CONNECTED" | "DISCONNECTED" | "STALE" | "NEVER_CONNECTED" | null;
    lastSuccessfulFetch: string | null;
    lastError: string | null;
    dataQuality: "VALID" | "SUSPECT" | "MISSING";
  };
}

export function getScenarioState(
  scenario: ScenarioType, 
  riskOverride?: number, 
  liveBiology?: any,
  candidates?: any[],
  liveEnv?: any,
  climateFeatures?: any,
  envSourceType?: "SIMULATED" | "LIVE",
  envConnectionState?: import('bioenso-shared').EnvironmentalConnectionState | null
): AppState {
  const UI_BASELINE: FarmBaseline = {
    expectedBehavior: {
      shadeSeeking: 0.15,
      waterDemand: 0.10,
      movement: 0.50,
      grazing: 0.75,
      resting: 0.40,
      drinking: 0.05,
      ruminating: 0.10,
      thermalResponse: 0.10
    },
    variability: {
      shadeSeeking: 0.1, waterDemand: 0.1, movement: 0.1, grazing: 0.1,
      resting: 0.1, drinking: 0.1, ruminating: 0.1, thermalResponse: 0.1
    }
  };
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
      break;
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

  
  // Derive BTI-based risk from the shared engine's output

  // If live environment is available, use it to override the base state
  if (liveEnv) {
    // Valid environmental observation received � use its measurements
    baseState.environment.temperature = liveEnv.temperature?.value ?? baseState.environment.temperature;
    baseState.environment.humidity = liveEnv.humidity?.value ?? baseState.environment.humidity;
    baseState.environment.rainfall = liveEnv.rainfall?.value ?? baseState.environment.rainfall;
    baseState.environment.tempDiff = climateFeatures?.temperatureTrend ?? baseState.environment.tempDiff;
    // Stale data is still an observation, but surface its age
    const isStale = envConnectionState?.status === "STALE";
    (baseState as any).envSource = {
      type: liveEnv.source === "SIMULATED" ? "SIMULATED" : "LIVE_EDGE_API",
      connectionStatus: envConnectionState?.status ?? (envSourceType === "LIVE" ? "CONNECTED" : null),
      lastSuccessfulFetch: envConnectionState?.lastSuccessfulFetch ?? liveEnv.receiptTime,
      lastError: envConnectionState?.lastError ?? null,
      dataQuality: isStale ? "SUSPECT" : liveEnv.overallQuality
    };
  } else {
    // No observation received
    if (envSourceType === "LIVE") {
      // Live mode selected but connection failed � do NOT substitute simulated data or render as Safe
      (baseState as any).envSource = {
        type: "DISCONNECTED",
        connectionStatus: envConnectionState?.status ?? "DISCONNECTED",
        lastSuccessfulFetch: envConnectionState?.lastSuccessfulFetch ?? null,
        lastError: envConnectionState?.lastError ?? "No observation received",
        dataQuality: "MISSING"
      };
      baseState.riskState.level = "INSUFFICIENT EVIDENCE";
      baseState.riskState.message = "Environmental telemetry unavailable. Cannot compute live risk.";
      baseState.riskState.score = null;
    } else {
      // Simulated mode � surface clearly as simulated
      (baseState as any).envSource = {
        type: "SIMULATED",
        connectionStatus: null,
        lastSuccessfulFetch: null,
        lastError: null,
        dataQuality: "VALID" // Simulated data is internally consistent
      };
    }
  }

  
  // Create simulated biology from current animal state diffs if liveBiology is absent
  let biologicalInput = null;
  if (liveBiology && liveBiology.status === "ACTIVE") {
      const { observation } = adaptBiologicalObservation(liveBiology, UI_BASELINE, true);
      biologicalInput = observation;
      
      const active = liveBiology.activeAnimals.value;
      baseState.animalState.total = (active !== null && active > 0) ? active : 128;
      
      // Keep UI visual state aligned with the new valid values
      baseState.animalState.shadeOccupancyDiff = (liveBiology.shadeOccupancyPct.value !== null ? liveBiology.shadeOccupancyPct.value : 15) - 15;
      baseState.animalState.waterDemandDiff = (liveBiology.waterZoneOccupancyPct.value !== null ? liveBiology.waterZoneOccupancyPct.value : 10) - 10;
      baseState.animalState.movementDiff = liveBiology.movementIndex.value !== null ? Math.round((liveBiology.movementIndex.value * 100) - 50) : 0;
      baseState.animalState.grazingDiff = (liveBiology.grazingPct.value !== null ? liveBiology.grazingPct.value : 75) - 75;
  } else {
      // Simulate input for the engine based on the scenario's predefined visual diffs
      biologicalInput = {
        animalsDetected: baseState.animalState.total,
        behavior: {
          shadeSeeking: 0.15 + (baseState.animalState.shadeOccupancyDiff / 100),
          waterDemand: 0.10 + (baseState.animalState.waterDemandDiff / 100),
          movement: 0.50 + (baseState.animalState.movementDiff / 100),
          grazing: 0.75 + (baseState.animalState.grazingDiff / 100),
          resting: undefined,
          drinking: undefined,
          ruminating: undefined,
          thermalResponse: undefined
        }
      };
  }

  // Evaluate through authoritative engine
  if (scenario !== "OFFLINE" && scenario !== "RECOVERY") { // Recovery handles its own manual interpolation for demo
    const hazard = scenario === "FLOOD_RISK" ? "FLOOD" : "HEAT";
    
    const btiResult = calculateBTI({
      climate: {
        ensoState: "EL_NINO",
        regionalSignal: "WARM",
        regionalClimateRelevance: 0.5,
        temperatureAnomaly: baseState.environment.tempDiff,
        rainfallAnomaly: scenario === "FLOOD_RISK" ? 50 : 0
      },
      environment: {
        temperature: baseState.environment.temperature,
        humidity: baseState.environment.humidity,
        durationMinutes: 120
      },
      biological: biologicalInput,
      baseline: UI_BASELINE,
      hazard: hazard
    });

    baseState.riskState.score = btiResult.score;


    // Map presentation states
    if (btiResult.severity === "INSUFFICIENT") {
      baseState.riskState.level = "INSUFFICIENT EVIDENCE";
      baseState.riskState.message = liveBiology ? "LIVE: " + btiResult.explanation[0] : btiResult.explanation[0];
      baseState.riskState.primaryAction = "Check Sensors";
    } else if (btiResult.severity === "CRITICAL") {

      baseState.riskState.level = "CRITICAL RISK";
      baseState.riskState.message = liveBiology ? "LIVE: " + btiResult.explanation[0] : btiResult.explanation[0];
      baseState.riskState.primaryAction = "Deploy Countermeasures Now";
    } else if (btiResult.severity === "ELEVATED") {
      baseState.riskState.level = "ELEVATED RISK";
      baseState.riskState.message = liveBiology ? "LIVE: " + btiResult.explanation[0] : btiResult.explanation[0];
      baseState.riskState.primaryAction = "Monitor closely";
    } else if (btiResult.severity === "WATCH") {
      baseState.riskState.level = "WATCH";
      baseState.riskState.message = liveBiology ? "LIVE: " + btiResult.explanation[0] : btiResult.explanation[0];
      baseState.riskState.primaryAction = "Ensure resources";
    } else {
      baseState.riskState.level = "SAFE TODAY";
      baseState.riskState.message = liveBiology ? "LIVE: Herd behavior is normal." : "Conditions are within normal bounds.";
    }

    // SAFETY DEFECT FIX: Override BTI result if environmental data is stale or disconnected
    const isUnavailable = envConnectionState?.status !== "CONNECTED";
    if (isUnavailable && envSourceType === "LIVE") {
      baseState.riskState.score = null;
      baseState.riskState.level = "INSUFFICIENT EVIDENCE";
      baseState.riskState.message = "Environmental telemetry is stale. Cannot compute live risk.";
      baseState.riskState.primaryAction = "Check Sensors";
    }
  }

  if (candidates) baseState.candidates = candidates;
  return baseState;
}





