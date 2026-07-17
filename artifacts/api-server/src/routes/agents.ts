import { Router } from "express";
import { db } from "@workspace/db";
import { macAgentsTable, settingsTable, devicesTable, systemLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { syslog } from "../lib/system-logger";

const router = Router();

const AGENT_OFFLINE_THRESHOLD_MS = 90_000; // 90 s — missed 3 heartbeats

// ── helpers ──────────────────────────────────────────────────────────────────

function isOnline(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - lastHeartbeat.getTime() < AGENT_OFFLINE_THRESHOLD_MS;
}

function serialiseAgent(row: typeof macAgentsTable.$inferSelect) {
  const online = isOnline(row.lastHeartbeatAt);
  return {
    ...row,
    status: online ? "online" : "offline",
    connectedAccounts: row.connectedAccounts ?? [],
    connectedDevices: row.connectedDevices ?? [],
    queueSize: row.queueSize ?? 0,
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getMacAgentUrl(): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "macAgentUrl"))
    .limit(1);
  return rows[0]?.value ?? null;
}

// ── GET /api/agents ───────────────────────────────────────────────────────────

router.get("/agents", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(macAgentsTable)
      .orderBy(desc(macAgentsTable.lastHeartbeatAt));
    res.json(rows.map(serialiseAgent));
  } catch (err) {
    req.log.error({ err }, "Failed to list agents");
    res.status(500).json({ error: "Failed to list agents" });
  }
});

// ── POST /api/agents/heartbeat ────────────────────────────────────────────────

const heartbeatSchema = z.object({
  agentId: z.string().min(1).max(128),
  hostname: z.string().min(1).max(256),
  os: z.string().max(128).optional().default(""),
  macosVersion: z.string().max(64).nullable().optional(),
  nodeVersion: z.string().max(64),
  agentVersion: z.string().max(64),
  messagesAppRunning: z.boolean(),
  messagesAppAvailable: z.boolean(),
  appleScriptAvailable: z.boolean(),
  connectedAccounts: z.array(z.string()),
  connectedDevices: z.array(z.string()),
  latencyMs: z.number().int().nullable().optional(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  queueSize: z.number().int().min(0),
  lastActivityAt: z.string().nullable().optional(),
  /** The HTTPS tunnel URL the dashboard should use to reach this agent. */
  macAgentUrl: z.string().url().nullable().optional(),
});

router.post("/agents/heartbeat", async (req, res) => {
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid heartbeat payload" });
    return;
  }

  const hb = parsed.data;
  const now = new Date();

  try {
    // Upsert the agent record
    await db
      .insert(macAgentsTable)
      .values({
        agentId: hb.agentId,
        hostname: hb.hostname,
        os: hb.os,
        macosVersion: hb.macosVersion ?? null,
        nodeVersion: hb.nodeVersion,
        agentVersion: hb.agentVersion,
        messagesAppRunning: hb.messagesAppRunning,
        messagesAppAvailable: hb.messagesAppAvailable,
        appleScriptAvailable: hb.appleScriptAvailable,
        connectedAccounts: hb.connectedAccounts,
        connectedDevices: hb.connectedDevices,
        latencyMs: hb.latencyMs ?? null,
        cpuUsage: hb.cpuUsage,
        memoryUsage: hb.memoryUsage,
        queueSize: hb.queueSize,
        status: "online",
        lastHeartbeatAt: now,
        lastActivityAt: hb.lastActivityAt ? new Date(hb.lastActivityAt) : now,
        macAgentUrl: hb.macAgentUrl ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: macAgentsTable.agentId,
        set: {
          hostname: hb.hostname,
          os: hb.os,
          macosVersion: hb.macosVersion ?? null,
          nodeVersion: hb.nodeVersion,
          agentVersion: hb.agentVersion,
          messagesAppRunning: hb.messagesAppRunning,
          messagesAppAvailable: hb.messagesAppAvailable,
          appleScriptAvailable: hb.appleScriptAvailable,
          connectedAccounts: hb.connectedAccounts,
          connectedDevices: hb.connectedDevices,
          latencyMs: hb.latencyMs ?? null,
          cpuUsage: hb.cpuUsage,
          memoryUsage: hb.memoryUsage,
          queueSize: hb.queueSize,
          status: "online",
          lastHeartbeatAt: now,
          lastActivityAt: hb.lastActivityAt ? new Date(hb.lastActivityAt) : now,
          // Only overwrite macAgentUrl when the heartbeat actually carries one
          ...(hb.macAgentUrl != null ? { macAgentUrl: hb.macAgentUrl } : {}),
          updatedAt: now,
        },
      });

    await syslog("info", "heartbeat", `Heartbeat from ${hb.hostname}`, {
      agentId: hb.agentId,
      cpuUsage: hb.cpuUsage,
      memoryUsage: hb.memoryUsage,
    }, hb.agentId);

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to process heartbeat");
    res.status(500).json({ error: "Failed to process heartbeat" });
  }
});

