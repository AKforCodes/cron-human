import { getNextRuns, explainCron, validateCron } from "cron-human";

interface IcalInput {
  readonly expr: string;
  readonly count?: number;
  readonly timezone?: string;
  readonly summary?: string;
  readonly durationMinutes?: number;
}

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcalDate(dateStr: string): string {
  // Input: "2025-01-01 09:00:00" → Output: "20250101T090000"
  return dateStr.replace(/[-: ]/g, "").replace(/(\d{8})(\d{6})/, "$1T$2");
}

function generateUid(expr: string, date: string): string {
  const hash = `${expr}-${date}`.split("").reduce((a, c) => {
    const h = ((a << 5) - a + c.charCodeAt(0)) | 0;
    return h;
  }, 0);
  return `${Math.abs(hash).toString(36)}@cron-human-mcp`;
}

export async function icalTool({ expr, count = 20, timezone, summary, durationMinutes = 5 }: IcalInput) {
  const error = validateCron(expr, { timezone });
  if (error) {
    return {
      content: [{ type: "text" as const, text: error }],
      isError: true,
    };
  }

  const description = explainCron(expr);
  const eventSummary = summary ?? `Cron: ${description}`;
  const runs = getNextRuns(expr, count, timezone);

  const events = runs.map((run) => {
    const dtStart = toIcalDate(run);
    // Calculate end time
    const startDate = new Date(run.replace(" ", "T"));
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const dtEnd = toIcalDate(
      endDate.toISOString().replace("T", " ").replace(/\.\d+Z$/, "").slice(0, 19),
    );
    const uid = generateUid(expr, run);

    return [
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcal(eventSummary)}`,
      `DESCRIPTION:${escapeIcal(`Cron: ${expr}\\n${description}`)}`,
      `UID:${uid}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//cron-human-mcp//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcal(eventSummary)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        description,
        eventCount: runs.length,
        ical: calendar,
        instructions: "Save the 'ical' field as a .ics file and import into Google Calendar, Outlook, or Apple Calendar.",
      }, null, 2),
    }],
  };
}
