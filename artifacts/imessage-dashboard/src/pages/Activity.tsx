import React, { useState, useCallback } from "react";
import {
  useGetMessages,
  useDeleteMessage,
  useDeleteAllMessages,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, Activity, Loader2, Search, Download,
  ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api";

type Status = "all" | "sent" | "failed" | "pending";
type SortDir = "desc" | "asc";

const TABS: { key: Status; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "sent",    label: "Sent" },
  { key: "failed",  label: "Errors" },
  { key: "pending", label: "Queued" },
];

function StatCard({ label, value, icon }: {
  label: string; value: number; icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#111113] p-5 rounded-lg border border-[rgba(255,255,255,0.06)] relative flex flex-col">
      <div className="absolute top-5 right-5 text-zinc-500">{icon}</div>
      <div className="sp-label mb-2">{label}</div>
      <div className="text-3xl font-semibold text-white tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

export default function ActivityPage() {
  const [tab, setTab] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const queryParams = {
    status: tab === "all" ? undefined : tab,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort,
  };
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useGetMessages(
    queryParams,
    { query: { queryKey: getGetMessagesQueryKey(queryParams), refetchInterval: 5000, staleTime: 0 } },
  );

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMessage = useDeleteMessage();
  const deleteAll = useDeleteAllMessages();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });

  const handleDelete = (id: number) => {
    deleteMessage.mutate({ id }, {
      onSuccess: () => { toast.success("Entry removed"); invalidate(); },
      onError: () => toast.error("Failed to remove entry"),
    });
  };

  const handleDeleteAll = () => {
    if (!window.confirm("Delete all message history? This cannot be undone.")) return;
    deleteAll.mutate(undefined, {
      onSuccess: () => { toast.success("History cleared"); invalidate(); setPage(1); },
      onError: () => toast.error("Failed to clear history"),
    });
  };

  const handleExport = useCallback((fmt: "csv" | "json") => {
    const params = new URLSearchParams({ format: fmt });
    if (tab !== "all") params.set("status", tab);
    window.open(`${getApiBase()}/api/messages/export?${params}`, "_blank");
  }, [tab]);

  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Activity</h1>
          <p className="text-sm text-zinc-500">Message history — auto-refreshes every 5 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase hidden sm:block">
              {lastUpdated}
            </span>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total"  value={total} icon={<Activity size={14} strokeWidth={1.5} />} />
        <StatCard label="Sent"   value={data?.messages.filter(m => m.status === "sent").length ?? 0} icon={<CheckCircle2 size={14} strokeWidth={1.5} />} />
        <StatCard label="Errors" value={data?.messages.filter(m => m.status === "failed").length ?? 0} icon={<AlertTriangle size={14} strokeWidth={1.5} />} />
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                tab === t.key
                  ? "bg-[rgba(255,255,255,0.06)] text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.03)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search numbers…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-8 text-xs bg-input/40"
          />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSort(s => s === "desc" ? "asc" : "desc")}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1.5 rounded border border-border hover:border-primary/30 transition-colors shrink-0"
        >
          {sort === "desc" ? "Newest first" : "Oldest first"}
        </button>

        <div className="flex gap-2 ml-auto shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExport("csv")}>
            <Download className="w-3.5 h-3.5 mr-1.5" />CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleExport("json")}>
            <Download className="w-3.5 h-3.5 mr-1.5" />JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/8"
            onClick={handleDeleteAll}
            disabled={deleteAll.isPending}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {search ? "No messages match your search" : "No messages yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-5 py-3.5 flex items-start gap-4 group hover:bg-secondary/20 transition-colors"
                >
                  {/* Status indicator */}
                  <div className="mt-1 shrink-0">
                    {m.status === "sent"    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {m.status === "failed"  && <AlertCircle  className="w-4 h-4 text-destructive" />}
                    {m.status === "pending" && <Clock        className="w-4 h-4 text-amber-400" />}
                  </div>

                  {/* Phone + content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-foreground">{m.phoneNumber}</span>
                      <span className={cn("text-[11px] font-medium capitalize", {
                        "text-emerald-400": m.status === "sent",
                        "text-destructive": m.status === "failed",
                        "text-amber-400":   m.status === "pending",
                      })}>
                        {m.status}
                      </span>
                      {m.duration != null && (
                        <span className="text-[10px] text-muted-foreground/60 font-mono">{m.duration}ms</span>
                      )}
                      {(m.retryCount ?? 0) > 0 && (
                        <span className="text-[10px] text-amber-400/80">{m.retryCount} retr{(m.retryCount ?? 0) === 1 ? "y" : "ies"}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{m.content}</p>
                    {m.error && (
                      <p className="text-xs text-destructive/80 mt-0.5 truncate">{m.error}</p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex items-start gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(m.sentAt), { addSuffix: true })}
                      </p>
                      {m.agentId && (
                        <p className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[120px]">{m.agentId}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(m.id)}
                      disabled={deleteMessage.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground px-2">Page {page} of {totalPages} · {total} total</span>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
