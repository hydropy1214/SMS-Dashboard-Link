# Dispatch

**Send iMessages and SMS at scale from your Mac.**

Dispatch is a self-hosted web dashboard: paste phone numbers, write a message, and send to everyone using your own Mac's Messages.app. No third-party APIs. No per-message fees.

---

## Run & operate

```bash
# Start API server (dev)
pnpm --filter @workspace/api-server run dev

# Start frontend (dev)
pnpm --filter @workspace/imessage-dashboard run dev

# Typecheck everything
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push
```

Required env: `DATABASE_URL` — PostgreSQL connection string (provided by Replit).

---

## Architecture

```
Browser (Dispatch UI)
      ↓  HTTPS
Replit API Server  (artifacts/api-server — Express 5)
      ↓  HTTPS tunnel
Mac Agent  (Node.js, port 3001, runs on user's Mac)
      ↓  AppleScript / osascript
Messages.app
      ↓  iMessage / SMS
Recipients' phones
```

The API server proxies message-send calls to the Mac Agent via a secure tunnel (Cloudflare or ngrok). The tunnel URL is saved in the `settings` table under key `macAgentUrl`.

Mac Agents send heartbeats every 30 seconds to `/api/agents/heartbeat` so the dashboard always shows live status without requiring a manual probe.

---

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/api-server/src/routes/agents.ts` | Mac Agent heartbeat, status, list, download |
| `artifacts/api-server/src/routes/messages.ts` | Send, history, export, delete |
| `artifacts/api-server/src/routes/dashboard.ts` | Live overview stats |
| `artifacts/api-server/src/routes/devices.ts` | Connected messaging devices |
| `artifacts/api-server/src/routes/logs.ts` | System log viewer |
| `artifacts/api-server/src/routes/settings.ts` | Settings CRUD |
| `artifacts/api-server/src/lib/system-logger.ts` | Structured DB-backed logging helper |
| `artifacts/imessage-dashboard/src/pages/Dashboard.tsx` | Live overview |
| `artifacts/imessage-dashboard/src/pages/Compose.tsx` | Bulk send with CSV/TXT upload |
| `artifacts/imessage-dashboard/src/pages/Activity.tsx` | Message history, search, filter, export |
| `artifacts/imessage-dashboard/src/pages/ConnectedMacs.tsx` | Per-agent cards with CPU/memory |
| `artifacts/imessage-dashboard/src/pages/Devices.tsx` | iMessage accounts + SMS devices |
| `artifacts/imessage-dashboard/src/pages/Logs.tsx` | System logs viewer |
| `artifacts/imessage-dashboard/src/pages/Settings.tsx` | Agent URL, connection status, download |
| `lib/api-spec/openapi.yaml` | OpenAPI spec — source of truth for codegen |
| `lib/api-client-react/src/generated/` | Generated React Query hooks (do not edit manually) |
| `lib/api-zod/src/generated/` | Generated Zod schemas (do not edit manually) |
| `lib/db/src/schema/` | Drizzle ORM table definitions |

---

## Database tables

| Table | Purpose |
|---|---|
| `messages` | Send history with status, agent, duration, retry count |
| `settings` | Key-value config (macAgentUrl, etc.) |
| `mac_agents` | Connected Mac Agents with heartbeat data |
| `devices` | Detected messaging accounts and SMS devices |
| `system_logs` | Structured event log for all important operations |

---

## Mac Agent heartbeat flow

1. Mac Agent starts → reads/generates `config.json` with agentId
2. Every 30 seconds: POST `/api/agents/heartbeat` with full system status
3. Backend upserts `mac_agents` row, writes `system_logs` entry
4. Dashboard queries `/api/agents/status` (reads from DB, falls back to live probe)
5. Agent is considered "offline" if no heartbeat for 90 seconds

---

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node.js 24
- **Frontend**: React 19, Vite 7, TailwindCSS 4, TanStack Query v5, Framer Motion, shadcn/ui, Sonner
- **API**: Express 5, Pino logging, esbuild bundle
- **Database**: PostgreSQL + Drizzle ORM + drizzle-zod
- **Validation**: Zod v4
- **Codegen**: Orval (OpenAPI → React Query + Zod)
- **Mac Agent**: Self-contained Node.js ESM, zero dependencies, AppleScript via `osascript`

---

## Architecture decisions

- **Heartbeat-first**: Agents push status every 30s; status endpoint reads from DB rather than probing live. This makes the sidebar always snappy and avoids latency spikes.
- **Proxy pattern**: The Replit API server proxies sends to the Mac Agent rather than having the browser call it directly, avoiding HTTPS→HTTP mixed-content issues and hiding the tunnel URL from clients.
- **Settings in DB**: `macAgentUrl` lives in the `settings` table so it persists across deploys without needing a separate secrets store.
- **Mac Agent has zero deps**: The installer script embeds the full `server.js` source inline so users run one script with no npm install step.
- **OpenAPI is the contract**: All route shape changes must go through `lib/api-spec/openapi.yaml` first, then `codegen` regenerates both client hooks and server Zod schemas.
- **System logger**: All important events (heartbeat, send, error) are recorded to `system_logs` via `syslog()` so the Logs page has a persistent audit trail.

---

## User preferences

- App name: **Dispatch** (not "iMessage Dashboard")
- Dark command-center theme, electric blue primary (#00C3FF), Inter font
- Remove Contacts page — users paste numbers directly; duplicates handled in Compose
- Activity page auto-refreshes every 5s; connection status polls every 8s
- Both Cloudflare and ngrok are fully supported as tunnel options
