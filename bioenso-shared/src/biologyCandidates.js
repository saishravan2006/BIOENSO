"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalEventCorrelationLayer = exports.PROVISIONAL_CANDIDATE_CONFIG = void 0;
exports.PROVISIONAL_CANDIDATE_CONFIG = {
    version: "0.1-PROVISIONAL",
    minDataCompleteness: 0.7,
    requiredCooccurringEvents: 2,
    persistenceWindowMs: 15 * 60 * 1000,
    eventCooldownMs: 30 * 60 * 1000
};
class TemporalEventCorrelationLayer {
    constructor(config = exports.PROVISIONAL_CANDIDATE_CONFIG) {
        this.activeCandidates = new Map();
        this.config = config;
    }
    processInterval(features, biologicalEvents, environmentalContext, nowIso) {
        var _a, _b, _c, _d, _e, _f, _g;
        const now = nowIso ? new Date(nowIso) : new Date();
        const result = [];
        // 1. Resolve stale events
        this.activeCandidates.forEach((candidate, id) => {
            const lastObserved = new Date(candidate.lastObservedTime);
            if (now.getTime() - lastObserved.getTime() > this.config.eventCooldownMs) {
                candidate.status = "RESOLVED";
                result.push({ ...candidate });
                this.activeCandidates.delete(id);
            }
        });
        // 2. Check for insufficient evidence
        if (!features.isValid || features.dataCompleteness < this.config.minDataCompleteness) {
            // If we are currently tracking an event, we shouldn't necessarily resolve it just because of a short camera drop.
            // But we emit an explicit insufficient evidence outcome for this interval.
            result.push({
                eventId: `IE-${now.getTime()}`,
                type: "INSUFFICIENT_EVIDENCE",
                startTime: now.toISOString(),
                lastObservedTime: now.toISOString(),
                status: "INSUFFICIENT_EVIDENCE",
                source: "SYSTEM",
                evidence: {
                    eventTypes: biologicalEvents.map(e => e.type),
                    sharedUnderlyingMeasurement: false,
                    dataCompleteness: features.dataCompleteness
                },
                context: {
                    environmentalBtiScore: (_a = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.score) !== null && _a !== void 0 ? _a : null,
                    environmentalSeverity: (_b = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.severity) !== null && _b !== void 0 ? _b : null
                },
                dataQuality: "INVALID",
                explanation: "Insufficient valid data completeness to evaluate behavioural anomalies.",
                limitations: ["Depends on continuous camera stream which is currently interrupted or sparse."]
            });
            return result;
        }
        // 3. Analyze current events
        const validEvents = biologicalEvents.filter(e => e.dataQuality !== "INVALID");
        // Explicit provenance dependency tracking:
        // Spatial zones and active animals originate from the exact same YOLO detections and polygon intersections.
        const spatialEvents = validEvents.filter(e => e.type === "GRAZING_ACTIVITY_DROP" ||
            e.type === "SHADE_OCCUPANCY_CHANGE" ||
            e.type === "WATER_ZONE_OCCUPANCY_CHANGE" ||
            e.type === "HERD_DISTRIBUTION_ANOMALY");
        const hasSharedMeasurementDependency = spatialEvents.length > 1;
        // Movement anomaly alone is not enough
        const isOnlyMovement = validEvents.length === 1 && (validEvents[0].type === "MOVEMENT_ANOMALY" || validEvents[0].type === "ACUTE_BEHAVIOURAL_ANOMALY");
        if (isOnlyMovement) {
            // Cannot trigger candidate
            return result;
        }
        // We consider "independent" evidence streams. 
        // If we have spatial events, they count as ONE stream.
        // Movement counts as ANOTHER stream.
        let independentEvidenceCount = 0;
        if (spatialEvents.length > 0)
            independentEvidenceCount++;
        if (validEvents.some(e => e.type === "MOVEMENT_ANOMALY" || e.type === "ACUTE_BEHAVIOURAL_ANOMALY"))
            independentEvidenceCount++;
        if (independentEvidenceCount >= this.config.requiredCooccurringEvents || spatialEvents.length >= 2) {
            // We have a candidate
            const candidateId = "CANDIDATE-ACUTE";
            let candidate = this.activeCandidates.get(candidateId);
            if (!candidate) {
                candidate = {
                    eventId: `${candidateId}-${now.getTime()}`,
                    type: "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE",
                    startTime: now.toISOString(),
                    lastObservedTime: now.toISOString(),
                    status: "ACTIVE",
                    source: ((_c = validEvents[0]) === null || _c === void 0 ? void 0 : _c.source) || "UNKNOWN",
                    evidence: {
                        eventTypes: validEvents.map(e => e.type),
                        sharedUnderlyingMeasurement: hasSharedMeasurementDependency,
                        dataCompleteness: features.dataCompleteness
                    },
                    context: {
                        environmentalBtiScore: (_d = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.score) !== null && _d !== void 0 ? _d : null,
                        environmentalSeverity: (_e = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.severity) !== null && _e !== void 0 ? _e : null
                    },
                    dataQuality: validEvents.some(e => e.dataQuality === "SUSPECT") ? "SUSPECT" : "VALID",
                    explanation: "Multiple concurrent behavioural changes observed.",
                    limitations: [
                        "PROVISIONAL: This is an investigative signal, not a confirmed biological diagnosis.",
                        "Does not diagnose panic, illness, or heat stress.",
                        "Movement index is a scene-motion proxy.",
                        hasSharedMeasurementDependency ? "WARNING: Correlated spatial observations depend on the same underlying computer vision frame and active-animal count. They are not entirely independent evidence." : "Independent observation streams utilized."
                    ]
                };
                this.activeCandidates.set(candidateId, candidate);
                result.push({ ...candidate }); // Output new event
            }
            else {
                // Deduplicate ongoing events: just update the last observed time.
                // We only push if it crosses some threshold or just let the caller know it's still active.
                // The prompt says: "Deduplicate repeated polling results so that a continuously present anomaly does not create a new alert every second."
                // We will output it if the context changed severely, but for now we just update state.
                candidate.lastObservedTime = now.toISOString();
                candidate.evidence.eventTypes = Array.from(new Set([...candidate.evidence.eventTypes, ...validEvents.map(e => e.type)]));
                candidate.context.environmentalBtiScore = (_f = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.score) !== null && _f !== void 0 ? _f : candidate.context.environmentalBtiScore;
                candidate.context.environmentalSeverity = (_g = environmentalContext === null || environmentalContext === void 0 ? void 0 : environmentalContext.severity) !== null && _g !== void 0 ? _g : candidate.context.environmentalSeverity;
                // We can optionally yield the updated active event.
                result.push({ ...candidate });
            }
        }
        return result;
    }
}
exports.TemporalEventCorrelationLayer = TemporalEventCorrelationLayer;
