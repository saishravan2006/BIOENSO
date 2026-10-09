import type { BehaviouralFeatures } from './biologyFeatures';
import type { BiologicalObservation } from './index';

export type BiologicalEventType = 
  | "GRAZING_ACTIVITY_DROP"
  | "MOVEMENT_ANOMALY"
  | "SHADE_OCCUPANCY_CHANGE"
  | "WATER_ZONE_OCCUPANCY_CHANGE"
  | "HERD_DISTRIBUTION_ANOMALY"
  | "ACUTE_BEHAVIOURAL_ANOMALY"
  | "INSUFFICIENT_EVIDENCE";

export interface BiologicalEvent {
  type: BiologicalEventType;
  timestamp: string;
  source: string;
  confidence: number;
  dataQuality: "VALID" | "SUSPECT" | "INVALID";
  metadata: {
    windowStart: string;
    windowEnd: string;
    changeMagnitude: number;
    description: string;
  };
}

export interface AnomalyThresholds {
  grazingDropThreshold: number;
  movementIncreaseThreshold: number;
  shadeIncreaseThreshold: number;
  waterIncreaseThreshold: number;
}

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  grazingDropThreshold: -20,
  movementIncreaseThreshold: 0.3,
  shadeIncreaseThreshold: 15,
  waterIncreaseThreshold: 10
};

export function detectBiologicalEvents(
  features: BehaviouralFeatures,
  latestObservation: BiologicalObservation | null,
  thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS
): BiologicalEvent[] {
  const events: BiologicalEvent[] = [];
  const now = new Date().toISOString();
  
  const source = latestObservation?.source || "UNKNOWN";
  const confidence = latestObservation?.confidence.quality === "VALID" ? latestObservation.confidence.value : 0;
  const quality = latestObservation?.overallQuality || "INVALID";

  if (!features.isValid || features.dataCompleteness < 0.5) {
    events.push({
      type: "INSUFFICIENT_EVIDENCE",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: "INVALID",
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: 0,
        description: "Insufficient historical baseline or recent data to detect behavioral anomalies."
      }
    });
    return events;
  }

  if (features.grazingChange !== null && features.grazingChange <= thresholds.grazingDropThreshold) {
    events.push({
      type: "GRAZING_ACTIVITY_DROP",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: quality,
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: features.grazingChange,
        description: `Grazing activity dropped by ${Math.abs(Math.round(features.grazingChange))}% relative to baseline.`
      }
    });
  }

  if (features.movementIntensityChange !== null && features.movementIntensityChange >= thresholds.movementIncreaseThreshold) {
    events.push({
      type: "MOVEMENT_ANOMALY",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: quality,
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: features.movementIntensityChange,
        description: `Scene movement index proxy increased by ${features.movementIntensityChange.toFixed(2)} relative to baseline.`
      }
    });
  }

  if (features.sustainedRapidMovement) {
    events.push({
      type: "ACUTE_BEHAVIOURAL_ANOMALY",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: quality,
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: features.movementIntensityChange || 0,
        description: `Sustained rapid movement detected over the time window.`
      }
    });
  }

  if (features.shadeOccupancyChange !== null && features.shadeOccupancyChange >= thresholds.shadeIncreaseThreshold) {
    events.push({
      type: "SHADE_OCCUPANCY_CHANGE",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: quality,
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: features.shadeOccupancyChange,
        description: `Shade occupancy increased by ${Math.round(features.shadeOccupancyChange)}% relative to baseline.`
      }
    });
  }

  if (features.waterOccupancyChange !== null && features.waterOccupancyChange >= thresholds.waterIncreaseThreshold) {
    events.push({
      type: "WATER_ZONE_OCCUPANCY_CHANGE",
      timestamp: now,
      source,
      confidence: confidence || 0,
      dataQuality: quality,
      metadata: {
        windowStart: features.windowStart,
        windowEnd: features.windowEnd,
        changeMagnitude: features.waterOccupancyChange,
        description: `Water zone occupancy increased by ${Math.round(features.waterOccupancyChange)}% relative to baseline.`
      }
    });
  }

  return events;
}
