# Dispatch

**Send iMessages and SMS at scale from your Mac.**

Dispatch is a self-hosted web dashboard that lets you paste a list of phone numbers, write a message once, and send it to everyone — all powered by your own Mac's Messages.app via AppleScript. No third-party messaging APIs, no per-message fees.

---

## How it works

```
Browser (Dispatch UI)
      ↓  HTTPS
Replit API Server
      ↓  HTTPS tunnel (Cloudflare / ngrok)
Mac Agent  (Node.js, port 3001, runs on your Mac)
      ↓  AppleScript
Messages.app
      ↓  iMessage / SMS
Recipients' phones
```

The Dispatch API server acts as a proxy between the browser and your Mac. Your Mac Agent never needs to accept inbound connections from the public internet directly — the tunnel URL points to the Mac Agent locally.

---

## Features

- **Bulk send** — paste any number of phone numbers (comma or newline separated); duplicates are automatically removed
- **Live activity log** — every send attempt is recorded with status (sent / error / queued), error detail, and timestamp; auto-refreshes every 5 seconds
- **Connection status** — sidebar shows Mac Agent connection state and latency at all times
- **Connected devices** — Settings page lists all Messages.app accounts on your Mac, including iPhones forwarding SMS
- **Multi-phone support** — connect multiple iPhones to one Mac via Text Message Forwarding; all show up as available senders
- **Tunnel auto-detection** — Settings detects Cloudflare vs ngrok URLs and labels them accordingly
- **Downloadable Mac Agent** — one-script installer, zero npm dependencies, runs on any Mac with Node.js

---

## Quick start

### 1. Run the API server (already running on Replit)

The API server runs automatically on Replit. No setup needed.

### 2. Set up the Mac Agent on your Mac

Go to **Dispatch → Setup Guide** in the browser, or follow these steps manually:

**a. Download and run the agent**

```bash
# Download from the dashboard, then:
cd ~/Downloads
chmod +x mac-agent-setup.sh && ./mac-agent-setup.sh
```

**b. Expose the agent with a tunnel** (in a second Terminal window)

```bash
# Option A — Cloudflare (free, no account needed)
npx cloudflared tunnel --url http://localhost:3001

# Option B — ngrok (free account required)
ngrok http 3001
```

Copy the HTTPS URL the tunnel prints (e.g. `https://abc123.trycloudflare.com`).

**c. Paste the URL in Dispatch → Settings → Mac Agent URL** and click Save.

### 3. Open Messages.app on your Mac

Sign in with your Apple ID. Keep it running — the Mac Agent needs it open to send.

### 4. Enable iPhone forwarding (for SMS to non-Apple phones)

On each iPhone:  
`Settings → Messages → Text Message Forwarding → toggle your Mac ON`

---

## Connecting multiple phones

One Mac can forward SMS from multiple iPhones simultaneously. To add more phones:

1. Repeat the iPhone forwarding step above on each additional iPhone
2. They'll appear in **Dispatch → Settings → Connected Devices** once the Mac Agent is connected

For multiple Apple IDs (sending from different iMessage accounts):  
`Messages.app → Settings → iMessage → add each Apple ID`

---

## Development

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL (provided by Replit)

### Install & run

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/imessage-dashboard run dev
```

### Key commands

| Command | Description |
|---|---|
| `pnpm run typecheck` | Typecheck all packages |
| `pnpm run build` | Build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema to dev database |

---

## Project structure

```
dispatch/
├── artifacts/
│   ├── api-server/          # Express API server (proxies to Mac Agent)
│   │   └── src/routes/
│   │       ├── messages.ts  # GET/POST/DELETE message history
│   │       ├── contacts.ts  # CRUD contacts
│   │       ├── settings.ts  # macAgentUrl setting
│   │       ├── mac-agent.ts # /status, /accounts, /download
│   │       └── system.ts    # macOS system checks
│   └── imessage-dashboard/  # React + Vite frontend (the Dispatch UI)
│       └── src/
│           ├── pages/
│           │   ├── Compose.tsx   # Send messages
│           │   ├── Activity.tsx  # Live send log
│           │   ├── Setup.tsx     # 3-step onboarding
│           │   └── Settings.tsx  # Mac Agent config + connected devices
│           └── components/
│               └── layout/Shell.tsx  # Sidebar + layout
├── lib/
│   ├── api-spec/            # OpenAPI spec (source of truth)
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema + client
└── README.md
```

---

## Database schema

| Table | Columns |
|---|---|
| `messages` | id, phoneNumber, content, status, error, sentAt |
| `settings` | id, key, value, updatedAt |

Key stored in `settings`: `macAgentUrl` — the tunnel URL pointing to your Mac Agent.

---

## Mac Agent API

The Mac Agent exposes a simple HTTP API on port 3001 (or `$MAC_AGENT_PORT`):

| Endpoint | Description |
|---|---|
| `GET /status` | Platform info, Messages.app state, AppleScript availability |
| `GET /accounts` | List all Messages.app accounts (iMessage + forwarded iPhones) |
| `POST /send` | `{ phoneNumbers: string[], content: string }` — sends via AppleScript |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS 4, Framer Motion, TanStack Query |
| API server | Express 5, TypeScript 5.9, Pino logging |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4) + drizzle-zod |
| API contract | OpenAPI 3.1 → Orval codegen |
| Mac Agent | Node.js (no dependencies), AppleScript via `osascript` |
| Tunneling | Cloudflare Tunnel or ngrok |
| Monorepo | pnpm workspaces |

---

## Security notes

- The Mac Agent accepts requests from any origin (CORS `*`) — it's designed to be reached only via an authenticated tunnel, not exposed directly to the internet
- The tunnel URL stored in Settings should be treated as a secret — anyone with it can trigger message sends from your Mac
- AppleScript inputs are sanitized before execution to prevent injection

---

## License

MIT
