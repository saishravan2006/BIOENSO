import type { BiologicalObservation as SharedBioObs } from 'bioenso-shared';
import type { BiologicalObservation as BtiBioObs, FarmBaseline } from './types';

export function adaptBiologicalObservation(
  sharedObs: SharedBioObs | null,
  baseline: FarmBaseline,
  isLive: boolean
): { observation: BtiBioObs; dataQualityDegraded: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  let dataQualityDegraded = false;

  // If no observation is provided, or we are running in pure simulation mode without live data,
  // we return the simulated baseline explicitly so it can be evaluated, but we note it's not live.
  if (!sharedObs || !isLive) {
    return {
      observation: {
        animalsDetected: 0,
        behavior: { ...baseline.expectedBehavior }
      },
      dataQualityDegraded: false,
      missingFields: []
    };
  }

  // Live observation mapping
  dataQualityDegraded = sharedObs.overallQuality !== "VALID";

  const getSafeValue = (field: any, name: string) => {
    if (field.value === null || field.value === undefined) {
      missingFields.push(name);
      return undefined; // Leaves it missing, allowing biology.ts guard to skip it
    }
    return field.value;
  };

  const btiObs: BtiBioObs = {
    animalsDetected: getSafeValue(sharedObs.activeAnimals, 'activeAnimals') ?? 0,
    behavior: {
      movement: getSafeValue(sharedObs.movementIndex, 'movementIndex'),
      shadeSeeking: sharedObs.shadeOccupancyPct.value !== null ? sharedObs.shadeOccupancyPct.value / 100 : undefined,
      waterDemand: sharedObs.waterZoneOccupancyPct.value !== null ? sharedObs.waterZoneOccupancyPct.value / 100 : undefined,
      grazing: sharedObs.grazingPct.value !== null ? sharedObs.grazingPct.value / 100 : undefined,
      
      // The legacy API does not provide these. We mark them undefined rather than making up zeroes or fallback values.
      resting: undefined,
      drinking: undefined,
      ruminating: undefined,
      thermalResponse: undefined
    }
  };

  // Push missing explicitly for unprovided fields
  if (btiObs.behavior.shadeSeeking === undefined) missingFields.push('shadeOccupancyPct');
  if (btiObs.behavior.waterDemand === undefined) missingFields.push('waterZoneOccupancyPct');
  if (btiObs.behavior.grazing === undefined) missingFields.push('grazingPct');

  return {
    observation: btiObs,
    dataQualityDegraded,
    missingFields
  };
}
import type { EnvironmentalObservation as SharedEnvObs } from 'bioenso-shared';
import type { EnvironmentObservation as BtiEnvObs } from './types';

// Adapts the shared environmental observation into the BTI engine's expected input structure.
export function adaptEnvironmentalObservation(
  sharedObs: SharedEnvObs | null,
  baselineEnv: BtiEnvObs, // We use the baseline environment as fallback if things are missing
  isLive: boolean
): { observation: BtiEnvObs; dataQualityDegraded: boolean; missingFields: string[]; limitations: string[] } {
  const missingFields: string[] = [];
  const limitations: string[] = [];
  let dataQualityDegraded = false;

  if (!sharedObs || !isLive) {
    return {
      observation: { ...baselineEnv },
      dataQualityDegraded: false,
      missingFields: [],
      limitations: []
    };
  }

  dataQualityDegraded = sharedObs.overallQuality !== "VALID";

  const getSafeValue = (field: any, name: string) => {
    if (field.value === null || field.value === undefined) {
      missingFields.push(name);
      return undefined;
    }
    return field.value;
  };

  const temp = getSafeValue(sharedObs.temperature, 'temperature');
  const hum = getSafeValue(sharedObs.humidity, 'humidity');
  
  // Note on rawWetSensorAdc:
  // The BTI engine expects `soilWetness` or `waterLevel`. We CANNOT map `rawWetSensorAdc` directly
  // to these fields without a documented calibration procedure. 
  // Doing so would violate safety constraints.
  if (sharedObs.rawWetSensorAdc.value !== null) {
    limitations.push("rawWetSensorAdc is valid but cannot influence BTI until a calibration profile translates it to soilWetness or waterLevel");
  }
  
  if (sharedObs.solarRadiation.value !== null) {
    limitations.push("solarRadiation is valid but cannot safely map to BTI radiantHeat without conversion formula");
  }

  const btiObs: BtiEnvObs = {
    // If temp/humidity are missing or invalid, we MUST fall back to baseline 
    // because BTI engine requires them to be numbers. BTI cannot handle missing core environment fields safely yet.
    temperature: temp !== undefined ? temp : (isLive ? undefined : baselineEnv.temperature),
    humidity: hum !== undefined ? hum : (isLive ? undefined : baselineEnv.humidity),
    
    // Optional fields
    rainfall: getSafeValue(sharedObs.rainfall, 'rainfall') ?? baselineEnv.rainfall,
    wind: getSafeValue(sharedObs.wind, 'wind') ?? baselineEnv.wind,
    
    // These remain driven by baseline since we have no safe live inputs
    thi: baselineEnv.thi,
    radiantHeat: baselineEnv.radiantHeat,
    waterLevel: baselineEnv.waterLevel,
    soilWetness: baselineEnv.soilWetness,
    
    durationMinutes: baselineEnv.durationMinutes
  };

  return {
    observation: btiObs,
    dataQualityDegraded,
    missingFields,
    limitations
  };
}

