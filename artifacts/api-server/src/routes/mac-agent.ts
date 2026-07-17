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

      const response = await fetch(`${agentUrl}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        res.json({
          connected: false,
          url: agentUrl,
          platform: null,
          isMac: null,
          messagesAppAvailable: null,
          appleScriptAvailable: null,
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
      };
      res.json({
        connected: true,
        url: agentUrl,
        platform: data.platform ?? null,
        isMac: data.isMac ?? null,
        messagesAppAvailable: data.messagesAppAvailable ?? null,
        appleScriptAvailable: data.appleScriptAvailable ?? null,
        error: null,
        latencyMs,
      });
    } catch (fetchErr: unknown) {
      const errMsg =
        fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      const isTimeout = errMsg.includes("abort");
      res.json({
        connected: false,
        url: agentUrl,
        platform: null,
        isMac: null,
        messagesAppAvailable: null,
        appleScriptAvailable: null,
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

// GET /api/mac-agent/download
router.get("/mac-agent/download", (_req, res) => {
  const script = `#!/bin/bash
# ============================================================
#  iMessage Dashboard — Mac Agent Setup Script
#  Run this on your Mac to enable message sending from the
#  dashboard. Requires macOS + Node.js 18+.
# ============================================================

set -e

AGENT_DIR="$HOME/.imessage-dashboard-agent"
PORT=\${MAC_AGENT_PORT:-3001}

echo ""
echo "  iMessage Dashboard — Mac Agent Installer"
echo "  =========================================="
echo ""

# Check macOS
if [[ "\$(uname)" != "Darwin" ]]; then
  echo "  ERROR: This script must be run on macOS."
  exit 1
fi

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "  ERROR: Node.js not found."
  echo "  Install it from https://nodejs.org (LTS version recommended)"
  exit 1
fi

NODE_VERSION=\$(node -e "process.stdout.write(process.version)")
echo "  Node.js found: \$NODE_VERSION"

# Create agent directory
mkdir -p "\$AGENT_DIR"
cd "\$AGENT_DIR"

# Write package.json
cat > package.json <<'PKGJSON'
{
  "name": "imessage-dashboard-agent",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js"
}
PKGJSON

# Write the agent server
cat > server.js <<'SERVEREOF'
import { createServer } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);
const PORT = Number(process.env.MAC_AGENT_PORT || 3001);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function checkAppleScript() {
  try {
    await execAsync("which osascript", { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function checkMessagesRunning() {
  try {
    const { stdout } = await execAsync(
      \`osascript -e 'tell application "System Events" to (name of processes) contains "Messages"'\`,
      { timeout: 5000 }
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function sendIMessage(phoneNumber, message) {
  const safePhone = phoneNumber.replace(/['"\\\\]/g, "");
  const safeMsg = message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
  const script = \`
    tell application "Messages"
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "\${safePhone}" of targetService
      send "\${safeMsg}" to targetBuddy
    end tell
  \`;
  try {
    await execAsync(\`osascript -e '\${script.replace(/'/g, "'\\"'\\"'")}'\`, {
      timeout: 15000,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, \`http://localhost:\${PORT}\`);

  // GET /status — health + system check
  if (req.method === "GET" && url.pathname === "/status") {
    const platform = os.platform();
    const isMac = platform === "darwin";
    const [appleScriptAvailable, messagesAppAvailable] = await Promise.all([
      checkAppleScript(),
      isMac ? checkMessagesRunning() : Promise.resolve(false),
    ]);
    return json(res, 200, {
      platform,
      isMac,
      appleScriptAvailable,
      messagesAppAvailable,
      agentVersion: "1.0.0",
    });
  }

  // POST /send — send a message
  if (req.method === "POST" && url.pathname === "/send") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }

      const { phoneNumbers, content } = parsed;
      if (!Array.isArray(phoneNumbers) || !content) {
        return json(res, 400, { error: "phoneNumbers and content required" });
      }

      const results = [];
      for (const phone of phoneNumbers) {
        const result = await sendIMessage(phone, content);
        results.push({ phoneNumber: phone, ...result });
      }
      return json(res, 200, results);
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Mac Agent running on port " + PORT);
  console.log("  Local URL: http://localhost:" + PORT);
  console.log("");
  console.log("  Next step: expose this to the internet using a tunnel.");
  console.log("  Option A — Cloudflare (free, no account):");
  console.log("    npx cloudflared tunnel --url http://localhost:" + PORT);
  console.log("");
  console.log("  Option B — ngrok:");
  console.log("    ngrok http " + PORT);
  console.log("");
  console.log("  Copy the HTTPS tunnel URL and paste it into the dashboard");
  console.log("  Settings page under Mac Agent URL.");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});

process.on("SIGINT", () => {
  console.log("\\n  Mac Agent stopped.");
  process.exit(0);
});
SERVEREOF

echo ""
echo "  Mac Agent installed at: \$AGENT_DIR"
echo ""
echo "  Starting Mac Agent on port \$PORT..."
echo ""

node "\$AGENT_DIR/server.js"
`;

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="mac-agent-setup.sh"',
  );
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(script);
});

export default router;
