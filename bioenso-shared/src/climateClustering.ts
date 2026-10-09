import type { ClimateFeatures } from './climateFeatures';

export interface ClusteringConfig {
  k: number;
  maxIterations: number;
  featuresToUse: (keyof ClimateFeatures)[];
  version: string;
}

export interface ClusterResult {
  clusterId: number;
  centroid: number[];
  distanceToCentroid: number;
  featureVector: number[];
  configVersion: string;
}

// Simple deterministic KMeans implementation
/**
 * ClimateKMeans - Simple deterministic KMeans for environmental history.
 * 
 * LIFECYCLE WARNING:
 * This model is fitted independently for the provided dataset (e.g. trailing history).
 * It does NOT persist state between fits, and there is no global "Regime 0" vs "Regime 1".
 * A cluster ID is ephemeral and only meaningful relative to the specific dataset it was trained on.
 * 
 * Users MUST NOT interpret Cluster 0 as "SAFE" or Cluster 1 as "DANGEROUS" across different
 * farms, time windows, or application sessions. It provides localized, relative grouping only.
 * 
 * Algorithm:
 * - Deterministic Initialization: Uses the first K distinct points (no random seed).
 * - Standardization: Applies Z-score scaling (zero mean, unit variance) to ensure
 *   features like temperature (e.g., 30) and humidity (e.g., 80) contribute equally.
 */
export class ClimateKMeans {
  private centroids: number[][] = [];
  private means: number[] = [];
  private stdDevs: number[] = [];
  private config: ClusteringConfig;

  constructor(config: ClusteringConfig) {
    this.config = config;
  }

  private extractVector(f: ClimateFeatures): number[] {
    return this.config.featuresToUse.map(key => {
      const val = f[key];
      return typeof val === 'number' ? val : 0; // fallback for nulls
    });
  }

  // Z-score standardization
  private fitScaler(data: number[][]) {
    const numFeatures = data[0].length;
    this.means = Array(numFeatures).fill(0);
    this.stdDevs = Array(numFeatures).fill(0);

    for (const row of data) {
      for (let j = 0; j < numFeatures; j++) {
        this.means[j] += row[j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.means[j] /= data.length;
    }

    for (const row of data) {
      for (let j = 0; j < numFeatures; j++) {
        this.stdDevs[j] += Math.pow(row[j] - this.means[j], 2);
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.stdDevs[j] = Math.sqrt(this.stdDevs[j] / data.length);
      if (this.stdDevs[j] === 0) this.stdDevs[j] = 1; // prevent division by zero
    }
  }

  private scale(vector: number[]): number[] {
    if (this.means.length === 0) return vector;
    return vector.map((v, i) => (v - this.means[i]) / this.stdDevs[i]);
  }

  private distance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  public fit(history: ClimateFeatures[]) {
    const validHistory = history.filter(h => h.dataCompleteness > 0.5);
    if (validHistory.length < this.config.k) {
      throw new Error(`Insufficient data to fit ${this.config.k} clusters`);
    }

    const rawData = validHistory.map(h => this.extractVector(h));
    this.fitScaler(rawData);
    const scaledData = rawData.map(v => this.scale(v));

    // Initialize centroids using first K distinct points (simple fallback)
    this.centroids = scaledData.slice(0, this.config.k).map(v => [...v]);

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Assign
      const assignments = scaledData.map(point => {
        let minDist = Infinity;
        let cluster = 0;
        for (let c = 0; c < this.config.k; c++) {
          const d = this.distance(point, this.centroids[c]);
          if (d < minDist) {
            minDist = d;
            cluster = c;
          }
        }
        return cluster;
      });

      // Update
      const newCentroids = Array(this.config.k).fill(0).map(() => Array(scaledData[0].length).fill(0));
      const counts = Array(this.config.k).fill(0);

      for (let i = 0; i < scaledData.length; i++) {
        const cluster = assignments[i];
        counts[cluster]++;
        for (let j = 0; j < scaledData[i].length; j++) {
          newCentroids[cluster][j] += scaledData[i][j];
        }
      }

      let changed = false;
      for (let c = 0; c < this.config.k; c++) {
        if (counts[c] > 0) {
          for (let j = 0; j < newCentroids[c].length; j++) {
            newCentroids[c][j] /= counts[c];
            if (Math.abs(newCentroids[c][j] - this.centroids[c][j]) > 0.001) {
              changed = true;
            }
          }
        }
        this.centroids[c] = newCentroids[c];
      }

      if (!changed) break;
    }
  }

  public predict(feature: ClimateFeatures): ClusterResult | null {
    if (this.centroids.length === 0 || feature.dataCompleteness < 0.2) return null;

    const raw = this.extractVector(feature);
    const scaled = this.scale(raw);

    let minDist = Infinity;
    let bestCluster = -1;
    for (let c = 0; c < this.centroids.length; c++) {
      const d = this.distance(scaled, this.centroids[c]);
      if (d < minDist) {
        minDist = d;
        bestCluster = c;
      }
    }

    return {
      clusterId: bestCluster,
      centroid: this.centroids[bestCluster],
      distanceToCentroid: minDist,
      featureVector: scaled,
      configVersion: this.config.version
    };
  }
}
