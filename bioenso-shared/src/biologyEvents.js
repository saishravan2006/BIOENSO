"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBiologicalEvents = detectBiologicalEvents;
const DEFAULT_THRESHOLDS = {
    grazingDropThreshold: -20,
    movementIncreaseThreshold: 0.3,
    shadeIncreaseThreshold: 15,
    waterIncreaseThreshold: 10
};
function detectBiologicalEvents(features, latestObservation, thresholds = DEFAULT_THRESHOLDS) {
    const events = [];
    const now = new Date().toISOString();
    const source = (latestObservation === null || latestObservation === void 0 ? void 0 : latestObservation.source) || "UNKNOWN";
    const confidence = (latestObservation === null || latestObservation === void 0 ? void 0 : latestObservation.confidence.quality) === "VALID" ? latestObservation.confidence.value : 0;
    const quality = (latestObservation === null || latestObservation === void 0 ? void 0 : latestObservation.overallQuality) || "INVALID";
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
