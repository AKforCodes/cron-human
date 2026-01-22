import { describe, it, expect } from 'vitest';
import { getNextRuns, validateCron } from '../src/lib.js';

describe('Macro Fix Regression Tests', () => {
  it('should validate @daily correctly', () => {
    const valid = validateCron('@daily');
    expect(valid).toBeNull();
  });

  it('should calculate next runs for @daily', () => {
    const dates = getNextRuns('@daily', 2, 'UTC');
    expect(dates).toHaveLength(2);
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/);
  });

  it('should handle @hourly', () => {
    const dates = getNextRuns('@hourly', 1, 'UTC');
    expect(dates).toHaveLength(1);
  });

  it('should handle @yearly', () => {
    const dates = getNextRuns('@yearly', 1, 'UTC');
    expect(dates).toHaveLength(1);
  });
});
