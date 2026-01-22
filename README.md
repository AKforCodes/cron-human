# cron-human

> A CLI that converts cron expressions to human-readable English and prints the next upcoming run times.

[![npm version](https://img.shields.io/npm/v/cron-human.svg)](https://www.npmjs.com/package/cron-human)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🗣 **Human readable**: Converts `*/5 * * * *` to "Every 5 minutes".
- 📅 **Next runs**: Calculates exact dates for upcoming executions.
- 🌍 **Timezone aware**: Supports output in specific timezones (e.g., `--tz Asia/Tokyo`).
- 🤖 **JSON support**: Machine-readable output with `--json`.
- ✅ **Validation**: Validates cron expressions strictly.

## Usage

You can run it directly with `npx`:

```bash
npx cron-human "*/5 * * * *"
```

Or install globally:

```bash
npm install -g cron-human
cron-human "0 12 * * MON-FRI"
```

### Options

| Option | Alias | Description | Default |
|---|---|---|---|
| `--next <number>` | `-n` | Number of upcoming run times to show | 5 |
| `--tz <iana>` | | Timezone for output dates | System Local |
| `--json` | | Output JSON format | false |
| `--quiet` | `-q` | Print only the description (no next runs) | false |
| `--seconds` | | Enable support for 6-field cron (with seconds) | false |
| `--help` | `-h` | Show help | |
| `--version` | `-v` | Show version | |

### Examples

**Standard Usage:**
```bash
$ cron-human "30 4 * * *"
At 04:30 AM

Next 5 runs:
- 2026-01-22 04:30:00
- 2026-01-23 04:30:00
- ...
```

**With Timezone:**
```bash
$ cron-human "0 0 * * *" --tz Asia/Tokyo
At 00:00 AM

Next 5 runs:
- 2026-01-22 00:00:00 (in Tokyo time)
- ...
```

**JSON Output:**
```bash
$ cron-human "*/10 * * * *" --json
{
  "expression": "*/10 * * * *",
  "description": "Every 10 minutes",
  "nextRuns": [
    "2026-01-22 12:10:00",
    "2026-01-22 12:20:00",
    ...
  ]
}
```

## Development

1. Clone repo
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`
5. Run locally: `npx tsx src/index.ts "..."`

## License

MIT © Akin Ibitoye
