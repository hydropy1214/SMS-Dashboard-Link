import React from "react";
import { useGetAgents, useDeleteAgent, getGetAgentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor, Wifi, WifiOff, Cpu, MemoryStick, Activity,
  RefreshCw, Trash2, MessageSquare, Smartphone, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

function ProgressBar({ value }: { value: number }) {
  const color = value > 80 ? "bg-red-500" : value > 60 ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function AgentCard({ agent, onDelete }: { agent: any; onDelete: () => void }) {
  const online = agent.status === "online";
  const lastBeat = agent.lastHeartbeatAt ? formatDistanceToNow(new Date(agent.lastHeartbeatAt), { addSuffix: true }) : "Never";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-card p-5 space-y-4 ${
        online ? "border-emerald-500/20" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            online ? "bg-emerald-500/10 border-emerald-500/20" : "bg-secondary/40 border-border"
          }`}>
            <Monitor className={`w-5 h-5 ${online ? "text-emerald-400" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{agent.hostname}</p>
            <p className="text-xs text-muted-foreground font-mono">{agent.agentId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={online
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-secondary/40 text-muted-foreground border-border"
          }>
            {online ? <><Wifi className="w-3 h-3 mr-1" />Online</> : <><WifiOff className="w-3 h-3 mr-1" />Offline</>}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* CPU */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> CPU
            </span>
            <span className="text-xs font-mono text-foreground">{agent.cpuUsage != null ? `${Math.round(agent.cpuUsage)}%` : "—"}</span>
          </div>
          {agent.cpuUsage != null && <ProgressBar value={agent.cpuUsage} />}
        </div>

        {/* Memory */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MemoryStick className="w-3 h-3" /> Memory
            </span>
            <span className="text-xs font-mono text-foreground">{agent.memoryUsage != null ? `${Math.round(agent.memoryUsage)}%` : "—"}</span>
          </div>
          {agent.memoryUsage != null && <ProgressBar value={agent.memoryUsage} />}
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 text-xs">
        {[
          { label: "Latency", value: agent.latencyMs != null ? `${agent.latencyMs}ms` : "—" },
          { label: "Agent version", value: agent.agentVersion ?? "—" },
          { label: "OS", value: [agent.os, agent.macosVersion].filter(Boolean).join(" ") || "—" },
          { label: "Node.js", value: agent.nodeVersion ?? "—" },
          { label: "Queue", value: `${agent.queueSize ?? 0} pending` },
          { label: "Last heartbeat", value: lastBeat },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Accounts & devices */}
      {((agent.connectedAccounts?.length ?? 0) > 0 || (agent.connectedDevices?.length ?? 0) > 0) && (
        <div className="space-y-2 pt-1 border-t border-border">
          {agent.connectedAccounts?.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> iMessage Accounts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.connectedAccounts.map((a: string) => (
                  <span key={a} className="text-[11px] font-mono bg-primary/8 text-primary border border-primary/15 px-2 py-0.5 rounded">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {agent.connectedDevices?.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3 h-3" /> SMS Devices
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.connectedDevices.map((d: string) => (
                  <span key={d} className="text-[11px] font-mono bg-amber-500/8 text-amber-400 border border-amber-500/15 px-2 py-0.5 rounded">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function ConnectedMacs() {
  const queryClient = useQueryClient();
  const { data: agents = [], isLoading, isFetching, refetch } = useGetAgents({
    query: { queryKey: getGetAgentsQueryKey(), refetchInterval: 15_000, staleTime: 0 },
  });
  const deleteAgent = useDeleteAgent();

  const handleDelete = (agentId: string) => {
    deleteAgent.mutate({ agentId }, {
      onSuccess: () => {
        toast.success("Agent removed");
        queryClient.invalidateQueries({ queryKey: getGetAgentsQueryKey() });
      },
      onError: () => toast.error("Failed to remove agent"),
    });
  };

  const online = (agents as any[]).filter(a => a.status === "online");
  const offline = (agents as any[]).filter(a => a.status !== "online");

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Connected Macs</h1>
          <p className="text-sm text-zinc-500">
            {agents.length === 0 ? "No Macs connected yet" : `${online.length} online · ${offline.length} offline`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <Monitor className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">No Mac Agents connected</p>
          <p className="text-xs text-muted-foreground">Download and run the Mac Agent on your Mac to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {online.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-widest">Online</p>
              {online.map(a => (
                <AgentCard key={a.agentId} agent={a} onDelete={() => handleDelete(a.agentId)} />
              ))}
            </div>
          )}
          {offline.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-widest">Offline</p>
              {offline.map(a => (
                <AgentCard key={a.agentId} agent={a} onDelete={() => handleDelete(a.agentId)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
