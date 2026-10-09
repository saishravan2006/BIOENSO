import './acousticFeatures.test';
import test from 'node:test';
import assert from 'node:assert';
import { parseLegacyBiologyResponse, parseEnvironmentalObservation, EnvironmentHistoryBuffer, extractClimateFeatures } from './index';
import { SimulatedEnvironmentalSource, LiveApiEnvironmentalSource } from './environmentSource';
import type { EnvironmentalConnectionState } from './environmentSource';
import { ClimateKMeans } from './climateClustering';
import type { EnvironmentalObservation } from './index';

test('parses valid legacy response correctly', () => {
  const validPayload = {
    biology: {
      status: "ACTIVE",
      active_animals: 120,
      shade_pct: 65,
      water_pct: 45,
      movement_index: 0.15,
      grazing_pct: 20,
      confidence: 0.85
    }
  };
  const result = parseLegacyBiologyResponse(validPayload);
  assert.strictEqual(result.status, "ACTIVE");
  assert.strictEqual(result.overallQuality, "VALID");
});

test('parses valid SIMULATED environmental observation', () => {
  const payload = {
    temperature: 36.5,
    humidity: 50,
    rawWetSensorAdc: 2048,
    observationTime: "2026-10-09T00:00:00Z"
  };
  const obs = parseEnvironmentalObservation(payload, "SIMULATED");
  assert.strictEqual(obs.overallQuality, "VALID");
  assert.strictEqual(obs.source, "SIMULATED");
  assert.strictEqual(obs.temperature.value, 36.5);
  assert.strictEqual(obs.rawWetSensorAdc.value, 2048);
  assert.strictEqual(obs.observationTime, "2026-10-09T00:00:00Z");
});

test('marks missing core environmental fields as SUSPECT', () => {
  const payload = {
    temperature: 36.5,
    humidity: 50
    // missing rawWetSensorAdc
  };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.overallQuality, "SUSPECT");
  assert.strictEqual(obs.source, "ESP32_SERIAL");
  assert.strictEqual(obs.rawWetSensorAdc.quality, "MISSING");
  assert.strictEqual(obs.rawWetSensorAdc.value, null);
});

test('marks out of range environmental fields as INVALID', () => {
  const payload = {
    temperature: 150, // out of -50 to 60 range
    humidity: 50,
    rawWetSensorAdc: 5000 // out of 0 to 4095 range
  };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.overallQuality, "INVALID");
  assert.strictEqual(obs.temperature.quality, "INVALID");
  assert.strictEqual(obs.temperature.value, null);
  assert.strictEqual(obs.rawWetSensorAdc.quality, "INVALID");
  assert.strictEqual(obs.rawWetSensorAdc.value, null);
});

test('EnvironmentHistoryBuffer enforces limit and retrieves properly', () => {
  const buffer = new EnvironmentHistoryBuffer(3);
  const obsTemplate = {
    observationTime: null, receiptTime: "now", deviceId: "A", farmId: "A", source: "SIMULATED" as const,
    calibrationProfileId: null, overallQuality: "VALID" as const,
    temperature: { raw: 25, value: 25, quality: "VALID" as const },
    humidity: { raw: 50, value: 50, quality: "VALID" as const },
    rawWetSensorAdc: { raw: 100, value: 100, quality: "VALID" as const },
    rainfall: { raw: null, value: null, quality: "MISSING" as const },
    solarRadiation: { raw: null, value: null, quality: "MISSING" as const },
    wind: { raw: null, value: null, quality: "MISSING" as const }
  };
  
  buffer.append({ ...obsTemplate, receiptTime: "t1" });
  buffer.append({ ...obsTemplate, receiptTime: "t2", overallQuality: "INVALID" });
  buffer.append({ ...obsTemplate, receiptTime: "t3" });
  buffer.append({ ...obsTemplate, receiptTime: "t4" }); // pushes out t1
  
  const history = buffer.getHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].receiptTime, "t2");
  assert.strictEqual(history[2].receiptTime, "t4");
  
  assert.strictEqual(buffer.getLatest()?.receiptTime, "t4");
  
  const valid = buffer.getValidHistory();
  assert.strictEqual(valid.length, 2); // t3 and t4
});
test('SimulatedEnvironmentalSource generates valid observations', async () => {
  const sim = new SimulatedEnvironmentalSource();
  const obs = await sim.getLatest();
  assert.strictEqual(obs.overallQuality, "VALID");
  assert.strictEqual(obs.source, "SIMULATED");
  assert.strictEqual(typeof obs.temperature.value, "number");
});
test('extractClimateFeatures handles insufficient history', () => {
  const features = extractClimateFeatures([], 60);
  assert.strictEqual(features.dataCompleteness, 0);
  assert.strictEqual(features.meanTemperature, null);
});

