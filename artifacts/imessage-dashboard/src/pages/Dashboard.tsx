import React from "react";
import {
  useGetDashboard,
  useGetMacAgentStatus,
  getGetDashboardQueryKey,
  getGetMacAgentStatusQueryKey,
} from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Send, XCircle, Clock, BarChart3, AlertCircle,
  RefreshCw, ArrowRight, CheckCircle2, Activity,
} from "lucide-react";
import { Link } from "wouter";

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({
  label, value, icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#111113] p-5 rounded-lg border border-[rgba(255,255,255,0.06)] relative flex flex-col">
      <div className="absolute top-5 right-5 text-zinc-500">{icon}</div>
      <div className="sp-label mb-2">{label}</div>
      <div className="text-3xl font-semibold text-white tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

/* ── Health badge ───────────────────────────────────────────── */
function HealthBadge({ status }: { status: "ok" | "error" | "warn" | "unknown" }) {
  if (status === "ok")
    return <span className="sp-badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Connected</span>;
  if (status === "error")
    return <span className="sp-badge bg-red-500/10 text-red-400 border-red-500/20">Offline ✗</span>;
  if (status === "warn")
    return <span className="sp-badge bg-amber-500/10 text-amber-400 border-amber-500/20">Warning ✗</span>;
  return <span className="sp-badge bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Unknown ✗</span>;
}

/* ── Health row ─────────────────────────────────────────────── */
function HealthRow({ label, status }: { label: string; status: "ok" | "error" | "warn" | "unknown" }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm text-zinc-300">{label}</span>
      <HealthBadge status={status} />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 10_000, staleTime: 0 },
  });

  const { data: macStatus } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false, staleTime: 0 },
  });

  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), "h:mm a") : null;
  const isConnected = data?.agentConnected === true;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 flex-1">

      {/* ── Header ── */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="sp-page-title mb-1">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Live system overview
            {lastUpdated && <> • Last updated {lastUpdated}</>}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[rgba(255,255,255,0.06)] text-sm text-zinc-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* ── Offline banner ── */}
      {!isConnected && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border-l-2 border-l-red-500/50 border border-[rgba(255,255,255,0.03)]">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-200">Mac Agent Disconnected</h3>
            <p className="text-sm text-red-200/60 mt-1 leading-relaxed">
              Dispatch cannot send messages right now. Please ensure the Mac Agent is running on your host machine and connected to the internet.
            </p>
          </div>
        </div>
      )}

      {/* ── Connected banner ── */}
      {isConnected && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/5 border-l-2 border-l-emerald-500/50 border border-[rgba(255,255,255,0.03)]">
          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-emerald-200">Mac Agent Connected</h3>
            <p className="text-sm text-emerald-200/60 mt-1">
              {data?.activeAgents ?? 1} active agent
              {data?.lastHeartbeat
                ? ` · Last heartbeat ${formatDistanceToNow(new Date(data.lastHeartbeat), { addSuffix: true })}`
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Sent Today"
          value={data?.sentToday ?? 0}
          icon={<Send size={14} strokeWidth={1.5} />}
        />
        <StatCard
          label="Failed Today"
          value={data?.failedToday ?? 0}
          icon={<XCircle size={14} strokeWidth={1.5} />}
        />
        <StatCard
          label="Pending"
          value={data?.pendingMessages ?? 0}
          icon={<Clock size={14} strokeWidth={1.5} />}
        />
        <StatCard
          label="Total Sent"
          value={(data?.totalMessages ?? 0).toLocaleString()}
          icon={<BarChart3 size={14} strokeWidth={1.5} />}
        />
      </div>

      {/* ── System health ── */}
      <div>
        <h2 className="text-sm font-medium text-white mb-3">System Health</h2>
        <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg divide-y divide-[rgba(255,255,255,0.06)]">
          <HealthRow
            label="Mac Agent Connection"
            status={data?.agentConnected ? "ok" : "error"}
          />
          <HealthRow
            label="Messages.app State"
            status={data?.messagesReady ? "ok" : data?.agentConnected ? "error" : "unknown"}
          />
          <HealthRow
            label="AppleScript Automation"
            status={data?.appleScriptReady ? "ok" : data?.agentConnected ? "error" : "unknown"}
          />
          <HealthRow
            label={`Connected Accounts (${data?.connectedAccounts ?? 0})`}
            status={(data?.connectedAccounts ?? 0) > 0 ? "ok" : data?.agentConnected ? "warn" : "unknown"}
          />
        </div>
      </div>

      {/* ── Recent activity (when data exists) ── */}
      {(data?.recentMessages?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Recent Activity</h2>
            <Link href="/activity">
              <span className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer transition-colors">
                View all →
              </span>
            </Link>
          </div>
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg divide-y divide-[rgba(255,255,255,0.06)]">
            {data!.recentMessages.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  m.status === "sent"    ? "bg-emerald-500" :
                  m.status === "failed"  ? "bg-red-500" : "bg-amber-500"
                }`} />
                <span className="text-sm font-mono text-zinc-300 flex-1 truncate">{m.phoneNumber}</span>
                <span className="text-xs text-zinc-500 truncate max-w-[200px] hidden sm:block">{m.content}</span>
                <span className={`text-xs font-medium capitalize shrink-0 ${
                  m.status === "sent"    ? "text-emerald-400" :
                  m.status === "failed"  ? "text-red-400" : "text-amber-400"
                }`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sending capacity (when connected + accounts exist) ── */}
      {isConnected && ((data?.connectedAccounts ?? 0) + (data?.connectedDevices ?? 0)) > 0 && (
        <div>
          <h2 className="text-sm font-medium text-white mb-3">Sending Capacity</h2>
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-sm text-zinc-400">
                {data!.connectedAccounts} iMessage account{data!.connectedAccounts !== 1 ? "s" : ""}
              </span>
            </div>
            {(data?.connectedDevices ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-sm text-zinc-400">
                  {data!.connectedDevices} SMS device{data!.connectedDevices !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="flex items-center gap-6 mt-auto pt-6 border-t border-[rgba(255,255,255,0.06)]">
        <Link href="/compose">
          <span className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors cursor-pointer">
            <ArrowRight size={14} /> Compose Message
          </span>
        </Link>
        {!isConnected && (
          <Link href="/setup">
            <span className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
              <ArrowRight size={14} /> Setup Mac Agent
            </span>
          </Link>
        )}
        <Link href="/activity">
          <span className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
            <Activity size={14} /> View Activity
          </span>
        </Link>
      </div>
    </div>
  );
}
