import { describe, it, expect } from 'vitest';
import { validateCron, explainCron, getNextRuns } from '../src/lib.js';
import { DateTime } from 'luxon';
import { performance } from 'node:perf_hooks';

function parseRun(s: string, zone = "UTC") {
  const dt = DateTime.fromFormat(s, "yyyy-MM-dd HH:mm:ss", { zone });
  expect(dt.isValid).toBe(true);
  return dt;
}

describe('Library Logic', () => {

    describe('A. ValidateCron (Hardening)', () => {
        it('1) Macro support', () => {
            expect(validateCron('@daily')).toBeNull();
            expect(validateCron('@hourly')).toBeNull();
            expect(validateCron('@weekly')).toBeNull();
            expect(validateCron('@monthly')).toBeNull();
            expect(validateCron('@yearly')).toBeNull();
            expect(validateCron('@annually')).toBeNull();

            expect(validateCron('@sometimes')).toMatch(/Invalid|Error/);
        });

        it('2) Newline injection sanitation', () => {
            expect(validateCron('*/5 * * * *\n')).toMatch(/newlines/);
            expect(validateCron('*/5 * * * *\r')).toMatch(/newlines/);
            expect(validateCron('*/5 * * * *\r\n')).toMatch(/newlines/);

            expect(validateCron('*/5\t*\t*\t*\t*')).toBeNull();
        });

        it('3) Leading/trailing whitespace is ignored', () => {
            expect(validateCron(' */5 * * * * ')).toBeNull();
            expect(validateCron(' @daily ')).toBeNull();
        });

        it('4) Field count boundaries', () => {
            expect(validateCron('* * * *')).toMatch(/Error.*5 fields/i);
            expect(validateCron('* * * * * * *')).toMatch(/Error.*5 fields/i);

            expect(validateCron('* * * * * *')).toMatch(/Error.*6-field/i);
            expect(validateCron('* * * * * *', { allowSeconds: true })).toBeNull();
        });

        it('5) Range/step/list syntax coverage', () => {
            expect(validateCron('0 9-17 * * 1-5')).toBeNull();
            expect(validateCron('*/15 9-17 * * 1-5')).toBeNull();
            expect(validateCron('0 0 1 */2 *')).toBeNull();
            expect(validateCron('0 0 1 1,6 *')).toBeNull();
            expect(validateCron('0 0 * * 0,6')).toBeNull();
        });

        it('6) Obvious numeric invalids', () => {
            expect(validateCron('60 * * * *')).toMatch(/Invalid|Error/);
            expect(validateCron('0 24 * * *')).toMatch(/Invalid|Error/);
            expect(validateCron('0 0 32 * *')).toMatch(/Invalid|Error/);
            expect(validateCron('0 0 * 13 *')).toMatch(/Invalid/);
        });
    });

    describe('B. ExplainCron (Output Stability)', () => {
        it('1) Throws on invalid input', () => {
            expect(() => explainCron('not a cron')).toThrow();
        });

        it('1b) Throws on unknown macro', () => {
             expect(() => explainCron('@sometimes')).toThrow();
        });

        it('2) 24-hour formatting', () => {
            const desc = explainCron('0 13 * * *');
            expect(desc).toContain('13:00');
            expect(desc).not.toContain('PM');
        });

        it('3) Macro description behaviour', () => {
            expect(explainCron('@hourly').length).toBeGreaterThan(5);
            expect(explainCron('@daily')).toMatch(/00:00/);
        });

        it('4) Trimming works', () => {
            const t1 = explainCron('*/5 * * * *');
            const t2 = explainCron(' */5 * * * * ');
            expect(t1).toEqual(t2);
        });
    });

    describe('C. GetNextRuns (Correctness + Safety)', () => {
        it('1) Exact length and monotonic increase', () => {
            const runs = getNextRuns('*/5 * * * *', 5, 'UTC');
            expect(runs).toHaveLength(5);

            for (let i = 0; i < runs.length - 1; i++) {
                const cur = parseRun(runs[i], 'UTC');
                const next = parseRun(runs[i+1], 'UTC');
                expect(next.toMillis()).toBeGreaterThan(cur.toMillis());
            }
        });

        it('2) Format matches YYYY-MM-DD HH:mm:ss', () => {
            const runs = getNextRuns('@hourly', 3);
            const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
            runs.forEach(r => {
                expect(r).toMatch(regex);
                expect(r).not.toContain('Invalid');
            });
        });

        it('3) Handles count edges', () => {
            expect(getNextRuns('*/5 * * * *', 1)).toHaveLength(1);
            expect(getNextRuns('*/5 * * * *', 0)).toHaveLength(0);

            const start = performance.now();
            const large = getNextRuns('*/5 * * * *', 100);
            expect(large).toHaveLength(100);
            expect(performance.now() - start).toBeLessThan(5000);
        });

        it('4) Timezone validation', () => {
            expect(() => getNextRuns('*/5 * * * *', 1, 'Not/AZone')).toThrow(/Invalid timezone/);
            expect(() => getNextRuns('*/5 * * * *', 1, 'UTC')).not.toThrow();
        });

        it('5) Macro next runs work', () => {
            const daily = getNextRuns('@daily', 2, 'UTC');
            expect(daily).toHaveLength(2);

            const d1 = parseRun(daily[0], 'UTC');
            const d2 = parseRun(daily[1], 'UTC');

            const diffHours = d2.diff(d1, 'hours').hours;
            expect(diffHours).toBe(24);
        });

        it('6) Seconds cron generates near-future runs', () => {
            const runs = getNextRuns('*/5 * * * * *', 3, 'UTC');
            expect(runs).toHaveLength(3);

            const d2 = parseRun(runs[1], 'UTC');
            const d3 = parseRun(runs[2], 'UTC');
            const diffMs = d3.toMillis() - d2.toMillis();

            expect(diffMs).toBeGreaterThanOrEqual(4900);
            expect(diffMs).toBeLessThanOrEqual(5100);
        });
    });

    describe('D. Security Checks', () => {
        it('1) Rejects extremely long strings (DoS prevention)', () => {
            const longString = "*/5 * * * * " + "a".repeat(2000);
            expect(validateCron(longString)).toMatch(/too long/);
        });

        it('2) Rejects control characters (Injection prevention)', () => {
             expect(validateCron('*/5 * * * * \x00')).toMatch(/control characters/);
             expect(validateCron('*/5 * * * * \x1B')).toMatch(/control characters/);
             expect(validateCron('*/5 * * * * \x07')).toMatch(/control characters/);
        });

        it('3) Explicitly rejects ANSI escape sequences', () => {
             expect(validateCron("*/5 * * * * \x1B[31m")).toMatch(/control/);
        });

        it('4) Allows strictly valid whitespace (Tab/Space)', () => {
             expect(validateCron('*/5\t*\t*\t*\t*')).toBeNull();
        });
    });

});
