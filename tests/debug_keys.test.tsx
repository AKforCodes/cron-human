import React, { useState } from 'react';
import { render } from 'ink-testing-library';
import { Box, Text, useInput, type Key } from 'ink';
import { describe, it } from 'vitest';

const DebugInput = () => {
    const [lastInput, setLastInput] = useState<{input: string, key: Key} | null>(null);

    useInput((input, key) => {
        setLastInput({ input, key });
    });

    return (
        <Box flexDirection="column">
            <Text>Debug Input</Text>
            {lastInput && (
                <Text>
                    Input: "{JSON.stringify(lastInput.input)}"
                    Key: {JSON.stringify(lastInput.key)}
                </Text>
            )}
        </Box>
    );
};

describe('Debug Keys', () => {
    it('logs keys', async () => {
        const { lastFrame, stdin } = render(<DebugInput />);

        console.log('--- TAB ---');
        stdin.write('\t');
        await new Promise(r => setTimeout(r, 10)); // tiny delay
        console.log(lastFrame());

        console.log('--- RETURN ---');
        stdin.write('\r');
        await new Promise(r => setTimeout(r, 10));
        console.log(lastFrame());

        console.log('--- ARROW UP ---');
        stdin.write('\u001B[A');
        await new Promise(r => setTimeout(r, 10));
        console.log(lastFrame());

        console.log('--- ARROW DOWN ---');
        stdin.write('\u001B[B');
        await new Promise(r => setTimeout(r, 10));
        console.log(lastFrame());
    });
});
