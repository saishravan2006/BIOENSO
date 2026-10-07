export type Severity = "NORMAL" | "WATCH" | "ELEVATED" | "CRITICAL";
export type Trend = "RISING" | "STABLE" | "FALLING";
export type DataQuality = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type HazardType = "HEAT" | "FLOOD" | "NONE";

export interface BTIResult {
  score: number;
  components: {
    climateContext: number;
    farmExposure: number;
    biologicalResponse: number;
    persistence: number;
  };
  confidence: number;
  residual: number; // Biological Climate Residual (+sigma)
  persistenceMinutes: number;
  severity: Severity;
  trend: Trend;
  dataQuality: DataQuality;
  explanation: string[];
}

export interface ClimateObservation {
  ensoState: string;
  regionalSignal: string;
  regionalClimateRelevance: number; // 0.0 - 1.0
  temperatureAnomaly: number;
  rainfallAnomaly: number;
}

export interface EnvironmentObservation {
  temperature: number;
  humidity: number;
  thi?: number;
  radiantHeat?: number;
  wind?: number;
  rainfall?: number;
  waterLevel?: number;
  soilWetness?: number;
  durationMinutes: number;
}

export interface BiologicalBehavior {
  resting: number;
  movement: number;
  drinking: number;
  grazing: number;
  ruminating: number;
  shadeSeeking: number;
  waterDemand: number;
  thermalResponse: number;
}

export interface BiologicalObservation {
  animalsDetected: number;
  behavior: BiologicalBehavior;
}

export interface FarmBaseline {
  expectedBehavior: BiologicalBehavior;
  variability: BiologicalBehavior; // e.g. MAD for computing sigma
}
