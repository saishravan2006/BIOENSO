import { BiologicalEvent } from './biologyEvents';

export interface AcousticFeatures {
  rmsAmplitude: number; // Root Mean Square amplitude (0.0 to 1.0)
  zeroCrossingRate: number; // Rate of sign changes per second (Hz)
  spectralCentroid: number; // Frequency centroid (Hz)
  spectralBandwidth: number; // Spectral spread (Hz)
  eventCounts: Record<string, number>; // Placeholder for future event detector counts
}

export interface AcousticPatternClassification {
  predictedClass: "ACOUSTIC_PATTERN_CANDIDATE" | "BACKGROUND_SOUND" | "UNKNOWN";
  confidence: number; // 0.0 to 1.0 (Note: NOT probability of distress)
  modelVersion: string;
  limitations: string[];
}

export interface AcousticObservation {
  observationId: string;
  farmId: string | null;
  timestamp: string; // ISO 8601
  ingestionTimestamp: string; // ISO 8601
  source: string; // "LIVE_MIC", "RECORDED_FIXTURE", etc.
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  algorithmVersion: string;
  quality: "VALID" | "SILENT" | "CLIPPED" | "NOISY" | "INVALID";
  features: AcousticFeatures | null;
  classification?: AcousticPatternClassification;
  limitations: string[];
}

export interface AcousticAnomalyConfig {
  minHistoryWindows: number;
  baselineWindowMs: number;
  anomalyThresholdZScore: number;
}

export class AcousticFeatureHistory {
  private history: AcousticObservation[] = [];
  private config: AcousticAnomalyConfig;

  constructor(config: AcousticAnomalyConfig) {
    this.config = config;
  }

  public addObservation(obs: AcousticObservation) {
    // We only keep valid feature windows
    if (obs.quality === "VALID" && obs.features) {
      this.history.push(obs);
      // Prune history
      const now = new Date(obs.timestamp).getTime();
      this.history = this.history.filter(h => now - new Date(h.timestamp).getTime() <= this.config.baselineWindowMs);
    }
  }

  public getHistory(): AcousticObservation[] {
    return [...this.history];
  }

  public calculateBaselineDeviation(obs: AcousticObservation): { zScore: number, isAnomaly: boolean } | null {
    if (obs.quality !== "VALID" || !obs.features) return null;
    
    // We need sufficient history
    if (this.history.length < this.config.minHistoryWindows) {
      return null;
    }

    const rmsValues = this.history.map(h => h.features!.rmsAmplitude);
    const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
    
    const variance = rmsValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rmsValues.length;
    
    // SAFE LOW-VARIANCE HANDLING:
    // If the baseline has near-zero variability, any tiny absolute change creates an enormous Z-score.
    // Instead of forcing a Z-score with an artificial epsilon, we explicitly reject the baseline 
    // as insufficiently variable to support standardized deviation analysis.
    const MIN_REQUIRED_VARIANCE = 1e-6; // Configurable/documented minimum variability
    
    if (variance < MIN_REQUIRED_VARIANCE) {
      return null; // Insufficient baseline variability to calculate a reliable deviation
    }
    
    const stdDev = Math.sqrt(variance);
    const zScore = (obs.features.rmsAmplitude - mean) / stdDev;
    
    if (!Number.isFinite(zScore)) return null;

    return {
      zScore,
      isAnomaly: Math.abs(zScore) > this.config.anomalyThresholdZScore
    };
  }
}

/** @deprecated Use AcousticPatternClassification instead. */
export type VocalizationClassification = AcousticPatternClassification;
