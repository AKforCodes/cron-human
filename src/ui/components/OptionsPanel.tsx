import React from 'react';
import { Box, Text } from 'ink';

interface OptionsPanelProps {
	isFocused: boolean;
	timezone: string;
	allowSeconds: boolean;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
	isFocused,
	timezone,
	allowSeconds,

}) => {
	return (
		<Box borderStyle="round" borderColor={isFocused ? "green" : "gray"} paddingX={1} flexDirection="column">
			<Text bold>Options (Press Tab to focus, then Space to toggle):</Text>
			<Box>
				<Text color={isFocused ? "cyan" : "white"}>
					[ {allowSeconds ? 'X' : ' '} ] Allow Seconds
				</Text>
				<Box marginLeft={2}>
					<Text dimColor>Timezone: {timezone || 'Local'} (Ctrl+T to set)</Text>
				</Box>
			</Box>
		</Box>
	);
};