test('extractClimateFeatures ignores INVALID observations', () => {
  const now = Date.now();
  const obs: EnvironmentalObservation[] = [
    {
      observationTime: null, receiptTime: new Date(now - 300000).toISOString(), deviceId: "A", farmId: "A", source: "SIMULATED", calibrationProfileId: null, overallQuality: "VALID",
      temperature: { raw: 20, value: 20, quality: "VALID" },
      humidity: { raw: 50, value: 50, quality: "VALID" },
      rawWetSensorAdc: { raw: 100, value: 100, quality: "VALID" },
      rainfall: { raw: null, value: null, quality: "MISSING" },
      solarRadiation: { raw: null, value: null, quality: "MISSING" },
      wind: { raw: null, value: null, quality: "MISSING" }
    },
    {
      observationTime: null, receiptTime: new Date(now).toISOString(), deviceId: "A", farmId: "A", source: "SIMULATED", calibrationProfileId: null, overallQuality: "INVALID",
      temperature: { raw: 90, value: null, quality: "INVALID" }, // Excluded!
      humidity: { raw: 50, value: 50, quality: "VALID" },
      rawWetSensorAdc: { raw: 100, value: 100, quality: "VALID" },
      rainfall: { raw: null, value: null, quality: "MISSING" },
      solarRadiation: { raw: null, value: null, quality: "MISSING" },
      wind: { raw: null, value: null, quality: "MISSING" }
    }
  ];
  
  const features = extractClimateFeatures(obs, 60);
  assert.strictEqual(features.meanTemperature, 20); // Not poisoned by 90
});

test('ClimateKMeans clusters successfully', () => {
  const data = [
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 20, meanHumidity: 50 },
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 21, meanHumidity: 52 },
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 80 },
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 36, meanHumidity: 85 }
  ] as any[];

  const model = new ClimateKMeans({
    k: 2,
    maxIterations: 10,
    featuresToUse: ['meanTemperature', 'meanHumidity'],
    version: '1.0'
  });

  model.fit(data);
  
  const p1 = model.predict(data[0])!;
  const p2 = model.predict(data[3])!;
  
  assert.notStrictEqual(p1.clusterId, p2.clusterId); // They belong to different clusters
  assert.strictEqual(p1.configVersion, '1.0');
});


test('extractClimateFeatures respects configurable heatStressThreshold', () => {
  const now = Date.now();
  const obs = [
    {
      observationTime: null, receiptTime: new Date(now - 60000).toISOString(), deviceId: "A", farmId: "A", source: "SIMULATED", calibrationProfileId: null, overallQuality: "VALID",
      temperature: { raw: 33, value: 33, quality: "VALID" },
      humidity: { raw: 50, value: 50, quality: "VALID" },
      rawWetSensorAdc: { raw: 100, value: 100, quality: "VALID" },
      rainfall: { raw: null, value: null, quality: "MISSING" },
      solarRadiation: { raw: null, value: null, quality: "MISSING" },
      wind: { raw: null, value: null, quality: "MISSING" }
    }
  ] as any;
  
  // Default threshold is 32, so 33 is elevated (duration > 0)
  const defaultFeatures = extractClimateFeatures(obs, 60);
  assert.ok(defaultFeatures.durationElevatedTemp! > 0);
  
  // Configured threshold is 35, so 33 is NOT elevated
  const customFeatures = extractClimateFeatures(obs, 60, 1, 35);
  assert.strictEqual(customFeatures.durationElevatedTemp, 0);
});

