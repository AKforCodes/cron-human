import { explainCron } from "cron-human";

interface ExplainInput {
  readonly expr: string;
}

export async function explainTool({ expr }: ExplainInput) {
  try {
    const description = explainCron(expr);
    return {
      content: [{ type: "text" as const, text: description }],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Could not explain: ${message}` }],
      isError: true,
    };
  }
}
