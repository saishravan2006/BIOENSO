import type { BiologicalObservation, FieldMeasurement } from './index';

export interface BehaviouralFeatures {
  windowStart: string;
  windowEnd: string;
  dataCompleteness: number;

  grazingChange: number | null; // delta %
  unclassifiedActivityChange: number | null;
  movementIntensityChange: number | null;
  shadeOccupancyChange: number | null;
  waterOccupancyChange: number | null;
  
  sustainedRapidMovement: boolean | null;
  
  // Indicates if this feature set is valid enough for anomaly detection
  isValid: boolean;
}

export function extractBehaviouralFeatures(
  baseline: BiologicalObservation[],
  recent: BiologicalObservation[],
  windowMinutes: number,
  expectedSamplesPerMinute: number = 1
): BehaviouralFeatures {
  const latestTime = recent.length > 0 ? new Date(recent[recent.length - 1].receiptTime) : new Date();
  const windowStart = new Date(latestTime.getTime() - windowMinutes * 60000);

  const expectedSamples = windowMinutes * expectedSamplesPerMinute;
  const validRecent = recent.filter(o => o.overallQuality === "VALID");
  const completeness = expectedSamples > 0 ? validRecent.length / expectedSamples : 0;

  let grazingChange: number | null = null;
  let unclassifiedActivityChange: number | null = null;
  let movementChange: number | null = null;
  let shadeChange: number | null = null;
  let waterChange: number | null = null;
  let sustainedRapidMovement: boolean | null = null;

  const validBaseline = baseline.filter(o => o.overallQuality === "VALID");

  if (validRecent.length > 0 && validBaseline.length > 0) {
    const getAvg = (obs: BiologicalObservation[], field: keyof BiologicalObservation) => {
      const vals = obs.map(o => {
        const measurement = o[field] as FieldMeasurement<number> | undefined;
        return measurement?.quality === "VALID" ? (measurement.value as number) : null;
      }).filter(v => v !== null) as number[];
      return vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    };

    const baseGrazing = getAvg(validBaseline, 'grazingPct');
    const recentGrazing = getAvg(validRecent, 'grazingPct');
    if (baseGrazing !== null && recentGrazing !== null) grazingChange = recentGrazing - baseGrazing;

    // We don't have restingPct explicitly typed in BiologicalObservation yet, so we will skip or add it.
    // Assuming we add it to the schema:
    const baseUnclass = getAvg(validBaseline, 'unclassifiedActivityPct' as any);
    const recentUnclass = getAvg(validRecent, 'unclassifiedActivityPct' as any);
    if (baseUnclass !== null && recentUnclass !== null) unclassifiedActivityChange = recentUnclass - baseUnclass;

    const baseMove = getAvg(validBaseline, 'movementIndex');
    const recentMove = getAvg(validRecent, 'movementIndex');
    if (baseMove !== null && recentMove !== null) movementChange = recentMove - baseMove;

    const baseShade = getAvg(validBaseline, 'shadeOccupancyPct');
    const recentShade = getAvg(validRecent, 'shadeOccupancyPct');
    if (baseShade !== null && recentShade !== null) shadeChange = recentShade - baseShade;

    const baseWater = getAvg(validBaseline, 'waterZoneOccupancyPct');
    const recentWater = getAvg(validRecent, 'waterZoneOccupancyPct');
    if (baseWater !== null && recentWater !== null) waterChange = recentWater - baseWater;

    // Sustained rapid movement: if recent mean movement is > 0.8 and higher than baseline
    if (recentMove !== null && baseMove !== null) {
      sustainedRapidMovement = recentMove > 0.8 && recentMove > baseMove * 1.5;
    }
  }

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: latestTime.toISOString(),
    dataCompleteness: Math.min(1.0, completeness),
    grazingChange,
    unclassifiedActivityChange,
    movementIntensityChange: movementChange,
    shadeOccupancyChange: shadeChange,
    waterOccupancyChange: waterChange,
    sustainedRapidMovement,
    isValid: validRecent.length > 0 && validBaseline.length > 0
  };
}
