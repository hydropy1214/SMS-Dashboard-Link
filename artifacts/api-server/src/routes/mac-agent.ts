import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getMacAgentUrl(): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "macAgentUrl"))
    .limit(1);
  return rows[0]?.value ?? null;
}

// GET /api/mac-agent/status
router.get("/mac-agent/status", async (req, res) => {
  try {
    const agentUrl = await getMacAgentUrl();

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
          latencyMs,
        });
        return;
      }

      const data = (await response.json()) as {
        platform?: string;
        isMac?: boolean;
        messagesAppAvailable?: boolean;
        appleScriptAvailable?: boolean;
        agentId?: string;
        agentVersion?: string;
        dispatchConnected?: boolean;
        lastHeartbeatStatus?: string | null;
      };
      res.json({
        connected: true, url: agentUrl,
        platform: data.platform ?? null,
        isMac: data.isMac ?? null,
        messagesAppAvailable: data.messagesAppAvailable ?? null,
        appleScriptAvailable: data.appleScriptAvailable ?? null,
        agentId: data.agentId ?? null,
        agentVersion: data.agentVersion ?? null,
        dispatchConnected: data.dispatchConnected ?? null,
        lastHeartbeatStatus: data.lastHeartbeatStatus ?? null,
        error: null, latencyMs,
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
        latencyMs: null,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Mac agent status check failed");
    res.status(500).json({ error: "Internal error checking Mac Agent status" });
  }
});

// GET /api/mac-agent/accounts
router.get("/mac-agent/accounts", async (req, res) => {
  const agentUrl = await getMacAgentUrl();
  if (!agentUrl) {
    res.json({ accounts: [], error: "Mac Agent not configured" });
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const r = await fetch(`${agentUrl}/accounts`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) {
      res.json({ accounts: [], error: `Agent error ${r.status}` });
      return;
    }
    const data = (await r.json()) as { accounts: string[]; error?: string };
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reach Mac Agent";
    res.json({ accounts: [], error: msg });
  }
});

