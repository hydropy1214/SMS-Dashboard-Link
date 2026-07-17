import { Router } from "express";
import { db } from "@workspace/db";
import { devicesTable, macAgentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const AGENT_OFFLINE_THRESHOLD_MS = 90_000;

function isOnline(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - lastHeartbeat.getTime() < AGENT_OFFLINE_THRESHOLD_MS;
}

// GET /api/devices — list all detected messaging devices, merged with live agent data
router.get("/devices", async (req, res) => {
  try {
    // Pull stored devices
    const stored = await db
      .select()
      .from(devicesTable)
      .orderBy(desc(devicesTable.updatedAt));

    // Pull all agents for live heartbeat data
    const agents = await db.select().from(macAgentsTable);

    // Build a hostname + status lookup keyed by agentId
    const agentMeta = new Map<string, {
      hostname: string;
      macosVersion: string | null;
      agentVersion: string | null;
      online: boolean;
    }>();
    for (const agent of agents) {
      agentMeta.set(agent.agentId, {
        hostname: agent.hostname,
        macosVersion: agent.macosVersion ?? null,
        agentVersion: agent.agentVersion ?? null,
        online: isOnline(agent.lastHeartbeatAt),
      });
    }

    // Synthesise entries from live agent heartbeats
    type SyntheticDevice = {
      id: number;
      agentId: string;
      hostname: string;
      macosVersion: string | null;
      agentVersion: string | null;
      displayName: string;
      /** iMessage | SMS | USB */
      service: string;
      accountId: string | null;
      available: boolean;
      lastUsedAt: string | null;
      createdAt: string;
    };

    const synthetic: SyntheticDevice[] = [];
    let syntheticId = -1;

    for (const agent of agents) {
      const online = isOnline(agent.lastHeartbeatAt);
      const meta = {
        agentId: agent.agentId,
        hostname: agent.hostname,
        macosVersion: agent.macosVersion ?? null,
        agentVersion: agent.agentVersion ?? null,
        available: online,
        lastUsedAt: agent.lastActivityAt?.toISOString() ?? null,
        createdAt: agent.createdAt.toISOString(),
      };

      // iMessage / Apple ID accounts
      for (const acct of agent.connectedAccounts ?? []) {
        synthetic.push({
          ...meta,
          id: syntheticId--,
          displayName: acct,
          service: "iMessage",
          accountId: acct,
        });
      }

      // Wi-Fi Text Message Forwarding iPhones (SMS)
      for (const dev of agent.connectedDevices ?? []) {
        synthetic.push({
          ...meta,
          id: syntheticId--,
          displayName: dev,
          service: "SMS",
          accountId: null,
        });
      }

      // USB-connected iPhones
      for (const dev of agent.usbDevices ?? []) {
        synthetic.push({
          ...meta,
          id: syntheticId--,
          displayName: dev,
          service: "USB",
          accountId: null,
        });
      }
    }

    // Prefer stored rows; add synthetics not already present
    const storedKeys = new Set(stored.map(d => `${d.agentId}:${d.service}:${d.displayName}`));
    const extras = synthetic.filter(
      s => !storedKeys.has(`${s.agentId}:${s.service}:${s.displayName}`),
    );

    const toResult = (
      d: typeof stored[number] | SyntheticDevice,
      meta?: { hostname: string; macosVersion: string | null; agentVersion: string | null; online: boolean },
    ) => {
      const m = meta ?? agentMeta.get(d.agentId);
      return {
        id: d.id,
        agentId: d.agentId,
        hostname: m?.hostname ?? d.agentId,
        macosVersion: m?.macosVersion ?? null,
        agentVersion: m?.agentVersion ?? null,
        displayName: d.displayName,
        service: d.service,
        accountId: (d as any).accountId ?? null,
        available: m ? m.online : ((d as any).available ?? true),
        lastUsedAt: (d as any).lastUsedAt ?? null,
        createdAt: (d as any).createdAt ?? new Date().toISOString(),
      };
    };

    const result = [
      ...stored.map(d => toResult(d)),
      ...extras.map(s => toResult(s, {
        hostname: s.hostname,
        macosVersion: s.macosVersion,
        agentVersion: s.agentVersion,
        online: s.available,
      })),
    ];

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list devices");
    res.status(500).json({ error: "Failed to list devices" });
  }
});

export default router;
