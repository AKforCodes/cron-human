import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface Preset {
	label: string;
	value: string;
}

interface PresetsModalProps {
	onSelect: (value: string) => void;
	onCancel: () => void;
}

const presets: Preset[] = [
	{ label: 'Every Minute (* * * * *)', value: '* * * * *' },
	{ label: 'Every Hour (0 * * * *)', value: '0 * * * *' },
	{ label: 'Every Day (0 0 * * *)', value: '0 0 * * *' },
	{ label: 'Every Weekday (0 0 * * 1-5)', value: '0 0 * * 1-5' },
    { label: 'Every Weekend (0 0 * * 0,6)', value: '0 0 * * 0,6' },
	{ label: 'First of Month (0 0 1 * *)', value: '0 0 1 * *' },
    { label: 'Start of Year (0 0 1 1 *)', value: '0 0 1 1 *' },
];

export const PresetsModal: React.FC<PresetsModalProps> = ({ onSelect, onCancel }) => {
	return (
		<Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1} width={50}>
			<Text bold>Select a Preset (Esc to cancel):</Text>
            <Box marginY={1}>
			    <SelectInput
				    items={presets}
				    onSelect={(item) => onSelect(item.value)}
                    isFocused={true}
			    />
            </Box>
            <Text dimColor>Use Arrow keys to select, Enter to apply</Text>
		</Box>
	);
};
