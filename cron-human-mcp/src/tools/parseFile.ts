import { readFileSync } from "node:fs";
import { explainCron, validateCron, getNextRuns } from "cron-human";

interface ParseFileInput {
  readonly filePath: string;
  readonly timezone?: string;
}

interface ParsedEntry {
  readonly line: number;
  readonly type: "job" | "variable" | "comment" | "empty" | "unknown";
  readonly raw: string;
  readonly expression?: string;
  readonly command?: string;
  readonly description?: string;
  readonly nextRun?: string;
  readonly error?: string;
  readonly variable?: string;
  readonly value?: string;
}

export async function parseFileTool({ filePath, timezone }: ParseFileInput) {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Cannot read file: ${message}` }],
      isError: true,
    };
  }

  const lines = content.split("\n");
  const entries: ParsedEntry[] = [];
  let jobCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      entries.push({ line: i + 1, type: "empty", raw });
      continue;
    }

    if (trimmed.startsWith("#")) {
      entries.push({ line: i + 1, type: "comment", raw });
      continue;
    }

    // Environment variable: KEY=value
    const envMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (envMatch) {
      entries.push({
        line: i + 1,
        type: "variable",
        raw,
        variable: envMatch[1],
        value: envMatch[2],
      });
      continue;
    }

    // Cron job: try to match 5-field expression + command, or @macro + command
    const cronMatch = trimmed.match(
      /^(@\w+|(?:[^\s]+\s+){4}[^\s]+)\s+(.+)$/,
    );

    if (cronMatch) {
      const expression = cronMatch[1].trim();
      const command = cronMatch[2].trim();
      const validationError = validateCron(expression, { timezone });

      if (validationError) {
        entries.push({
          line: i + 1,
          type: "job",
          raw,
          expression,
          command,
          error: validationError,
        });
        errorCount++;
      } else {
        let description: string;
        try {
          description = explainCron(expression);
        } catch {
          description = "(could not describe)";
        }

        let nextRun = "";
        try {
          const runs = getNextRuns(expression, 1, timezone);
          nextRun = runs[0] ?? "";
        } catch {
          // skip
        }

        entries.push({
          line: i + 1,
          type: "job",
          raw,
          expression,
          command,
          description,
          nextRun,
        });
        jobCount++;
      }
      continue;
    }

    entries.push({ line: i + 1, type: "unknown", raw });
  }

  const result = {
    file: filePath,
    totalLines: lines.length,
    jobs: jobCount,
    errors: errorCount,
    entries: entries.filter((e) => e.type !== "empty"),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
