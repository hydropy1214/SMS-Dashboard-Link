import React, { useState, useCallback } from "react";
import { useGetLogs, getGetLogsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { FileText, RefreshCw, Download, Search, AlertTriangle, Info, Bug, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Level = "all" | "info" | "warn" | "error" | "debug";

const LEVELS: { key: Level; label: string }[] = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "warn", label: "Warnings" },
  { key: "info", label: "Info" },
  { key: "debug", label: "Debug" },
];

function LevelIcon({ level }: { level: string }) {
  switch (level) {
    case "error": return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    case "warn":  return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    case "debug": return <Bug className="w-3.5 h-3.5 text-muted-foreground" />;
    default:      return <Info className="w-3.5 h-3.5 text-primary" />;
  }
}

function levelCls(level: string) {
  switch (level) {
    case "error": return "text-destructive";
    case "warn":  return "text-amber-400";
    case "debug": return "text-muted-foreground";
    default:      return "text-primary";
  }
}

export default function Logs() {
  const [level, setLevel] = useState<Level>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const logParams = {
    level: level === "all" ? undefined : level,
    search: search || undefined,
    page,
    pageSize: 100,
  };
  const { data, isLoading, isFetching, refetch } = useGetLogs(
    logParams,
    { query: { queryKey: getGetLogsQueryKey(logParams), refetchInterval: 10_000, staleTime: 0 } },
  );

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleDownload = useCallback(() => {
    const text = logs
      .map(l => `[${l.createdAt}] [${l.level.toUpperCase().padEnd(5)}] [${l.category}] ${l.message}${l.data ? " " + l.data : ""}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dispatch-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Logs</h1>
          <p className="text-sm text-zinc-500">System events — auto-refreshes every 10 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={logs.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Level tabs */}
        <div className="flex gap-1 p-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg">
          {LEVELS.map(l => (
            <button
              key={l.key}
              onClick={() => { setLevel(l.key); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                level === l.key
                  ? "bg-[rgba(255,255,255,0.06)] text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.03)]",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-8 text-xs bg-input/40"
          />
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No log entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-border font-mono text-xs">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i < 20 ? i * 0.01 : 0 }}
                className="px-4 py-2.5 flex items-start gap-3 hover:bg-secondary/20 transition-colors"
              >
                <span className="text-muted-foreground/60 shrink-0 w-16 text-right tabular-nums">
                  {format(new Date(log.createdAt), "HH:mm:ss")}
                </span>
                <span className={cn("shrink-0 flex items-center gap-1 w-14", levelCls(log.level))}>
                  <LevelIcon level={log.level} />
                  {log.level}
                </span>
                <span className="text-muted-foreground shrink-0 w-20 truncate">{log.category}</span>
                <span className="text-foreground flex-1 leading-relaxed break-all">
                  {log.message}
                  {log.data && (
                    <span className="text-muted-foreground ml-2">{log.data}</span>
                  )}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
