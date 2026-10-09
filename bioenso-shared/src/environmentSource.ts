import { parseEnvironmentalObservation, EnvironmentalObservation } from './index';

export interface IEnvironmentalSource {
  getLatest(): Promise<EnvironmentalObservation>;
}

export interface EnvironmentalConnectionState {
  status: "CONNECTED" | "DISCONNECTED" | "STALE" | "NEVER_CONNECTED";
  lastSuccessfulFetch: string | null;
  lastAttemptTime: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  sourceType: "SIMULATED" | "LIVE_EDGE_API";
}

export const DEFAULT_STALE_THRESHOLD_MS = 30000; // 30 seconds

export class SimulatedEnvironmentalSource implements IEnvironmentalSource {
  private baseTemp = 25;
  private baseHum = 50;
  private baseAdc = 1500;

  async getLatest(): Promise<EnvironmentalObservation> {
    // Add some random noise
    this.baseTemp += (Math.random() - 0.5) * 0.5;
    this.baseHum += (Math.random() - 0.5) * 2;
    this.baseAdc += (Math.random() - 0.5) * 50;

    const payload = {
      observationTime: new Date().toISOString(),
      deviceId: "SIM_ENV_01",
      farmId: "DEMO_FARM_01",
      temperature: this.baseTemp,
      humidity: this.baseHum,
      rawWetSensorAdc: this.baseAdc,
      rainfall: 0,
      wind: 5 + Math.random() * 5
    };

    return parseEnvironmentalObservation(payload, "SIMULATED");
  }
}

export class LiveApiEnvironmentalSource implements IEnvironmentalSource {
  private connectionState: EnvironmentalConnectionState;
  private staleThresholdMs: number;

  constructor(
    private endpoint: string,
    staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS
  ) {
    this.staleThresholdMs = staleThresholdMs;
    this.connectionState = {
      status: "NEVER_CONNECTED",
      lastSuccessfulFetch: null,
      lastAttemptTime: null,
      lastError: null,
      consecutiveFailures: 0,
      sourceType: "LIVE_EDGE_API"
    };
  }

  getConnectionState(): EnvironmentalConnectionState {
    // Check staleness on access
    if (this.connectionState.lastSuccessfulFetch) {
      const elapsed = Date.now() - new Date(this.connectionState.lastSuccessfulFetch).getTime();
      if (elapsed > this.staleThresholdMs && this.connectionState.status === "CONNECTED") {
        this.connectionState.status = "STALE";
      }
    }
    return { ...this.connectionState };
  }

  async getLatest(): Promise<EnvironmentalObservation> {
    this.connectionState.lastAttemptTime = new Date().toISOString();
    
    let res: Response;
    try {
      res = await fetch(this.endpoint);
    } catch (err: any) {
      this.connectionState.consecutiveFailures++;
      this.connectionState.lastError = err?.message || "Network error";
      this.connectionState.status = this.connectionState.lastSuccessfulFetch ? "DISCONNECTED" : "NEVER_CONNECTED";
      throw new Error(`Environmental API connection failed: ${this.connectionState.lastError}`);
    }
    
    if (!res.ok) {
      this.connectionState.consecutiveFailures++;
      this.connectionState.lastError = `HTTP ${res.status}: ${res.statusText}`;
      this.connectionState.status = "DISCONNECTED";
      throw new Error(`Environmental API error: ${this.connectionState.lastError}`);
    }

    let json: any;
    try {
      json = await res.json();
    } catch (err: any) {
      this.connectionState.consecutiveFailures++;
      this.connectionState.lastError = "Malformed JSON response";
      this.connectionState.status = "DISCONNECTED";
      throw new Error("Environmental API returned malformed JSON");
    }

    // Successfully fetched and parsed
    this.connectionState.consecutiveFailures = 0;
    this.connectionState.lastError = null;
    this.connectionState.lastSuccessfulFetch = new Date().toISOString();
    this.connectionState.status = "CONNECTED";

    return parseEnvironmentalObservation(json, "ESP32_SERIAL");
  }
}
