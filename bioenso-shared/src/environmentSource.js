"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveApiEnvironmentalSource = exports.SimulatedEnvironmentalSource = void 0;
const index_1 = require("./index");
class SimulatedEnvironmentalSource {
    constructor() {
        this.baseTemp = 25;
        this.baseHum = 50;
        this.baseAdc = 1500;
    }
    async getLatest() {
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
        return (0, index_1.parseEnvironmentalObservation)(payload, "SIMULATED");
    }
}
exports.SimulatedEnvironmentalSource = SimulatedEnvironmentalSource;
class LiveApiEnvironmentalSource {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    async getLatest() {
        const res = await fetch(this.endpoint);
        if (!res.ok) {
            throw new Error(`Failed to fetch environmental data: ${res.statusText}`);
        }
        const json = await res.json();
        return (0, index_1.parseEnvironmentalObservation)(json, "ESP32_SERIAL"); // Assuming API serves serial data
    }
}
exports.LiveApiEnvironmentalSource = LiveApiEnvironmentalSource;