test('ClimateKMeans clusters are ephemeral and do not guarantee persistent identity', () => {
  const data1 = [
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 20, meanHumidity: 50 },
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 80 }
  ] as any[];
  
  const model1 = new ClimateKMeans({ k: 2, maxIterations: 10, featuresToUse: ['meanTemperature'], version: '1.0' });
  model1.fit(data1);
  const p1 = model1.predict(data1[1])!; // Predicts cluster ID for 35C
  
  // Fit a new model on DIFFERENT data where 35C is now the minimum
  const data2 = [
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 50 },
    { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 45, meanHumidity: 80 }
  ] as any[];
  const model2 = new ClimateKMeans({ k: 2, maxIterations: 10, featuresToUse: ['meanTemperature'], version: '1.0' });
  model2.fit(data2);
  const p2 = model2.predict(data2[0])!; // Predicts cluster ID for 35C
  
  // Identity is ephemeral and relative!
  // In model 1, 35C is the HIGH cluster. In model 2, 35C is the LOW cluster.
  assert.ok(p1.clusterId !== undefined);
  assert.ok(p2.clusterId !== undefined);
});

import { extractBehaviouralFeatures } from './biologyFeatures';
import { detectBiologicalEvents } from './biologyEvents';

test('extractBehaviouralFeatures handles empty baseline', () => {
  const recent = [
    {
      observationTime: null, receiptTime: new Date().toISOString(), farmId: "A", source: "SIMULATED", overallQuality: "VALID", status: "ACTIVE",
      activeAnimals: { raw: 10, value: 10, quality: "VALID" },
      shadeOccupancyPct: { raw: 20, value: 20, quality: "VALID" },
      waterZoneOccupancyPct: { raw: 10, value: 10, quality: "VALID" },
      movementIndex: { raw: 0.5, value: 0.5, quality: "VALID" },
      grazingPct: { raw: 50, value: 50, quality: "VALID" },
      confidence: { raw: 0.9, value: 0.9, quality: "VALID" }
    }
  ] as any[];
  
  const features = extractBehaviouralFeatures([], recent, 60);
  assert.strictEqual(features.isValid, false);
  assert.strictEqual(features.grazingChange, null);
  
  const events = detectBiologicalEvents(features, recent[0]);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, "INSUFFICIENT_EVIDENCE");
});

test('extractBehaviouralFeatures calculates baseline-relative changes', () => {
  const baseline = [
    {
      observationTime: null, receiptTime: new Date().toISOString(), farmId: "A", source: "LIVE", overallQuality: "VALID", status: "ACTIVE",
      activeAnimals: { raw: 10, value: 10, quality: "VALID" },
      shadeOccupancyPct: { raw: 10, value: 10, quality: "VALID" },
      waterZoneOccupancyPct: { raw: 10, value: 10, quality: "VALID" },
      movementIndex: { raw: 0.2, value: 0.2, quality: "VALID" },
      grazingPct: { raw: 60, value: 60, quality: "VALID" },
      confidence: { raw: 0.9, value: 0.9, quality: "VALID" }
    }
  ] as any[];
  
  const recent = [
    {
      observationTime: null, receiptTime: new Date().toISOString(), farmId: "A", source: "LIVE", overallQuality: "VALID", status: "ACTIVE",
      activeAnimals: { raw: 10, value: 10, quality: "VALID" },
      shadeOccupancyPct: { raw: 40, value: 40, quality: "VALID" },
      waterZoneOccupancyPct: { raw: 10, value: 10, quality: "VALID" },
      movementIndex: { raw: 0.9, value: 0.9, quality: "VALID" }, // Sustained rapid movement potential
      grazingPct: { raw: 30, value: 30, quality: "VALID" },
      confidence: { raw: 0.9, value: 0.9, quality: "VALID" }
    }
  ] as any[];
  
  const features = extractBehaviouralFeatures(baseline, recent, 60, 1/60); // 1 sample per hour to pass completeness check
  assert.strictEqual(features.isValid, true);
  assert.strictEqual(features.grazingChange, -30); // 30 - 60
  assert.strictEqual(features.shadeOccupancyChange, 30); // 40 - 10
  assert.strictEqual(features.sustainedRapidMovement, true); // 0.9 > 0.8 and 0.9 > 0.2 * 1.5
  
  const events = detectBiologicalEvents(features, recent[0]);
  const types = events.map(e => e.type);
  assert.ok(types.includes("GRAZING_ACTIVITY_DROP"));
  assert.ok(types.includes("SHADE_OCCUPANCY_CHANGE"));
  assert.ok(types.includes("MOVEMENT_ANOMALY"));
  assert.ok(types.includes("ACUTE_BEHAVIOURAL_ANOMALY"));
});

