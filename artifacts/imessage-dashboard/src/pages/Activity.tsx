import React, { useState } from "react";
import { useGetMessages, useDeleteMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Trash2, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, Activity, Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "all" | "sent" | "failed" | "pending";

const TABS: { key: Tab; label: string; color?: string }[] = [
  { key: "all",     label: "All" },
  { key: "sent",    label: "Sent",   color: "text-emerald-400" },
  { key: "failed",  label: "Errors", color: "text-destructive" },
  { key: "pending", label: "Queued", color: "text-amber-400" },
];

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>("all");

  const { data: messages, isLoading, dataUpdatedAt } = useGetMessages({
    query: {
      queryKey: getGetMessagesQueryKey(),
      refetchInterval: 5000,
      staleTime: 0,
    },
  });

  const deleteMessage = useDeleteMessage();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    deleteMessage.mutate({ id }, {
      onSuccess: () => {
        toast.success("Entry removed");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
      },
      onError: () => toast.error("Failed to remove entry"),
    });
  };

  const all = messages ?? [];
  const counts = {
    all:     all.length,
    sent:    all.filter(m => m.status === "sent").length,
    failed:  all.filter(m => m.status === "failed").length,
    pending: all.filter(m => m.status === "pending").length,
  };
  const rows = tab === "all" ? all : all.filter(m => m.status === tab);
  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : null;

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Activity</h1>
          </div>
          <p className="text-sm text-muted-foreground">Live send log — refreshes every 5 seconds</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-border hover:border-primary/30 hover:text-primary"
            onClick={() => queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase">
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={counts.all} icon={<Activity className="w-4 h-4 text-muted-foreground" />} />
        <StatCard label="Sent" value={counts.sent} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} accent="emerald" />
        <StatCard label="Errors" value={counts.failed} icon={<AlertTriangle className="w-4 h-4 text-destructive" />} accent="red" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-secondary/40 border border-border rounded-lg w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.key
                ? "bg-card border border-border text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-2 text-[10px] font-mono ${tab === t.key ? "text-primary" : "text-muted-foreground/50"}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Loading activity…</span>
          </div>

        ) : rows.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-secondary/60 border border-border flex items-center justify-center">
              <Activity className="w-4 h-4 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No entries</p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                {tab === "all" ? "No messages sent yet." : `No ${tab} messages.`}
              </p>
            </div>
          </div>

        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest bg-secondary/30 border-b border-border">
              <div className="col-span-3">Recipient</div>
              <div className="col-span-5">Message</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            <div className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {rows.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.025, 0.25) }}
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 items-start hover:bg-secondary/15 transition-colors group"
                  >
                    {/* Recipient */}
                    <div className="col-span-3 space-y-0.5">
                      <p className="font-mono text-sm font-medium text-foreground truncate">{msg.phoneNumber}</p>
                      {msg.status === "failed" && msg.error && (
                        <p className="text-[10px] font-mono text-destructive/75 leading-tight line-clamp-2" title={msg.error}>
                          {msg.error}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="col-span-5">
                      <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">{msg.content}</p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex justify-center pt-0.5">
                      <StatusPill status={msg.status} />
                    </div>

                    {/* Time + delete */}
                    <div className="col-span-2 flex items-start justify-end gap-1.5">
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                        </p>
                        <p className="text-[9px] font-mono text-muted-foreground/40">
                          {format(new Date(msg.sentAt), "HH:mm:ss")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleteMessage.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive mt-0.5"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────── */

function StatCard({ label, value, icon, accent }: {
  label: string; value: number; icon: React.ReactNode; accent?: "emerald" | "red";
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border bg-card ${
      accent === "emerald" ? "border-emerald-500/15" :
      accent === "red"     ? "border-destructive/15" :
                             "border-border"
    }`}>
      {icon}
      <div>
        <p className={`text-2xl font-bold font-mono leading-none ${
          accent === "emerald" ? "text-emerald-400" :
          accent === "red"     ? "text-destructive" :
                                 "text-foreground"
        }`}>{value}</p>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    sent:    { label: "Sent",   cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
    failed:  { label: "Error",  cls: "bg-destructive/10 text-destructive border-destructive/20",  icon: <AlertTriangle className="w-2.5 h-2.5" /> },
    pending: { label: "Queued", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",        icon: <Clock className="w-2.5 h-2.5" /> },
  };
  const s = map[status] ?? { label: status, cls: "bg-secondary/50 text-muted-foreground border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}
