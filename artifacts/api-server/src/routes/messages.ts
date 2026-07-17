import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, settingsTable, macAgentsTable } from "@workspace/db";
import { eq, desc, asc, ilike, and, count, avg } from "drizzle-orm";
import { z } from "zod";
import { syslog } from "../lib/system-logger";

const router = Router();

const sendMessageInputSchema = z.object({
  phoneNumbers: z.array(z.string().min(1)).min(1),
  content: z.string().min(1).max(10000),
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function getMacAgentUrl(): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "macAgentUrl"))
    .limit(1);
  return rows[0]?.value ?? null;
}

function serialiseMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    phoneNumber: m.phoneNumber,
    content: m.content,
    status: m.status,
    error: m.error ?? null,
    agentId: m.agentId ?? null,
    duration: m.duration ?? null,
    retryCount: m.retryCount ?? 0,
    sentAt: m.sentAt.toISOString(),
  };
}

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── GET /api/messages ─────────────────────────────────────────────────────────

router.get("/messages", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50));
    const sortDir = req.query.sort === "asc" ? asc : desc;
    const statusFilter = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const conditions = [];
    if (statusFilter && ["sent", "failed", "pending"].includes(statusFilter)) {
      conditions.push(eq(messagesTable.status, statusFilter));
    }
    if (search) {
      conditions.push(ilike(messagesTable.phoneNumber, `%${search}%`));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(messagesTable)
        .where(where)
        .orderBy(sortDir(messagesTable.sentAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(messagesTable).where(where),
    ]);

    res.json({
      messages: rows.map(serialiseMessage),
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ── GET /api/messages/export ──────────────────────────────────────────────────

router.get("/messages/export", async (req, res) => {
  const format = req.query.format as string;
  const statusFilter = req.query.status as string | undefined;

  if (!["csv", "json"].includes(format)) {
    res.status(400).json({ error: "format must be csv or json" });
    return;
  }

  try {
    const conditions = [];
    if (statusFilter && ["sent", "failed", "pending"].includes(statusFilter)) {
      conditions.push(eq(messagesTable.status, statusFilter));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(messagesTable)
      .where(where)
      .orderBy(desc(messagesTable.sentAt));

    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="messages.json"');
      res.setHeader("Content-Type", "application/json");
      res.json(rows.map(serialiseMessage));
      return;
    }

    // CSV
    const headers = ["id", "phoneNumber", "content", "status", "error", "agentId", "duration", "retryCount", "sentAt"];
    const lines = [
      headers.join(","),
      ...rows.map(m =>
        [m.id, m.phoneNumber, m.content, m.status, m.error, m.agentId, m.duration, m.retryCount, m.sentAt.toISOString()]
          .map(v => escapeCsv(v == null ? null : String(v)))
          .join(","),
      ),
    ];
    res.setHeader("Content-Disposition", 'attachment; filename="messages.csv"');
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(lines.join("\n"));
  } catch (err) {
    req.log.error({ err }, "Failed to export messages");
    res.status(500).json({ error: "Failed to export messages" });
  }
});

// ── POST /api/messages/send ───────────────────────────────────────────────────

router.post("/messages/send", async (req, res) => {
  const parsed = sendMessageInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { phoneNumbers, content } = parsed.data;
  const agentUrl = await getMacAgentUrl();

  if (!agentUrl) {
    const results = [];
    for (const phoneNumber of phoneNumbers) {
      const [inserted] = await db
        .insert(messagesTable)
        .values({ phoneNumber, content, status: "failed", error: "Mac Agent not configured. Go to Settings." })
        .returning();
      results.push(serialiseMessage(inserted));
    }
    await syslog("warn", "send", "Send attempted but Mac Agent not configured");
    res.status(503).json({ error: "Mac Agent not configured", sent: 0, failed: phoneNumbers.length, total: phoneNumbers.length, results });
    return;
  }

  // Find active agent ID for tracking
  const agents = await db.select().from(macAgentsTable).orderBy(desc(macAgentsTable.lastHeartbeatAt)).limit(1);
  const activeAgentId = agents[0]?.agentId ?? null;

  let agentResults: Array<{ phoneNumber: string; success: boolean; error?: string; durationMs?: number }> = [];
  let agentError: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const agentResponse = await fetch(`${agentUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumbers, content }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (agentResponse.ok) {
      agentResults = (await agentResponse.json()) as typeof agentResults;
    } else {
      agentError = `Mac Agent responded with ${agentResponse.status}`;
    }
  } catch (err: unknown) {
    agentError = err instanceof Error ? err.message : "Failed to reach Mac Agent";
    if (agentError.includes("abort")) agentError = "Request timed out — Mac Agent took too long to respond";
  }

  const dbResults = [];
  let sent = 0, failed = 0;

  for (const phoneNumber of phoneNumbers) {
    const agentResult = agentResults.find(r => r.phoneNumber === phoneNumber);
    const success = agentError ? false : (agentResult?.success ?? false);
    const status = success ? "sent" : "failed";
    const error = success ? null : (agentResult?.error ?? agentError ?? "Unknown error");
    const duration = agentResult?.durationMs ?? null;

    if (success) sent++; else failed++;

    const [inserted] = await db
      .insert(messagesTable)
      .values({ phoneNumber, content, status, error, agentId: activeAgentId, duration })
      .returning();
    dbResults.push(serialiseMessage(inserted));
  }

  await syslog("info", "send", `Send batch: ${sent} sent, ${failed} failed`, { total: phoneNumbers.length, agentId: activeAgentId }, activeAgentId ?? undefined);

  // Update agent last activity
  if (activeAgentId) {
    await db
      .update(macAgentsTable)
      .set({ lastActivityAt: new Date() })
      .where(eq(macAgentsTable.agentId, activeAgentId));
  }

  res.json({ sent, failed, total: phoneNumbers.length, results: dbResults });
});

// ── DELETE /api/messages/all ──────────────────────────────────────────────────

router.delete("/messages/all", async (req, res) => {
  try {
    await db.delete(messagesTable);
    await syslog("warn", "messages", "All message history deleted");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete all messages");
    res.status(500).json({ error: "Failed to delete all messages" });
  }
});

// ── DELETE /api/messages/:id ──────────────────────────────────────────────────

router.delete("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }
  try {
    const deleted = await db.delete(messagesTable).where(eq(messagesTable.id, id)).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete message");
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
