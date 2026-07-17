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

---

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/api-server/src/routes/mac-agent.ts` | Mac Agent proxy + downloadable installer script |
| `artifacts/imessage-dashboard/src/pages/` | Frontend pages (Compose, Activity, Setup, Settings) |
| `artifacts/imessage-dashboard/src/components/layout/Shell.tsx` | Sidebar, nav, connection status |
| `lib/api-spec/openapi.yaml` | OpenAPI spec — source of truth for codegen |
| `lib/api-client-react/src/generated/` | Generated React Query hooks (do not edit manually) |
| `lib/api-zod/src/generated/` | Generated Zod schemas (do not edit manually) |
| `lib/db/src/schema/` | Drizzle ORM table definitions |

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

- **Proxy pattern**: the Replit API server proxies sends to the Mac Agent rather than having the browser call it directly, avoiding HTTPS→HTTP mixed-content issues and hiding the tunnel URL from clients.
- **Settings in DB**: `macAgentUrl` lives in the `settings` table so it persists across deploys without needing a separate secrets store.
- **Mac Agent has zero deps**: the installer script embeds the full `server.js` source inline so users run one script with no npm install step.
- **Accounts endpoint**: `/api/mac-agent/accounts` proxies to the Mac Agent's `/accounts` endpoint which uses AppleScript to list all Messages.app accounts — this drives the "Connected Devices" UI in Settings.
- **OpenAPI is the contract**: all route shape changes must go through `lib/api-spec/openapi.yaml` first, then `codegen` regenerates both client hooks and server Zod schemas.

---

## User preferences

- App name: **Dispatch** (not "iMessage Dashboard")
- Dark command-center theme, electric blue primary (#00C3FF), Inter font
- Remove Contacts page — users paste numbers directly; duplicates handled in Compose
- Activity page auto-refreshes every 5s; connection status polls every 8s
- Both Cloudflare and ngrok are fully supported as tunnel options
