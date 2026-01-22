# cron-human

> A command-line tool that converts cron expressions into human-readable English and calculates the next scheduled run times.

[![npm version](https://img.shields.io/npm/v/cron-human.svg)](https://www.npmjs.com/package/cron-human)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

If you've ever looked at a cron expression like `0 12 * * MON-FRI` and wondered "when does this actually run?", this tool is for you. It translates cryptic cron syntax into plain English and shows you exactly when the job will execute next.

Perfect for:
- 🔍 **Debugging cron jobs** - Verify your cron expressions do what you expect
- � **Understanding existing schedules** - Decode cron expressions in config files
- ✅ **Validating syntax** - Catch errors before deploying to production
- 🌐 **Timezone conversions** - See execution times in different timezones

## Features

- �🗣 **Human readable** - Converts `*/5 * * * *` to "Every 5 minutes"
- 📅 **Next run times** - Calculates exact dates for upcoming executions
- 🌍 **Timezone aware** - Supports IANA timezone identifiers (e.g., `America/New_York`, `Asia/Tokyo`)
- 🤖 **JSON output** - Machine-readable format for scripting and automation
- ✅ **Strict validation** - Catches invalid expressions and provides clear error messages
- ⏱️ **Seconds support** - Handle 6-field cron expressions with `--seconds` flag
- 🏷️ **Macro shortcuts** - Supports `@daily`, `@hourly`, `@weekly`, etc.

## Installation

### One-time use with npx

No installation needed - run directly with npx:

```bash
npx cron-human "*/5 * * * *"
```

### Global installation

Install once, use anywhere:

```bash
npm install -g cron-human
```

Then use it directly:

```bash
cron-human "0 12 * * MON-FRI"
```

## Usage

### Basic Usage

```bash
cron-human "<cron-expression>"
```

**Example:**
```bash
$ cron-human "30 4 * * *"
At 04:30

Next 5 runs:
- 2026-01-22 04:30:00
- 2026-01-23 04:30:00
- 2026-01-24 04:30:00
- 2026-01-25 04:30:00
- 2026-01-26 04:30:00
```

### Options

| Option | Alias | Description | Default |
|---|---|---|---|
| `--next <number>` | `-n` | Number of upcoming run times to show (max 100) | 5 |
| `--tz <timezone>` | | IANA timezone for output dates (e.g., `America/New_York`) | System local time |
| `--json` | | Output in JSON format for scripting | false |
| `--quiet` | `-q` | Print only the human description (no next runs) | false |
| `--seconds` | | Enable 6-field cron format (includes seconds) | false |
| `--help` | `-h` | Show help message | |
| `--version` | `-v` | Show installed version | |

## Examples

### Common Cron Patterns

**Every 5 minutes:**
```bash
$ cron-human "*/5 * * * *"
Every 5 minutes
```

**Daily at midnight:**
```bash
$ cron-human "0 0 * * *"
At 00:00
```

**Weekdays only at 9 AM:**
```bash
$ cron-human "0 9 * * MON-FRI"
At 09:00, Monday through Friday
```

**First day of every month:**
```bash
$ cron-human "0 0 1 * *"
At 00:00, on day 1 of the month
```

### Using Macros

Cron macros are shortcuts for common schedules:

```bash
$ cron-human "@daily"
At 00:00

$ cron-human "@hourly"
Every hour

$ cron-human "@weekly"
At 00:00, only on Sunday
```

**Supported macros:**
- `@yearly` or `@annually` - Run once a year: `0 0 1 1 *`
- `@monthly` - Run once a month: `0 0 1 * *`
- `@weekly` - Run once a week: `0 0 * * 0`
- `@daily` - Run once a day: `0 0 * * *`
- `@hourly` - Run once an hour: `0 * * * *`

### Timezone Examples

**New York time:**
```bash
$ cron-human "0 9 * * *" --tz America/New_York
At 09:00

Next 5 runs:
- 2026-01-22 09:00:00
- 2026-01-23 09:00:00
- ...
```

**Tokyo time:**
```bash
$ cron-human "30 14 * * *" --tz Asia/Tokyo --next 3
At 14:30

Next 3 runs:
- 2026-01-22 14:30:00
- 2026-01-23 14:30:00
- 2026-01-24 14:30:00
```

### JSON Output for Scripting

Perfect for parsing in scripts or CI/CD pipelines:

```bash
$ cron-human "*/15 * * * *" --json --next 2
{
  "expression": "*/15 * * * *",
  "description": "Every 15 minutes",
  "nextRuns": [
    "2026-01-22 12:15:00",
    "2026-01-22 12:30:00"
  ]
}
```

### Quiet Mode

Get just the description without the run times:

```bash
$ cron-human "0 */6 * * *" --quiet
Every 6 hours
```

### Seconds-Precision Cron

Some systems (like certain schedulers) support 6-field cron with seconds:

```bash
$ cron-human "*/30 * * * * *" --seconds
Every 30 seconds
```

## Supported Cron Format

### Standard 5-field format:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, SUN-SAT)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### 6-field format (with `--seconds`):
```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─── Day of week (0-6)
│ │ │ │ └───── Month (1-12)
│ │ │ └─────── Day of month (1-31)
│ │ └───────── Hour (0-23)
│ └─────────── Minute (0-59)
└───────────── Second (0-59)
```

### Special characters:
- `*` - Any value
- `,` - List (e.g., `1,3,5`)
- `-` - Range (e.g., `1-5`)
- `/` - Step (e.g., `*/10` = every 10)

## Troubleshooting

### Invalid cron expression error

Make sure your expression has the correct number of fields:
- **5 fields** for standard cron (default)
- **6 fields** with `--seconds` flag

### Timezone not recognized

Use valid IANA timezone identifiers. Common examples:
- `UTC`
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`

Find your timezone: [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### Expression accepted but results look wrong

Use `--tz UTC` to see results in UTC and verify the pattern:

```bash
cron-human "0 12 * * *" --tz UTC --next 7
```

## Development

Want to contribute or run locally?

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/cron-human.git
   cd cron-human
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Build:**
   ```bash
   npm run build
   ```

5. **Run locally:**
   ```bash
   npm run dev "*/5 * * * *"
   ```

## License

MIT © Akin Ibitoye
