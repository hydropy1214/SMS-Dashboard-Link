import { Router } from "express";
import { db } from "@workspace/db";
import { devicesTable, macAgentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// GET /api/devices — list all detected messaging devices, merged with live agent data
router.get("/devices", async (req, res) => {
  try {
    // Pull stored devices
    const stored = await db
      .select()
      .from(devicesTable)
      .orderBy(desc(devicesTable.updatedAt));

    // Also synthesise entries from live agent heartbeats
    const agents = await db.select().from(macAgentsTable);
    const synthetic: Array<{
      id: number;
      agentId: string;
      displayName: string;
      service: string;
      accountId: string | null;
      available: boolean;
      lastUsedAt: string | null;
      createdAt: string;
    }> = [];

    let syntheticId = -1;
    for (const agent of agents) {
      for (const acct of agent.connectedAccounts ?? []) {
        synthetic.push({
          id: syntheticId--,
          agentId: agent.agentId,
          displayName: acct,
          service: acct.includes("@") ? "iMessage" : "iMessage",
          accountId: acct,
          available: agent.status === "online",
          lastUsedAt: agent.lastActivityAt?.toISOString() ?? null,
          createdAt: agent.createdAt.toISOString(),
        });
      }
      for (const dev of agent.connectedDevices ?? []) {
        synthetic.push({
          id: syntheticId--,
          agentId: agent.agentId,
          displayName: dev,
          service: "SMS",
          accountId: null,
          available: agent.status === "online",
          lastUsedAt: agent.lastActivityAt?.toISOString() ?? null,
          createdAt: agent.createdAt.toISOString(),
        });
      }
    }

    // Prefer stored rows; add synthetics not already stored
    const storedNames = new Set(stored.map(d => `${d.agentId}:${d.displayName}`));
    const extras = synthetic.filter(s => !storedNames.has(`${s.agentId}:${s.displayName}`));

    const result = [
      ...stored.map(d => ({
        id: d.id,
        agentId: d.agentId,
        displayName: d.displayName,
        service: d.service,
        accountId: d.accountId ?? null,
        available: d.available ?? true,
        lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      ...extras,
    ];

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list devices");
    res.status(500).json({ error: "Failed to list devices" });
  }
});

export default router;
