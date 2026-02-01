import React from 'react';
import { Box, Text } from 'ink';

interface HistoryItem {
	expression: string;
	timestamp: Date;
}

interface HistoryPanelProps {
	isFocused: boolean;
	items: HistoryItem[];
	selectedIndex: number;
	startIndex: number;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isFocused, items, selectedIndex, startIndex }) => {
	if (items.length === 0) {
		return (
			<Box borderStyle="round" borderColor={isFocused ? "green" : "gray"} paddingX={1} flexDirection="column">
				<Text bold>History:</Text>
				<Text dimColor>No history yet. Press Enter to save successful runs.</Text>
			</Box>
		);
	}


	return (
		<Box borderStyle="round" borderColor={isFocused ? "green" : "gray"} paddingX={1} flexDirection="column">
			<Text bold>History (Up/Down to navigate, Enter to load, 'c' to copy):</Text>
			{items.map((item, index) => {
				const globalIndex = startIndex + index;
				const isSelected = globalIndex === selectedIndex;
				return (
				<Box key={index}>
					<Text color={isSelected ? "cyan" : "white"}>
						{isSelected ? "> " : "  "}
						{item.expression}
					</Text>
				</Box>
				);
			})}
		</Box>
	);
};
