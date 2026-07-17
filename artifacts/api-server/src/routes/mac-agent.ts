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
#  Dispatch — Mac Agent Setup Script v4.0
#
#  Fully automatic: installs the agent, starts a Cloudflare
#  tunnel, and registers the URL with your dashboard.
#  No manual tunnel step required.
#
#  Usage:
#    DISPATCH_URL=https://your-replit-url.replit.dev bash dispatch-agent-setup.sh
#
#  Requires: macOS, Node.js 18+
# ============================================================

AGENT_DIR="\$HOME/.dispatch-agent"
LOG_DIR="\$AGENT_DIR/logs"
PORT=\${MAC_AGENT_PORT:-3001}
PLIST_DIR="\$HOME/Library/LaunchAgents"
AGENT_PLIST="\$PLIST_DIR/com.dispatch.agent.plist"
TUNNEL_PLIST="\$PLIST_DIR/com.dispatch.tunnel.plist"

# ── Colour helpers ─────────────────────────────────────────
RED="\\033[0;31m"; GREEN="\\033[0;32m"; YELLOW="\\033[1;33m"
CYAN="\\033[0;36m"; BOLD="\\033[1m"; RESET="\\033[0m"
info()    { echo -e "  \${CYAN}→\${RESET} \$*"; }
success() { echo -e "  \${GREEN}✓\${RESET} \$*"; }
warn()    { echo -e "  \${YELLOW}⚠\${RESET} \$*"; }
error()   { echo -e "  \${RED}✗\${RESET} \$*"; }
header()  { echo ""; echo -e "  \${CYAN}\${BOLD}── \$* ──\${RESET}"; echo ""; }
die()     { error "\$*"; exit 1; }

echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   Dispatch Mac Agent  ·  Installer v4.0     │"
echo "  └─────────────────────────────────────────────┘"
echo ""

# ── 1. Platform & Node.js ──────────────────────────────────
header "Step 1: Checking Requirements"
[[ "\$(uname)" == "Darwin" ]] || die "This script must be run on macOS."
success "macOS detected"

command -v node &>/dev/null || {
  error "Node.js not found."
  info  "Install the LTS version from https://nodejs.org — takes about 2 minutes."
  exit 1
}
NODE_VER=\$(node -e "process.stdout.write(process.version)")
NODE_MAJOR=\$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
[[ \$NODE_MAJOR -ge 18 ]] || die "Node.js 18+ required (you have \$NODE_VER). Update at https://nodejs.org"
NODE_BIN=\$(command -v node)
success "Node.js \$NODE_VER (\$NODE_BIN)"

command -v npx &>/dev/null || die "npx not found. Reinstall Node.js from https://nodejs.org"
success "npx available"

# ── 2. Stop any existing agent & tunnel ────────────────────
header "Step 2: Preparing Clean Start"

stop_port() {
  local pids
  pids=\$(lsof -ti:"\$PORT" 2>/dev/null || true)
  if [[ -n "\$pids" ]]; then
    info "Stopping existing process on port \$PORT..."
    echo "\$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 1
    pids=\$(lsof -ti:"\$PORT" 2>/dev/null || true)
    [[ -n "\$pids" ]] && echo "\$pids" | xargs kill -9 2>/dev/null || true
    sleep 0.5
  fi
}

launchctl unload "\$AGENT_PLIST" 2>/dev/null || true
launchctl unload "\$TUNNEL_PLIST" 2>/dev/null || true
sleep 1
stop_port
success "Port \$PORT is free"

# ── 3. Install agent files ─────────────────────────────────
header "Step 3: Installing Agent"
mkdir -p "\$AGENT_DIR" "\$LOG_DIR"
success "Agent directory: \$AGENT_DIR"

cat > "\$AGENT_DIR/package.json" << 'PKGJSON'
{
  "name": "dispatch-mac-agent",
  "version": "4.0.0",
  "type": "module",
  "description": "Dispatch Mac Agent — bridges the dashboard to Messages.app"
}
PKGJSON
success "package.json written"

cat > "\$AGENT_DIR/server.js" << 'AGENTEOF'
${agentServerJs}
AGENTEOF
success "server.js written"

