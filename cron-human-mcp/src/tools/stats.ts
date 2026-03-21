import { cronStats } from "cron-human";

interface StatsInput {
  readonly expr: string;
  readonly timezone?: string;
  readonly allowSeconds?: boolean;
  readonly costPerRun?: number;
}

export async function statsTool({ expr, timezone, allowSeconds, costPerRun }: StatsInput) {
  try {
    const result = cronStats(expr, { timezone, allowSeconds, costPerRun });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Stats failed: ${message}` }],
      isError: true,
    };
  }
}
