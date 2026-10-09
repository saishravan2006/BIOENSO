"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClimateFeatures = extractClimateFeatures;
function extractClimateFeatures(history, windowMinutes, expectedSamplesPerMinute = 1, heatStressThreshold = 32 // PROVISIONAL: This is a placeholder threshold, not a scientifically validated universal livestock heat-stress threshold. It must be configurable per animal type.
) {
    if (history.length === 0) {
        return {
            windowStart: "", windowEnd: "", dataCompleteness: 0,
            meanTemperature: null, minTemperature: null, maxTemperature: null,
            temperatureTrend: null, temperatureVariability: null,
            meanHumidity: null, maxHumidity: null, humidityTrend: null,
            rainfallTotal: null, durationElevatedTemp: null
        };
    }
    // Sort by receipt time just in case
    const sorted = [...history].sort((a, b) => new Date(a.receiptTime).getTime() - new Date(b.receiptTime).getTime());
    const latestTime = new Date(sorted[sorted.length - 1].receiptTime);
    const cutoffTime = new Date(latestTime.getTime() - windowMinutes * 60000);
    const windowObs = sorted.filter(o => new Date(o.receiptTime) >= cutoffTime);
    const validWindowObs = windowObs.filter(o => o.overallQuality === "VALID");
    const expectedSamples = windowMinutes * expectedSamplesPerMinute;
    const completeness = expectedSamples > 0 ? validWindowObs.length / expectedSamples : 0;
    let meanTemp = null;
    let minTemp = null;
    let maxTemp = null;
    let tempTrend = null;
    let tempVar = null;
    let durationElevated = null;
    let meanHum = null;
    let maxHum = null;
    let humTrend = null;
    let rainfallTotal = null;
    if (validWindowObs.length > 0) {
        const temps = validWindowObs.map(o => o.temperature.value);
        const hums = validWindowObs.map(o => o.humidity.value);
        minTemp = Math.min(...temps);
        maxTemp = Math.max(...temps);
        meanTemp = temps.reduce((sum, val) => sum + val, 0) / temps.length;
        // Variance and stddev
        const tempVariance = temps.reduce((sum, val) => sum + Math.pow(val - meanTemp, 2), 0) / temps.length;
        tempVar = Math.sqrt(tempVariance);
        maxHum = Math.max(...hums);
        meanHum = hums.reduce((sum, val) => sum + val, 0) / hums.length;
        // Simple trend (last - first) / time_diff_minutes
        const firstObs = validWindowObs[0];
        const lastObs = validWindowObs[validWindowObs.length - 1];
        const diffMs = new Date(lastObs.receiptTime).getTime() - new Date(firstObs.receiptTime).getTime();
        if (diffMs > 0) {
            const diffMins = diffMs / 60000;
            tempTrend = (lastObs.temperature.value - firstObs.temperature.value) / diffMins;
            humTrend = (lastObs.humidity.value - firstObs.humidity.value) / diffMins;
        }
        else {
            tempTrend = 0;
            humTrend = 0;
        }
        // Duration elevated (temp > 32)
        // Roughly estimate by ratio of elevated samples * windowMinutes
        const elevatedSamples = temps.filter(t => t > heatStressThreshold).length;
        durationElevated = (elevatedSamples / temps.length) * windowMinutes;
        // Rainfall total
        const validRain = validWindowObs.filter(o => o.rainfall.quality === "VALID");
        if (validRain.length > 0) {
            rainfallTotal = validRain.reduce((sum, o) => sum + o.rainfall.value, 0);
        }
    }
    return {
        windowStart: cutoffTime.toISOString(),
        windowEnd: latestTime.toISOString(),
        dataCompleteness: Math.min(1.0, completeness),
        meanTemperature: meanTemp,
        minTemperature: minTemp,
        maxTemperature: maxTemp,
        temperatureTrend: tempTrend,
        temperatureVariability: tempVar,
        meanHumidity: meanHum,
        maxHumidity: maxHum,
        humidityTrend: humTrend,
        rainfallTotal,
        durationElevatedTemp: durationElevated
    };
}
