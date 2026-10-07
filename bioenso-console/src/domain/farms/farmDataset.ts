import type { FarmBaseline, BiologicalObservation, EnvironmentObservation, ClimateObservation, HazardType } from '../bti/types';

export interface FarmState {
  id: string;
  name: string;
  location: { district: string; latitude: number; longitude: number };
  livestock: { species: string[]; herdSize: number };
  baseline: FarmBaseline;
  currentClimate: ClimateObservation;
  currentEnvironment: EnvironmentObservation;
  currentBiology: BiologicalObservation;
  intervention: { active: boolean; type: "COOLING" | "EVACUATION" | null };
  connectivity: { environmentNode: boolean; camera: boolean; thermal: boolean; edgeAI: boolean; lora: boolean; cloud: boolean };
  hazard: HazardType;
}

const defaultBaseline: FarmBaseline = {
  expectedBehavior: { resting: 30, movement: 20, drinking: 10, grazing: 25, ruminating: 15, shadeSeeking: 10, waterDemand: 10, thermalResponse: 10 },
  variability: { resting: 5, movement: 5, drinking: 2, grazing: 5, ruminating: 3, shadeSeeking: 2, waterDemand: 2, thermalResponse: 2 }
};

export const baseFarms: FarmState[] = [
  {
    id: "FARM_01", name: "Farm A", location: { district: "Chengalpattu", latitude: 12.68, longitude: 79.98 },
    livestock: { species: ["Cattle"], herdSize: 100 },
    hazard: "HEAT",
    baseline: defaultBaseline,
    currentClimate: { ensoState: "El Niño", regionalSignal: "Elevated", regionalClimateRelevance: 0.8, temperatureAnomaly: 0, rainfallAnomaly: 0 },
    currentEnvironment: { temperature: 30, humidity: 50, thi: 70, durationMinutes: 0 },
    currentBiology: { animalsDetected: 100, behavior: { ...defaultBaseline.expectedBehavior } },
    intervention: { active: false, type: null },
    connectivity: { environmentNode: true, camera: true, thermal: true, edgeAI: true, lora: true, cloud: true }
  },
  {
    id: "FARM_02", name: "Farm B", location: { district: "Cuddalore", latitude: 11.75, longitude: 79.76 },
    livestock: { species: ["Cattle"], herdSize: 100 },
    hazard: "HEAT",
    baseline: defaultBaseline,
    currentClimate: { ensoState: "El Niño", regionalSignal: "Elevated", regionalClimateRelevance: 0.7, temperatureAnomaly: 0, rainfallAnomaly: 0 },
    currentEnvironment: { temperature: 31, humidity: 55, thi: 72, durationMinutes: 0 },
    currentBiology: { animalsDetected: 100, behavior: { ...defaultBaseline.expectedBehavior } },
    intervention: { active: false, type: null },
    connectivity: { environmentNode: true, camera: true, thermal: true, edgeAI: true, lora: true, cloud: true }
  },
  {
    id: "FARM_06", name: "Farm F (Flood Prone)", location: { district: "Thanjavur", latitude: 10.78, longitude: 79.13 },
    livestock: { species: ["Cattle"], herdSize: 120 },
    hazard: "FLOOD",
    baseline: defaultBaseline,
    currentClimate: { ensoState: "El Niño", regionalSignal: "Moderate", regionalClimateRelevance: 0.6, temperatureAnomaly: 0, rainfallAnomaly: 0 },
    currentEnvironment: { temperature: 28, humidity: 80, rainfall: 0, waterLevel: 0, soilWetness: 30, durationMinutes: 0 },
    currentBiology: { animalsDetected: 120, behavior: { ...defaultBaseline.expectedBehavior } },
    intervention: { active: false, type: null },
    connectivity: { environmentNode: true, camera: true, thermal: false, edgeAI: true, lora: true, cloud: true }
  },
];

// 39 placeholders
export const placeholderFarms: FarmState[] = Array.from({ length: 39 }).map((_, i) => ({
  id: `FARM_P_${i}`, name: `Farm P${i}`,
  location: { district: "Various", latitude: 11.0 + Math.random()*2, longitude: 78.0 + Math.random()*2 },
  livestock: { species: ["Cattle"], herdSize: Math.floor(Math.random() * 100) + 10 },
  hazard: i % 5 === 0 ? "FLOOD" : "HEAT",
  baseline: defaultBaseline,
  currentClimate: { ensoState: "El Niño", regionalSignal: "Low", regionalClimateRelevance: 0.2, temperatureAnomaly: 0, rainfallAnomaly: 0 },
  currentEnvironment: { temperature: 30, humidity: 50, thi: 70, durationMinutes: 0 },
  currentBiology: { animalsDetected: 50, behavior: { ...defaultBaseline.expectedBehavior } },
  intervention: { active: false, type: null },
  connectivity: { environmentNode: true, camera: true, thermal: true, edgeAI: true, lora: true, cloud: true }
}));

export const allFarms: FarmState[] = [...baseFarms, ...placeholderFarms];
