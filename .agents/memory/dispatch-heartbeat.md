---
name: Dispatch heartbeat architecture
description: How Mac Agent status works — push heartbeats, DB-backed status, offline threshold
---

# Dispatch Mac Agent Status Architecture

## The rule
Mac Agents push heartbeats every 30s to POST /api/agents/heartbeat. The /api/agents/status endpoint reads from the mac_agents DB table rather than probing the agent live. An agent is "offline" if last heartbeat is >90s old (3 missed beats).

**Why:** Live probes add latency to every status check and fail when the tunnel is slow. DB-backed status makes the sidebar always snappy.

**How to apply:** Any code that checks "is the agent connected?" should read from mac_agents, not fetch the agent URL directly. The live-probe fallback in agents/status is only used when no heartbeating agents are in the DB (first-run with an old-style agent).

## Key constants
- AGENT_OFFLINE_THRESHOLD_MS = 90_000 (defined in agents.ts and dashboard.ts)

## Key files
- artifacts/api-server/src/routes/agents.ts — heartbeat endpoint + status endpoint
- lib/db/src/schema/mac-agents.ts — mac_agents table schema
