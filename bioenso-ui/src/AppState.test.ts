import test from 'node:test';
import assert from 'node:assert';
import { getScenarioState } from './AppState.js';
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

test('UI Test A: Fresh live observation produces normal score', () => {
  const connState: EnvironmentalConnectionState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: FRESH_ENV.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], FRESH_ENV, null, "LIVE", connState);
  
  assert.notStrictEqual(state.riskState.score, null);
  assert.notStrictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
  assert.strictEqual(state.envSource?.connectionStatus, "CONNECTED");
});

test('UI Test B: Stale live observation overrides score to INSUFFICIENT', () => {
  const connState: EnvironmentalConnectionState = { status: "STALE", consecutiveFailures: 3, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Timeout", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], STALE_ENV, null, "LIVE", connState);
  
  assert.strictEqual(state.riskState.score, null);
  assert.strictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
  assert.ok(state.riskState.message.includes("stale"));
});

test('UI Test C: Never-connected source yields INSUFFICIENT and no silent fallback', () => {
  const connState: EnvironmentalConnectionState = { status: "NEVER_CONNECTED", consecutiveFailures: 1, lastSuccessfulFetch: null, lastError: "Refused", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], null, null, "LIVE", connState);
  
  assert.strictEqual(state.riskState.score, null);
  assert.strictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
  assert.strictEqual(state.envSource?.type, "DISCONNECTED");
});

test('UI Test D: Disconnected source with stale data does not produce normal score', () => {
  const connState: EnvironmentalConnectionState = { status: "DISCONNECTED", consecutiveFailures: 10, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Offline", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], STALE_ENV, null, "LIVE", connState);
  
  assert.strictEqual(state.riskState.score, null);
  assert.strictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
});

test('UI Test E: Recovery after reconnection', () => {
  let connState: EnvironmentalConnectionState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: FRESH_ENV.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  let state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], FRESH_ENV, null, "LIVE", connState);
  assert.notStrictEqual(state.riskState.score, null);

  connState = { status: "STALE", consecutiveFailures: 3, lastSuccessfulFetch: STALE_ENV.receiptTime, lastError: "Timeout", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], STALE_ENV, null, "LIVE", connState);
  assert.strictEqual(state.riskState.score, null);
  assert.strictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");

  const freshEnv2 = { ...FRESH_ENV, receiptTime: new Date().toISOString() };
  connState = { status: "CONNECTED", consecutiveFailures: 0, lastSuccessfulFetch: freshEnv2.receiptTime, lastError: null, lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], freshEnv2, null, "LIVE", connState);
  assert.notStrictEqual(state.riskState.score, null);
  assert.notStrictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
});

test('UI Test F: No silent simulation fallback', () => {
  const connState: EnvironmentalConnectionState = { status: "NEVER_CONNECTED", consecutiveFailures: 1, lastSuccessfulFetch: null, lastError: "Refused", lastAttemptTime: new Date().toISOString(), sourceType: "LIVE_EDGE_API" };
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], null, null, "LIVE", connState);
  assert.strictEqual(state.riskState.score, null);
  assert.strictEqual(state.envSource?.type, "DISCONNECTED");
});

test('UI Test G: Simulation mode regression', () => {
  const state = getScenarioState("NORMAL", undefined, LIVE_BIOLOGY, [], null, null, "SIMULATED", null);
  assert.notStrictEqual(state.riskState.score, null);
  assert.notStrictEqual(state.riskState.level, "INSUFFICIENT EVIDENCE");
  assert.strictEqual(state.envSource?.type, "SIMULATED");
});