# ── 4. Save config ─────────────────────────────────────────
CONFIG_PATH="\$AGENT_DIR/config.json"
EXISTING_ID=""
if [[ -f "\$CONFIG_PATH" ]]; then
  EXISTING_ID=\$(node --input-type=module -e "
import { readFileSync } from 'fs';
try {
  const c = JSON.parse(readFileSync(process.env.CFG, 'utf8'));
  process.stdout.write(c.agentId || '');
} catch {}
" CFG="\$CONFIG_PATH" 2>/dev/null || true)
fi
[[ -n "\$EXISTING_ID" ]] || EXISTING_ID=\$(node --input-type=module -e "
import { randomUUID } from 'crypto';
process.stdout.write(randomUUID());
")

if [[ -n "\$DISPATCH_URL" ]]; then
  CLEAN_URL="\${DISPATCH_URL%/}"
  node --input-type=module -e "
import { writeFileSync } from 'fs';
writeFileSync(process.env.CFG, JSON.stringify({
  agentId: process.env.AID,
  dispatchUrl: process.env.URL
}, null, 2));
" CFG="\$CONFIG_PATH" AID="\$EXISTING_ID" URL="\$CLEAN_URL"
  success "Dashboard URL: \$CLEAN_URL"
  success "Agent ID: \$EXISTING_ID"
else
  node --input-type=module -e "
import { writeFileSync } from 'fs';
writeFileSync(process.env.CFG, JSON.stringify({ agentId: process.env.AID }, null, 2));
" CFG="\$CONFIG_PATH" AID="\$EXISTING_ID"
  warn "DISPATCH_URL not set — heartbeats to the dashboard are disabled."
  warn "Re-run with: DISPATCH_URL=https://your-url bash dispatch-agent-setup.sh"
fi

# ── 5. Write tunnel helper script ──────────────────────────
# This script is called by the tunnel LaunchAgent (and directly
# in foreground mode). It starts cloudflared, waits for the URL,
# then registers it with Dispatch automatically.
cat > "\$AGENT_DIR/start-tunnel.sh" << 'TUNNELEOF'
#!/bin/bash
AGENT_DIR="\$HOME/.dispatch-agent"
LOG_DIR="\$AGENT_DIR/logs"
TUNNEL_LOG="\$LOG_DIR/tunnel.log"
CONFIG="\$AGENT_DIR/config.json"
PORT=\${MAC_AGENT_PORT:-3001}

DISPATCH_URL=\$(node --input-type=module -e "
import { readFileSync } from 'fs';
try {
  const c = JSON.parse(readFileSync(process.env.CFG, 'utf8'));
  process.stdout.write(c.dispatchUrl || '');
} catch {}
" CFG="\$CONFIG" 2>/dev/null || true)

echo "" > "\$TUNNEL_LOG"
npx cloudflared tunnel --url "http://localhost:\$PORT" >> "\$TUNNEL_LOG" 2>&1 &
CPID=\$!

TUNNEL_URL=""
for i in \$(seq 1 60); do
  sleep 1
  TUNNEL_URL=\$(grep -oE 'https://[a-z0-9-]+\\.trycloudflare\\.com' "\$TUNNEL_LOG" 2>/dev/null | head -1)
  [[ -n "\$TUNNEL_URL" ]] && break
done

if [[ -n "\$TUNNEL_URL" ]]; then
  echo "  ✓ Tunnel: \$TUNNEL_URL" | tee -a "\$TUNNEL_LOG"
  if [[ -n "\$DISPATCH_URL" ]]; then
    STATUS=\$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "\$DISPATCH_URL/api/settings" \\
      -H "Content-Type: application/json" \\
      -d "{\"macAgentUrl\":\"\$TUNNEL_URL\"}" 2>/dev/null || echo "000")
    if [[ "\$STATUS" == "200" ]]; then
      echo "  ✓ Registered with Dispatch automatically" | tee -a "\$TUNNEL_LOG"
    else
      echo "  ⚠ Could not auto-register (HTTP \$STATUS). Paste manually: \$TUNNEL_URL" | tee -a "\$TUNNEL_LOG"
    fi
  fi
else
  echo "  ⚠ Tunnel URL not detected after 60s. Check: \$TUNNEL_LOG" >&2
fi

wait "\$CPID"
TUNNELEOF
chmod +x "\$AGENT_DIR/start-tunnel.sh"
success "Tunnel script written"

# ── 6. Auto-start preference ───────────────────────────────
header "Step 4: Auto-Start"
echo "  Install as a background service that starts automatically"
echo "  at login? This is recommended — both the agent and tunnel"
echo "  will restart if your Mac reboots."
echo ""
read -r -p "  Install background service? [Y/n] " INSTALL_LAUNCH
echo ""
LAUNCH_AGENT_STARTED=false

if [[ ! "\$INSTALL_LAUNCH" =~ ^[Nn]$ ]]; then
  BASH_BIN=\$(command -v bash)
  CURRENT_PATH="\$PATH"
  mkdir -p "\$PLIST_DIR"

  # Agent LaunchAgent
  cat > "\$AGENT_PLIST" << AGENTPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dispatch.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>\$NODE_BIN</string>
    <string>\$AGENT_DIR/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>\$AGENT_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>\$CURRENT_PATH</string>
    <key>HOME</key><string>\$HOME</string>
    <key>MAC_AGENT_PORT</key><string>\$PORT</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>\$LOG_DIR/agent-stdout.log</string>
  <key>StandardErrorPath</key><string>\$LOG_DIR/agent-stderr.log</string>
</dict>
</plist>
AGENTPLIST

  # Tunnel LaunchAgent
  cat > "\$TUNNEL_PLIST" << TUNNELPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dispatch.tunnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>\$BASH_BIN</string>
    <string>\$AGENT_DIR/start-tunnel.sh</string>
  </array>
  <key>WorkingDirectory</key><string>\$AGENT_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>\$CURRENT_PATH</string>
    <key>HOME</key><string>\$HOME</string>
    <key>MAC_AGENT_PORT</key><string>\$PORT</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>\$LOG_DIR/tunnel-stdout.log</string>
  <key>StandardErrorPath</key><string>\$LOG_DIR/tunnel-stderr.log</string>
</dict>
</plist>
TUNNELPLIST

  launchctl load "\$AGENT_PLIST" 2>/dev/null && {
    success "Agent service installed and running"
    LAUNCH_AGENT_STARTED=true
  } || warn "Could not start agent service. Run: launchctl load \$AGENT_PLIST"

  launchctl load "\$TUNNEL_PLIST" 2>/dev/null && {
    success "Tunnel service installed and running"
  } || warn "Could not start tunnel service. Run: launchctl load \$TUNNEL_PLIST"

else
  info "Skipping background service — will run in foreground"
fi

# ── 7. Wait for tunnel URL and register ────────────────────
header "Step 5: Connecting Tunnel"

TUNNEL_URL=""
if [[ "\$LAUNCH_AGENT_STARTED" == "true" ]]; then
  info "Waiting for Cloudflare tunnel URL (up to 60 seconds)..."
  for i in \$(seq 1 60); do
    sleep 1
    TUNNEL_URL=\$(grep -oE 'https://[a-z0-9-]+\\.trycloudflare\\.com' "\$LOG_DIR/tunnel-stdout.log" 2>/dev/null | head -1)
    [[ -n "\$TUNNEL_URL" ]] && break
    # Show progress every 10 seconds
    [[ \$((i % 10)) -eq 0 ]] && info "Still waiting... (\${i}s)"
  done
else
  # Foreground mode: start tunnel in background first, capture URL, then run agent in foreground
  info "Starting Cloudflare tunnel..."
  TUNNEL_LOG="\$LOG_DIR/tunnel.log"
  echo "" > "\$TUNNEL_LOG"
  npx cloudflared tunnel --url "http://localhost:\$PORT" >> "\$TUNNEL_LOG" 2>&1 &
  TUNNEL_BG_PID=\$!
  info "Waiting for tunnel URL (up to 60 seconds)..."
  for i in \$(seq 1 60); do
    sleep 1
    TUNNEL_URL=\$(grep -oE 'https://[a-z0-9-]+\\.trycloudflare\\.com' "\$TUNNEL_LOG" 2>/dev/null | head -1)
    [[ -n "\$TUNNEL_URL" ]] && break
    [[ \$((i % 10)) -eq 0 ]] && info "Still waiting... (\${i}s)"
  done
fi

if [[ -n "\$TUNNEL_URL" ]]; then
  success "Tunnel URL: \$TUNNEL_URL"
  if [[ -n "\$DISPATCH_URL" ]]; then
    CLEAN_DISPATCH="\${DISPATCH_URL%/}"
    HTTP_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "\$CLEAN_DISPATCH/api/settings" \\
      -H "Content-Type: application/json" \\
      -d "{\"macAgentUrl\":\"\$TUNNEL_URL\"}" 2>/dev/null || echo "000")
    if [[ "\$HTTP_STATUS" == "200" ]]; then
      success "Tunnel URL registered with Dispatch — no manual step needed!"
    else
      warn "Auto-register failed (HTTP \$HTTP_STATUS). Paste this URL into"
      warn "Dispatch → Settings → Mac Agent URL:"
      echo ""
      echo "      \$TUNNEL_URL"
      echo ""
    fi
  else
    info "Paste this URL into Dispatch → Settings → Mac Agent URL:"
    echo ""
    echo "      \$TUNNEL_URL"
    echo ""
  fi
else
  warn "Tunnel URL not detected after 60 seconds."
  if [[ "\$LAUNCH_AGENT_STARTED" == "true" ]]; then
    info "Check \$LOG_DIR/tunnel-stdout.log for details."
  else
    info "Check \$LOG_DIR/tunnel.log for details."
  fi
  info "Once you have the URL, paste it in Dispatch → Settings → Mac Agent URL."
fi

# ── 8. Done ────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  \${GREEN}\${BOLD}Setup complete!\${RESET}                                    │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

if [[ "\$LAUNCH_AGENT_STARTED" == "true" ]]; then
  success "Agent is running in the background (auto-restarts at login)"
  success "Tunnel is running in the background (auto-restarts)"
  echo ""
  info "Useful commands:"
  info "  View agent logs : tail -f \$LOG_DIR/agent-stdout.log"
  info "  View tunnel logs: tail -f \$LOG_DIR/tunnel-stdout.log"
  info "  Stop everything : launchctl unload \$AGENT_PLIST \$TUNNEL_PLIST"
  info "  Restart         : launchctl unload \$AGENT_PLIST \$TUNNEL_PLIST && launchctl load \$AGENT_PLIST \$TUNNEL_PLIST"
  echo ""
  info "You can close this Terminal window — the agent runs in the background."
  echo ""
else
  echo "  Starting agent now. Keep this window open."
  echo "  Press Ctrl+C to stop."
  echo ""
  node "\$AGENT_DIR/server.js"
fi
`;

  res.setHeader("Content-Disposition", 'attachment; filename="dispatch-agent-setup.sh"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

export default router;
