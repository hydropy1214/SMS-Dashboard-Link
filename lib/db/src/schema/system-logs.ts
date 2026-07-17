import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const systemLogsTable = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // info | warn | error | debug
  category: text("category").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string
  agentId: text("agent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SystemLog = typeof systemLogsTable.$inferSelect;
export type InsertSystemLog = typeof systemLogsTable.$inferInsert;
