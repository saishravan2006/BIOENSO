import type { BiologicalEvent } from './biologyEvents';
import type { BehaviouralFeatures } from './biologyFeatures';
import type { EnvironmentalObservation } from './index';

export type CandidateEventType = 
  | "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE"
  | "INSUFFICIENT_EVIDENCE";

export type EventLifecycleStatus = "ACTIVE" | "RESOLVED" | "INSUFFICIENT_EVIDENCE";

export interface CandidateEvent {
  eventId: string;
  type: CandidateEventType;
  startTime: string;
  lastObservedTime: string;
  status: EventLifecycleStatus;
  resolutionReason?: "CONFIRMED_RECOVERY" | "TIMEOUT";
  accumulatedRecoveryMs?: number;
  lastRecoveryObservationTime?: string;
  source: string;
  evidence: {
    eventTypes: string[];
    sharedUnderlyingMeasurement: boolean;
    dataCompleteness: number;
  };
  context: {
    environmentalBtiScore: number | null;
    environmentalSeverity: string | null;
  };
  dataQuality: "VALID" | "SUSPECT" | "INVALID";
  explanation: string;
  limitations: string[];
}

export interface CandidateDetectionConfig {
  version: string;
  minDataCompleteness: number; // e.g. 0.7
  requiredCooccurringEvents: number; // e.g. 2
  persistenceWindowMs: number; // e.g. 15 minutes
  eventCooldownMs: number; // e.g. 30 minutes
  maxObservationGapMs: number; // e.g. 5 minutes
}

export const PROVISIONAL_CANDIDATE_CONFIG: CandidateDetectionConfig = {
  version: "0.1-PROVISIONAL",
  minDataCompleteness: 0.7,
  requiredCooccurringEvents: 2,
  persistenceWindowMs: 15 * 60 * 1000,
  eventCooldownMs: 30 * 60 * 1000,
  maxObservationGapMs: 5 * 60 * 1000
};

export class TemporalEventCorrelationLayer {
  private activeCandidates: Map<string, CandidateEvent> = new Map();
  private preCandidates: Map<string, { firstObserved: Date; lastObserved: Date; accumulatedPersistenceMs: number; events: BiologicalEvent[] }> = new Map();
  private config: CandidateDetectionConfig;

  constructor(config: CandidateDetectionConfig = PROVISIONAL_CANDIDATE_CONFIG) {
    this.config = config;
  }

