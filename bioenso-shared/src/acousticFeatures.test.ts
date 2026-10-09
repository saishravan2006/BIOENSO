import test from 'node:test';
import assert from 'node:assert';
import { AcousticFeatureHistory, AcousticObservation } from './acousticFeatures';

test('AcousticFeatureHistory handles insufficient history', () => {
  const history = new AcousticFeatureHistory({ minHistoryWindows: 2, baselineWindowMs: 60000, anomalyThresholdZScore: 2.0 });
  
  const obs: AcousticObservation = {
    observationId: "test-1", farmId: null, timestamp: new Date().toISOString(), ingestionTimestamp: new Date().toISOString(),
    source: "RECORDED_FIXTURE", durationSeconds: 5, sampleRate: 16000, channels: 1, algorithmVersion: "0.1",
    quality: "VALID", features: { rmsAmplitude: 0.5, zeroCrossingRate: 100, spectralCentroid: 1500, spectralBandwidth: 500, eventCounts: {} },
    limitations: []
  };
  
  history.addObservation(obs);
  const result = history.calculateBaselineDeviation(obs);
  assert.strictEqual(result, null);
});

test('AcousticFeatureHistory rejects invalid feature calculation', () => {
  const history = new AcousticFeatureHistory({ minHistoryWindows: 1, baselineWindowMs: 60000, anomalyThresholdZScore: 2.0 });
  const obs: AcousticObservation = {
    observationId: "test-2", farmId: null, timestamp: new Date().toISOString(), ingestionTimestamp: new Date().toISOString(),
    source: "RECORDED_FIXTURE", durationSeconds: 5, sampleRate: 16000, channels: 1, algorithmVersion: "0.1",
    quality: "CLIPPED", features: null, limitations: []
  };
  
  history.addObservation(obs); // Should not add clipped
  assert.strictEqual(history.getHistory().length, 0);
  
  const result = history.calculateBaselineDeviation(obs);
  assert.strictEqual(result, null);
});

test('AcousticFeatureHistory explicitly rejects low-variance baselines rather than hallucinating massive Z-Scores', () => {
  const history = new AcousticFeatureHistory({ minHistoryWindows: 2, baselineWindowMs: 60000, anomalyThresholdZScore: 2.0 });
  
  const obs1: AcousticObservation = {
    observationId: "test-1", farmId: null, timestamp: new Date(1000).toISOString(), ingestionTimestamp: new Date().toISOString(),
    source: "RECORDED_FIXTURE", durationSeconds: 5, sampleRate: 16000, channels: 1, algorithmVersion: "0.1",
    quality: "VALID", features: { rmsAmplitude: 0.1, zeroCrossingRate: 100, spectralCentroid: 1500, spectralBandwidth: 500, eventCounts: {} },
    limitations: []
  };
  const obs2: AcousticObservation = {
    ...obs1, observationId: "test-2", timestamp: new Date(2000).toISOString(), features: { ...obs1.features!, rmsAmplitude: 0.1 }
  };
  
  history.addObservation(obs1);
  history.addObservation(obs2);
  
  const obs3: AcousticObservation = {
    ...obs1, observationId: "test-3", timestamp: new Date(3000).toISOString(), features: { ...obs1.features!, rmsAmplitude: 0.5 }
  };
  
  // Baseline variance is 0.0, so it must return null to avoid division by zero or extreme Z-scores
  const result = history.calculateBaselineDeviation(obs3);
  assert.strictEqual(result, null);
});

test('AcousticFeatureHistory calculates standardized deviations when baseline variability is sufficient', () => {
  const history = new AcousticFeatureHistory({ minHistoryWindows: 3, baselineWindowMs: 60000, anomalyThresholdZScore: 2.0 });
  
  const obs1: AcousticObservation = {
    observationId: "test-1", farmId: null, timestamp: new Date(1000).toISOString(), ingestionTimestamp: new Date().toISOString(),
    source: "RECORDED_FIXTURE", durationSeconds: 5, sampleRate: 16000, channels: 1, algorithmVersion: "0.1",
    quality: "VALID", features: { rmsAmplitude: 0.1, zeroCrossingRate: 100, spectralCentroid: 1500, spectralBandwidth: 500, eventCounts: {} },
    limitations: []
  };
  const obs2: AcousticObservation = {
    ...obs1, observationId: "test-2", timestamp: new Date(2000).toISOString(), features: { ...obs1.features!, rmsAmplitude: 0.15 }
  };
  const obs3: AcousticObservation = {
    ...obs1, observationId: "test-3", timestamp: new Date(3000).toISOString(), features: { ...obs1.features!, rmsAmplitude: 0.2 }
  };
  
  history.addObservation(obs1);
  history.addObservation(obs2);
  history.addObservation(obs3);
  
  // Mean: 0.15. Variance: ((0.05)^2 + 0 + (0.05)^2) / 3 = 0.005 / 3 = ~0.00166 > 1e-6.
  // StdDev = sqrt(0.00166) = ~0.0408
  
  const obs4: AcousticObservation = {
    ...obs1, observationId: "test-4", timestamp: new Date(4000).toISOString(), features: { ...obs1.features!, rmsAmplitude: 0.5 }
  };
  
  const result = history.calculateBaselineDeviation(obs4);
  assert.ok(result);
  
  // ZScore = (0.5 - 0.15) / 0.040824 = 0.35 / 0.040824 = ~8.57
  assert.strictEqual(result.isAnomaly, true);
  assert.ok(result.zScore > 8.0 && result.zScore < 9.0);
});


test('AcousticFeatureHistory trims old windows', () => {
  const history = new AcousticFeatureHistory({ minHistoryWindows: 1, baselineWindowMs: 5000, anomalyThresholdZScore: 2.0 });
  const obs1: AcousticObservation = {
    observationId: "test-1", farmId: null, timestamp: new Date(1000).toISOString(), ingestionTimestamp: new Date().toISOString(),
    source: "RECORDED_FIXTURE", durationSeconds: 5, sampleRate: 16000, channels: 1, algorithmVersion: "0.1",
    quality: "VALID", features: { rmsAmplitude: 0.1, zeroCrossingRate: 100, spectralCentroid: 1500, spectralBandwidth: 500, eventCounts: {} },
    limitations: []
  };
  const obs2: AcousticObservation = {
    ...obs1, observationId: "test-2", timestamp: new Date(10000).toISOString()
  };
  history.addObservation(obs1);
  history.addObservation(obs2);
  assert.strictEqual(history.getHistory().length, 1); // obs1 pruned because 10000 - 1000 = 9000 > 5000
});
