import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { explainTool } from "./tools/explain.js";
import { validateTool } from "./tools/validate.js";
import { nextRunsTool } from "./tools/nextRuns.js";
import { diffTool } from "./tools/diff.js";
import { statsTool } from "./tools/stats.js";
import { crontabListTool, crontabAddTool, crontabRemoveTool } from "./tools/crontab.js";
import { overlapsTool } from "./tools/overlaps.js";
import { icalTool } from "./tools/ical.js";
import { parseFileTool } from "./tools/parseFile.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "cron-human",
    version: "1.0.0",
  });

  // --- Core tools ---

  server.tool(
    "explain",
    "Convert a cron expression to plain English. Example: '0 9 * * 1-5' → 'At 09:00, Monday through Friday'",
    { expr: z.string().describe("A cron expression (5 or 6 fields)") },
    explainTool,
  );

  server.tool(
    "validate",
    "Check whether a cron expression is valid. Returns { valid: true } or { valid: false, error: '...' }",
    {
      expr: z.string().describe("The cron expression to validate"),
      timezone: z.string().optional().describe("IANA timezone, e.g. 'America/New_York'"),
      allowSeconds: z.boolean().optional().describe("Allow 6-field expressions with a seconds field"),
    },
    validateTool,
  );

  server.tool(
    "nextRuns",
    "Return the next N times a cron expression will fire. Example: '*/5 * * * *' with count=3 → ['2025-01-01 00:05:00', ...]",
    {
      expr: z.string().describe("A valid cron expression"),
      count: z.number().min(1).max(100).default(5).describe("How many upcoming runs to return (1-100)"),
      timezone: z.string().optional().describe("IANA timezone for output, e.g. 'Europe/London'"),
    },
    nextRunsTool,
  );

  server.tool(
    "diff",
    "Compare two cron expressions side-by-side: shows description and next N runs for each. Useful for choosing between schedules.",
    {
      exprA: z.string().describe("First cron expression"),
      exprB: z.string().describe("Second cron expression"),
      count: z.number().min(1).max(100).default(5).describe("How many upcoming runs to compare"),
      timezone: z.string().optional().describe("IANA timezone"),
      allowSeconds: z.boolean().optional().describe("Allow 6-field expressions with seconds"),
    },
    diffTool,
  );

  server.tool(
    "stats",
    "Analyze a cron schedule: frequency (per day/week/month/year), gap analysis (shortest/longest/average), and optional cost estimate per invocation.",
    {
      expr: z.string().describe("A valid cron expression"),
      timezone: z.string().optional().describe("IANA timezone"),
      allowSeconds: z.boolean().optional().describe("Allow 6-field expressions with seconds"),
      costPerRun: z.number().min(0).optional().describe("Cost per invocation in dollars, e.g. 0.002 for AWS Lambda"),
    },
    statsTool,
  );

  // --- System crontab tools ---

  server.tool(
    "crontab_list",
    "Read and explain all jobs in the user's system crontab. Returns each entry with its schedule description, command, and next run time.",
    {},
    crontabListTool,
  );

  server.tool(
    "crontab_add",
    "Add a new cron job to the user's system crontab. Validates the expression before adding. Example: expression='0 2 * * *', command='/usr/local/bin/backup.sh'",
    {
      expression: z.string().describe("Cron expression for the schedule"),
      command: z.string().describe("The shell command to run"),
      comment: z.string().optional().describe("Optional comment to add above the entry"),
    },
    crontabAddTool,
  );

  server.tool(
    "crontab_remove",
    "Remove cron jobs from the user's system crontab that match a text pattern. Matches against the full line (expression + command).",
    {
      pattern: z.string().describe("Text pattern to match against crontab lines (e.g. 'backup.sh' or '0 2 * * *')"),
    },
    crontabRemoveTool,
  );

  // --- Analysis tools ---

  server.tool(
    "overlaps",
    "Detect schedule collisions between multiple cron expressions. Finds times where two or more jobs fire within a given window. Useful for avoiding resource contention.",
    {
      expressions: z.array(z.string()).min(2).max(10).describe("Array of cron expressions to check"),
      windowMinutes: z.number().min(0).max(60).default(5).describe("How close (in minutes) two runs must be to count as a collision"),
      hours: z.number().min(1).max(168).default(24).describe("How many hours ahead to analyze (max 168 = 1 week)"),
      timezone: z.string().optional().describe("IANA timezone"),
    },
    overlapsTool,
  );

  // --- Export tools ---

  server.tool(
    "export_ical",
    "Generate an .ics calendar file from a cron expression. The output can be saved as a .ics file and imported into Google Calendar, Outlook, or Apple Calendar.",
    {
      expr: z.string().describe("A valid cron expression"),
      count: z.number().min(1).max(100).default(20).describe("How many future events to generate"),
      timezone: z.string().optional().describe("IANA timezone"),
      summary: z.string().optional().describe("Event title (defaults to the cron description)"),
      durationMinutes: z.number().min(1).max(1440).default(5).describe("Duration of each event in minutes"),
    },
    icalTool,
  );

  // --- File parsing tools ---

  server.tool(
    "parse_file",
    "Parse a crontab file from disk and explain every entry. Handles comments, environment variables, and cron jobs. Works with standard crontab format.",
    {
      filePath: z.string().describe("Absolute path to the crontab file to parse"),
      timezone: z.string().optional().describe("IANA timezone for next-run calculations"),
    },
    parseFileTool,
  );

  return server;
}
