import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputSectionProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	isFocused: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ value, onChange, onSubmit, isFocused }) => {
	return (
		<Box borderStyle="round" borderColor={isFocused ? "green" : "gray"} paddingX={1} flexDirection="column">
			<Text bold color={isFocused ? "green" : "white"}>Cron Expression:</Text>
			<Box>
				<TextInput
					value={value}
					onChange={onChange}
					onSubmit={onSubmit}
					focus={isFocused}
					placeholder="* * * * *"
				/>
			</Box>
		</Box>
	);
};
