import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

export function startTui() {
    const { waitUntilExit } = render(React.createElement(App));
    return waitUntilExit();
}
