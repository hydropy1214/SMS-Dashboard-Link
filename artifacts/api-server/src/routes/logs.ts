import { Router } from "express";
import { db } from "@workspace/db";
import { systemLogsTable } from "@workspace/db";
import { eq, desc, ilike, and, count } from "drizzle-orm";

const router = Router();

// GET /api/logs
router.get("/logs", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 100));
    const level = req.query.level as string | undefined;
    const category = req.query.category as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const conditions = [];
    if (level && ["info", "warn", "error", "debug"].includes(level)) {
      conditions.push(eq(systemLogsTable.level, level));
    }
    if (category) {
      conditions.push(eq(systemLogsTable.category, category));
    }
    if (search) {
      conditions.push(ilike(systemLogsTable.message, `%${search}%`));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(systemLogsTable)
        .where(where)
        .orderBy(desc(systemLogsTable.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(systemLogsTable).where(where),
    ]);

    res.json({
      logs: rows.map(r => ({
        id: r.id,
        level: r.level,
        category: r.category,
        message: r.message,
        data: r.data ?? null,
        agentId: r.agentId ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
