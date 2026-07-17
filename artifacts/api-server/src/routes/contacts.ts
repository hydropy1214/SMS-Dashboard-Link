import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const contactInputSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
});

const contactUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
});

// GET /api/contacts
router.get("/contacts", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(contactsTable)
      .orderBy(contactsTable.name);
    res.json(
      rows.map((c) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch contacts");
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// POST /api/contacts
router.post("/contacts", async (req, res) => {
  const parsed = contactInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [inserted] = await db
    .insert(contactsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json({
    id: inserted.id,
    name: inserted.name,
    phoneNumber: inserted.phoneNumber,
    createdAt: inserted.createdAt.toISOString(),
  });
});

// PUT /api/contacts/:id
router.put("/contacts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contact ID" });
    return;
  }

  const parsed = contactUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const existing = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, id))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [updated] = await db
    .update(contactsTable)
    .set(parsed.data)
    .where(eq(contactsTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    phoneNumber: updated.phoneNumber,
    createdAt: updated.createdAt.toISOString(),
  });
});

// DELETE /api/contacts/:id
router.delete("/contacts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contact ID" });
    return;
  }

  const existing = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, id))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.json({ success: true });
});

export default router;
