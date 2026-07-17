import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const sendMessageInputSchema = z.object({
  phoneNumbers: z.array(z.string().min(1)).min(1),
  content: z.string().min(1),
});

async function getMacAgentUrl(): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "macAgentUrl"))
    .limit(1);
  return rows[0]?.value ?? null;
}

// GET /api/messages
router.get("/messages", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(messagesTable)
      .orderBy(messagesTable.sentAt);
    const messages = rows.reverse().map((m) => ({
      id: m.id,
      phoneNumber: m.phoneNumber,
      content: m.content,
      status: m.status,
      error: m.error ?? null,
      sentAt: m.sentAt.toISOString(),
    }));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages/send — proxies to Mac Agent
router.post("/messages/send", async (req, res) => {
  const parsed = sendMessageInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { phoneNumbers, content } = parsed.data;
  const agentUrl = await getMacAgentUrl();

  if (!agentUrl) {
    // Record all as failed
    const results = [];
    for (const phoneNumber of phoneNumbers) {
      const [inserted] = await db
        .insert(messagesTable)
        .values({
          phoneNumber,
          content,
          status: "failed",
          error:
            "Mac Agent not configured. Go to Settings to set up your Mac Agent.",
        })
        .returning();
      results.push({
        id: inserted.id,
        phoneNumber: inserted.phoneNumber,
        content: inserted.content,
        status: inserted.status,
        error: inserted.error ?? null,
        sentAt: inserted.sentAt.toISOString(),
      });
    }
    res.status(503).json({ error: "Mac Agent not configured", results });
    return;
  }

  // Proxy to Mac Agent
  let agentResults: Array<{
    phoneNumber: string;
    success: boolean;
    error?: string;
  }> = [];
  let agentError: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
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
    agentError =
      err instanceof Error ? err.message : "Failed to reach Mac Agent";
  }

  // Save results to DB
  const dbResults = [];
  for (const phoneNumber of phoneNumbers) {
    const agentResult = agentResults.find((r) => r.phoneNumber === phoneNumber);
    const status =
      agentError || (agentResult && !agentResult.success) ? "failed" : "sent";
    const error = agentError ?? agentResult?.error ?? null;

    const [inserted] = await db
      .insert(messagesTable)
      .values({ phoneNumber, content, status, error })
      .returning();

    dbResults.push({
      id: inserted.id,
      phoneNumber: inserted.phoneNumber,
      content: inserted.content,
      status: inserted.status,
      error: inserted.error ?? null,
      sentAt: inserted.sentAt.toISOString(),
    });
  }

  res.json(dbResults);
});

// DELETE /api/messages/:id
router.delete("/messages/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid message ID" });
    return;
  }

  const existing = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  res.json({ success: true });
});

export default router;
