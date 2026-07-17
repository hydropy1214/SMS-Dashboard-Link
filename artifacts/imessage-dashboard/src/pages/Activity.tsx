import React, { useState } from "react";
import { useGetMessages, useDeleteMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, CheckCircle2, Clock, RefreshCw, Activity, Loader2, BarChart3 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type FilterTab = "all" | "sent" | "failed" | "pending";

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Error" },
  { key: "pending", label: "Queued" },
];

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const { data: messages, isLoading, dataUpdatedAt } = useGetMessages({
    query: {
      queryKey: getGetMessagesQueryKey(),
      refetchInterval: 5000,
      staleTime: 0,
    }
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
  };

  const allMessages = messages ?? [];
  const counts = {
    all: allMessages.length,
    sent: allMessages.filter(m => m.status === "sent").length,
    failed: allMessages.filter(m => m.status === "failed").length,
    pending: allMessages.filter(m => m.status === "pending").length,
  };

  const filtered = filter === "all"
    ? allMessages
    : allMessages.filter(m => m.status === filter);

  const lastUpdated = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), "HH:mm:ss")
    : null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            ACTIVITY
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Live send log — auto-refreshes every 5 seconds
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-muted-foreground shrink-0" />
          <div>
            <div className="text-xl font-bold font-mono text-foreground">{counts.all}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total</div>
          </div>
        </div>
        <div className="bg-card border border-[#34c759]/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#34c759] shrink-0" />
          <div>
            <div className="text-xl font-bold font-mono text-[#34c759]">{counts.sent}</div>
            <div className="text-[10px] font-mono text-[#34c759]/70 uppercase tracking-wider">Sent</div>
          </div>
        </div>
        <div className="bg-card border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <div className="text-xl font-bold font-mono text-destructive">{counts.failed}</div>
            <div className="text-[10px] font-mono text-destructive/70 uppercase tracking-wider">Failed</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg border border-border w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
              filter === f.key
                ? 'bg-card border border-border text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`ml-2 text-[10px] ${filter === f.key ? 'text-primary' : 'text-muted-foreground/60'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="font-mono text-sm uppercase tracking-wider">Loading logs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-secondary/50 border border-border flex items-center justify-center">
              <Activity className="w-5 h-5 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-mono text-sm uppercase tracking-wider">No entries</p>
              <p className="text-xs mt-1 opacity-60">
                {filter === "all"
                  ? "No messages have been sent yet."
                  : `No ${filter} messages.`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-mono text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-border">
              <div className="col-span-3">Recipient</div>
              <div className="col-span-5">Message</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            <div className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {filtered.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.3) }}
                    className="grid grid-cols-12 gap-3 px-4 py-3.5 items-start hover:bg-secondary/20 transition-colors group"
                  >
                    {/* Recipient */}
                    <div className="col-span-3">
                      <div className="font-mono text-sm font-medium text-foreground truncate">
                        {msg.phoneNumber}
                      </div>
                      {msg.status === "failed" && msg.error && (
                        <div className="text-[10px] font-mono text-destructive/80 mt-0.5 leading-tight line-clamp-2" title={msg.error}>
                          {msg.error}
                        </div>
                      )}
                    </div>

                    {/* Message preview */}
                    <div className="col-span-5">
                      <p className="text-sm text-foreground/75 line-clamp-2 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="col-span-2 flex justify-center pt-0.5">
                      <StatusBadge status={msg.status} />
                    </div>

                    {/* Time + delete */}
                    <div className="col-span-2 flex items-start justify-end gap-1">
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                        </div>
                        <div className="text-[9px] font-mono text-muted-foreground/50">
                          {format(new Date(msg.sentAt), "HH:mm:ss")}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleteMessage.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-1 shrink-0 mt-0.5"
                        title="Remove entry"
                      >
                        <Trash2 className="w-3 h-3" />
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return (
        <Badge variant="outline" className="bg-[#34c759]/10 text-[#34c759] border-[#34c759]/25 font-mono text-[10px] uppercase tracking-wider gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" /> Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/25 font-mono text-[10px] uppercase tracking-wider gap-1">
          <AlertTriangle className="w-2.5 h-2.5" /> Error
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/25 font-mono text-[10px] uppercase tracking-wider gap-1">
          <Clock className="w-2.5 h-2.5" /> Queued
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
          {status}
        </Badge>
      );
  }
}
