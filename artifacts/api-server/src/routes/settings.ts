import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /api/settings — return all settings as a key→value map
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map: Record<string, string | null> = {};
    for (const r of rows) {
      map[r.key] = r.value ?? null;
    }
    res.json(map);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch settings");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PATCH /api/settings — update one or more keys
const settingsSchema = z.record(z.string().min(1), z.string().nullable());

router.patch("/settings", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid settings payload" });
    return;
  }

  try {
    const now = new Date();
    for (const [key, value] of Object.entries(parsed.data)) {
      await db
        .insert(settingsTable)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value, updatedAt: now },
        });
    }

    // Return updated settings
    const rows = await db.select().from(settingsTable);
    const map: Record<string, string | null> = {};
    for (const r of rows) {
      map[r.key] = r.value ?? null;
    }
    res.json(map);
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
