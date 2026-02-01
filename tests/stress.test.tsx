import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/ui/app.js';
import { describe, it, expect, vi } from 'vitest';

const waitFor = async (assertion: () => void, timeout = 3000) => {
    const start = Date.now();
    while (true) {
        try {
            assertion();
            return;
        } catch (e) {
            if (Date.now() - start > timeout) {
                throw e;
            }
            await new Promise(r => setTimeout(r, 20));
        }
    }
};

describe('TUI Stress Tests', () => {
    it('handles rapid mode toggling without stuck state', async () => {
        const { lastFrame, stdin } = render(<App />);

        for (let i = 0; i < 5; i++) {
            stdin.write('\x14');
            await new Promise(r => setTimeout(r, 50));
            stdin.write('\x1B');
            await new Promise(r => setTimeout(r, 50));
            stdin.write('\x10');
            await new Promise(r => setTimeout(r, 50));
            stdin.write('\x10');
            await new Promise(r => setTimeout(r, 50));
        }

        await waitFor(() => {
            const frame = lastFrame();
            expect(frame).toContain('Cron Expression:');
            expect(frame).not.toContain('Enter Timezone');
            expect(frame).not.toContain('Select a Preset');
        });
    });

    it('handles large history correctly', async () => {
        const { lastFrame, stdin } = render(<App />);

        for (let i = 0; i < 55; i++) {
            stdin.write('\x12');
            await new Promise(r => setTimeout(r, 20));
            // Use Minute field (0-59) to ensure valid cron and unique history items
            stdin.write(`${i} * * * *`);
            stdin.write('\r');
            await new Promise(r => setTimeout(r, 20));
        }

        stdin.write('\t');
        stdin.write('\t');

        await waitFor(() => {
            const frame = lastFrame();
            // Expect the oldest item "0 * * * *" to be evicted.
            expect(frame).not.toContain('0 * * * *');
        });
    }, 15000);

    it('survives massive input paste', async () => {
        const { lastFrame, stdin } = render(<App />);

        const massiveString = 'A'.repeat(5000);
        stdin.write(massiveString);

        await waitFor(() => {
            const frame = lastFrame();
            expect(frame).toContain('Cron Human TUI');
        });
    });

    it('prevents mode nesting (e.g. opening Presets while in Timezone)', async () => {
        const { lastFrame, stdin } = render(<App />);

        stdin.write('\x14');

        await waitFor(() => {
             const frame = lastFrame();
             expect(frame).toContain('Enter Timezone');
        });

        stdin.write('\x10');

        await waitFor(() => {
            const frame = lastFrame();

            expect(frame).not.toContain('Select a Preset');
            expect(frame).toContain('Enter Timezone');
        });
    });
});
