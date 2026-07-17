import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // sent | failed | pending
  error: text("error"),
  agentId: text("agent_id"),
  duration: integer("duration"), // ms
  retryCount: integer("retry_count").default(0),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  sentAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
