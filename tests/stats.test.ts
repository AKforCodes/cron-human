import { describe, it, expect } from 'vitest';
import { cronStats } from '../src/lib.js';
import { spawnSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve('dist/cli.js');
const nodeExe = process.execPath;
const run = (args: string[]) => {
    const { stdout, stderr, status } = spawnSync(nodeExe, [cliPath, ...args], {
        encoding: 'utf-8',
        timeout: 30000,
    });
    return { stdout: stdout || '', stderr: stderr || '', status: status ?? 1 };
};

describe('cronStats (Library)', () => {

    describe('A. Frequency Accuracy', () => {

        it('1) @daily produces ~1 run/day, ~365 runs/year', () => {
            const s = cronStats('@daily', { timezone: 'UTC' });
            expect(s.frequency.perDay).toBeCloseTo(1, 0);
            expect(s.frequency.perWeek).toBeCloseTo(7, 0);
            expect(s.frequency.perMonth).toBeCloseTo(30, 0);
            // Sampling window is 1 year; actual count is 365 or 366
            expect(s.frequency.perYear).toBeGreaterThanOrEqual(365);
            expect(s.frequency.perYear).toBeLessThanOrEqual(366);
        });

        it('2) @hourly produces ~24 runs/day', () => {
            const s = cronStats('@hourly', { timezone: 'UTC' });
            expect(s.frequency.perDay).toBeCloseTo(24, 0);
            expect(s.frequency.perWeek).toBeCloseTo(168, 0);
        });

        it('3) Every-minute produces ~1440 runs/day (extrapolated)', () => {
            const s = cronStats('* * * * *', { timezone: 'UTC' });
            // Extrapolated from 10K sample — allow ~1% tolerance
            expect(s.frequency.perDay).toBeCloseTo(1440, -1);
        }, 15000);

        it('4) Every 5 minutes produces ~288 runs/day', () => {
            const s = cronStats('*/5 * * * *', { timezone: 'UTC' });
            expect(s.frequency.perDay).toBeCloseTo(288, 0);
        }, 15000);

        it('5) Weekdays-only produces ~5 runs/week', () => {
            const s = cronStats('0 9 * * MON-FRI', { timezone: 'UTC' });
            expect(s.frequency.perWeek).toBeCloseTo(5, 0);
            expect(s.frequency.perDay).toBeLessThan(1);
        });

        it('6) Monthly produces ~12 runs/year', () => {
            const s = cronStats('@monthly', { timezone: 'UTC' });
            expect(s.frequency.perYear).toBeCloseTo(12, 0);
        });

        it('7) Yearly produces ~1 run/year', () => {
            const s = cronStats('@yearly', { timezone: 'UTC' });
            expect(s.frequency.perYear).toBeCloseTo(1, 0);
        });

        it('8) Weekends-only produces ~2 runs/week', () => {
            const s = cronStats('0 12 * * 0,6', { timezone: 'UTC' });
            expect(s.frequency.perWeek).toBeCloseTo(2, 0);
        });

        it('9) Twice daily produces ~2 runs/day', () => {
            const s = cronStats('0 9,17 * * *', { timezone: 'UTC' });
            expect(s.frequency.perDay).toBeCloseTo(2, 0);
        });

        it('10) Every 15 min during business hours (9-17) weekdays', () => {
            // 9:00-17:45 = 36 slots per day * 5 days = 180/week
            const s = cronStats('*/15 9-17 * * 1-5', { timezone: 'UTC' });
            expect(s.frequency.perWeek).toBeCloseTo(180, -1);
        });
    });

    describe('B. Gap Analysis', () => {

        it('1) @hourly has uniform 60min gaps', () => {
            const s = cronStats('@hourly', { timezone: 'UTC' });
            expect(s.gaps.shortest.minutes).toBe(60);
            expect(s.gaps.longest.minutes).toBe(60);
            expect(s.gaps.average.minutes).toBe(60);
        });

        it('2) @daily has uniform 1440min gaps', () => {
            const s = cronStats('@daily', { timezone: 'UTC' });
            expect(s.gaps.shortest.minutes).toBe(1440);
            expect(s.gaps.longest.minutes).toBe(1440);
        });

        it('3) Weekday schedule has weekend gap', () => {
            const s = cronStats('0 9 * * 1-5', { timezone: 'UTC' });
            // Shortest = 24h (weekday to weekday)
            expect(s.gaps.shortest.minutes).toBe(1440);
            // Longest = Fri 9am -> Mon 9am = 72h = 4320min
            expect(s.gaps.longest.minutes).toBe(4320);
        });

        it('4) Every-10-min has uniform 10min gaps', () => {
            const s = cronStats('*/10 * * * *', { timezone: 'UTC' });
            expect(s.gaps.shortest.minutes).toBe(10);
            expect(s.gaps.longest.minutes).toBe(10);
        }, 15000);

        it('5) Twice daily (9am + 5pm) alternates 8h and 16h gaps', () => {
            const s = cronStats('0 9,17 * * *', { timezone: 'UTC' });
            expect(s.gaps.shortest.minutes).toBe(480);   // 8h
            expect(s.gaps.longest.minutes).toBe(960);    // 16h
            expect(s.gaps.average.minutes).toBeCloseTo(720, 0); // 12h avg
        });

        it('6) Gap labels format correctly', () => {
            const s = cronStats('0 9 * * 1-5', { timezone: 'UTC' });
            expect(s.gaps.shortest.label).toBe('1d');
            // 3 days = 4320min
            expect(s.gaps.longest.label).toBe('3d');
        });

        it('7) Sub-minute gaps with seconds cron', () => {
            const s = cronStats('*/10 * * * * *', { timezone: 'UTC', allowSeconds: true });
            expect(s.gaps.shortest.minutes).toBeCloseTo(0.17, 1); // 10s
            expect(s.gaps.shortest.label).toBe('10s');
        }, 15000);

        it('8) Monthly schedule has variable gaps (28-31 day months)', () => {
            const s = cronStats('0 0 1 * *', { timezone: 'UTC' });
            // Feb is shorter, some months 31 days
            expect(s.gaps.shortest.minutes).toBeLessThan(s.gaps.longest.minutes);
            // Shortest ~28 days (Feb), Longest ~31 days
            expect(s.gaps.shortest.minutes).toBeGreaterThanOrEqual(28 * 1440);
            expect(s.gaps.longest.minutes).toBeLessThanOrEqual(31 * 1440);
        });
    });

    describe('C. Cost Estimation', () => {

        it('1) No cost field when --cost not provided', () => {
            const s = cronStats('@daily', { timezone: 'UTC' });
            expect(s.cost).toBeUndefined();
        });

        it('2) Cost at $0 produces $0', () => {
            const s = cronStats('@daily', { timezone: 'UTC', costPerRun: 0 });
            expect(s.cost).toBeDefined();
            expect(s.cost!.monthly).toBe(0);
            expect(s.cost!.yearly).toBe(0);
        });

        it('3) Cost scales linearly with frequency', () => {
            const price = 0.01;
            const hourly = cronStats('@hourly', { timezone: 'UTC', costPerRun: price });
            const daily = cronStats('@daily', { timezone: 'UTC', costPerRun: price });
            // Hourly costs ~24x daily
            expect(hourly.cost!.yearly / daily.cost!.yearly).toBeCloseTo(24, 0);
        });

        it('4) Lambda pricing scenario: every-hour at $0.0000002', () => {
            const s = cronStats('@hourly', { timezone: 'UTC', costPerRun: 0.0000002 });
            expect(s.cost).toBeDefined();
            // 8760 * 0.0000002 = 0.00175 — rounds to 0.00 at 2dp
            expect(s.cost!.yearly).toBeLessThan(0.01);
            expect(s.cost!.yearly).toBeGreaterThanOrEqual(0);
        });

        it('5) Expensive invocation scenario', () => {
            const s = cronStats('@daily', { timezone: 'UTC', costPerRun: 5.00 });
            // 365 or 366 runs * $5
            expect(s.cost!.yearly).toBeGreaterThanOrEqual(1825);
            expect(s.cost!.yearly).toBeLessThanOrEqual(1830);
            expect(s.cost!.monthly).toBeCloseTo(152, 0);
        });
    });

    describe('D. Description', () => {

        it('1) Returns a human-readable description', () => {
            const s = cronStats('@hourly');
            expect(s.description).toMatch(/hour/i);
        });

        it('2) Macros get proper descriptions', () => {
            expect(cronStats('@daily').description).toMatch(/00:00/);
            expect(cronStats('@hourly').description).toMatch(/hour/i);
        });
    });

    describe('E. Error Handling', () => {

        it('1) Rejects invalid cron', () => {
            expect(() => cronStats('not valid')).toThrow();
        });

        it('2) Rejects 6-field without allowSeconds', () => {
            expect(() => cronStats('*/5 * * * * *')).toThrow(/6-field/);
        });

        it('3) Accepts 6-field with allowSeconds', () => {
            const s = cronStats('*/30 * * * * *', { allowSeconds: true });
            expect(s.frequency.perDay).toBeGreaterThan(1000);
        }, 15000);

        it('4) Rejects invalid timezone', () => {
            expect(() => cronStats('@daily', { timezone: 'Mars/Olympus' })).toThrow();
        });

        it('5) Rejects empty string', () => {
            expect(() => cronStats('')).toThrow();
        });

        it('6) Rejects control characters', () => {
            expect(() => cronStats('* * * * *\x00')).toThrow();
        });
    });

    describe('F. Timezone Behavior', () => {

        it('1) Different timezones produce the same frequency for @daily', () => {
            const utc = cronStats('@daily', { timezone: 'UTC' });
            const ny = cronStats('@daily', { timezone: 'America/New_York' });
            expect(utc.frequency.perDay).toBe(ny.frequency.perDay);
        });

        it('2) Timezone does not affect gap calculation for @hourly', () => {
            const utc = cronStats('@hourly', { timezone: 'UTC' });
            const tokyo = cronStats('@hourly', { timezone: 'Asia/Tokyo' });
            expect(utc.gaps.shortest.minutes).toBe(tokyo.gaps.shortest.minutes);
        }, 15000);
    });

    describe('G. Performance', () => {

        it('1) @hourly completes quickly', () => {
            const start = performance.now();
            cronStats('@hourly', { timezone: 'UTC' });
            expect(performance.now() - start).toBeLessThan(3000);
        });

        it('2) Every-second cron completes in reasonable time', () => {
            const start = performance.now();
            cronStats('*/30 * * * * *', { timezone: 'UTC', allowSeconds: true });
            expect(performance.now() - start).toBeLessThan(15000);
        }, 20000);

        it('3) Yearly cron (sparse) still works', () => {
            const start = performance.now();
            const s = cronStats('@yearly', { timezone: 'UTC' });
            expect(performance.now() - start).toBeLessThan(5000);
            expect(s.frequency.perYear).toBeCloseTo(1, 0);
        });

        it('4) Every-minute extrapolation is fast', () => {
            const start = performance.now();
            const s = cronStats('* * * * *', { timezone: 'UTC' });
            // Should complete in under 5s thanks to 10K sample + extrapolation
            expect(performance.now() - start).toBeLessThan(5000);
            expect(s.frequency.perDay).toBeCloseTo(1440, -1);
        }, 10000);
    });
});

describe('cronStats CLI (stats subcommand)', () => {

    it('1) Basic output format', () => {
        const res = run(['stats', '@hourly']);
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Schedule:');
        expect(res.stdout).toContain('Frequency:');
        expect(res.stdout).toContain('Per day');
        expect(res.stdout).toContain('Per week');
        expect(res.stdout).toContain('Per month');
        expect(res.stdout).toContain('Per year');
        expect(res.stdout).toContain('Gaps:');
        expect(res.stdout).toContain('Shortest');
        expect(res.stdout).toContain('Longest');
        expect(res.stdout).toContain('Average');
    });

    it('2) --json produces valid JSON with all fields', () => {
        const res = run(['stats', '@hourly', '--json']);
        expect(res.status).toBe(0);
        const data = JSON.parse(res.stdout);
        expect(data).toHaveProperty('description');
        expect(data).toHaveProperty('frequency');
        expect(data).toHaveProperty('frequency.perDay');
        expect(data).toHaveProperty('frequency.perWeek');
        expect(data).toHaveProperty('frequency.perMonth');
        expect(data).toHaveProperty('frequency.perYear');
        expect(data).toHaveProperty('gaps');
        expect(data).toHaveProperty('gaps.shortest');
        expect(data).toHaveProperty('gaps.longest');
        expect(data).toHaveProperty('gaps.average');
    });

    it('3) --cost adds cost section', () => {
        const res = run(['stats', '@hourly', '--cost', '0.002']);
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Cost estimate');
        expect(res.stdout).toContain('Monthly');
        expect(res.stdout).toContain('Yearly');
        expect(res.stdout).toContain('$');
    });

    it('4) --cost in JSON mode', () => {
        const res = run(['stats', '@daily', '--cost', '1.50', '--json']);
        expect(res.status).toBe(0);
        const data = JSON.parse(res.stdout);
        expect(data).toHaveProperty('cost');
        expect(data.cost.monthly).toBeGreaterThan(0);
        expect(data.cost.yearly).toBeGreaterThan(0);
    });

    it('5) No cost section without --cost flag', () => {
        const res = run(['stats', '@daily']);
        expect(res.status).toBe(0);
        expect(res.stdout).not.toContain('Cost estimate');
    });

    it('6) Invalid cron exits 1', () => {
        const res = run(['stats', 'not a cron']);
        expect(res.status).toBe(1);
    });

    it('7) Invalid --cost exits 1', () => {
        const res = run(['stats', '@daily', '--cost', 'abc']);
        expect(res.status).toBe(1);
    });

    it('8) Negative --cost exits 1', () => {
        const res = run(['stats', '@daily', '--cost', '-5']);
        expect(res.status).toBe(1);
    });

    it('9) --seconds flag works', () => {
        const res = run(['stats', '0 */5 * * * *', '--seconds', '--json']);
        expect(res.status).toBe(0);
        const data = JSON.parse(res.stdout);
        expect(data.frequency.perDay).toBeGreaterThan(100);
    });

    it('10) --tz flag works', () => {
        const res = run(['stats', '@hourly', '--tz', 'UTC', '--json']);
        expect(res.status).toBe(0);
        const data = JSON.parse(res.stdout);
        expect(data.frequency.perDay).toBeCloseTo(24, 0);
    });

    it('11) Invalid --tz with stats', () => {
        const res = run(['stats', '@daily', '--tz', 'Fake/Zone']);
        expect(res.status).toBe(1);
    });

    it('12) Macro works with stats', () => {
        const res = run(['stats', '@weekly', '--json']);
        expect(res.status).toBe(0);
        const data = JSON.parse(res.stdout);
        expect(data.frequency.perWeek).toBeCloseTo(1, 0);
    });
});
