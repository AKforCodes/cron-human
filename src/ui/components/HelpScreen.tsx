import React from 'react';
import { Box, Text } from 'ink';

export const HelpScreen: React.FC = () => {
	return (
		<Box flexDirection="column" borderStyle="round" borderColor="white" padding={1}>
			<Text bold underline>Help & Keybindings</Text>
			<Box marginTop={1}>
				<Text bold>Tab</Text><Text>: Cycle focus (Input -{'>'} Options -{'>'} History)</Text>
			</Box>
			<Box>
				<Text bold>Enter</Text><Text>: Run conversion / Save to history</Text>
			</Box>
			<Box>
				<Text bold>Up/Down</Text><Text>: Navigate history</Text>
			</Box>
			<Box>
				<Text bold>c</Text><Text>: Copy selected history item</Text>
			</Box>
			<Box>
				<Text bold>Ctrl+V</Text><Text>: Paste from clipboard</Text>
			</Box>
			<Box>
				<Text bold>Ctrl+R</Text><Text>: Reset input</Text>
			</Box>
			<Box>
				<Text bold>Ctrl+C / Q</Text><Text>: Quit</Text>
			</Box>

			<Box marginTop={1}>
				<Text bold underline>Examples:</Text>
			</Box>
			<Box>
				<Text>* * * * *       (Every minute)</Text>
			</Box>
			<Box>
				<Text>0 12 * * 1-5    (At 12:00 on weekdays)</Text>
			</Box>
			<Box>
				<Text>@daily          (Run once a day at midnight)</Text>
			</Box>
		</Box>
	);
};
