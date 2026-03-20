import cronstrue from 'cronstrue';
import { DateTime } from 'luxon';
import { CronExpressionParser } from 'cron-parser';

export interface ValidateOptions {
  timezone?: string;
  allowSeconds?: boolean;
}

const MACROS: Record<string, string> = {
  "@yearly":   "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly":  "0 0 1 * *",
  "@weekly":   "0 0 * * 0",
  "@daily":    "0 0 * * *",
  "@hourly":   "0 * * * *",
  "@minutely": "* * * * *",
  "@secondly": "* * * * * *",
  "@weekdays": "0 0 * * 1-5",
  "@weekends": "0 0 * * 0,6",
};

function normalizeForParse(expr: string): string {
  const t = expr.trim();
  if (!t.startsWith("@")) return t;
  const key = t.toLowerCase();
  return MACROS[key] ?? t;
}

function fieldCount(expr: string): number {
  return expr.trim().split(/\s+/).length;
}

function toJSDate(x: unknown): Date {
  if (x instanceof Date) return x;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (x && typeof (x as any).toDate === 'function') return (x as any).toDate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (x && typeof (x as any).toJSDate === 'function') return (x as any).toJSDate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (x && typeof (x as any).valueOf === 'function') return new Date((x as any).valueOf());
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

  // eslint-disable-next-line no-control-regex
  if (expression.match(/[\x00-\x08\x0E-\x1F\x7F]/)) {
      return 'Error: Invalid control characters in expression.';
  }

  if (expression.match(/[\n\r]/)) {
      return 'Error: Invalid cron expression (newlines not allowed).';
  }

  const normalized = normalizeForParse(expression);

  if (expression.trim().startsWith("@")) {
    const macro = expression.trim().toLowerCase();
    if (macro === '@secondly' && !options.allowSeconds) {
       return 'Error: @secondly requires --seconds flag.';
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
    const parseOpts: { tz?: string } = {};
    if (options.timezone) parseOpts.tz = options.timezone;

    CronExpressionParser.parse(normalized, parseOpts);
    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return `Invalid cron expression: ${message}`;
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

export interface CompareResult {
  a: { expression: string; description: string; nextRuns: string[] };
  b: { expression: string; description: string; nextRuns: string[] };
}

export function compareCron(
  exprA: string,
  exprB: string,
  count: number = 5,
  options: { timezone?: string; allowSeconds?: boolean } = {},
): CompareResult {
  for (const [label, expr] of [['A', exprA], ['B', exprB]] as const) {
    const err = validateCron(expr, { timezone: options.timezone, allowSeconds: options.allowSeconds });
    if (err) throw new Error(`Expression ${label}: ${err}`);
  }

  return {
    a: {
      expression: exprA,
      description: explainCron(exprA),
      nextRuns: getNextRuns(exprA, count, options.timezone),
    },
    b: {
      expression: exprB,
      description: explainCron(exprB),
      nextRuns: getNextRuns(exprB, count, options.timezone),
    },
  };
}

export interface CronStats {
  description: string;
  frequency: {
    perDay: number;
    perWeek: number;
    perMonth: number;
    perYear: number;
  };
  gaps: {
    shortest: { minutes: number; label: string };
    longest: { minutes: number; label: string };
    average: { minutes: number; label: string };
  };
  cost?: {
    monthly: number;
    yearly: number;
  };
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) {
    const secs = Math.round(totalMinutes * 60);
    return `${secs}s`;
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = Math.round(totalMinutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

export function cronStats(
  expression: string,
  options: { timezone?: string; allowSeconds?: boolean; costPerRun?: number } = {},
): CronStats {
  const err = validateCron(expression, { timezone: options.timezone, allowSeconds: options.allowSeconds });
  if (err) throw new Error(err);

  if (options.timezone) {
    const test = DateTime.now().setZone(options.timezone);
    if (!test.isValid) throw new Error(`Invalid timezone "${options.timezone}". Use IANA like "Europe/London".`);
  }

  const description = explainCron(expression);

  // Sample runs and extrapolate for high-frequency schedules
  const parseOpts: { tz?: string; currentDate?: Date } = {};
  if (options.timezone) parseOpts.tz = options.timezone;

  const now = new Date();
  parseOpts.currentDate = now;
  const interval = CronExpressionParser.parse(normalizeForParse(expression), parseOpts);

  const oneYearMs = 365.25 * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() + oneYearMs;
  const timestamps: number[] = [];
  const maxSamples = 10_000;

  let reachedCutoff = false;
  for (let i = 0; i < maxSamples; i++) {
    const obj = interval.next();
    const d = toJSDate(obj);
    if (d.getTime() > cutoff) { reachedCutoff = true; break; }
    timestamps.push(d.getTime());
  }

  const totalSampled = timestamps.length;
  if (totalSampled === 0) {
    throw new Error('No runs found within the next year for this expression.');
  }

  // Compute gaps from the sample
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i] - timestamps[i - 1]) / 60_000);
  }

  let shortest = gaps[0] ?? 0;
  let longest = gaps[0] ?? 0;
  let gapSum = 0;
  for (const g of gaps) {
    if (g < shortest) shortest = g;
    if (g > longest) longest = g;
    gapSum += g;
  }
  const avgGap = gaps.length > 0 ? gapSum / gaps.length : 0;

  // Calculate frequency: extrapolate from sample if we didn't cover the full year
  let perYear: number;
  if (reachedCutoff || totalSampled < maxSamples) {
    // We covered the full year — use actual count
    perYear = totalSampled;
  } else {
    // We hit maxSamples before the year cutoff — extrapolate from sampled span
    const sampledSpanMs = timestamps[timestamps.length - 1] - timestamps[0];
    if (sampledSpanMs > 0) {
      const runsPerMs = (totalSampled - 1) / sampledSpanMs;
      perYear = Math.round(runsPerMs * oneYearMs);
    } else {
      perYear = totalSampled;
    }
  }

  const perDay = perYear / 365.25;
  const perWeek = perDay * 7;
  const perMonth = perYear / 12;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const stats: CronStats = {
    description,
    frequency: {
      perDay: round2(perDay),
      perWeek: round2(perWeek),
      perMonth: round2(perMonth),
      perYear: round2(perYear),
    },
    gaps: {
      shortest: { minutes: round2(shortest), label: formatDuration(shortest) },
      longest: { minutes: round2(longest), label: formatDuration(longest) },
      average: { minutes: round2(avgGap), label: formatDuration(avgGap) },
    },
  };

  if (options.costPerRun !== undefined) {
    stats.cost = {
      monthly: round2(perMonth * options.costPerRun),
      yearly: round2(perYear * options.costPerRun),
    };
  }

  return stats;
}

export function getNextRuns(
  expression: string,
  count: number,
  timezone?: string,
): string[] {
  const options: { tz?: string } = {};

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to calculate next runs: ${message}`);
  }
}
