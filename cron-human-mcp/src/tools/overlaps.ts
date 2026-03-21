import { getNextRuns, explainCron, validateCron } from "cron-human";

interface OverlapsInput {
  readonly expressions: string[];
  readonly windowMinutes?: number;
  readonly hours?: number;
  readonly timezone?: string;
}

interface Collision {
  readonly timeA: string;
  readonly timeB: string;
  readonly exprA: string;
  readonly exprB: string;
  readonly gapSeconds: number;
}

export async function overlapsTool({ expressions, windowMinutes = 5, hours = 24, timezone }: OverlapsInput) {
  if (expressions.length < 2) {
    return {
      content: [{ type: "text" as const, text: "Need at least 2 cron expressions to check for overlaps." }],
      isError: true,
    };
  }

  if (expressions.length > 10) {
    return {
      content: [{ type: "text" as const, text: "Maximum 10 expressions at once." }],
      isError: true,
    };
  }

  for (const expr of expressions) {
    const error = validateCron(expr, { timezone });
    if (error) {
      return {
        content: [{ type: "text" as const, text: `Invalid expression "${expr}": ${error}` }],
        isError: true,
      };
    }
  }

  // Get runs for each expression within the time window
  // Estimate count based on hours — generous upper bound
  const count = Math.min(200, hours * 12);
  const cutoff = Date.now() + hours * 60 * 60 * 1000;

  const schedules = expressions.map((expr) => {
    const runs = getNextRuns(expr, count, timezone);
    const timestamps = runs
      .map((r) => new Date(r.replace(" ", "T")).getTime())
      .filter((t) => t <= cutoff);
    return { expr, description: explainCron(expr), timestamps };
  });

  // Find collisions between all pairs
  const windowMs = windowMinutes * 60 * 1000;
  const collisions: Collision[] = [];

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];

      for (const tA of a.timestamps) {
        for (const tB of b.timestamps) {
          const gap = Math.abs(tA - tB);
          if (gap <= windowMs) {
            collisions.push({
              timeA: new Date(tA).toISOString(),
              timeB: new Date(tB).toISOString(),
              exprA: a.expr,
              exprB: b.expr,
              gapSeconds: Math.round(gap / 1000),
            });
          }
        }
      }
    }
  }

  // Sort by time
  const sorted = [...collisions].sort(
    (a, b) => new Date(a.timeA).getTime() - new Date(b.timeA).getTime(),
  );

  const result = {
    schedules: schedules.map(({ expr, description }) => ({ expr, description })),
    windowMinutes,
    hoursAnalyzed: hours,
    collisionCount: sorted.length,
    collisions: sorted.slice(0, 50), // cap output
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