// ── GET /api/agents/status — legacy compat ────────────────────────────────────

router.get("/agents/status", async (req, res) => {
  try {
    const agentUrl = await getMacAgentUrl();

    // First try to find a recently-heartbeating agent in DB
    const agents = await db
      .select()
      .from(macAgentsTable)
      .orderBy(desc(macAgentsTable.lastHeartbeatAt))
      .limit(1);

    const primaryAgent = agents[0];

    if (primaryAgent && isOnline(primaryAgent.lastHeartbeatAt)) {
      res.json({
        connected: true,
        url: agentUrl ?? primaryAgent.macAgentUrl ?? null,
        platform: primaryAgent.os ?? null,
        isMac: true,
        messagesAppAvailable: primaryAgent.messagesAppAvailable ?? null,
        appleScriptAvailable: primaryAgent.appleScriptAvailable ?? null,
        error: null,
        latencyMs: primaryAgent.latencyMs ?? null,
        hostname: primaryAgent.hostname,
        agentVersion: primaryAgent.agentVersion ?? null,
        connectedAccounts: primaryAgent.connectedAccounts ?? [],
        connectedDevices: primaryAgent.connectedDevices ?? [],
        lastHeartbeat: primaryAgent.lastHeartbeatAt?.toISOString() ?? null,
      });
      return;
    }

    // Fall back to live probe if URL is configured
    if (!agentUrl) {
      res.json({
        connected: false,
        url: null,
        platform: null,
        isMac: null,
        messagesAppAvailable: null,
        appleScriptAvailable: null,
        error: "Mac Agent URL not configured. Go to Settings to set it up.",
        latencyMs: null,
        hostname: null,
        agentVersion: null,
        connectedAccounts: null,
        connectedDevices: null,
        lastHeartbeat: null,
      });
      return;
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${agentUrl}/status`, { signal: controller.signal });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        res.json({
          connected: false, url: agentUrl,
          platform: null, isMac: null,
          messagesAppAvailable: null, appleScriptAvailable: null,
          error: `Mac Agent responded with ${response.status}`,
          latencyMs, hostname: null, agentVersion: null,
          connectedAccounts: null, connectedDevices: null, lastHeartbeat: null,
        });
        return;
      }

      const data = (await response.json()) as Record<string, unknown>;
      res.json({
        connected: true, url: agentUrl,
        platform: (data.platform as string) ?? null,
        isMac: (data.isMac as boolean) ?? null,
        messagesAppAvailable: (data.messagesAppAvailable as boolean) ?? null,
        appleScriptAvailable: (data.appleScriptAvailable as boolean) ?? null,
        error: null, latencyMs,
        hostname: (data.hostname as string) ?? null,
        agentVersion: (data.agentVersion as string) ?? null,
        connectedAccounts: null, connectedDevices: null, lastHeartbeat: null,
      });
    } catch (fetchErr: unknown) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      const isTimeout = errMsg.includes("abort");
      res.json({
        connected: false, url: agentUrl,
        platform: null, isMac: null,
        messagesAppAvailable: null, appleScriptAvailable: null,
        error: isTimeout
          ? "Connection timed out. Is the Mac Agent running and the tunnel active?"
          : `Cannot reach Mac Agent: ${errMsg}`,
        latencyMs: null, hostname: null, agentVersion: null,
        connectedAccounts: null, connectedDevices: null, lastHeartbeat: null,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Mac agent status check failed");
    res.status(500).json({ error: "Internal error checking Mac Agent status" });
  }
});

// ── GET /api/agents/:agentId ──────────────────────────────────────────────────

router.get("/agents/:agentId", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(macAgentsTable)
      .where(eq(macAgentsTable.agentId, req.params.agentId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(serialiseAgent(rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to get agent");
    res.status(500).json({ error: "Failed to get agent" });
  }
});

// ── DELETE /api/agents/:agentId ───────────────────────────────────────────────

router.delete("/agents/:agentId", async (req, res) => {
  try {
    await db
      .delete(macAgentsTable)
      .where(eq(macAgentsTable.agentId, req.params.agentId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete agent");
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

// ── GET /api/agents/download ──────────────────────────────────────────────────

router.get("/agents/download", (_req, res) => {
  const script = buildInstallerScript();
  res.setHeader("Content-Disposition", 'attachment; filename="dispatch-agent-setup.sh"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

// ── Mac Agent installer ───────────────────────────────────────────────────────

function buildInstallerScript(): string {
  return `#!/bin/bash
# =============================================================
#  Dispatch — Mac Agent Setup Script v3.0
#  Installs the Dispatch Mac Agent on your Mac.
#  Run: chmod +x dispatch-agent-setup.sh && ./dispatch-agent-setup.sh
# =============================================================

set -e

AGENT_VERSION="3.0.0"
AGENT_DIR="$HOME/DispatchAgent"
LOG_DIR="$AGENT_DIR/logs"
CONFIG_FILE="$AGENT_DIR/config.json"
SERVER_FILE="$AGENT_DIR/server.js"
PORT="\${MAC_AGENT_PORT:-3001}"
DISPATCH_URL="\${DISPATCH_URL:-}"

BOLD="\\033[1m"
GREEN="\\033[0;32m"
YELLOW="\\033[0;33m"
RED="\\033[0;31m"
CYAN="\\033[0;36m"
RESET="\\033[0m"

info()    { echo -e "  \${CYAN}ℹ\${RESET}  $1"; }
success() { echo -e "  \${GREEN}✓\${RESET}  $1"; }
warn()    { echo -e "  \${YELLOW}⚠\${RESET}  $1"; }
error()   { echo -e "  \${RED}✗\${RESET}  $1"; }
header()  { echo -e "\\n\${BOLD}$1\${RESET}\\n"; }

clear
echo ""
echo -e "\${BOLD}  ╔══════════════════════════════════════════╗\${RESET}"
echo -e "\${BOLD}  ║       Dispatch Mac Agent v$AGENT_VERSION          ║\${RESET}"
echo -e "\${BOLD}  ╚══════════════════════════════════════════╝\${RESET}"
echo ""

# ── 1. Prerequisites ───────────────────────────────────────────
header "Step 1: Checking prerequisites"

if [[ "\$(uname)" != "Darwin" ]]; then
  error "This script must run on macOS."
  exit 1
fi
success "macOS detected: \$(sw_vers -productVersion)"

MACOS_MAJOR=\$(sw_vers -productVersion | cut -d. -f1)
if (( MACOS_MAJOR < 12 )); then
  warn "macOS 12 (Monterey) or later is recommended."
fi

if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install it from https://nodejs.org/"
  exit 1
fi
NODE_VER=\$(node --version)
success "Node.js: \$NODE_VER"

if ! command -v osascript &>/dev/null; then
  error "osascript not found — is this macOS?"
  exit 1
fi
success "AppleScript (osascript) available"

# ── 2. Create directories ──────────────────────────────────────
header "Step 2: Creating installation directory"

mkdir -p "\$AGENT_DIR"
mkdir -p "\$LOG_DIR"
success "Agent directory: \$AGENT_DIR"

# ── 3. Generate config ─────────────────────────────────────────
header "Step 3: Generating configuration"

if [[ -f "\$CONFIG_FILE" ]]; then
  info "Existing config found — preserving Agent ID"
  AGENT_ID=\$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('\$CONFIG_FILE','utf8')).agentId||'')}catch{}" 2>/dev/null || echo "")
fi

if [[ -z "\$AGENT_ID" ]]; then
  AGENT_ID="agent-\$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")"
  success "Generated new Agent ID: \$AGENT_ID"
