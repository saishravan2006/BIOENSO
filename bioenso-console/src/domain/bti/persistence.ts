import { PERSISTENCE_WINDOW_MINUTES } from './config';

export function calculatePersistenceScore(durationMinutes: number): number {
  return Math.min(1.0, Math.max(0.0, durationMinutes / PERSISTENCE_WINDOW_MINUTES));
}
