import cronstrue from 'cronstrue';
import { DateTime } from 'luxon';
import { CronExpressionParser } from 'cron-parser';

export interface ValidateOptions {
  timezone?: string;
  allowSeconds?: boolean;
}

const MACROS: Record<string, string> = {
  "@yearly":   "0 0 0 1 1 *",
  "@annually": "0 0 0 1 1 *",
  "@monthly":  "0 0 0 1 * *",
  "@weekly":   "0 0 0 * * 0",
  "@daily":    "0 0 0 * * *",
  "@hourly":   "0 0 * * * *",
  "@minutely": "0 * * * * *",
  "@secondly": "* * * * * *",
  "@weekdays": "0 0 0 * * 1-5",
  "@weekends": "0 0 0 * * 0,6",
};

function normalizeForParse(expr: string): string {
  const t = expr.trim();
  if (!t.startsWith("@")) return t;
  const key = t.toLowerCase();
  // for parsing, use expanded cron if known, otherwise keep original (will error)
  return MACROS[key] ?? t;
}

function fieldCount(expr: string): number {
  return expr.trim().split(/\s+/).length;
}

function toJSDate(x: any): Date {
  if (x instanceof Date) return x;
  if (x && typeof x.toDate === 'function') return x.toDate();
  if (x && typeof x.toJSDate === 'function') return x.toJSDate();
  if (x && typeof x.valueOf === 'function') return new Date(x.valueOf());
  const d = new Date(String(x));
  if (isNaN(d.getTime())) {
      throw new Error('cron-parser returned an invalid date iterator result.');
  }
  return d;
}

export function validateCron(expression: string, options: ValidateOptions = {}): string | null {
  if (expression.length > 1000) {
      return 'Error: Cron expression too long (max 1000 chars).';
  }

  if (expression.match(/[\x00-\x08\x0E-\x1F\x7F]/)) {
      return 'Error: Invalid control characters in expression.';
  }

  if (expression.match(/[\n\r]/)) {
      return 'Error: Invalid cron expression (newlines not allowed).';
  }

  const normalized = normalizeForParse(expression);

  if (expression.trim().startsWith("@")) {
      try {
        const parseOpts: any = {};
        if (options.timezone) parseOpts.tz = options.timezone;
        CronExpressionParser.parse(normalized, parseOpts);
        return null;
      } catch (err: any) {
        return `Invalid cron expression: ${err.message}`;
      }
  }

  const fields = fieldCount(normalized);

  if (!options.allowSeconds && fields === 6) {
    return 'Error: 6-field cron detected. Use --seconds for seconds support.';
  }

  if (fields < 5 || fields > 6) {
    return 'Error: cron must have 5 fields (or 6 with --seconds).';
  }

  try {
    const parseOpts: any = {};
    if (options.timezone) parseOpts.tz = options.timezone;

    CronExpressionParser.parse(normalized, parseOpts);
    return null;
  } catch (err: any) {
    return `Invalid cron expression: ${err.message}`;
  }
}

export function explainCron(expression: string): string {
  const normalized = normalizeForParse(expression);

  return cronstrue.toString(normalized, {
    use24HourTimeFormat: true,
    throwExceptionOnParseError: true,
    verbose: false,
  });
}

export function getNextRuns(
  expression: string,
  count: number,
  timezone?: string,
): string[] {
  const options: any = {};

  if (!Number.isFinite(count) || count < 0 || count > 1000) {
      throw new Error("Invalid count: must be between 0 and 1000.");
  }

  if (timezone) {
    const test = DateTime.now().setZone(timezone);
    if (!test.isValid) throw new Error(`Invalid timezone "${timezone}". Use IANA like "Europe/London".`);
    options.tz = timezone;
  }

  try {
    const interval = CronExpressionParser.parse(normalizeForParse(expression), options);
    const dates: string[] = [];

    for (let i = 0; i < count; i++) {
        const obj = interval.next();
        const jsDate = toJSDate(obj);

        const dt = timezone
        ? DateTime.fromJSDate(jsDate).setZone(timezone)
        : DateTime.fromJSDate(jsDate);

        dates.push(dt.toFormat('yyyy-MM-dd HH:mm:ss'));
    }
    return dates;
  } catch (err: any) {
    throw new Error(`Failed to calculate next runs: ${err.message}`);
  }
}