else
  success "Reusing Agent ID: \$AGENT_ID"
fi

HOSTNAME_VAL=\$(hostname -s)

cat > "\$CONFIG_FILE" <<CONFIGEOF
{
  "agentId": "\$AGENT_ID",
  "hostname": "\$HOSTNAME_VAL",
  "port": \$PORT,
  "dispatchUrl": "\$DISPATCH_URL",
  "logDir": "\$LOG_DIR",
  "heartbeatIntervalMs": 30000
}
CONFIGEOF
success "Configuration written"

# ── 4. Install agent server ────────────────────────────────────
header "Step 4: Installing Mac Agent server"

cat > "\$SERVER_FILE" <<'SERVEREOF'
// Dispatch Mac Agent v3.0 — single-file modular server
// No npm dependencies required.

import http from "node:http";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import os from "node:os";
import crypto from "node:crypto";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

const AGENT_VERSION = "3.0.0";

// ── Config ─────────────────────────────────────────────────────
function loadConfig() {
  const configPath = join(__dirname, "config.json");
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return { agentId: "agent-" + crypto.randomBytes(8).toString("hex"), port: 3001, heartbeatIntervalMs: 30000 };
  }
}
const config = loadConfig();
const PORT = process.env.MAC_AGENT_PORT || config.port || 3001;

