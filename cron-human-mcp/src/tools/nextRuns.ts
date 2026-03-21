import { getNextRuns, validateCron } from "cron-human";

interface NextRunsInput {
  readonly expr: string;
  readonly count?: number;
  readonly timezone?: string;
}

export async function nextRunsTool({ expr, count = 5, timezone }: NextRunsInput) {
  const error = validateCron(expr, { timezone });
  if (error) {
    return {
      content: [{ type: "text" as const, text: error }],
      isError: true,
    };
  }

  try {
    const runs = getNextRuns(expr, count, timezone);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(runs, null, 2) }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Failed to get next runs: ${message}` }],
      isError: true,
    };
  }
}
