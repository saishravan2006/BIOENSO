import test from 'node:test';
import assert from 'node:assert';
import { getNetworkState } from './AppState.js';
import type { EnvironmentalConnectionState } from 'bioenso-shared';

const LIVE_BIOLOGY = {
  status: "ACTIVE",
  overallQuality: "VALID",
  activeAnimals: { value: 120, quality: "VALID" },
  shadeOccupancyPct: { value: 65, quality: "VALID" },
  waterZoneOccupancyPct: { value: 20, quality: "VALID" },
  grazingPct: { value: 15, quality: "VALID" },
  movementIndex: { value: 0.8, quality: "VALID" }
};

const FRESH_ENV = {
  receiptTime: new Date().toISOString(),
  source: "ESP32_SERIAL",
  overallQuality: "VALID",
  temperature: { value: 30, quality: "VALID" },
  humidity: { value: 50, quality: "VALID" },
  rainfall: { value: 0, quality: "VALID" }
};

const STALE_ENV = {
  ...FRESH_ENV,
  receiptTime: new Date(Date.now() - 60000).toISOString()
};

test('Console Test A: Fresh live observation produces normal score', () => {
  const connState: EnvironmentalConnectionState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: FRESH_ENV.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], FRESH_ENV, connState, "LIVE");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.notStrictEqual(demoFarm.bti.score, null);
  assert.notStrictEqual(demoFarm.bti.severity, "INSUFFICIENT");
  // Check that the injected temperature is used
  assert.strictEqual(demoFarm.currentEnvironment.temperature, 30);
});

test('Console Test B: Stale live observation overrides score to INSUFFICIENT', () => {
  const connState: EnvironmentalConnectionState = { status: "STALE", consecutiveFailures: 3, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Timeout", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], STALE_ENV, connState, "LIVE");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.strictEqual(demoFarm.bti.score, null);
  assert.strictEqual(demoFarm.bti.severity, "INSUFFICIENT");
  assert.ok(demoFarm.bti.explanation[0].includes("stale"));
});

test('Console Test C: Never-connected source yields INSUFFICIENT and no silent fallback', () => {
  const connState: EnvironmentalConnectionState = { status: "NEVER_CONNECTED", consecutiveFailures: 1, lastSuccessfulFetch: null, lastError: "Refused", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], null, connState, "LIVE");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.strictEqual(demoFarm.bti.score, null);
  assert.strictEqual(demoFarm.bti.severity, "INSUFFICIENT");
});

test('Console Test D: Disconnected source with stale data does not produce normal score', () => {
  const connState: EnvironmentalConnectionState = { status: "DISCONNECTED", consecutiveFailures: 10, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Offline", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], STALE_ENV, connState, "LIVE");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.strictEqual(demoFarm.bti.score, null);
  assert.strictEqual(demoFarm.bti.severity, "INSUFFICIENT");
});

test('Console Test E: Recovery after reconnection', () => {
  let connState: EnvironmentalConnectionState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: FRESH_ENV.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  let farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], FRESH_ENV, connState, "LIVE");
  let demoFarm = farms.find(f => f.id === "FARM_01")!;
  assert.notStrictEqual(demoFarm.bti.score, null);

  connState = { status: "STALE", consecutiveFailures: 3, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Timeout", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], STALE_ENV, connState, "LIVE");
  demoFarm = farms.find(f => f.id === "FARM_01")!;
  assert.strictEqual(demoFarm.bti.score, null);
  assert.strictEqual(demoFarm.bti.severity, "INSUFFICIENT");

  const freshEnv2 = { ...FRESH_ENV, receiptTime: new Date().toISOString() };
  connState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: freshEnv2.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], freshEnv2, connState, "LIVE");
  demoFarm = farms.find(f => f.id === "FARM_01")!;
  assert.notStrictEqual(demoFarm.bti.score, null);
  assert.notStrictEqual(demoFarm.bti.severity, "INSUFFICIENT");
});

test('Console Test F: No silent simulation fallback', () => {
  const connState: EnvironmentalConnectionState = { status: "NEVER_CONNECTED", consecutiveFailures: 1, lastSuccessfulFetch: null, lastError: "Refused", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], null, connState, "LIVE");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.strictEqual(demoFarm.bti.score, null);
  assert.strictEqual(demoFarm.bti.severity, "INSUFFICIENT");
});

test('Console Test G: Simulation mode regression', () => {
  const farms = getNetworkState("NETWORK_NORMAL", LIVE_BIOLOGY, [], null, null, "SIMULATED");
  const demoFarm = farms.find(f => f.id === "FARM_01")!;
  
  assert.notStrictEqual(demoFarm.bti.score, null);
  assert.notStrictEqual(demoFarm.bti.severity, "INSUFFICIENT");
});
