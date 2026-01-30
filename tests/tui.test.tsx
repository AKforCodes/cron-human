import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/ui/app.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue('*/5 * * * *'),
}));


vi.mock('clipboardy', () => ({
  default: {
    write: mocks.write,
    read: mocks.read,
  }
}));

const waitFor = async (assertion: () => void, timeout = 2000) => {
    const start = Date.now();
    while (true) {
        try {
            assertion();
            return;
        } catch (e) {
            if (Date.now() - start > timeout) {
                throw e;
            }
            await new Promise(r => setTimeout(r, 50));
        }
    }
};

describe('TUI App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

  it('renders initial state correctly', () => {
    const { lastFrame } = render(<App />);
    const frame = lastFrame();

    expect(frame).toContain('Cron Human TUI');
    expect(frame).toContain('Cron Expression:');
    expect(frame).toContain('History');
  });

  it('validates and explains a simple cron', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('* * * * *');

    await waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Every minute');
        expect(frame).toContain('Next runs:');
    });
  });

  it('shows error for invalid cron', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('invalid cron string');

    await waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Error: cron must have 5 fields');
    });
  });

  it('handles options toggling', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('\t');

    await new Promise(r => setTimeout(r, 200));
    stdin.write(' ');

    await waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('[ X ] Allow Seconds');
    });
  });

  it('adds successful runs to history and navigates them', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('0 0 * * *');
    await new Promise(r => setTimeout(r, 20));
    stdin.write('\r');


    await new Promise(r => setTimeout(r, 20));
    stdin.write('*/5 * * * *');
    await new Promise(r => setTimeout(r, 20));
    stdin.write('\r');

    stdin.write('\t');
    await new Promise(r => setTimeout(r, 20));
    stdin.write('\t');

    await waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('0 0 * * *');
        expect(frame).toContain('*/5 * * * *');
    });

    stdin.write('\u001B[B');

    await waitFor(() => {
        const frame3 = lastFrame();
        if (frame3) {
            expect(frame3).toContain('> 0 0 * * *');
        }
    });
  });

  it('copies to clipboard', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('* * * * *');
    await new Promise(r => setTimeout(r, 200));
    stdin.write('\r');


    await new Promise(r => setTimeout(r, 200));
    stdin.write('\t');
    await new Promise(r => setTimeout(r, 200));
    stdin.write('\t');

    await waitFor(() => {
        const frame = lastFrame();
        if (frame) {
            expect(frame).toContain('* * * * *');
        }
    });


    await new Promise(r => setTimeout(r, 200));
    stdin.write('c');

    await waitFor(() => {
        expect(mocks.write).toHaveBeenCalledWith('* * * * *');
    });
  });
});
