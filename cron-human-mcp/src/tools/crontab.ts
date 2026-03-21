import { execSync } from "node:child_process";
import { explainCron, validateCron, getNextRuns } from "cron-human";

interface CrontabEntry {
  readonly line: number;
  readonly raw: string;
  readonly expression: string;
  readonly command: string;
  readonly description: string;
  readonly nextRun: string;
}

function runCrontab(args: string): string {
  try {
    return execSync(`crontab ${args}`, { encoding: "utf-8", timeout: 5000 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("no crontab for")) {
      return "";
    }
    throw new Error(`crontab command failed: ${message}`);
  }
}

function parseCrontabLines(raw: string): CrontabEntry[] {
  const entries: CrontabEntry[] = [];
  const lines = raw.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    // Match: 5-field cron expression followed by a command
    const match = line.match(
      /^(@\w+|(?:[^\s]+\s+){4}[^\s]+)\s+(.+)$/,
    );
    if (!match) continue;

    const expression = match[1].trim();
    const command = match[2].trim();

    let description: string;
    try {
      description = explainCron(expression);
    } catch {
      description = "(could not parse schedule)";
    }

    let nextRun = "";
    try {
      const runs = getNextRuns(expression, 1);
      nextRun = runs[0] ?? "";
    } catch {
      // skip
    }

    entries.push({
      line: i + 1,
      raw: line,
      expression,
      command,
      description,
      nextRun,
    });
  }

  return entries;
}

export async function crontabListTool() {
  try {
    const raw = runCrontab("-l");
    if (!raw.trim()) {
      return {
        content: [{ type: "text" as const, text: "No crontab entries found." }],
      };
    }

    const entries = parseCrontabLines(raw);
    if (entries.length === 0) {
      return {
        content: [{ type: "text" as const, text: "Crontab exists but has no active job entries (only comments or empty lines)." }],
      };
    }

    const result = {
      total: entries.length,
      entries,
      raw,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Failed to read crontab: ${message}` }],
      isError: true,
    };
  }
}

interface CrontabAddInput {
  readonly expression: string;
  readonly command: string;
  readonly comment?: string;
}

export async function crontabAddTool({ expression, command, comment }: CrontabAddInput) {
  const error = validateCron(expression);
  if (error) {
    return {
      content: [{ type: "text" as const, text: `Invalid cron expression: ${error}` }],
      isError: true,
    };
  }

  if (!command.trim()) {
    return {
      content: [{ type: "text" as const, text: "Command cannot be empty." }],
      isError: true,
    };
  }

  try {
    let existing = "";
    try {
      existing = runCrontab("-l");
    } catch {
      // no existing crontab
    }

    const newLine = comment
      ? `# ${comment}\n${expression} ${command}`
      : `${expression} ${command}`;

    const updated = existing.trimEnd()
      ? `${existing.trimEnd()}\n${newLine}\n`
      : `${newLine}\n`;

    execSync("crontab -", { input: updated, encoding: "utf-8", timeout: 5000 });

    const description = explainCron(expression);
    const nextRuns = getNextRuns(expression, 3);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          status: "added",
          expression,
          command,
          description,
          nextRuns,
        }, null, 2),
      }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Failed to add crontab entry: ${message}` }],
      isError: true,
    };
  }
}

interface CrontabRemoveInput {
  readonly pattern: string;
}

export async function crontabRemoveTool({ pattern }: CrontabRemoveInput) {
  if (!pattern.trim()) {
    return {
      content: [{ type: "text" as const, text: "Pattern cannot be empty." }],
      isError: true,
    };
  }

  try {
    const existing = runCrontab("-l");
    if (!existing.trim()) {
      return {
        content: [{ type: "text" as const, text: "No crontab entries to remove from." }],
        isError: true,
      };
    }

    const lines = existing.split("\n");
    const removed: string[] = [];
    const kept: string[] = [];

    for (const line of lines) {
      if (line.includes(pattern)) {
        removed.push(line);
      } else {
        kept.push(line);
      }
    }

    if (removed.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No crontab entries matched pattern "${pattern}".` }],
      };
    }

    const updated = kept.join("\n");
    if (updated.trim()) {
      execSync("crontab -", { input: updated, encoding: "utf-8", timeout: 5000 });
    } else {
      execSync("crontab -r", { encoding: "utf-8", timeout: 5000 });
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          status: "removed",
          removedCount: removed.length,
          removedEntries: removed,
        }, null, 2),
      }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Failed to remove crontab entry: ${message}` }],
      isError: true,
    };
  }
}
