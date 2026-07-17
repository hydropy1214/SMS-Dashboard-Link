import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, macAgentsTable } from "@workspace/db";
import { desc, gte, eq, and, count, avg, sql } from "drizzle-orm";

const router = Router();

const AGENT_OFFLINE_THRESHOLD_MS = 90_000;

function isOnline(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - lastHeartbeat.getTime() < AGENT_OFFLINE_THRESHOLD_MS;
}

// GET /api/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      agents,
      allMessages,
      todayMessages,
      pendingCount,
      recentMessages,
      avgDuration,
    ] = await Promise.all([
      db.select().from(macAgentsTable).orderBy(desc(macAgentsTable.lastHeartbeatAt)),
      db.select({ total: count() }).from(messagesTable),
      db.select({ status: messagesTable.status, cnt: count() })
        .from(messagesTable)
        .where(gte(messagesTable.sentAt, todayStart))
        .groupBy(messagesTable.status),
      db.select({ cnt: count() }).from(messagesTable).where(eq(messagesTable.status, "pending")),
      db.select().from(messagesTable).orderBy(desc(messagesTable.sentAt)).limit(10),
      db.select({ avg: avg(messagesTable.duration) }).from(messagesTable).where(eq(messagesTable.status, "sent")),
    ]);

    const activeAgents = agents.filter(a => isOnline(a.lastHeartbeatAt));
    const primaryAgent = activeAgents[0] ?? null;

    const sentToday = todayMessages.find(r => r.status === "sent")?.cnt ?? 0;
    const failedToday = todayMessages.find(r => r.status === "failed")?.cnt ?? 0;
    const totalMessages = Number(allMessages[0]?.total ?? 0);
    const pendingMessages = Number(pendingCount[0]?.cnt ?? 0);

    const connectedAccounts = activeAgents.reduce((sum, a) => sum + (a.connectedAccounts?.length ?? 0), 0);
    const connectedDevices = activeAgents.reduce((sum, a) => sum + (a.connectedDevices?.length ?? 0), 0);

    const agentStatus = activeAgents.length > 0 ? "online" : agents.length > 0 ? "offline" : "unknown";

    res.json({
      agentStatus,
      agentConnected: activeAgents.length > 0,
      messagesReady: primaryAgent?.messagesAppRunning ?? false,
      appleScriptReady: primaryAgent?.appleScriptAvailable ?? false,
      connectedAccounts,
      connectedDevices,
      sentToday: Number(sentToday),
      failedToday: Number(failedToday),
      pendingMessages,
      totalMessages,
      avgSendTimeMs: avgDuration[0]?.avg ? Math.round(Number(avgDuration[0].avg)) : null,
      lastHeartbeat: primaryAgent?.lastHeartbeatAt?.toISOString() ?? null,
      activeAgents: activeAgents.length,
      recentMessages: recentMessages.map(m => ({
        id: m.id,
        phoneNumber: m.phoneNumber,
        content: m.content,
        status: m.status,
        error: m.error ?? null,
        agentId: m.agentId ?? null,
        duration: m.duration ?? null,
        retryCount: m.retryCount ?? 0,
        sentAt: m.sentAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch dashboard stats");
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;