// ── Logger ─────────────────────────────────────────────────────
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
function log(level, category, message, data) {
  const entry = { ts: new Date().toISOString(), level, category, message, ...(data ? { data } : {}) };
  console.log(JSON.stringify(entry));
}

// ── Send queue ─────────────────────────────────────────────────
const sendQueue = [];
let isSending = false;

// ── AppleScript helpers ────────────────────────────────────────
function sanitiseForAppleScript(str) {
  if (typeof str !== "string") throw new Error("Expected string");
  // Escape backslashes and double quotes, reject null bytes
  if (str.includes("\\0")) throw new Error("Null byte in input");
  return str.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
}

async function runAppleScript(script) {
  const { stdout, stderr } = await execAsync(\`osascript -e \${JSON.stringify(script)}\`, { timeout: 30000 });
  if (stderr && stderr.trim()) log("warn", "applescript", "stderr", { stderr: stderr.trim() });
  return stdout.trim();
}

async function sendViaMessages(phoneNumber, content) {
  const safePhone = sanitiseForAppleScript(phoneNumber);
  const safeContent = sanitiseForAppleScript(content);
  const script = \`
    tell application "Messages"
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "\${safePhone}" of targetService
      send "\${safeContent}" to targetBuddy
    end tell
  \`;
  await runAppleScript(script);
}

async function getMessagesAccounts() {
  try {
    const script = \`
      set output to ""
      tell application "Messages"
        repeat with acct in accounts
          set output to output & (name of acct) & "\\n"
        end repeat
      end tell
      return output
    \`;
    const out = await runAppleScript(script);
    return out.split("\\n").map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function checkMessagesRunning() {
  try {
    const out = await runAppleScript('tell application "System Events" to (name of processes) contains "Messages"');
    return out.trim() === "true";
  } catch { return false; }
}

async function checkAppleScriptAvailable() {
  try {
    await execAsync("osascript -e 'return 1'", { timeout: 3000 });
    return true;
  } catch { return false; }
}

// ── System info ────────────────────────────────────────────────
function getCpuUsage() {
  const cpus = os.cpus();
  let total = 0, idle = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return Math.round(((total - idle) / total) * 100);
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

async function getMacosVersion() {
  try {
    const { stdout } = await execAsync("sw_vers -productVersion", { timeout: 3000 });
    return stdout.trim();
  } catch { return null; }
}

// ── Status ─────────────────────────────────────────────────────
async function getStatus() {
  const [macosVersion, appleScriptAvailable, messagesRunning, accounts] = await Promise.all([
    getMacosVersion(),
    checkAppleScriptAvailable(),
    checkMessagesRunning(),
    getMessagesAccounts().catch(() => []),
  ]);

  return {
    agentId: config.agentId,
    hostname: os.hostname(),
    platform: os.platform(),
    isMac: os.platform() === "darwin",
    macosVersion,
    nodeVersion: process.version,
    agentVersion: AGENT_VERSION,
    messagesAppAvailable: true,
    messagesAppRunning: messagesRunning,
    appleScriptAvailable,
    connectedAccounts: accounts,
    connectedDevices: [],
    cpuUsage: getCpuUsage(),
    memoryUsage: getMemoryUsage(),
    uptime: Math.round(process.uptime()),
    queueSize: sendQueue.length,
  };
}

// ── Heartbeat ──────────────────────────────────────────────────
let heartbeatTimer = null;

async function sendHeartbeat() {
  const dispatchUrl = config.dispatchUrl;
  if (!dispatchUrl) return;

  try {
    const status = await getStatus();
    const payload = {
      agentId: config.agentId,
      hostname: status.hostname,
      os: status.platform,
      macosVersion: status.macosVersion,
      nodeVersion: status.nodeVersion,
      agentVersion: AGENT_VERSION,
      messagesAppRunning: status.messagesAppRunning,
      messagesAppAvailable: status.messagesAppAvailable,
      appleScriptAvailable: status.appleScriptAvailable,
      connectedAccounts: status.connectedAccounts,
      connectedDevices: status.connectedDevices,
      latencyMs: null,
      cpuUsage: status.cpuUsage,
      memoryUsage: status.memoryUsage,
      queueSize: sendQueue.length,
      lastActivityAt: null,
    };

    const t0 = Date.now();
    const res = await fetch(\`\${dispatchUrl}/api/agents/heartbeat\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, latencyMs: null }),
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - t0;

    if (res.ok) {
      log("debug", "heartbeat", \`Heartbeat sent (latency: \${latencyMs}ms)\`);
      // Send again with measured latency
      await fetch(\`\${dispatchUrl}/api/agents/heartbeat\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, latencyMs }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    } else {
      log("warn", "heartbeat", \`Heartbeat failed: HTTP \${res.status}\`);
    }
  } catch (err) {
    log("warn", "heartbeat", \`Heartbeat error: \${err.message}\`);
  }
}

function startHeartbeat() {
  const intervalMs = config.heartbeatIntervalMs || 30000;
  sendHeartbeat(); // immediate first beat
  heartbeatTimer = setInterval(sendHeartbeat, intervalMs);
  log("info", "heartbeat", \`Heartbeat started (interval: \${intervalMs}ms)\`);
}

// ── HTTP server ────────────────────────────────────────────────
function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 1e6) reject(new Error("Body too large")); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, \`http://localhost:\${PORT}\`);

  try {
    if (req.method === "GET" && url.pathname === "/status") {
      const status = await getStatus();
      return json(res, 200, status);
    }

    if (req.method === "GET" && url.pathname === "/accounts") {
      const accounts = await getMessagesAccounts();
      return json(res, 200, { accounts });
    }

    if (req.method === "POST" && url.pathname === "/send") {
      const body = await readBody(req);
      const { phoneNumbers, content } = body;

      if (!Array.isArray(phoneNumbers) || !phoneNumbers.length || typeof content !== "string" || !content.trim()) {
        return json(res, 400, { error: "phoneNumbers (array) and content (string) are required" });
      }

      const results = [];
      for (const phoneNumber of phoneNumbers) {
        if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
          results.push({ phoneNumber: String(phoneNumber), success: false, error: "Invalid phone number" });
          continue;
        }
        const t0 = Date.now();
        try {
          await sendViaMessages(phoneNumber.trim(), content);
          results.push({ phoneNumber, success: true, durationMs: Date.now() - t0 });
          log("info", "send", \`Sent to \${phoneNumber}\`);
        } catch (err) {
          results.push({ phoneNumber, success: false, error: err.message, durationMs: Date.now() - t0 });
          log("error", "send", \`Failed to send to \${phoneNumber}\`, { error: err.message });
        }
        // Brief pause between sends to avoid Messages.app rate limiting
        await new Promise(r => setTimeout(r, 500));
      }

      return json(res, 200, results);
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, uptime: Math.round(process.uptime()), queueSize: sendQueue.length });
    }

    json(res, 404, { error: "Not found" });
  } catch (err) {
    log("error", "server", \`Request error: \${err.message}\`);
    json(res, 500, { error: "Internal error" });
  }
});

server.listen(PORT, () => {
  const line = "─".repeat(54);
  console.log("");
  console.log("  ╭" + line + "╮");
  console.log("  │  Dispatch Mac Agent v" + AGENT_VERSION + "                          │");
  console.log("  │  Running on port " + PORT + "                              │");
  console.log("  ╰" + line + "╯");
  console.log("");
  console.log("  Local:   http://localhost:" + PORT);
  console.log("  Status:  http://localhost:" + PORT + "/status");
  console.log("");
  if (config.dispatchUrl) {
    console.log("  Dispatch: " + config.dispatchUrl);
    console.log("  Heartbeats: every " + Math.round((config.heartbeatIntervalMs || 30000) / 1000) + "s");
    console.log("");
    startHeartbeat();
  } else {
    console.log("  ⚠  No Dispatch URL configured.");
    console.log("  Open Dispatch → Settings → Mac Agent URL, paste your tunnel URL, save.");
    console.log("  The agent will start sending heartbeats automatically.");
    console.log("");
  }
  console.log("  Next: open a NEW Terminal and start a tunnel:");
  console.log("");
  console.log("    Cloudflare (free, no account needed):");
  console.log("      npx cloudflared tunnel --url http://localhost:" + PORT);
  console.log("");
  console.log("    ngrok:");
  console.log("      ngrok http " + PORT);
  console.log("");
  console.log("  Paste the HTTPS URL in Dispatch → Settings → Mac Agent URL");
  console.log("  Keep this window open while using Dispatch.");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
  log("info", "server", "Mac Agent started", { port: PORT, agentId: config.agentId, hostname: os.hostname() });
});

process.on("SIGINT", () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  log("info", "server", "Mac Agent stopped");
  console.log("\\n  Dispatch Mac Agent stopped.\\n");
  process.exit(0);
});
SERVEREOF

success "Agent server installed"

# ── 5. Verify Messages.app ─────────────────────────────────────
header "Step 5: Checking Messages.app"

if osascript -e 'tell application "System Events" to (name of processes) contains "Messages"' 2>/dev/null | grep -q "true"; then
  success "Messages.app is running"
else
  warn "Messages.app is not currently running — please open it before sending messages"
fi

# ── 6. Tunnel setup ────────────────────────────────────────────
header "Step 6: Tunnel setup (optional)"

echo "  The agent runs on your Mac at http://localhost:\$PORT"
echo "  To use it from Replit, expose it with a tunnel:"
echo ""
echo "    Cloudflare (free, no account needed):"
echo "      npx cloudflared tunnel --url http://localhost:\$PORT"
echo ""
echo "    ngrok:"
echo "      ngrok http \$PORT"
echo ""
echo "  Then paste the HTTPS URL in Dispatch → Settings → Mac Agent URL."
echo ""

# ── 7. LaunchAgent (optional auto-start) ──────────────────────
header "Step 7: Auto-start on login (optional)"

read -r -p "  Install LaunchAgent to start automatically at login? [y/N] " INSTALL_LAUNCH
if [[ "\$INSTALL_LAUNCH" =~ ^[Yy]$ ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="\$PLIST_DIR/com.dispatch.agent.plist"
  mkdir -p "\$PLIST_DIR"
  cat > "\$PLIST_FILE" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.dispatch.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>\$AGENT_DIR/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>\$AGENT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>\$LOG_DIR/stdout.log</string>
  <key>StandardErrorPath</key>
  <string>\$LOG_DIR/stderr.log</string>
</dict>
</plist>
PLISTEOF
  launchctl load "\$PLIST_FILE" 2>/dev/null && success "LaunchAgent installed and loaded" || warn "Could not load LaunchAgent — try running: launchctl load \$PLIST_FILE"
else
  info "Skipping LaunchAgent"
fi

# ── 8. Start ───────────────────────────────────────────────────
header "Step 8: Starting Mac Agent"

echo "  Starting agent in this terminal. Keep this window open."
echo "  Open a new terminal window for the tunnel."
echo ""

node --experimental-vm-modules "\$SERVER_FILE"
`;

  return script;
}

export default router;
