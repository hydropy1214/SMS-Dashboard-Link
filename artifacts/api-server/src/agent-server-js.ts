/**
 * Mac Agent server.js content.
 *
 * Uses String.raw so that all JavaScript escape sequences (\" \\ \n etc.)
 * are preserved verbatim. This string is embedded in the bash installer
 * script via template interpolation, which also does not re-process escapes.
 *
 * WARNING: do NOT convert this to a regular template literal — it will
 * corrupt the nested JS escape sequences inside the embedded server.js code.
 */
export const agentServerJs: string = String.raw`import { createServer } from "http";
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
  config.dispatchUrl = process.env.DISPATCH_URL.replace(/\/+$/, "");
}
// Persist MAC_AGENT_URL from env — the tunnel URL the dashboard uses to reach THIS agent.
// Set this when running multiple agents: MAC_AGENT_URL=https://xxx.trycloudflare.com node server.js
if (process.env.MAC_AGENT_URL) {
  config.macAgentUrl = process.env.MAC_AGENT_URL.replace(/\/+$/, "");
}
saveConfig(config);

const AGENT_ID = config.agentId;
const DISPATCH_URL = config.dispatchUrl || null;
const MAC_AGENT_URL = config.macAgentUrl || null;

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
      macAgentUrl: MAC_AGENT_URL,
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
      process.stdout.write("  \u2713 Heartbeat \u2192 " + DISPATCH_URL + " (" + r.status + ")\n");
    } else {
      process.stdout.write("  \u26a0 Heartbeat failed: " + r.status + "\n");
    }
  } catch (err) {
    lastHeartbeatStatus = "failed: " + (err.message || "unknown");
    process.stdout.write("  \u2717 Heartbeat error: " + (err.message || "unknown") + "\n");
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
    const testContent = content || "\u2705 Dispatch test \u2014 if you got this, everything is working!";
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
  const line = "\u2500".repeat(54);
  console.log("");
  console.log("  \u256d" + line + "\u256e");
  console.log("  \u2502  Dispatch Mac Agent v" + AGENT_VERSION + "                          \u2502");
  console.log("  \u2502  Agent ID: " + AGENT_ID.slice(0, 8) + "\u2026                              \u2502");
  console.log("  \u2570" + line + "\u256f");
  console.log("");
  console.log("  Local URL : http://localhost:" + PORT);
  console.log("  Status    : http://localhost:" + PORT + "/status");
  if (DISPATCH_URL) {
    console.log("  Dashboard : " + DISPATCH_URL);
    console.log("  Heartbeat : every 30 seconds  \u2713");
    console.log("");
    // Send first heartbeat immediately
    console.log("  Sending first heartbeat...");
    await sendHeartbeat();
    setInterval(sendHeartbeat, 30000);
  } else {
    console.log("");
    console.log("  \u26a0  Heartbeats are DISABLED \u2014 DISPATCH_URL not set.");
    console.log("     The Connected Macs page won't show this agent.");
    console.log("     Restart with: DISPATCH_URL=https://your-replit-url node server.js");
  }
  console.log("");
  console.log("  \u2500\u2500\u2500 Next steps \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log("  Open a NEW Terminal and start a tunnel:");
  console.log("");
  console.log("    Cloudflare (free, no account):");
  console.log("      npx cloudflared tunnel --url http://localhost:" + PORT);
  console.log("");
  console.log("    ngrok (free account required):");
  console.log("      ngrok http " + PORT);
  console.log("");
  console.log("  Copy the HTTPS URL the tunnel prints, then paste it");
  console.log("  in Dispatch \u2192 Settings \u2192 Mac Agent URL.");
  console.log("");
  console.log("  Keep this Terminal window open while using Dispatch.");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});

process.on("SIGINT", () => {
  console.log("\n  Dispatch Mac Agent stopped.\n");
  process.exit(0);
});
`;
