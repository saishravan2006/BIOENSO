"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentHistoryBuffer = void 0;
exports.parseField = parseField;
exports.parseEnvironmentalObservation = parseEnvironmentalObservation;
exports.parseLegacyBiologyResponse = parseLegacyBiologyResponse;
function parseField(raw, min, max, missingAllowed = false) {
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
function parseEnvironmentalObservation(json, source, receiptTimeOverride) {
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
    let overallQuality = "VALID";
    if (coreFields.some(f => f.quality === "INVALID")) {
        overallQuality = "INVALID";
    }
    else if (coreFields.some(f => f.quality === "MISSING" || f.quality === "SUSPECT")) {
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
class EnvironmentHistoryBuffer {
    constructor(limit = 1000) {
        this.buffer = [];
        this.limit = limit;
    }
    append(obs) {
        this.buffer.push(obs);
        if (this.buffer.length > this.limit) {
            this.buffer.shift();
        }
    }
    getHistory() {
        return [...this.buffer];
    }
    getLatest() {
        return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
    }
    getValidHistory() {
        return this.buffer.filter(o => o.overallQuality === "VALID");
    }
}
exports.EnvironmentHistoryBuffer = EnvironmentHistoryBuffer;
__exportStar(require("./environmentSource"), exports);
__exportStar(require("./climateFeatures"), exports);
__exportStar(require("./climateClustering"), exports);
__exportStar(require("./biologyFeatures"), exports);
__exportStar(require("./biologyEvents"), exports);
__exportStar(require("./biologyCandidates"), exports);
function parseLegacyBiologyResponse(json, receiptTimeOverride) {
    var _a, _b;
    if (!json || typeof json !== 'object' || !json.biology) {
        throw new Error("Invalid legacy payload structure: missing 'biology' root");
    }
    const bio = json.biology;
    const activeAnimals = parseField(bio.active_animals, 0, 100000);
    const shadeOccupancyPct = parseField((_a = bio.shade_occupancy_pct) !== null && _a !== void 0 ? _a : bio.shade_pct, 0, 100);
    const waterZoneOccupancyPct = parseField((_b = bio.water_zone_occupancy_pct) !== null && _b !== void 0 ? _b : bio.water_pct, 0, 100);
    const movementIndex = parseField(bio.movement_index, 0, 1);
    const grazingPct = parseField(bio.grazing_pct, 0, 100);
    const restingPct = parseField(bio.resting_pct, 0, 100, true);
    const unclassifiedActivityPct = parseField(bio.unclassified_activity_pct, 0, 100, true);
    const confidence = parseField(bio.confidence, 0, 1);
    const fields = [activeAnimals, shadeOccupancyPct, waterZoneOccupancyPct, movementIndex, grazingPct, confidence];
    if (bio.resting_pct !== undefined && bio.resting_pct !== null)
        fields.push(restingPct);
    if (bio.unclassified_activity_pct !== undefined && bio.unclassified_activity_pct !== null)
        fields.push(unclassifiedActivityPct);
    let overallQuality = "VALID";
    if (fields.some(f => f.quality === "INVALID")) {
        overallQuality = "INVALID";
    }
    else if (fields.some(f => f.quality === "MISSING" || f.quality === "SUSPECT")) {
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