// POST /api/mac-agent/test-send — send a test message via the agent
router.post("/mac-agent/test-send", async (req, res) => {
  const agentUrl = await getMacAgentUrl();
  if (!agentUrl) {
    res.status(503).json({ success: false, error: "Mac Agent not configured. Set the tunnel URL in Settings first." });
    return;
  }
  const { phoneNumber } = req.body as { phoneNumber?: string };
  if (!phoneNumber?.trim()) {
    res.status(400).json({ success: false, error: "phoneNumber is required" });
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const r = await fetch(`${agentUrl}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = (await r.json()) as { success: boolean; error?: string; method?: string; durationMs?: number };
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reach Mac Agent";
    const isTimeout = msg.includes("abort");
    res.json({
      success: false,
      error: isTimeout
        ? "Test timed out — Mac Agent took too long to respond. Is Messages.app open?"
        : `Cannot reach Mac Agent: ${msg}`,
    });
  }
});

// GET /api/mac-agent/download — serves the Mac Agent installer script
router.get("/mac-agent/download", (_req, res) => {
  const script = `#!/bin/bash
# ============================================================
#  Dispatch — Mac Agent Setup Script v3.0
#
#  Runs on your Mac to enable iMessage/SMS sending from the
#  Dispatch dashboard. Requires macOS + Node.js 18+.
#
#  Usage:
#    chmod +x dispatch-agent-setup.sh && ./dispatch-agent-setup.sh
#
#  To connect heartbeats (recommended):
#    DISPATCH_URL=https://your-replit-url.replit.dev ./dispatch-agent-setup.sh
#
#  After starting, expose the agent with a tunnel:
#    Cloudflare: npx cloudflared tunnel --url http://localhost:3001
#    ngrok:      ngrok http 3001
#
#  Then paste the HTTPS tunnel URL in Dispatch → Settings.
# ============================================================

set -e

AGENT_DIR="\$HOME/.dispatch-agent"
LOG_DIR="\$AGENT_DIR/logs"
PORT=\${MAC_AGENT_PORT:-3001}

# Colour helpers
RED="\\033[0;31m"; GREEN="\\033[0;32m"; YELLOW="\\033[1;33m"; CYAN="\\033[0;36m"; RESET="\\033[0m"
info()    { echo -e "  \${CYAN}→\${RESET} \$1"; }
success() { echo -e "  \${GREEN}✓\${RESET} \$1"; }
warn()    { echo -e "  \${YELLOW}⚠\${RESET} \$1"; }
error()   { echo -e "  \${RED}✗\${RESET} \$1"; }
header()  { echo ""; echo -e "  \${CYAN}── \$1 ──\${RESET}"; }

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   Dispatch Mac Agent  ·  Installer v3.0     │"
echo "  └─────────────────────────────────────────────┘"
echo ""

# ── 1. Platform check ──────────────────────────────────────
header "Step 1: Checking Requirements"
if [[ "\$(uname)" != "Darwin" ]]; then
  error "This script must be run on macOS. Exiting."
  exit 1
fi
success "macOS detected"

# ── 2. Node.js check ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  error "Node.js not found."
  info  "Install it from https://nodejs.org (choose LTS)"
  exit 1
fi
NODE_VER=\$(node -e "process.stdout.write(process.version)")
NODE_MAJOR=\$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [[ \$NODE_MAJOR -lt 18 ]]; then
  error "Node.js 18+ required. You have \$NODE_VER."
  info  "Update at https://nodejs.org"
  exit 1
fi
success "Node.js \$NODE_VER"

# ── 3. Create directories ──────────────────────────────────
header "Step 2: Installing Agent"
mkdir -p "\$AGENT_DIR" "\$LOG_DIR"
success "Agent directory: \$AGENT_DIR"

# ── 4. Write package.json ──────────────────────────────────
cat > "\$AGENT_DIR/package.json" <<'PKGJSON'
{
  "name": "dispatch-mac-agent",
  "version": "3.0.0",
  "type": "module",
  "description": "Dispatch Mac Agent — bridges the dashboard to Messages.app"
}
PKGJSON
success "package.json written"

# ── 5. Write server.js ────────────────────────────────────
cat > "\$AGENT_DIR/server.js" <<'SERVEREOF'
import { createServer } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import os from "os";

const execAsync = promisify(exec);
const PORT = Number(process.env.MAC_AGENT_PORT || 3001);
const AGENT_VERSION = "3.0.0";
const __dir = dirname(new URL(import.meta.url).pathname);
const CONFIG_FILE = join(__dir, "config.json");

// ── Config persistence ────────────────────────────────────
function readConfig() {
  if (existsSync(CONFIG_FILE)) {
    try { return JSON.parse(readFileSync(CONFIG_FILE, "utf8")); } catch {}
  }
  return {};
}
function saveConfig(data) {
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

let config = readConfig();
if (!config.agentId) {
  config.agentId = randomUUID();
}
// Persist DISPATCH_URL from env (so future restarts without the env var still work)
if (process.env.DISPATCH_URL) {
  config.dispatchUrl = process.env.DISPATCH_URL.replace(/\\/+$/, "");
}
saveConfig(config);

const AGENT_ID = config.agentId;
const DISPATCH_URL = config.dispatchUrl || null;

// ── HTTP helpers ──────────────────────────────────────────
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function jsonResp(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ── macOS helpers ─────────────────────────────────────────
async function checkAppleScript() {
  try { await execAsync("which osascript", { timeout: 3000 }); return true; }
  catch { return false; }
}

async function checkMessagesRunning() {
  try {
    const { stdout } = await execAsync(
      "osascript -e 'tell application \"System Events\" to (name of processes) contains \"Messages\"'",
      { timeout: 5000 }
    );
    return stdout.trim() === "true";
  } catch { return false; }
}

async function getMessagesAccounts() {
  try {
    const { stdout } = await execAsync(
      "osascript -e 'tell application \"Messages\" to get name of every account'",
      { timeout: 8000 }
    );
    const raw = stdout.trim();
    if (!raw) return [];
    return raw.split(", ").map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}

async function getMacOSVersion() {
  try {
    const { stdout } = await execAsync("sw_vers -productVersion", { timeout: 3000 });
    return stdout.trim();
  } catch { return null; }
}

// ── Message sending: iMessage → SMS → auto fallback ───────
async function runAppleScript(script, timeout) {
  // Escape single quotes for shell embedding: ' → '"'"'
  const escaped = script.replace(/'/g, "'\"'\"'");
  await execAsync("osascript -e '" + escaped + "'", { timeout });
}

async function sendMessage(phoneNumber, message) {
  // Sanitise inputs
  const safePhone = phoneNumber.replace(/['"\\]/g, "").trim();
  // Escape backslashes and double-quotes for AppleScript string embedding
  const safeMsg = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const start = Date.now();

  const attempts = [
    {
      label: "iMessage",
      script: "tell application \"Messages\"\nset s to 1st service whose service type = iMessage\nset b to buddy \"" + safePhone + "\" of s\nsend \"" + safeMsg + "\" to b\nend tell",
    },
    {
      label: "SMS",
      script: "tell application \"Messages\"\nset s to 1st service whose service type = SMS\nset b to buddy \"" + safePhone + "\" of s\nsend \"" + safeMsg + "\" to b\nend tell",
    },
    {
      label: "auto",
      script: "tell application \"Messages\"\nsend \"" + safeMsg + "\" to buddy \"" + safePhone + "\"\nend tell",
    },
  ];

  let lastError = "Unknown error";
  for (const { label, script } of attempts) {
    try {
      await runAppleScript(script, 15000);
      return { success: true, method: label, durationMs: Date.now() - start };
    } catch (err) {
      lastError = err.message || "Unknown error";
    }
  }

  // Provide actionable error hints
  let hint = lastError;
  if (lastError.toLowerCase().includes("can't get buddy")) {
    hint = "Number '" + phoneNumber + "' is not reachable via iMessage or SMS on this Mac. Make sure Messages.app has this contact and Text Message Forwarding is enabled on your iPhone if sending SMS.";
  } else if (lastError.includes("Messages is not running")) {
    hint = "Messages.app is not running. Please open Messages.app on your Mac and sign in.";
  } else if (lastError.includes("execution error") || lastError.includes("osascript")) {
    hint = "AppleScript error — try reopening Messages.app. Detail: " + lastError;
  }

  return { success: false, error: hint, method: null, durationMs: Date.now() - start };
}

// ── Heartbeat ─────────────────────────────────────────────
let lastHeartbeatStatus = null;
let lastHeartbeatAt = null;

async function sendHeartbeat() {
  if (!DISPATCH_URL) return;
  try {
    const [appleScriptAvailable, messagesRunning, accounts, macosVersion] = await Promise.all([
      checkAppleScript(),
      checkMessagesRunning(),
      getMessagesAccounts(),
      getMacOSVersion(),
    ]);
    const mem = process.memoryUsage();
    const payload = {
      agentId: AGENT_ID,
      hostname: os.hostname(),
      os: os.platform(),
      macosVersion,
      nodeVersion: process.version,
      agentVersion: AGENT_VERSION,
      messagesAppRunning: messagesRunning,
      messagesAppAvailable: messagesRunning,
      appleScriptAvailable,
      connectedAccounts: accounts,
      connectedDevices: [],
      cpuUsage: 0,
      memoryUsage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      queueSize: 0,
      lastActivityAt: null,
      latencyMs: null,
    };
    const r = await fetch(DISPATCH_URL + "/api/agents/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    lastHeartbeatStatus = r.ok ? "ok" : ("error " + r.status);
    lastHeartbeatAt = new Date().toISOString();
    if (r.ok) {
      process.stdout.write("  ✓ Heartbeat → " + DISPATCH_URL + " (" + r.status + ")\n");
    } else {
      process.stdout.write("  ⚠ Heartbeat failed: " + r.status + "\n");
    }
  } catch (err) {
    lastHeartbeatStatus = "failed: " + (err.message || "unknown");
    process.stdout.write("  ✗ Heartbeat error: " + (err.message || "unknown") + "\n");
  }
}

// ── Request body reader ───────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

// ── HTTP Server ───────────────────────────────────────────
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, "http://localhost:" + PORT);

  // GET /status
  if (req.method === "GET" && url.pathname === "/status") {
    const platform = os.platform();
    const isMac = platform === "darwin";
    const [appleScriptAvailable, messagesAppAvailable, macosVersion] = await Promise.all([
      checkAppleScript(),
      isMac ? checkMessagesRunning() : Promise.resolve(false),
      getMacOSVersion(),
    ]);
    return jsonResp(res, 200, {
      platform, isMac, appleScriptAvailable, messagesAppAvailable,
      agentVersion: AGENT_VERSION,
      agentId: AGENT_ID,
      hostname: os.hostname(),
      macosVersion,
      dispatchConnected: Boolean(DISPATCH_URL),
      dispatchUrl: DISPATCH_URL,
      lastHeartbeatStatus,
      lastHeartbeatAt,
    });
  }

  // GET /accounts
  if (req.method === "GET" && url.pathname === "/accounts") {
    const hasAppleScript = await checkAppleScript();
    if (!hasAppleScript) return jsonResp(res, 200, { accounts: [], error: "AppleScript not available on this machine" });
    const accounts = await getMessagesAccounts();
    return jsonResp(res, 200, { accounts, count: accounts.length });
  }

  // POST /send — bulk send
  if (req.method === "POST" && url.pathname === "/send") {
    let parsed;
    try { parsed = await readBody(req); }
    catch { return jsonResp(res, 400, { error: "Invalid JSON body" }); }
    const { phoneNumbers, content } = parsed;
    if (!Array.isArray(phoneNumbers) || typeof content !== "string" || !content) {
      return jsonResp(res, 400, { error: "phoneNumbers (string[]) and content (string) are required" });
    }
    const results = [];
    for (const phone of phoneNumbers) {
      const result = await sendMessage(String(phone), content);
      results.push({ phoneNumber: phone, ...result });
    }
    return jsonResp(res, 200, results);
  }

  // POST /test — test send to a single number
  if (req.method === "POST" && url.pathname === "/test") {
    let parsed;
    try { parsed = await readBody(req); }
    catch { return jsonResp(res, 400, { error: "Invalid JSON body" }); }
    const { phoneNumber, content } = parsed;
    if (!phoneNumber) return jsonResp(res, 400, { error: "phoneNumber is required" });
    const testContent = content || "✅ Dispatch test — if you got this, everything is working!";
    const result = await sendMessage(String(phoneNumber), testContent);
    return jsonResp(res, 200, result);
  }

  // POST /heartbeat-trigger — manually trigger a heartbeat (for debugging)
  if (req.method === "POST" && url.pathname === "/heartbeat-trigger") {
    if (!DISPATCH_URL) return jsonResp(res, 400, { error: "DISPATCH_URL not configured. Restart with DISPATCH_URL=https://... set." });
    sendHeartbeat().catch(() => {});
    return jsonResp(res, 200, { queued: true });
  }

  jsonResp(res, 404, { error: "Not found" });
});

server.listen(PORT, async () => {
  const line = "─".repeat(54);
  console.log("");
  console.log("  ╭" + line + "╮");
  console.log("  │  Dispatch Mac Agent v" + AGENT_VERSION + "                          │");
  console.log("  │  Agent ID: " + AGENT_ID.slice(0, 8) + "…                              │");
  console.log("  ╰" + line + "╯");
  console.log("");
  console.log("  Local URL : http://localhost:" + PORT);
  console.log("  Status    : http://localhost:" + PORT + "/status");
  if (DISPATCH_URL) {
    console.log("  Dashboard : " + DISPATCH_URL);
    console.log("  Heartbeat : every 30 seconds  ✓");
    console.log("");
    // Send first heartbeat immediately
    console.log("  Sending first heartbeat...");
    await sendHeartbeat();
    setInterval(sendHeartbeat, 30000);
  } else {
    console.log("");
    console.log("  ⚠  Heartbeats are DISABLED — DISPATCH_URL not set.");
    console.log("     The Connected Macs page won't show this agent.");
    console.log("     Restart with: DISPATCH_URL=https://your-replit-url node server.js");
  }
  console.log("");
  console.log("  ─── Next steps ──────────────────────────────────");
  console.log("  Open a NEW Terminal and start a tunnel:");
  console.log("");
  console.log("    Cloudflare (free, no account):");
  console.log("      npx cloudflared tunnel --url http://localhost:" + PORT);
  console.log("");
  console.log("    ngrok (free account required):");
  console.log("      ngrok http " + PORT);
  console.log("");
  console.log("  Copy the HTTPS URL the tunnel prints, then paste it");
  console.log("  in Dispatch → Settings → Mac Agent URL.");
  console.log("");
  console.log("  Keep this Terminal window open while using Dispatch.");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});

process.on("SIGINT", () => {
  console.log("\n  Dispatch Mac Agent stopped.\n");
  process.exit(0);
});
SERVEREOF

success "server.js written"

# ── 6. Write config.json with DISPATCH_URL ─────────────────
if [[ -n "\$DISPATCH_URL" ]]; then
  header "Step 3: Saving Dashboard URL"
  EXISTING_ID=""
  CONFIG_PATH="\$AGENT_DIR/config.json"
  if [[ -f "\$CONFIG_PATH" ]]; then
    EXISTING_ID=\$(node -e "try{const c=require('\$CONFIG_PATH');process.stdout.write(c.agentId||'')}catch{}" 2>/dev/null || true)
  fi
  if [[ -z "\$EXISTING_ID" ]]; then
    EXISTING_ID=\$(node -e "process.stdout.write(require('crypto').randomUUID())")
  fi
  # Strip trailing slash
  CLEAN_URL="\${DISPATCH_URL%/}"
  node -e "
    const fs = require('fs');
    const cfg = { agentId: '\$EXISTING_ID', dispatchUrl: '\$CLEAN_URL' };
    fs.writeFileSync('\$CONFIG_PATH', JSON.stringify(cfg, null, 2));
    console.log('  Config saved.');
  "
  success "Dashboard URL saved: \$CLEAN_URL"
  success "Agent ID: \$EXISTING_ID"
else
  warn "DISPATCH_URL not set — heartbeats disabled."
  warn "Run with: DISPATCH_URL=https://your-url ./dispatch-agent-setup.sh"
  warn "Or restart later: DISPATCH_URL=https://your-url node \$AGENT_DIR/server.js"
fi

# ── 7. LaunchAgent (optional auto-start) ───────────────────
header "Step 4: Auto-Start (optional)"
read -r -p "  Install LaunchAgent to start automatically at login? [y/N] " INSTALL_LAUNCH
if [[ "\$INSTALL_LAUNCH" =~ ^[Yy]$ ]]; then
  PLIST_DIR="\$HOME/Library/LaunchAgents"
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
  <key>EnvironmentVariables</key>
  <dict>
    <key>MAC_AGENT_PORT</key>
    <string>\${MAC_AGENT_PORT:-3001}</string>
  </dict>
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
  launchctl load "\$PLIST_FILE" 2>/dev/null && success "LaunchAgent installed and started" || warn "Could not load LaunchAgent automatically. Run: launchctl load \$PLIST_FILE"
else
  info "Skipping LaunchAgent"
fi

# ── 8. Start ───────────────────────────────────────────────
header "Step 5: Starting Mac Agent"
echo ""
echo "  Starting agent. Keep this Terminal window open."
echo "  Open a NEW Terminal for the tunnel command."
echo ""

if [[ -n "\$DISPATCH_URL" ]]; then
  DISPATCH_URL="\$DISPATCH_URL" node "\$AGENT_DIR/server.js"
else
  node "\$AGENT_DIR/server.js"
fi
`;

  res.setHeader("Content-Disposition", 'attachment; filename="dispatch-agent-setup.sh"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

export default router;
