"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const index_1 = require("./index");
(0, node_test_1.default)('parses valid legacy response correctly', () => {
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
    const result = (0, index_1.parseLegacyBiologyResponse)(validPayload);
    node_assert_1.default.strictEqual(result.status, "ACTIVE");
    node_assert_1.default.strictEqual(result.overallQuality, "VALID");
});
(0, node_test_1.default)('parses valid SIMULATED environmental observation', () => {
    const payload = {
        temperature: 36.5,
        humidity: 50,
        rawWetSensorAdc: 2048,
        observationTime: "2026-10-09T00:00:00Z"
    };
    const obs = (0, index_1.parseEnvironmentalObservation)(payload, "SIMULATED");
    node_assert_1.default.strictEqual(obs.overallQuality, "VALID");
    node_assert_1.default.strictEqual(obs.source, "SIMULATED");
    node_assert_1.default.strictEqual(obs.temperature.value, 36.5);
    node_assert_1.default.strictEqual(obs.rawWetSensorAdc.value, 2048);
    node_assert_1.default.strictEqual(obs.observationTime, "2026-10-09T00:00:00Z");
});
(0, node_test_1.default)('marks missing core environmental fields as SUSPECT', () => {
    const payload = {
        temperature: 36.5,
        humidity: 50
        // missing rawWetSensorAdc
    };
    const obs = (0, index_1.parseEnvironmentalObservation)(payload, "ESP32_SERIAL");
    node_assert_1.default.strictEqual(obs.overallQuality, "SUSPECT");
    node_assert_1.default.strictEqual(obs.source, "ESP32_SERIAL");
    node_assert_1.default.strictEqual(obs.rawWetSensorAdc.quality, "MISSING");
    node_assert_1.default.strictEqual(obs.rawWetSensorAdc.value, null);
});
(0, node_test_1.default)('marks out of range environmental fields as INVALID', () => {
    const payload = {
        temperature: 150, // out of -50 to 60 range
        humidity: 50,
        rawWetSensorAdc: 5000 // out of 0 to 4095 range
    };
    const obs = (0, index_1.parseEnvironmentalObservation)(payload, "ESP32_SERIAL");
    node_assert_1.default.strictEqual(obs.overallQuality, "INVALID");
    node_assert_1.default.strictEqual(obs.temperature.quality, "INVALID");
    node_assert_1.default.strictEqual(obs.temperature.value, null);
    node_assert_1.default.strictEqual(obs.rawWetSensorAdc.quality, "INVALID");
    node_assert_1.default.strictEqual(obs.rawWetSensorAdc.value, null);
});
(0, node_test_1.default)('EnvironmentHistoryBuffer enforces limit and retrieves properly', () => {
    var _a;
    const buffer = new index_1.EnvironmentHistoryBuffer(3);
    const obsTemplate = {
        observationTime: null, receiptTime: "now", deviceId: "A", farmId: "A", source: "SIMULATED",
        calibrationProfileId: null, overallQuality: "VALID",
        temperature: { raw: 25, value: 25, quality: "VALID" },
        humidity: { raw: 50, value: 50, quality: "VALID" },
        rawWetSensorAdc: { raw: 100, value: 100, quality: "VALID" },
        rainfall: { raw: null, value: null, quality: "MISSING" },
        solarRadiation: { raw: null, value: null, quality: "MISSING" },
        wind: { raw: null, value: null, quality: "MISSING" }
    };
    buffer.append({ ...obsTemplate, receiptTime: "t1" });
    buffer.append({ ...obsTemplate, receiptTime: "t2", overallQuality: "INVALID" });
    buffer.append({ ...obsTemplate, receiptTime: "t3" });
    buffer.append({ ...obsTemplate, receiptTime: "t4" }); // pushes out t1
    const history = buffer.getHistory();
    node_assert_1.default.strictEqual(history.length, 3);
    node_assert_1.default.strictEqual(history[0].receiptTime, "t2");
    node_assert_1.default.strictEqual(history[2].receiptTime, "t4");
    node_assert_1.default.strictEqual((_a = buffer.getLatest()) === null || _a === void 0 ? void 0 : _a.receiptTime, "t4");
    const valid = buffer.getValidHistory();
    node_assert_1.default.strictEqual(valid.length, 2); // t3 and t4
});
const environmentSource_1 = require("./environmentSource");
(0, node_test_1.default)('SimulatedEnvironmentalSource generates valid observations', async () => {
    const sim = new environmentSource_1.SimulatedEnvironmentalSource();
    const obs = await sim.getLatest();
    node_assert_1.default.strictEqual(obs.overallQuality, "VALID");
    node_assert_1.default.strictEqual(obs.source, "SIMULATED");
    node_assert_1.default.strictEqual(typeof obs.temperature.value, "number");
});
const climateFeatures_1 = require("./climateFeatures");
const climateClustering_1 = require("./climateClustering");
(0, node_test_1.default)('extractClimateFeatures handles insufficient history', () => {
    const features = (0, climateFeatures_1.extractClimateFeatures)([], 60);
    node_assert_1.default.strictEqual(features.dataCompleteness, 0);
    node_assert_1.default.strictEqual(features.meanTemperature, null);
});
(0, node_test_1.default)('extractClimateFeatures ignores INVALID observations', () => {
    const now = Date.now();
    const obs = [
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
    const features = (0, climateFeatures_1.extractClimateFeatures)(obs, 60);
    node_assert_1.default.strictEqual(features.meanTemperature, 20); // Not poisoned by 90
});
(0, node_test_1.default)('ClimateKMeans clusters successfully', () => {
    const data = [
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 20, meanHumidity: 50 },
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 21, meanHumidity: 52 },
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 80 },
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 36, meanHumidity: 85 }
    ];
    const model = new climateClustering_1.ClimateKMeans({
        k: 2,
        maxIterations: 10,
        featuresToUse: ['meanTemperature', 'meanHumidity'],
        version: '1.0'
    });
    model.fit(data);
    const p1 = model.predict(data[0]);
    const p2 = model.predict(data[3]);
    node_assert_1.default.notStrictEqual(p1.clusterId, p2.clusterId); // They belong to different clusters
    node_assert_1.default.strictEqual(p1.configVersion, '1.0');
});
(0, node_test_1.default)('extractClimateFeatures respects configurable heatStressThreshold', () => {
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
    ];
    // Default threshold is 32, so 33 is elevated (duration > 0)
    const defaultFeatures = (0, climateFeatures_1.extractClimateFeatures)(obs, 60);
    node_assert_1.default.ok(defaultFeatures.durationElevatedTemp > 0);
    // Configured threshold is 35, so 33 is NOT elevated
    const customFeatures = (0, climateFeatures_1.extractClimateFeatures)(obs, 60, 1, 35);
    node_assert_1.default.strictEqual(customFeatures.durationElevatedTemp, 0);
});
(0, node_test_1.default)('ClimateKMeans clusters are ephemeral and do not guarantee persistent identity', () => {
    const data1 = [
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 20, meanHumidity: 50 },
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 80 }
    ];
    const model1 = new climateClustering_1.ClimateKMeans({ k: 2, maxIterations: 10, featuresToUse: ['meanTemperature'], version: '1.0' });
    model1.fit(data1);
    const p1 = model1.predict(data1[1]); // Predicts cluster ID for 35C
    // Fit a new model on DIFFERENT data where 35C is now the minimum
    const data2 = [
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 35, meanHumidity: 50 },
        { windowStart: "", windowEnd: "", dataCompleteness: 1, meanTemperature: 45, meanHumidity: 80 }
    ];
    const model2 = new climateClustering_1.ClimateKMeans({ k: 2, maxIterations: 10, featuresToUse: ['meanTemperature'], version: '1.0' });
    model2.fit(data2);
    const p2 = model2.predict(data2[0]); // Predicts cluster ID for 35C
    // Identity is ephemeral and relative!
    // In model 1, 35C is the HIGH cluster. In model 2, 35C is the LOW cluster.
    node_assert_1.default.ok(p1.clusterId !== undefined);
    node_assert_1.default.ok(p2.clusterId !== undefined);
});
const biologyFeatures_1 = require("./biologyFeatures");
const biologyEvents_1 = require("./biologyEvents");
(0, node_test_1.default)('extractBehaviouralFeatures handles empty baseline', () => {
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
    ];
    const features = (0, biologyFeatures_1.extractBehaviouralFeatures)([], recent, 60);
    node_assert_1.default.strictEqual(features.isValid, false);
    node_assert_1.default.strictEqual(features.grazingChange, null);
    const events = (0, biologyEvents_1.detectBiologicalEvents)(features, recent[0]);
    node_assert_1.default.strictEqual(events.length, 1);
    node_assert_1.default.strictEqual(events[0].type, "INSUFFICIENT_EVIDENCE");
});
(0, node_test_1.default)('extractBehaviouralFeatures calculates baseline-relative changes', () => {
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
    ];
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
    ];
    const features = (0, biologyFeatures_1.extractBehaviouralFeatures)(baseline, recent, 60, 1 / 60); // 1 sample per hour to pass completeness check
    node_assert_1.default.strictEqual(features.isValid, true);
    node_assert_1.default.strictEqual(features.grazingChange, -30); // 30 - 60
    node_assert_1.default.strictEqual(features.shadeOccupancyChange, 30); // 40 - 10
    node_assert_1.default.strictEqual(features.sustainedRapidMovement, true); // 0.9 > 0.8 and 0.9 > 0.2 * 1.5
    const events = (0, biologyEvents_1.detectBiologicalEvents)(features, recent[0]);
    const types = events.map(e => e.type);
    node_assert_1.default.ok(types.includes("GRAZING_ACTIVITY_DROP"));
    node_assert_1.default.ok(types.includes("SHADE_OCCUPANCY_CHANGE"));
    node_assert_1.default.ok(types.includes("MOVEMENT_ANOMALY"));
    node_assert_1.default.ok(types.includes("ACUTE_BEHAVIOURAL_ANOMALY"));
});
(0, node_test_1.default)('parseLegacyBiologyResponse includes unclassifiedActivityPct correctly', () => {
    var _a;
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
    const obs = (0, index_1.parseLegacyBiologyResponse)(payload);
    node_assert_1.default.strictEqual((_a = obs.unclassifiedActivityPct) === null || _a === void 0 ? void 0 : _a.value, 20);
});
const biologyCandidates_1 = require("./biologyCandidates");
(0, node_test_1.default)('TemporalEventCorrelationLayer: Scene-motion anomaly alone does not trigger candidate', () => {
    const layer = new biologyCandidates_1.TemporalEventCorrelationLayer();
    const features = {
        isValid: true,
        dataCompleteness: 1.0,
        windowStart: "2026-10-09T00:00:00Z",
        windowEnd: "2026-10-09T00:15:00Z",
        grazingChange: 0,
        unclassifiedActivityChange: 0,
        movementIntensityChange: 0.5,
        shadeOccupancyChange: 0,
        waterOccupancyChange: 0,
        sustainedRapidMovement: true
    };
    const events = [
        { type: "MOVEMENT_ANOMALY", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } },
        { type: "ACUTE_BEHAVIOURAL_ANOMALY", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } }
    ];
    const result = layer.processInterval(features, events);
    node_assert_1.default.strictEqual(result.length, 0); // Should not trigger candidate
});
(0, node_test_1.default)('TemporalEventCorrelationLayer: Correlated spatial events trigger candidate but explicitly note shared underlying measurement', () => {
    const layer = new biologyCandidates_1.TemporalEventCorrelationLayer();
    const features = {
        isValid: true,
        dataCompleteness: 1.0,
        windowStart: "2026-10-09T00:00:00Z",
        windowEnd: "2026-10-09T00:15:00Z"
    };
    const events = [
        { type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } },
        { type: "SHADE_OCCUPANCY_CHANGE", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } }
    ];
    const result = layer.processInterval(features, events);
    node_assert_1.default.strictEqual(result.length, 1);
    const candidate = result[0];
    node_assert_1.default.strictEqual(candidate.type, "ACUTE_BEHAVIOURAL_ANOMALY_CANDIDATE");
    node_assert_1.default.strictEqual(candidate.evidence.sharedUnderlyingMeasurement, true);
    node_assert_1.default.ok(candidate.limitations.some(l => l.includes("Correlated spatial observations depend on the same underlying computer vision frame")));
});
(0, node_test_1.default)('TemporalEventCorrelationLayer: Deduplicates persistent events and resolves stale events', () => {
    const layer = new biologyCandidates_1.TemporalEventCorrelationLayer({
        version: "test",
        minDataCompleteness: 0.5,
        requiredCooccurringEvents: 2,
        persistenceWindowMs: 0,
        eventCooldownMs: 1000 // 1 second
    });
    const features = { isValid: true, dataCompleteness: 1.0 };
    const events = [
        { type: "GRAZING_ACTIVITY_DROP", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } },
        { type: "SHADE_OCCUPANCY_CHANGE", dataQuality: "VALID", source: "LIVE", metadata: { description: "" } }
    ];
    // T=0
    const t0 = new Date('2026-10-09T00:00:00Z');
    const res1 = layer.processInterval(features, events, undefined, t0.toISOString());
    node_assert_1.default.strictEqual(res1.length, 1);
    node_assert_1.default.strictEqual(res1[0].status, "ACTIVE");
    // T=500ms (Polling again) - should return the SAME event (deduplicated)
    const t1 = new Date(t0.getTime() + 500);
    const res2 = layer.processInterval(features, events, undefined, t1.toISOString());
    node_assert_1.default.strictEqual(res2.length, 1);
    node_assert_1.default.strictEqual(res2[0].eventId, res1[0].eventId);
    node_assert_1.default.strictEqual(res2[0].lastObservedTime, t1.toISOString());
    // T=2000ms (Cooldown passed), no new events, should resolve
    const t2 = new Date(t0.getTime() + 2000);
    const res3 = layer.processInterval(features, [], undefined, t2.toISOString());
    node_assert_1.default.strictEqual(res3.length, 1);
    node_assert_1.default.strictEqual(res3[0].status, "RESOLVED");
});
(0, node_test_1.default)('TemporalEventCorrelationLayer: Returns INSUFFICIENT_EVIDENCE if completeness is low', () => {
    const layer = new biologyCandidates_1.TemporalEventCorrelationLayer();
    const features = { isValid: true, dataCompleteness: 0.2 };
    const result = layer.processInterval(features, []);
    node_assert_1.default.strictEqual(result.length, 1);
    node_assert_1.default.strictEqual(result[0].type, "INSUFFICIENT_EVIDENCE");
});
