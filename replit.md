# Dispatch

A self-hosted bulk iMessage / SMS platform. The browser dashboard talks to the Replit-hosted API server, which relays commands to a Mac Agent running on your local Mac via a Cloudflare Tunnel or ngrok.

## Architecture

```
Browser → Replit API Server → Tunnel (Cloudflare/ngrok) → Mac Agent → AppleScript → Messages.app
```

- **API Server** (`artifacts/api-server`) — Express 5, TypeScript, Drizzle ORM, PostgreSQL
- **Dashboard** (`artifacts/imessage-dashboard`) — React 19, Vite, TailwindCSS 4, TanStack Query
- **Mac Agent** — zero-dependency Node.js script run on your Mac (see Setup Guide in the dashboard)

## How to run on Replit

Both services start automatically via their configured workflows:

| Service | Workflow |
|---|---|
| API Server | `artifacts/api-server: API Server` |
| Dashboard | `artifacts/imessage-dashboard: web` |

The database schema is managed by Drizzle ORM. To push schema changes:

```bash
pnpm --filter @workspace/db run push
```

## Mac Agent setup

After the dashboard is running, visit **Setup Guide** in the sidebar. You will need:

1. A Mac with Messages.app configured and iMessage/SMS enabled
2. Node.js 24+ on the Mac
3. A Cloudflare Tunnel or ngrok exposing the Mac Agent's port
4. The tunnel URL entered in **Settings → Mac Agent URL** inside the dashboard

## User preferences

<!-- Add any remembered preferences here -->
