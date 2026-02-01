import React, { useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InputSectionProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	isFocused: boolean;
	label?: string;
}

export const InputSection: React.FC<InputSectionProps> = ({ value, onChange, onSubmit, isFocused, label = "Cron Expression:" }) => {
    const ctrlHeld = useRef(false);

    useInput((_input, key) => {
        ctrlHeld.current = key.ctrl;
    }, { isActive: true });

    const parts = value.trim().split(/\s+/);
    let helpText = "";
    if (parts.length > 5) helpText = "Fields: Sec Min Hour Day Month Weekday";
    else helpText = "Fields: Min Hour Day Month Weekday";

	return (
		<Box borderStyle="round" borderColor={isFocused ? "green" : "gray"} paddingX={1} flexDirection="column">
			<Text bold color={isFocused ? "green" : "white"}>{label}</Text>
			<Box>
				<TextInput
					value={value}
					onChange={(val) => {
                        setTimeout(() => {
                             if (!ctrlHeld.current) {
                                onChange(val);
                             }
                        }, 0);
                    }}
					onSubmit={onSubmit}
					focus={isFocused}
					placeholder="* * * * *"
				/>
			</Box>
            {isFocused && label.includes("Cron") && (
                <Box marginTop={0}>
                    <Text dimColor>{helpText}</Text>
                </Box>
            )}
		</Box>
	);
};
