import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { InputSection } from './components/InputSection.js';
import { PreviewSection } from './components/PreviewSection.js';
import { OptionsPanel } from './components/OptionsPanel.js';
import { HistoryPanel } from './components/HistoryPanel.js';
import clipboardy from 'clipboardy';

enum FocusArea {
	Input,
	Options,
	History
}

interface HistoryItem {
	expression: string;
	timestamp: Date;
}

export const App: React.FC = () => {
	const { exit } = useApp();
	const [expression, setExpression] = useState('');
	const [timezone, setTimezone] = useState<string | undefined>(undefined);
	const [allowSeconds, setAllowSeconds] = useState(false);
	const [focus, setFocus] = useState<FocusArea>(FocusArea.Input);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [historyIndex, setHistoryIndex] = useState(0);
	const [notification, setNotification] = useState<string | null>(null);

	useEffect(() => {
		if (notification) {
			const timer = setTimeout(() => setNotification(null), 2000);
			return () => clearTimeout(timer);
		}
	}, [notification]);

	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			exit();
			return;
		}

		if (input === 'q' && !key.ctrl && focus !== FocusArea.Input) {
			exit();
			return;
		}

		if (key.tab) {
			setFocus((prev) => {
				if (prev === FocusArea.Input) return FocusArea.Options;
				if (prev === FocusArea.Options) return FocusArea.History;
				return FocusArea.Input;
			});
		}

		if (key.ctrl && input === 'r') {
			setExpression('');
			setFocus(FocusArea.Input);
		}



		if (key.ctrl && input === 'v') {
			if (focus === FocusArea.Input) {
                clipboardy.read().then(text => {
                    if (text) {
                        setExpression(text.trim());
                        setNotification('Pasted from clipboard!');
                    }
                }).catch(err => {
                    setNotification(`Paste failed: ${err.message}`);
                });
			}
		}

		if (focus === FocusArea.Options) {
			if (input === ' ') {
				setAllowSeconds(prev => !prev);
			}

		}

		if (focus === FocusArea.History) {
			if (key.upArrow) {
				setHistoryIndex(prev => Math.max(0, prev - 1));
			}
			if (key.downArrow) {
				setHistoryIndex(prev => Math.min(history.length - 1, prev + 1));
			}
			if (key.return) {
				if (history[historyIndex]) {
					setExpression(history[historyIndex].expression);
					setFocus(FocusArea.Input);
				}
			}
			if (input === 'c') {
				if (history[historyIndex]) {
                    clipboardy.write(history[historyIndex].expression).then(() => {
                        setNotification('Copied to clipboard!');
                    }).catch((err: any) => {
                        setNotification(`Copy failed: ${err.message}`);
                    });
				}
			}
		}
	});

	const handleInputSubmit = (val: string) => {
		if (val.trim()) {
			const last = history[0];
			if (!last || last.expression !== val) {
				setHistory(prev => [{ expression: val, timestamp: new Date() }, ...prev].slice(0, 50));
			}
		}
	};

	return (
		<Box flexDirection="column" padding={1} width="100%" height="100%">
            <Box marginBottom={1} justifyContent="space-between">
				<Box>
                	<Text bold color="magenta">Cron Human TUI</Text>
                	<Text> | </Text>
                	<Text dimColor>Ctrl+C to Quit</Text>
				</Box>
				{notification && <Text color="yellow" bold>{notification}</Text>}
            </Box>

			<InputSection
				value={expression}
				onChange={setExpression}
				onSubmit={handleInputSubmit}
				isFocused={focus === FocusArea.Input}
			/>

			<Box marginY={1}>
				<OptionsPanel
					isFocused={focus === FocusArea.Options}
					timezone={timezone || "Local"}
					allowSeconds={allowSeconds}
				/>
			</Box>

			<PreviewSection
				expression={expression}
				timezone={timezone}
				allowSeconds={allowSeconds}
			/>

			<Box marginTop={1}>
				<HistoryPanel
					isFocused={focus === FocusArea.History}
					items={history.slice(0, 5)}
					selectedIndex={historyIndex}
				/>
                {history.length > 5 && <Text dimColor>... {history.length - 5} more</Text>}
			</Box>
		</Box>
	);
};
