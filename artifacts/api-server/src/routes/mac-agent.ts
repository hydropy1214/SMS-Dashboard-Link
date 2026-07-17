import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { agentServerJs } from "../agent-server-js.js";

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
cat > "\$AGENT_DIR/server.js" << 'AGENTEOF'
${agentServerJs}
AGENTEOF

success "server.js written"

# ── 6. Write config.json with DISPATCH_URL ─────────────────
if [[ -n "\$DISPATCH_URL" ]]; then
  header "Step 3: Saving Dashboard URL"
  EXISTING_ID=""
  CONFIG_PATH="\$AGENT_DIR/config.json"
  if [[ -f "\$CONFIG_PATH" ]]; then
    EXISTING_ID=\$(node -e "
      import { readFileSync } from 'fs';
      try {
        const c = JSON.parse(readFileSync('\$CONFIG_PATH', 'utf8'));
        process.stdout.write(c.agentId || '');
      } catch {}
    " 2>/dev/null || true)
  fi
  if [[ -z "\$EXISTING_ID" ]]; then
    EXISTING_ID=\$(node -e "import { randomUUID } from 'crypto'; process.stdout.write(randomUUID());")
  fi
  # Strip trailing slash
  CLEAN_URL="\${DISPATCH_URL%/}"
  node -e "
    import { writeFileSync } from 'fs';
    const cfg = { agentId: '\$EXISTING_ID', dispatchUrl: '\$CLEAN_URL' };
    writeFileSync('\$CONFIG_PATH', JSON.stringify(cfg, null, 2));
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
LAUNCH_AGENT_STARTED=false
if [[ "\$INSTALL_LAUNCH" =~ ^[Yy]$ ]]; then
  NODE_BIN=\$(command -v node)
  if [[ -z "\$NODE_BIN" ]]; then
    error "Cannot find node binary path. Is Node.js in your PATH?"
    exit 1
  fi
  PLIST_DIR="\$HOME/Library/LaunchAgents"
  PLIST_FILE="\$PLIST_DIR/com.dispatch.agent.plist"
  mkdir -p "\$PLIST_DIR"
  # Unload any existing instance first to avoid port conflicts on re-runs
  launchctl unload "\$PLIST_FILE" 2>/dev/null || true
  cat > "\$PLIST_FILE" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.dispatch.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>\$NODE_BIN</string>
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
  if launchctl load "\$PLIST_FILE" 2>/dev/null; then
    success "LaunchAgent installed and started (using \$NODE_BIN)"
    LAUNCH_AGENT_STARTED=true
  else
    warn "Could not load LaunchAgent automatically. Run: launchctl load \$PLIST_FILE"
  fi
else
  info "Skipping LaunchAgent"
fi

# ── 8. Start (only if LaunchAgent didn't already start it) ─
if [[ "\$LAUNCH_AGENT_STARTED" == "true" ]]; then
  echo ""
  success "Agent is running in the background via LaunchAgent."
  info "Logs: \$LOG_DIR/stdout.log"
  info "To stop:   launchctl unload \$HOME/Library/LaunchAgents/com.dispatch.agent.plist"
  info "To restart: launchctl unload \$HOME/Library/LaunchAgents/com.dispatch.agent.plist && launchctl load \$HOME/Library/LaunchAgents/com.dispatch.agent.plist"
  echo ""
else
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
fi
`;

  res.setHeader("Content-Disposition", 'attachment; filename="dispatch-agent-setup.sh"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

export default router;