    public processInterval(
    features: BehaviouralFeatures,
    biologicalEvents: BiologicalEvent[],
    environmentalContext?: { score: number | null, severity: string },
    nowIso?: string
  ): CandidateEvent[] {
    const now = nowIso ? new Date(nowIso) : new Date();
    const result: CandidateEvent[] = [];

    const validEvents = biologicalEvents.filter(e => e.dataQuality !== "INVALID");
    const spatialEvents = validEvents.filter(e => 
      e.type === "GRAZING_ACTIVITY_DROP" || 
      e.type === "SHADE_OCCUPANCY_CHANGE" || 
      e.type === "WATER_ZONE_OCCUPANCY_CHANGE" ||
      e.type === "HERD_DISTRIBUTION_ANOMALY"
    );
    const hasSharedMeasurementDependency = spatialEvents.length > 1;

    let independentEvidenceCount = 0;
    if (spatialEvents.length > 0) independentEvidenceCount++;

    const isAnomalyPresentThisTick = validEvents.length > 0 && independentEvidenceCount >= this.config.requiredCooccurringEvents;

    // 1. Update recovery and timeout for active candidates
    this.activeCandidates.forEach((candidate, id) => {
      const lastObserved = new Date(candidate.lastObservedTime);

      if (!isAnomalyPresentThisTick) {
        const lastRecovery = new Date(candidate.lastRecoveryObservationTime || now.toISOString());
        const gap = now.getTime() - lastRecovery.getTime();
        
        const isValidObservation = features.isValid && features.dataCompleteness >= this.config.minDataCompleteness;

        if (isValidObservation) {
          if (gap <= this.config.maxObservationGapMs) {
            candidate.accumulatedRecoveryMs = (candidate.accumulatedRecoveryMs || 0) + gap;
          } else {
            candidate.accumulatedRecoveryMs = 0;
          }
        } else {
          if (gap > this.config.maxObservationGapMs) {
             candidate.accumulatedRecoveryMs = 0;
          }
        }
        
        candidate.lastRecoveryObservationTime = now.toISOString();

        let resolved = false;
        if ((candidate.accumulatedRecoveryMs || 0) >= this.config.eventCooldownMs) {
          candidate.status = "RESOLVED";
          candidate.resolutionReason = "CONFIRMED_RECOVERY";
          candidate.explanation += " (Resolved due to confirmed recovery)";
          resolved = true;
        } else if (now.getTime() - lastObserved.getTime() > this.config.eventCooldownMs) {
          candidate.status = "RESOLVED";
          candidate.resolutionReason = "TIMEOUT";
          candidate.explanation += " (Resolved due to observation timeout)";
          resolved = true;
        }

        if (resolved) {
          result.push({ ...candidate });
          this.activeCandidates.delete(id);
        }
      } else {
        // Anomaly is present this tick
        candidate.lastObservedTime = now.toISOString();
        candidate.accumulatedRecoveryMs = 0;
        candidate.lastRecoveryObservationTime = now.toISOString();
        candidate.evidence.eventTypes = Array.from(new Set([...candidate.evidence.eventTypes, ...validEvents.map(e => e.type)]));
        candidate.context.environmentalBtiScore = environmentalContext?.score ?? candidate.context.environmentalBtiScore;
        candidate.context.environmentalSeverity = environmentalContext?.severity ?? candidate.context.environmentalSeverity;
        result.push({ ...candidate });
      }
    });

    // 2. Check for insufficient evidence
    if (!features.isValid || features.dataCompleteness < this.config.minDataCompleteness) {
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
          environmentalBtiScore: environmentalContext?.score ?? null,
          environmentalSeverity: environmentalContext?.severity ?? null
        },
        dataQuality: "INVALID",
        explanation: "Insufficient valid data completeness to evaluate behavioural anomalies.",
        limitations: ["Depends on continuous camera stream which is currently interrupted or sparse."]
      });
      return result;
    }

    const isOnlyMovement = validEvents.length === 1 && (validEvents[0].type === "MOVEMENT_ANOMALY" || validEvents[0].type === "ACUTE_BEHAVIOURAL_ANOMALY");
    if (isOnlyMovement) {
      return result;
    }

    if (independentEvidenceCount >= this.config.requiredCooccurringEvents) {
      const sigId = "CANDIDATE-ACUTE";
      let pre = this.preCandidates.get(sigId);
      if (!pre) {
        pre = { firstObserved: now, lastObserved: now, accumulatedPersistenceMs: 0, events: validEvents };
        this.preCandidates.set(sigId, pre);
      } else {
        const gap = now.getTime() - pre.lastObserved.getTime();
        if (gap > this.config.maxObservationGapMs) {
          pre.firstObserved = now;
          pre.accumulatedPersistenceMs = 0;
        } else {
          pre.accumulatedPersistenceMs += gap;
        }
        pre.lastObserved = now;
        pre.events = validEvents;
      }

      if (pre.accumulatedPersistenceMs < this.config.persistenceWindowMs) {
        return result;
      }

      const candidateId = "CANDIDATE-ACUTE";
      let candidate = this.activeCandidates.get(candidateId);
      
      if (!candidate) {
        candidate = {
          eventId: `${candidateId}-${now.getTime()}`,
          type: "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE",
          startTime: now.toISOString(),
          lastObservedTime: now.toISOString(),
          status: "ACTIVE",
          accumulatedRecoveryMs: 0,
          lastRecoveryObservationTime: now.toISOString(),
          source: validEvents[0]?.source || "UNKNOWN",
          evidence: {
            eventTypes: validEvents.map(e => e.type),
            sharedUnderlyingMeasurement: hasSharedMeasurementDependency,
            dataCompleteness: features.dataCompleteness
          },
          context: {
            environmentalBtiScore: environmentalContext?.score ?? null,
            environmentalSeverity: environmentalContext?.severity ?? null
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
        result.push({ ...candidate });
      }
    } else {
      const staleKeys: string[] = [];
      this.preCandidates.forEach((pre, key) => {
        if (now.getTime() - pre.lastObserved.getTime() > this.config.maxObservationGapMs) {
          staleKeys.push(key);
        }
      });
      staleKeys.forEach(k => this.preCandidates.delete(k));
    }

    if (validEvents.length > 0 && independentEvidenceCount < this.config.requiredCooccurringEvents) {
      const candidateId = "CANDIDATE-INSUFFICIENT-STREAMS";
      let candidate = this.activeCandidates.get(candidateId);
      
      if (!candidate) {
        candidate = {
          eventId: `IE-STREAMS-${now.getTime()}`,
          type: "INSUFFICIENT_EVIDENCE",
          startTime: now.toISOString(),
          lastObservedTime: now.toISOString(),
          status: "INSUFFICIENT_EVIDENCE",
          source: validEvents[0]?.source || "UNKNOWN",
          evidence: {
            eventTypes: validEvents.map(e => e.type),
            sharedUnderlyingMeasurement: hasSharedMeasurementDependency,
            dataCompleteness: features.dataCompleteness
          },
          context: {
            environmentalBtiScore: environmentalContext?.score ?? null,
            environmentalSeverity: environmentalContext?.severity ?? null
          },
          dataQuality: "VALID",
          explanation: "Cannot satisfy requirement for 2 independent evidence streams. Available evidence shares underlying YOLO measurements or relies on scene-motion proxies.",
          limitations: ["Current hardware/sensors provide only 1 independent animal stream (CV bounding boxes)."]
        };
        this.activeCandidates.set(candidateId, candidate);
        result.push({ ...candidate });
      } else {
        candidate.lastObservedTime = now.toISOString();
        candidate.evidence.eventTypes = Array.from(new Set([...candidate.evidence.eventTypes, ...validEvents.map(e => e.type)]));
        result.push({ ...candidate });
      }
    }

    return result;
  }
}