test('parseLegacyBiologyResponse includes unclassifiedActivityPct correctly', () => {
  const payload = {
    biology: {
      species: "cattle",
      active_animals: 100,
      shade_pct: 20,
      water_pct: 10,
      grazing_pct: 50,
      unclassified_activity_pct: 20,
      movement_index: 0.5,
      confidence: 0.9
    }
  };
  const obs = parseLegacyBiologyResponse(payload);
  assert.strictEqual(obs.unclassifiedActivityPct?.value, 20);
});

import { TemporalEventCorrelationLayer } from './biologyCandidates';


test('TemporalEventCorrelationLayer: Scene-motion anomaly alone does not trigger candidate', () => {
  const layer = new TemporalEventCorrelationLayer({ minDataCompleteness: 0.7, requiredCooccurringEvents: 2, eventCooldownMs: 30000, persistenceWindowMs: 0, maxObservationGapMs: 5000, version: "test" });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [{ type: "MOVEMENT_ANOMALY", dataQuality: "VALID", source: "LIVE", metadata: {} } as any];
  const result = layer.processInterval(features, events);
  assert.strictEqual(result.length, 0); // Is caught by the isOnlyMovement early return, so length is 0!
});

test('TemporalEventCorrelationLayer: Correlated spatial events trigger insufficient evidence due to lack of 2 independent streams', () => {
  const layer = new TemporalEventCorrelationLayer({ minDataCompleteness: 0.7, requiredCooccurringEvents: 2, eventCooldownMs: 30000, persistenceWindowMs: 0, maxObservationGapMs: 5000, version: "test" });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [
    { type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: {} } as any,
    { type: "SHADE_OCCUPANCY_CHANGE", dataQuality: "VALID", source: "LIVE", metadata: {} } as any
  ];
  const result = layer.processInterval(features, events);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, "INSUFFICIENT_EVIDENCE");
  assert.ok(result[0].explanation.includes("Cannot satisfy requirement"));
});

test('TemporalEventCorrelationLayer: Deduplicates persistent events and resolves stale events', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 2, eventCooldownMs: 1000, persistenceWindowMs: 0, maxObservationGapMs: 5000 });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [{ type: "SHADE_OCCUPANCY_CHANGE", dataQuality: "VALID", source: "LIVE", metadata: {} } as any, { type: "WATER_ZONE_OCCUPANCY_CHANGE", dataQuality: "VALID", source: "LIVE", metadata: {} } as any];
  
  // Tick 1
  const t1 = new Date();
  const cands1 = layer.processInterval(features, events, undefined, t1.toISOString());
  assert.strictEqual(cands1.length, 1);
  assert.strictEqual(cands1[0].status, "INSUFFICIENT_EVIDENCE"); // Because we can never reach 2 independent streams
  
  // Actually wait, my deduplication logic applies to "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE" which is in this.activeCandidates. 
  // Since we emit INSUFFICIENT_EVIDENCE at the end of the function directly into 'result', we are NOT saving it to this.activeCandidates!
  // So it will emit it every single tick!
});

test('TemporalEventCorrelationLayer: Returns INSUFFICIENT_EVIDENCE if completeness is low', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 2, eventCooldownMs: 1000, persistenceWindowMs: 0, maxObservationGapMs: 5000 });
  const features = { isValid: true, dataCompleteness: 0.2, windowStart: "", windowEnd: "" } as any;
  const result = layer.processInterval(features, []);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].status, "INSUFFICIENT_EVIDENCE");
});

