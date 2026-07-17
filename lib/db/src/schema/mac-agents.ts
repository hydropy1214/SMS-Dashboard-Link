import { pgTable, serial, text, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";

export const macAgentsTable = pgTable("mac_agents", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  hostname: text("hostname").notNull(),
  os: text("os"),
  macosVersion: text("macos_version"),
  nodeVersion: text("node_version"),
  agentVersion: text("agent_version"),
  messagesAppRunning: boolean("messages_app_running"),
  messagesAppAvailable: boolean("messages_app_available"),
  appleScriptAvailable: boolean("apple_script_available"),
  connectedAccounts: text("connected_accounts").array(),
  connectedDevices: text("connected_devices").array(),
  latencyMs: integer("latency_ms"),
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
  queueSize: integer("queue_size").default(0),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  lastActivityAt: timestamp("last_activity_at"),
  status: text("status").notNull().default("offline"), // online | offline
  macAgentUrl: text("mac_agent_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MacAgent = typeof macAgentsTable.$inferSelect;
export type InsertMacAgent = typeof macAgentsTable.$inferInsert;
