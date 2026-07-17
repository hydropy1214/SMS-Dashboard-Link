import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  displayName: text("display_name").notNull(),
  service: text("service").notNull(), // iMessage | SMS
  accountId: text("account_id"),
  available: boolean("available").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Device = typeof devicesTable.$inferSelect;
export type InsertDevice = typeof devicesTable.$inferInsert;