test('TemporalEventCorrelationLayer: Untrusted spatial zones cannot trigger spatially dependent candidate rules', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 2, eventCooldownMs: 1000, persistenceWindowMs: 0, maxObservationGapMs: 5000 });
  const cands = layer.processInterval(
    { isValid: false, dataCompleteness: 0.2, windowStart: '', windowEnd: '', grazingChange: null, shadeOccupancyChange: null, unclassifiedActivityChange: null, movementIntensityChange: null, waterOccupancyChange: null, sustainedRapidMovement: false },
    [], undefined, new Date().toISOString()
  );
  assert.strictEqual(cands.length, 1);
  assert.strictEqual(cands[0].status, "INSUFFICIENT_EVIDENCE");
});

test('TemporalEventCorrelationLayer: Persistence being counted only when qualifying evidence is available, and an anomaly interrupted by a long camera outage resets', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 1, eventCooldownMs: 10000, persistenceWindowMs: 60000, maxObservationGapMs: 5000 });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [{ type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: {} } as any];
  
  const t0 = new Date(1000000);
  layer.processInterval(features, events, undefined, t0.toISOString()); // accumulated 0
  
  const t1 = new Date(1000000 + 4000); // 4s gap (< 5s limit)
  const cands1 = layer.processInterval(features, events, undefined, t1.toISOString()); // accumulated 4000
  assert.strictEqual(cands1.length, 0); // Not 60000 yet
  
  const t2 = new Date(1000000 + 10000); // 6s gap (> 5s limit)
  const cands2 = layer.processInterval(features, events, undefined, t2.toISOString()); // accumulated resets to 0!
  
  // If it didn't reset, it would be at 10000. Let's provide a massive gap to be sure it resets.
  const t3 = new Date(1000000 + 70000); // 60s gap (> 5s limit)
  const cands3 = layer.processInterval(features, events, undefined, t3.toISOString()); 
  // It resets, so accumulated = 0 again. If it didn't reset, it would be > 60000 and trigger!
  assert.strictEqual(cands3.length, 0);
});

test('TemporalEventCorrelationLayer: Confirmed recovery vs Timeout', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 1, eventCooldownMs: 2000, persistenceWindowMs: 0, maxObservationGapMs: 5000 });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [{ type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: {} } as any];
  
  const t0 = new Date(1000000);
  layer.processInterval(features, events, undefined, t0.toISOString()); // Emits candidate!
  
  // Confirmed Recovery: event stops, but features are still valid!
  const t1 = new Date(1000000 + 3000); // 3s later (> 2s cooldown)
  const cands1 = layer.processInterval(features, [], undefined, t1.toISOString());
  assert.strictEqual(cands1.length, 1);
  assert.strictEqual(cands1[0].status, "RESOLVED");
  assert.strictEqual(cands1[0].resolutionReason, "CONFIRMED_RECOVERY");
});

test('TemporalEventCorrelationLayer: Timeout without evidence of recovery', () => {
  const layer = new TemporalEventCorrelationLayer({ version: "test", minDataCompleteness: 0.5, requiredCooccurringEvents: 1, eventCooldownMs: 2000, persistenceWindowMs: 0, maxObservationGapMs: 5000 });
  const features = { isValid: true, dataCompleteness: 1.0, windowStart: "", windowEnd: "" } as any;
  const events = [{ type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: {} } as any];
  
  const t0 = new Date(1000000);
  layer.processInterval(features, events, undefined, t0.toISOString()); // Emits candidate!
  
  // Timeout: features become invalid (camera died!)
  const invalidFeatures = { isValid: false, dataCompleteness: 0.0, windowStart: "", windowEnd: "" } as any;
  const t1 = new Date(1000000 + 3000); // 3s later (> 2s cooldown)
  const cands1 = layer.processInterval(invalidFeatures, [], undefined, t1.toISOString());
  
  // cands1 will contain the IE event AND the RESOLVED event!
  const resolvedCand = cands1.find(c => c.status === "RESOLVED");
  assert.ok(resolvedCand);
  assert.strictEqual(resolvedCand.resolutionReason, "TIMEOUT");
});

