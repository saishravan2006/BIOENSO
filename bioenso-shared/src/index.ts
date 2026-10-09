
export interface FieldMeasurement<T> {
  raw: unknown;
  value: T | null;
  quality: "VALID" | "SUSPECT" | "MISSING" | "INVALID";
}

export type QualityFlag = "VALID" | "SUSPECT" | "MISSING" | "INVALID";

export interface BiologicalObservation {
  observationTime: string | null;
  receiptTime: string;
  farmId: string | "UNASSIGNED";
  status: "ACTIVE" | "INACTIVE" | "OFFLINE";
  source: string;
  
  activeAnimals: FieldMeasurement<number>;
  shadeOccupancyPct: FieldMeasurement<number>;
  waterZoneOccupancyPct: FieldMeasurement<number>;
  /**
   * PROVENANCE WARNING: Scene-motion proxy, not animal-specific tracking.
   */
  movementIndex: FieldMeasurement<number>;
  grazingPct: FieldMeasurement<number>;
  restingPct?: FieldMeasurement<number>;
  unclassifiedActivityPct?: FieldMeasurement<number>;
  confidence: FieldMeasurement<number>;
  
  overallQuality: "VALID" | "SUSPECT" | "INVALID";
}

export interface EnvironmentalObservation {
  observationTime: string | null;
  receiptTime: string;
  deviceId: string | "UNASSIGNED";
  farmId: string | "UNASSIGNED";
  source: string;
  calibrationProfileId: string | null;
  
  temperature: FieldMeasurement<number>;
  humidity: FieldMeasurement<number>;
  rawWetSensorAdc: FieldMeasurement<number>;
  
  rainfall: FieldMeasurement<number>;
  solarRadiation: FieldMeasurement<number>;
  wind: FieldMeasurement<number>;
  
  overallQuality: "VALID" | "SUSPECT" | "INVALID";
}

export function parseField(raw: unknown, min: number, max: number, missingAllowed: boolean = false): FieldMeasurement<number> {
  if (raw === null || raw === undefined || raw === "") {
    return { raw, value: null, quality: "MISSING" };
  }
  
  const num = Number(raw);
  if (isNaN(num)) {
    return { raw, value: null, quality: "INVALID" };
  }
  
  if (num < min || num > max) {
    return { raw, value: null, quality: "INVALID" };
  }
  
  return { raw, value: num, quality: "VALID" };
}

export function parseEnvironmentalObservation(json: any, source: "SIMULATED" | "ESP32_SERIAL", receiptTimeOverride?: string): EnvironmentalObservation {
  if (!json || typeof json !== 'object') {
    throw new Error("Invalid environmental payload structure");
  }
  
  const temperature = parseField(json.temperature, -50, 60);
  const humidity = parseField(json.humidity, 0, 100);
  const rawWetSensorAdc = parseField(json.rawWetSensorAdc, 0, 4095);
  const rainfall = parseField(json.rainfall, 0, 500, true);
  const solarRadiation = parseField(json.solarRadiation, 0, 1500, true);
  const wind = parseField(json.wind, 0, 300, true);
  
  const coreFields = [temperature, humidity, rawWetSensorAdc];
  let overallQuality: "VALID" | "SUSPECT" | "INVALID" = "VALID";
  
  if (coreFields.some(f => f.quality === "INVALID")) {
    overallQuality = "INVALID";
  } else if (coreFields.some(f => f.quality === "MISSING" || f.quality === "SUSPECT")) {
    overallQuality = "SUSPECT";
  }

  const optFields = [rainfall, solarRadiation, wind];
  if (optFields.some(f => f.quality === "INVALID")) {
    overallQuality = "INVALID";
  }
  
  const receiptTime = receiptTimeOverride || new Date().toISOString();
  
  return {
    observationTime: json.observationTime || null,
    receiptTime,
    deviceId: json.deviceId || "UNASSIGNED",
    farmId: json.farmId || "UNASSIGNED",
    source,
    calibrationProfileId: json.calibrationProfileId || null,
    temperature,
    humidity,
    rawWetSensorAdc,
    rainfall,
    solarRadiation,
    wind,
    overallQuality
  };
}

