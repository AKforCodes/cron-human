import { describe, it, expect } from 'vitest';
import { compareCron } from '../src/lib.js';
import { spawnSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve('dist/cli.js');
const nodeExe = process.execPath;
const run = (args: string[]) => {
  const { stdout, stderr, status } = spawnSync(nodeExe, [cliPath, ...args], { encoding: 'utf-8' });
  return { stdout: stdout || '', stderr: stderr || '', status: status ?? 1 };
};

describe('compareCron (Library)', () => {
  describe('A. Basic Comparison', () => {
    it('1) Returns both descriptions and runs', () => {
      const result = compareCron('*/5 * * * *', '@hourly');
      expect(result.a.expression).toBe('*/5 * * * *');
      expect(result.b.expression).toBe('@hourly');
      expect(result.a.description).toContain('5 minutes');
      expect(result.b.description).toMatch(/hour/i);
      expect(result.a.nextRuns).toHaveLength(5);
      expect(result.b.nextRuns).toHaveLength(5);
    });

    it('2) Custom count', () => {
      const result = compareCron('@daily', '@hourly', 10);
      expect(result.a.nextRuns).toHaveLength(10);
      expect(result.b.nextRuns).toHaveLength(10);
    });

    it('3) Count of 1', () => {
      const result = compareCron('@daily', '@hourly', 1);
      expect(result.a.nextRuns).toHaveLength(1);
      expect(result.b.nextRuns).toHaveLength(1);
    });

    it('4) Identical expressions produce identical results', () => {
      const result = compareCron('0 9 * * *', '0 9 * * *');
      expect(result.a.description).toBe(result.b.description);
      expect(result.a.nextRuns).toEqual(result.b.nextRuns);
    });

    it('5) Macro vs expanded equivalent produce same runs', () => {
      const result = compareCron('@daily', '0 0 * * *', 5, { timezone: 'UTC' });
      expect(result.a.nextRuns).toEqual(result.b.nextRuns);
    });
  });

  describe('B. Run Format Validation', () => {
    it('1) All runs match YYYY-MM-DD HH:mm:ss', () => {
      const result = compareCron('*/10 * * * *', '0 */2 * * *', 10);
      const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      [...result.a.nextRuns, ...result.b.nextRuns].forEach((r) => {
        expect(r).toMatch(regex);
      });
    });

    it('2) Runs are monotonically increasing per side', () => {
      const result = compareCron('*/5 * * * *', '0 9 * * MON-FRI', 10);
      for (const side of [result.a.nextRuns, result.b.nextRuns]) {
        for (let i = 0; i < side.length - 1; i++) {
          expect(side[i + 1] > side[i]).toBe(true);
        }
      }
    });
  });

  describe('C. Timezone Handling', () => {
    it('1) Timezone applies to both sides', () => {
      const utc = compareCron('@daily', '@hourly', 3, { timezone: 'UTC' });
      const ny = compareCron('@daily', '@hourly', 3, { timezone: 'America/New_York' });
      // @hourly runs show different wall-clock times across timezones
      expect(utc.b.nextRuns[0]).not.toBe(ny.b.nextRuns[0]);
    });

    it('2) Invalid timezone throws', () => {
      expect(() => compareCron('@daily', '@hourly', 3, { timezone: 'Fake/Zone' })).toThrow();
    });
  });

  describe('D. Seconds Support', () => {
    it('1) Rejects 6-field without allowSeconds', () => {
      expect(() => compareCron('*/10 * * * * *', '@daily')).toThrow(/6-field/);
    });

    it('2) Accepts 6-field with allowSeconds', () => {
      const result = compareCron('*/10 * * * * *', '*/30 * * * * *', 3, { allowSeconds: true });
      expect(result.a.nextRuns).toHaveLength(3);
      expect(result.b.nextRuns).toHaveLength(3);
    });

    it('3) Mixed 5-field and 6-field: rejects the 6-field side', () => {
      expect(() => compareCron('*/5 * * * *', '*/10 * * * * *')).toThrow();
    });
  });

  describe('E. Error Handling', () => {
    it('1) Invalid first expression throws', () => {
      expect(() => compareCron('bad', '@daily')).toThrow(/Expression A/);
    });

    it('2) Invalid second expression throws', () => {
      expect(() => compareCron('@daily', 'bad')).toThrow(/Expression B/);
    });

    it('3) Both invalid — first one reported', () => {
      expect(() => compareCron('bad1', 'bad2')).toThrow(/Expression A/);
    });

    it('4) Empty strings throw', () => {
      expect(() => compareCron('', '@daily')).toThrow();
      expect(() => compareCron('@daily', '')).toThrow();
    });

    it('5) Control characters throw', () => {
      expect(() => compareCron('* * * * *\x00', '@daily')).toThrow();
    });
  });

  describe('F. Edge Cases', () => {
    it('1) Sparse schedules (yearly)', () => {
      const result = compareCron('@yearly', '@monthly', 3, { timezone: 'UTC' });
      expect(result.a.nextRuns).toHaveLength(3);
      expect(result.b.nextRuns).toHaveLength(3);
    });

    it('2) High-frequency vs low-frequency', () => {
      const result = compareCron('* * * * *', '@yearly', 5, { timezone: 'UTC' });
      // Every-minute runs should all be within the same day
      const firstDay = result.a.nextRuns[0].substring(0, 10);
      expect(result.a.nextRuns[4].substring(0, 10)).toBe(firstDay);
      // Yearly runs should span years
      const yearA = result.b.nextRuns[0].substring(0, 4);
      const yearB = result.b.nextRuns[2].substring(0, 4);
      expect(parseInt(yearB)).toBeGreaterThan(parseInt(yearA));
    });

    it('3) Complex expressions with ranges and lists', () => {
      const result = compareCron(
        '0 9-17 * * 1-5', // business hours weekdays
        '0 22 * * 0,6', // 10pm weekends
        5,
        { timezone: 'UTC' },
      );
      expect(result.a.nextRuns).toHaveLength(5);
      expect(result.b.nextRuns).toHaveLength(5);
      expect(result.a.description.length).toBeGreaterThan(0);
      expect(result.b.description.length).toBeGreaterThan(0);
    });

    it('4) Macros on both sides', () => {
      const result = compareCron('@weekdays', '@weekends');
      expect(result.a.nextRuns).toHaveLength(5);
      expect(result.b.nextRuns).toHaveLength(5);
    });
  });
});

describe('compareCron CLI (diff subcommand)', () => {
  it('1) Basic text output format', () => {
    const res = run(['diff', '*/5 * * * *', '@hourly']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('A:');
    expect(res.stdout).toContain('B:');
    expect(res.stdout).toMatch(/Next \d+ runs/);
  });

  it('2) --json produces valid JSON', () => {
    const res = run(['diff', '@daily', '@hourly', '--json']);
    expect(res.status).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data).toHaveProperty('a');
    expect(data).toHaveProperty('b');
    expect(data.a).toHaveProperty('expression');
    expect(data.a).toHaveProperty('description');
    expect(data.a).toHaveProperty('nextRuns');
    expect(data.b).toHaveProperty('expression');
    expect(data.b).toHaveProperty('description');
    expect(data.b).toHaveProperty('nextRuns');
  });

  it('3) --next controls run count', () => {
    const res = run(['diff', '@daily', '@hourly', '--next', '3', '--json']);
    expect(res.status).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data.a.nextRuns).toHaveLength(3);
    expect(data.b.nextRuns).toHaveLength(3);
  });

  it('4) --tz flag works', () => {
    const res = run(['diff', '@daily', '@hourly', '--tz', 'UTC', '--json']);
    expect(res.status).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data.a.nextRuns.length).toBeGreaterThan(0);
  });

  it('5) --seconds flag works', () => {
    const res = run(['diff', '*/10 * * * * *', '*/30 * * * * *', '--seconds', '--json']);
    expect(res.status).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data.a.nextRuns).toHaveLength(5);
  });

  it('6) Invalid first expression exits 1', () => {
    const res = run(['diff', 'bad', '@daily']);
    expect(res.status).toBe(1);
  });

  it('7) Invalid second expression exits 1', () => {
    const res = run(['diff', '@daily', 'bad']);
    expect(res.status).toBe(1);
  });

  it('8) Missing arguments exits non-zero', () => {
    const res = run(['diff', '@daily']);
    expect(res.status).not.toBe(0);
  });

  it('9) Invalid --next exits 1', () => {
    expect(run(['diff', '@daily', '@hourly', '--next', '0']).status).toBe(1);
    expect(run(['diff', '@daily', '@hourly', '--next', 'abc']).status).toBe(1);
    expect(run(['diff', '@daily', '@hourly', '--next', '101']).status).toBe(1);
  });

  it('10) Invalid --tz exits 1', () => {
    const res = run(['diff', '@daily', '@hourly', '--tz', 'Fake/Zone']);
    expect(res.status).toBe(1);
  });

  it('11) Side-by-side columns align in text mode', () => {
    const res = run(['diff', '*/5 * * * *', '@hourly', '--next', '3']);
    expect(res.status).toBe(0);
    // Check the header row exists
    expect(res.stdout).toMatch(/A\s+B/);
    // Check separator line
    expect(res.stdout).toContain('───');
  });

  it('12) Identical expressions show matching runs', () => {
    const res = run(['diff', '0 9 * * *', '0 9 * * *', '--json', '--tz', 'UTC']);
    expect(res.status).toBe(0);
    const data = JSON.parse(res.stdout);
    expect(data.a.nextRuns).toEqual(data.b.nextRuns);
  });
});
