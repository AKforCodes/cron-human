import { compareCron } from "cron-human";

interface DiffInput {
  readonly exprA: string;
  readonly exprB: string;
  readonly count?: number;
  readonly timezone?: string;
  readonly allowSeconds?: boolean;
}

export async function diffTool({ exprA, exprB, count = 5, timezone, allowSeconds }: DiffInput) {
  try {
    const result = compareCron(exprA, exprB, count, { timezone, allowSeconds });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Comparison failed: ${message}` }],
      isError: true,
    };
  }
}