export class EnvironmentHistoryBuffer {
  private buffer: EnvironmentalObservation[] = [];
  private limit: number;
  private staleThresholdMs: number;

  constructor(limit: number = 1000, staleThresholdMs: number = 30000) {
    this.limit = limit;
    this.staleThresholdMs = staleThresholdMs;
  }

  public append(obs: EnvironmentalObservation) {
    // Reject duplicates by observationTime
    const last = this.getLatest();
    if (last && obs.observationTime && last.observationTime === obs.observationTime) {
      return; // Duplicate, skip
    }
    this.buffer.push(obs);
    if (this.buffer.length > this.limit) {
      this.buffer.shift();
    }
  }

  /** Alias for append(), used by application polling loops */
  public addObservation(obs: EnvironmentalObservation) {
    this.append(obs);
  }

  public getHistory(): EnvironmentalObservation[] {
    return [...this.buffer];
  }

  public getLatest(): EnvironmentalObservation | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  public getValidHistory(): EnvironmentalObservation[] {
    return this.buffer.filter(o => o.overallQuality === "VALID");
  }

  /** Returns true if the most recent observation is older than the stale threshold */
  public isStale(): boolean {
    const latest = this.getLatest();
    if (!latest) return true;
    const elapsed = Date.now() - new Date(latest.receiptTime).getTime();
    return elapsed > this.staleThresholdMs;
  }

  public size(): number {
    return this.buffer.length;
  }
}

export * from './environmentSource';
export * from './climateFeatures';
export * from './climateClustering';
export * from './biologyFeatures';
export * from './biologyEvents';
export * from './biologyCandidates';

export function parseLegacyBiologyResponse(json: any, receiptTimeOverride?: string): BiologicalObservation {
  if (!json || typeof json !== 'object' || !json.biology) {
    throw new Error("Invalid legacy payload structure: missing 'biology' root");
  }
  
  const bio = json.biology;
  const activeAnimals = parseField(bio.active_animals, 0, 100000);
  const shadeOccupancyPct = parseField(bio.shade_occupancy_pct ?? bio.shade_pct, 0, 100);
  const waterZoneOccupancyPct = parseField(bio.water_zone_occupancy_pct ?? bio.water_pct, 0, 100);
  const movementIndex = parseField(bio.movement_index, 0, 1);
  const grazingPct = parseField(bio.grazing_pct, 0, 100);
  const restingPct = parseField(bio.resting_pct, 0, 100, true);
  const unclassifiedActivityPct = parseField(bio.unclassified_activity_pct, 0, 100, true);
  const confidence = parseField(bio.confidence, 0, 1);
  
  const fields = [activeAnimals, shadeOccupancyPct, waterZoneOccupancyPct, movementIndex, grazingPct, confidence];
  if (bio.resting_pct !== undefined && bio.resting_pct !== null) fields.push(restingPct);
  if (bio.unclassified_activity_pct !== undefined && bio.unclassified_activity_pct !== null) fields.push(unclassifiedActivityPct);
  
  let overallQuality: "VALID" | "SUSPECT" | "INVALID" = "VALID";
  
  if (fields.some(f => f.quality === "INVALID")) {
    overallQuality = "INVALID";
  } else if (fields.some(f => f.quality === "MISSING" || f.quality === "SUSPECT")) {
    overallQuality = "SUSPECT";
  }

  const receiptTime = receiptTimeOverride || new Date().toISOString();

  return {
    observationTime: json.timestamp || receiptTime,
    receiptTime,
    farmId: json.farm_id || "UNASSIGNED",
    status: json.status || "ACTIVE",
    source: json.source || "LIVE",
    activeAnimals,
    shadeOccupancyPct,
    waterZoneOccupancyPct,
    movementIndex,
    grazingPct,
    restingPct,
    unclassifiedActivityPct,
    confidence,
    overallQuality
  };
}

export * from './acousticFeatures';
