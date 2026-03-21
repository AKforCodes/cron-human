import { validateCron } from "cron-human";

interface ValidateInput {
  readonly expr: string;
  readonly timezone?: string;
  readonly allowSeconds?: boolean;
}

export async function validateTool({ expr, timezone, allowSeconds }: ValidateInput) {
  const error = validateCron(expr, { timezone, allowSeconds });

  if (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ valid: false, error }) }],
    };
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify({ valid: true }) }],
  };
}
