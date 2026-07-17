import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const settingsInputSchema = z.object({
  macAgentUrl: z.string().url().nullable(),
});

async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

// GET /api/settings
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, r]));
    const macRow = map["macAgentUrl"];
    res.json({
      macAgentUrl: macRow?.value ?? null,
      updatedAt: macRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// POST /api/settings
router.post("/settings", async (req, res) => {
  const parsed = settingsInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid settings data" });
    return;
  }

  try {
    await setSetting("macAgentUrl", parsed.data.macAgentUrl);
    const rows = await db.select().from(settingsTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, r]));
    const macRow = map["macAgentUrl"];
    res.json({
      macAgentUrl: macRow?.value ?? null,
      updatedAt: macRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export { getSetting };
export default router;
