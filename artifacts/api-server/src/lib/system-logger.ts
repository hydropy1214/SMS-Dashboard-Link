import { db } from "@workspace/db";
import { systemLogsTable } from "@workspace/db";

type LogLevel = "info" | "warn" | "error" | "debug";

export async function syslog(
  level: LogLevel,
  category: string,
  message: string,
  data?: Record<string, unknown>,
  agentId?: string,
) {
  try {
    await db.insert(systemLogsTable).values({
      level,
      category,
      message,
      data: data ? JSON.stringify(data) : null,
      agentId: agentId ?? null,
    });
  } catch {
    // Never let logging crash the caller
  }
}
