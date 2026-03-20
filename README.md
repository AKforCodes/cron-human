# cron-human

> Convert cron expressions into human-readable English and see when they'll run next.

[![npm version](https://img.shields.io/npm/v/cron-human.svg)](https://www.npmjs.com/package/cron-human)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dt/cron-human.svg)](https://www.npmjs.com/package/cron-human)

## Quick Start

```bash
npx cron-human "*/5 * * * *"
```

**Output:**
```
Every 5 minutes

Next 5 runs:
- 2026-01-22 02:40:00
- 2026-01-22 02:45:00
- 2026-01-22 02:50:00
- 2026-01-22 02:55:00
- 2026-01-22 03:00:00
```

## Installation

```bash
npm install -g cron-human
```

## Features

- 🗣 **Human readable** - `*/5 * * * *` → "Every 5 minutes"
- 📅 **Next run times** - Shows exact execution dates
- 🌍 **Timezone support** - `--tz America/New_York`, `Asia/Tokyo`, etc.
- 🤖 **JSON output** - Use `--json` for scripts/automation
- 🏷️ **Macros** - `@daily`, `@hourly`, `@weekly`, `@monthly`, `@yearly`
- ⏱️ **Seconds precision** - 6-field cron with `--seconds`
- 🔀 **Diff** - Compare two cron expressions side-by-side
- 📊 **Stats** - Frequency, gap analysis, and cost estimation

## Options

| Option | Alias | Description | Default |
|---|---|---|---|
| `--next <n>` | `-n` | Number of runs to show (max 100) | 5 |
| `--tz <zone>` | | IANA timezone (e.g., `UTC`, `America/New_York`) | Local |
| `--json` | | JSON output format | false |
| `--quiet` | `-q` | Description only (no run times) | false |
| `--seconds` | | Enable 6-field cron (with seconds) | false |
| `--cost <price>` | | Cost per invocation for `stats` (e.g., `0.002`) | |
| `--help` | `-h` | Show help | |
| `--version` | `-v` | Show version | |

## Subcommands

| Command | Description |
|---|---|
| `diff <exprA> <exprB>` | Compare two cron expressions side-by-side |
| `stats <expression>` | Show frequency, gap analysis, and cost estimates |
| `tui` | Launch the interactive TUI |

## Examples

**Common patterns:**
```bash
cron-human "0 9 * * MON-FRI"        # At 09:00, Monday through Friday
cron-human "0 0 1 * *"               # At 00:00, on day 1 of the month
cron-human "@daily"                  # At 00:00
```

**With timezone:**
```bash
cron-human "0 9 * * *" --tz America/New_York --next 3
```

**JSON output:**
```bash
cron-human "*/15 * * * *" --json --quiet
```

**Output:**
```json
{
  "expression": "*/15 * * * *",
  "description": "Every 15 minutes",
  "nextRuns": []
}
```

## Diff

Compare two cron expressions side-by-side to see how they differ:

```bash
cron-human diff "0 9 * * MON-FRI" "0 9 * * *"
```

**Output:**
```
A: At 09:00, Monday through Friday
   0 9 * * MON-FRI

B: At 09:00
   0 9 * * *

Next 5 runs:
A                       B
─────────────────────── ───────────────────────
2026-03-20 09:00:00     2026-03-20 09:00:00
2026-03-23 09:00:00     2026-03-21 09:00:00
2026-03-24 09:00:00     2026-03-22 09:00:00
2026-03-25 09:00:00     2026-03-23 09:00:00
2026-03-26 09:00:00     2026-03-24 09:00:00
```

Supports `--json`, `--tz`, `--next`, and `--seconds` flags.

## Stats

Get frequency, gap analysis, and optional cost estimates for any cron schedule:

```bash
cron-human stats "0 9 * * MON-FRI"
```

**Output:**
```
Schedule: At 09:00, Monday through Friday

Frequency:
  Per day ......... 0.72
  Per week ........ 5.02
  Per month ....... 21.83
  Per year ........ 261.9

Gaps:
  Shortest ........ 1d  (1440 min)
  Longest ......... 3d  (4320 min)
  Average ......... 1d 9h 36m  (2016 min)
```

**With cost estimation** (e.g., AWS Lambda at $0.002/invocation):

```bash
cron-human stats "*/5 * * * *" --cost 0.002
```

```
Cost estimate ($0.002/invocation):
  Monthly ......... $17.53
  Yearly .......... $210.39
```

Supports `--json`, `--tz`, `--seconds`, and `--cost` flags.

## Cron Format

**Standard (5 fields):**
```
* * * * *
│ │ │ │ └─ Day of week (0-6)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**With seconds (6 fields, use `--seconds`):**
```
* * * * * *
└─ Second (0-59) + above
```

**Special characters:**
- `*` = any value
- `,` = list (e.g., `1,3,5`)
- `-` = range (e.g., `1-5`)
- `/` = step (e.g., `*/10`)

## License

MIT © Akin Ibitoye

## Interactive Mode (TUI)

Launch the interactive Terminal UI with:

```bash
cron-human tui
# or
cron-human --interactive
```

![Cron Human TUI Screenshot](tui-screenshot.png)

### Key Features
- **Live Preview**: Real-time validation and English translation as you type.
- **History**: Auto-saves successful cron expressions. Navigate history with `Up/Down` and reload with `Enter`.
- **Clipboard Integration**: Paste (`Ctrl+V`) directly into the editor. Copy (`c`) saved expressions from history.
- **Toggle Options**: Quickly enable/disable seconds support (`Space`).

### Keybindings

| Key | Action |
|---|---|
| `Tab` | Cycle focus (Input → Options → History) |
| `Ctrl+V` | Paste from clipboard |
| `Ctrl+R` | Reset/Clear input |
| `Ctrl+C` / `Q` | Quit |

**History Panel:**
| Key | Action |
|---|---|
| `Up` / `Down` | Navigate history |
| `Enter` | Load selected expression |
| `c` | Copy selected expression |

**Options Panel:**
| Key | Action |
|---|---|
| `Space` | Toggle checkbox |

## Manual Test Cases

1. **Basic Minute**: `* * * * *` -> "Every minute"
2. **Specific Time**: `30 14 * * *` -> "At 14:30"
3. **Interval**: `*/5 * * * *` -> "Every 5 minutes"
4. **Range**: `0 9-17 * * 1-5` -> "At 0 minutes past the hour, between 09:00 and 17:59, Monday through Friday"
5. **Macro**: `@daily` -> "At 00:00"
6. **With Seconds**: `*/30 * * * * *` (Enable "Allow Seconds") -> "Every 30 seconds"
7. **Invalid**: `* * * 99 *` -> "Error: Invalid cron expression..."
8. **Timezone**: Set TZ to `UTC` -> Verify next runs match UTC.
9. **History**: Enter a valid cron -> Press Up -> should see it.
10. **Help**: Press `Tab` until Focus is History, then `Tab` again -> Focus Input.
11. **Clipboard**: Press `Ctrl+V` to paste a cron string. Select history item and press `c` to copy.