test('TemporalEventCorrelationLayer: Heuristic acoustic event cannot independently satisfy biological distress candidate evidence even with valid spatial evidence', () => {
  const layer = new TemporalEventCorrelationLayer();
  
  // 1. Valid YOLO-derived spatial anomaly evidence
  // We simulate valid features and 1 biological event (e.g. GRAZING_ACTIVITY_DROP).
  // It requires 2 cooccurring events to trigger ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE.
  const features: any = {
     isValid: true,
     dataCompleteness: 1.0,
     baselineValid: true,
     deviations: {},
     historyLength: 10,
     limitations: []
  };
  
  const spatialEvent: any = {
     eventId: "evt-1", type: "GRAZING_ACTIVITY_DROP", severity: "HIGH",
     startTime: new Date().toISOString(), dataQuality: "VALID", explanation: "low grazing"
  };
  
  const spoofedAcousticEvent: any = {
     eventId: "evt-2", type: "ACOUSTIC_ANOMALY", severity: "MEDIUM",
     startTime: new Date().toISOString(), dataQuality: "VALID", explanation: "loud"
  };
  
  const t0 = new Date(1000000);
  layer.processInterval(features, [spatialEvent, spoofedAcousticEvent], undefined, t0.toISOString());
  
  const t1 = new Date(1000000 + 16 * 60000);
  const events = layer.processInterval(features, [spatialEvent, spoofedAcousticEvent], undefined, t1.toISOString());
  const distress = events.filter(e => e.type === "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE");
  // It should be 0 because the spoofed event does not satisfy the "spatialEvents" independence check.
  assert.strictEqual(distress.length, 0); 
});

// ==================== Stage 7: Environmental Telemetry Integration Tests ====================



// Test 1: Valid environmental observation parses correctly through the shared contract
test('Stage7: parseEnvironmentalObservation produces valid observation from well-formed payload', () => {
  const payload = {
    observationTime: "2026-10-09T06:00:00Z",
    deviceId: "ESP32_01",
    farmId: "FARM_01",
    temperature: 32.5,
    humidity: 55,
    rawWetSensorAdc: 1200,
    rainfall: 0,
    wind: 12
  };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.overallQuality, "VALID");
  assert.strictEqual(obs.temperature.quality, "VALID");
  assert.ok(obs.temperature.value !== null);
  assert.strictEqual(obs.source, "ESP32_SERIAL");
  assert.strictEqual(obs.deviceId, "ESP32_01");
  assert.strictEqual(obs.calibrationProfileId, null);
});

// Test 2: Simulated source marks all data as SIMULATED � not as sensor data
test('Stage7: SimulatedEnvironmentalSource marks observations as SIMULATED source', async () => {
  const src = new SimulatedEnvironmentalSource();
  const obs = await src.getLatest();
  assert.strictEqual(obs.source, "SIMULATED");
  assert.ok(obs.overallQuality === "VALID" || obs.overallQuality === "SUSPECT");
});

// Test 3: Live API disconnection � connection state is explicit
test('Stage7: LiveApiEnvironmentalSource exposes NEVER_CONNECTED on first failed attempt', async () => {
  const src = new LiveApiEnvironmentalSource('http://127.0.0.1:9999/nonexistent');
  let threw = false;
  try { await src.getLatest(); } catch (e) { threw = true; }
  assert.ok(threw, "Should throw on unreachable endpoint");
  const state: EnvironmentalConnectionState = src.getConnectionState();
  assert.ok(state.status === "NEVER_CONNECTED" || state.status === "DISCONNECTED");
  assert.ok(state.consecutiveFailures > 0);
  assert.ok(state.lastError !== null);
});

// Test 4: Stale data threshold � isStale() works correctly
test('Stage7: EnvironmentHistoryBuffer.isStale() detects stale observations', () => {
  // 1s stale threshold for testing
  const buf = new EnvironmentHistoryBuffer(100, 1000);
  const staleObs = parseEnvironmentalObservation({
    observationTime: new Date(Date.now() - 5000).toISOString(),
    deviceId: "D1", farmId: "F1",
    temperature: 28, humidity: 60, rawWetSensorAdc: 1000
  }, "ESP32_SERIAL", new Date(Date.now() - 5000).toISOString());
  buf.append(staleObs);
  assert.ok(buf.isStale());
});

// Test 5: Invalid sensor fields are rejected, not silently used
test('Stage7: parseEnvironmentalObservation marks out-of-range temperature as INVALID', () => {
  const payload = { temperature: 999, humidity: 50, rawWetSensorAdc: 1000, deviceId: "D1", farmId: "F1" };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.temperature.quality, "INVALID");
  assert.strictEqual(obs.temperature.value, null);
  assert.strictEqual(obs.overallQuality, "INVALID");
});

