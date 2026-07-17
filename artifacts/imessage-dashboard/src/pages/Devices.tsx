import React from "react";
import { useGetDevices, getGetDevicesQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Smartphone, MessageSquare, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function Devices() {
  const { data: devices = [], isLoading, isFetching, refetch } = useGetDevices({
    query: { queryKey: getGetDevicesQueryKey(), refetchInterval: 20_000, staleTime: 0 },
  });

  const iMessage = (devices as any[]).filter(d => d.service === "iMessage");
  const sms = (devices as any[]).filter(d => d.service === "SMS");

  function DeviceRow({ device }: { device: any }) {
    const available = device.available !== false;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
          device.service === "iMessage"
            ? "bg-primary/8 border-primary/20"
            : "bg-amber-500/8 border-amber-500/20"
        }`}>
          {device.service === "iMessage"
            ? <MessageSquare className="w-4 h-4 text-primary" />
            : <Smartphone className="w-4 h-4 text-amber-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{device.displayName}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{device.agentId}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge className={`text-[11px] ${
            device.service === "iMessage"
              ? "bg-primary/8 text-primary border-primary/20"
              : "bg-amber-500/8 text-amber-400 border-amber-500/20"
          }`}>
            {device.service}
          </Badge>

          <span className={`flex items-center gap-1 text-xs font-medium ${available ? "text-emerald-400" : "text-muted-foreground"}`}>
            {available ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {available ? "Available" : "Unavailable"}
          </span>

          {device.lastUsedAt && (
            <span className="text-[11px] text-muted-foreground hidden md:block">
              {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Devices</h1>
          <p className="text-sm text-zinc-500">
            {devices.length === 0 ? "No devices detected" : `${iMessage.length} iMessage · ${sms.length} SMS`}
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
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <Smartphone className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">No devices detected</p>
          <p className="text-xs text-muted-foreground">
            Connect a Mac Agent and open Messages.app to detect available accounts and devices.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {iMessage.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  iMessage Accounts ({iMessage.length})
                </h2>
              </div>
              {iMessage.map(d => <DeviceRow key={d.id} device={d} />)}
            </div>
          )}

          {sms.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  SMS Forwarding Devices ({sms.length})
                </h2>
              </div>
              {sms.map(d => <DeviceRow key={d.id} device={d} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
