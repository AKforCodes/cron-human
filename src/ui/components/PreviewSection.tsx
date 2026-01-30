import React from 'react';
import { Box, Text } from 'ink';
import { validateCron, explainCron, getNextRuns } from '../../lib.js';

interface PreviewSectionProps {
	expression: string;
	timezone?: string;
	allowSeconds?: boolean;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({ expression, timezone, allowSeconds }) => {
	const validationError = validateCron(expression, { timezone, allowSeconds });

	let content;
	let nextRuns: string[] = [];
	let isError = false;

	if (validationError) {
		content = validationError;
		isError = true;
	} else {
		try {
			content = explainCron(expression);
			nextRuns = getNextRuns(expression, 3, timezone);
		} catch (e: any) {
			content = e.message;
			isError = true;
		}
	}

	return (
		<Box flexDirection="column" borderStyle="round" borderColor={isError ? "red" : "blue"} paddingX={1} flexGrow={1}>
			<Text bold color="white">Human Readable:</Text>
			<Text color={isError ? "red" : "green"}>{content}</Text>

			{!isError && nextRuns.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text dimColor>Next runs:</Text>
					{nextRuns.map((run, i) => (
						<Text key={i} dimColor>  - {run}</Text>
					))}
				</Box>
			)}
		</Box>
	);
};