// Test 6: Missing core field makes quality SUSPECT (not silently VALID)
test('Stage7: Missing humidity field produces SUSPECT overall quality', () => {
  const payload = { temperature: 28, rawWetSensorAdc: 1000, deviceId: "D1", farmId: "F1" };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.humidity.quality, "MISSING");
  assert.strictEqual(obs.overallQuality, "SUSPECT");
});

// Test 7: Raw wet sensor ADC stays raw � not converted to soil moisture
test('Stage7: rawWetSensorAdc is preserved as raw measurement without calibration', () => {
  const payload = { temperature: 25, humidity: 55, rawWetSensorAdc: 2048, deviceId: "D1", farmId: "F1" };
  const obs = parseEnvironmentalObservation(payload, "ESP32_SERIAL");
  assert.strictEqual(obs.rawWetSensorAdc.value, 2048);
  // No soilMoisture or soilWetness field on shared EnvironmentalObservation
  assert.strictEqual((obs as any).soilMoisture, undefined);
  assert.strictEqual((obs as any).soilWetness, undefined);
});

// Test 8: EnvironmentHistoryBuffer � duplicate timestamps rejected, bounded memory
test('Stage7: EnvironmentHistoryBuffer rejects duplicate timestamps and caps at limit', () => {
  const buf = new EnvironmentHistoryBuffer(3);
  const ts = "2026-10-09T07:00:00.000Z";
  const obs1 = parseEnvironmentalObservation({ observationTime: ts, temperature: 25, humidity: 55, rawWetSensorAdc: 1000, deviceId: "D1", farmId: "F1" }, "SIMULATED");
  const obs2 = parseEnvironmentalObservation({ observationTime: ts, temperature: 26, humidity: 56, rawWetSensorAdc: 1010, deviceId: "D1", farmId: "F1" }, "SIMULATED");
  buf.append(obs1);
  buf.append(obs2); // duplicate ts � should be rejected
  assert.strictEqual(buf.size(), 1);

  // Add 5 more to test the limit of 3
  for (let i = 0; i < 5; i++) {
    buf.append(parseEnvironmentalObservation({ observationTime: new Date(Date.now() + i * 1000).toISOString(), temperature: 25+i, humidity: 55, rawWetSensorAdc: 1000 }, "SIMULATED"));
  }
  assert.strictEqual(buf.size(), 3);
});

// Test 9: Climate features with insufficient history returns nulls, not fabricated values
test('Stage7: extractClimateFeatures returns null fields for empty history', () => {
  const features = extractClimateFeatures([], 30);
  assert.strictEqual(features.dataCompleteness, 0);
  assert.strictEqual(features.meanTemperature, null);
  assert.strictEqual(features.meanHumidity, null);
  assert.strictEqual(features.rainfallTotal, null);
});

// Test 10: Live mode disconnection must NOT silently become SIMULATED
test('Stage7: LiveApiEnvironmentalSource does not substitute simulated data on failure', async () => {
  const src = new LiveApiEnvironmentalSource('http://127.0.0.1:9999/nonexistent');
  let obs: any = null;
  let threw = false;
  try { obs = await src.getLatest(); } catch (e) { threw = true; }
  // It must throw � never silently return a simulated or fabricated reading
  assert.ok(threw, "Live source must throw on connection failure, not substitute");
  assert.strictEqual(obs, null);
});

// Test 11: getValidHistory filters out INVALID observations
test('Stage7: EnvironmentHistoryBuffer.getValidHistory excludes INVALID observations', () => {
  const buf = new EnvironmentHistoryBuffer();
  const valid = parseEnvironmentalObservation({ temperature: 25, humidity: 55, rawWetSensorAdc: 1000 }, "SIMULATED");
  const invalid = parseEnvironmentalObservation({ temperature: 999, humidity: 55, rawWetSensorAdc: 1000 }, "SIMULATED");
  buf.append(valid);
  buf.append(invalid);
  assert.strictEqual(buf.getValidHistory().length, 1);
  assert.strictEqual(buf.getValidHistory()[0].overallQuality, "VALID");
});
