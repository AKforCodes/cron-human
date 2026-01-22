import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';

import fs from 'fs';

const cliPath = path.resolve('dist/cli.js');
const nodeExe = process.execPath;

if (!fs.existsSync(cliPath)) {
    throw new Error('dist/cli.js not found. Please run "npm run build" before running tests.');
}

const run = (args: string[]) => {
    const { stdout, stderr, status } = spawnSync(nodeExe, [cliPath, ...args], { encoding: 'utf-8' });
    return {
        stdout: stdout || '',
        stderr: stderr || '',
        status: status ?? 1
    };
};

describe('CLI Integration (Hardening)', () => {

    it('1) Help/version behaviour', () => {
        const help = run(['--help']);
        expect(help.status).toBe(0);
        expect(help.stdout).toContain('Usage: cron-human');

        const ver = run(['--version']);
        expect(ver.status).toBe(0);
        expect(ver.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('2) Default mode prints explanation + Next runs header + bullets', () => {
        const res = run(['*/5 * * * *']);
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Every 5 minutes');
        expect(res.stdout).toContain('Next 5 runs');

        const matches = res.stdout.match(/^- \d{4}/gm);
        expect(matches?.length).toBe(5);
    });

    it('3) Quiet mode prints ONLY the explanation', () => {
        const res = run(['*/5 * * * *', '--quiet']);
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Every 5 minutes');
        expect(res.stdout).not.toContain('Next 5 runs');

        const lines = res.stdout.trim().split('\n');
        expect(lines.length).toBe(1);
    });

    it('4) JSON mode outputs valid JSON', () => {
        const res = run(['*/5 * * * *', '--json']);
        const data = JSON.parse(res.stdout);

        expect(data).toHaveProperty('expression', '*/5 * * * *');
        expect(data).toHaveProperty('description');
        expect(data).toHaveProperty('nextRuns');
        expect(data.nextRuns).toHaveLength(5);

        const quietRes = run(['*/5 * * * *', '--json', '--quiet']);
        const qData = JSON.parse(quietRes.stdout);
        if (qData.nextRuns) {
             expect(qData.nextRuns).toHaveLength(0);
        }
    });

    it('5) Invalid cron exits 1 and uses stderr', () => {
        const res = run(['61 * * * *']);
        expect(res.status).toBe(1);
        expect(res.stderr).toMatch(/Error:|Invalid/);
        expect(res.stdout).not.toContain('Next');
    });

    it('6) --next validation', () => {
        expect(run(['* * * * *', '--next', '0']).status).toBe(1);
        expect(run(['* * * * *', '--next', '-1']).status).toBe(1);
        expect(run(['* * * * *', '--next', 'abc']).status).toBe(1);
        expect(run(['* * * * *', '--next', '101']).status).toBe(1);

        const valid = run(['* * * * *', '--next', '1']);
        expect(valid.status).toBe(0);
        expect(valid.stdout.match(/^- \d{4}/gm)?.length).toBe(1);
    }, 20000);

    it('7) Seconds enforcement', () => {
        const reject = run(['* * * * * *']);
        expect(reject.status).toBe(1);
        expect(reject.stderr).toContain('6-field cron detected');

        const accept = run(['* * * * * *', '--seconds']);
        expect(accept.status).toBe(0);
    });

    it('8) Timezone CLI validation', () => {
        const fail = run(['* * * * *', '--tz', 'Not/AZone']);
        expect(fail.status).toBe(1);
        expect(fail.stderr).toMatch(/invalid timezone/i);

        const success = run(['* * * * *', '--tz', 'UTC']);
        expect(success.status).toBe(0);
    });

    it('9) Whitespace and quoting', () => {
        const res = run([' */10 * * * * ']);
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Every 10 minutes');
    });

    it('10) Macro CLI usage', () => {
        const res = run(['@daily', '--next', '2', '--tz', 'UTC']);
        expect(res.status).toBe(0);
        expect(res.stdout).toMatch(/00:00/);
        expect(res.stdout.match(/^- \d{4}/gm)?.length).toBe(2);
    });

});
