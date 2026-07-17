import React from "react";
import { useGetDevices, getGetDevicesQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import {
  Smartphone, MessageSquare, RefreshCw, CheckCircle2,
  XCircle, Usb, Monitor, Wifi, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type Device = {
  id: number;
  agentId: string;
  hostname: string;
  macosVersion: string | null;
  agentVersion: string | null;
  displayName: string;
  service: string;
  accountId: string | null;
  available: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

// ── Per-service config ─────────────────────────────────────────────────────────
const SERVICE_CONFIG = {
  iMessage: {
    label: "iMessage Accounts",
    description: "Apple ID / email accounts signed in to Messages.app on this Mac",
    Icon: MessageSquare,
    iconClass: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ConnIcon: Monitor,
    connLabel: "Mac account",
  },
  SMS: {
    label: "Wi-Fi iPhones",
    description: "iPhones forwarding SMS via Text Message Forwarding over Wi-Fi",
    Icon: Wifi,
    iconClass: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ConnIcon: Wifi,
    connLabel: "Wi-Fi forwarding",
  },
  USB: {
    label: "USB iPhones",
    description: "iPhones physically connected via USB cable",
    Icon: Smartphone,
    iconClass: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ConnIcon: Usb,
    connLabel: "USB cable",
  },
} as const;

// ── Device row ────────────────────────────────────────────────────────────────
function DeviceRow({ device, index }: { device: Device; index: number }) {
  const cfg = SERVICE_CONFIG[device.service as keyof typeof SERVICE_CONFIG] ?? SERVICE_CONFIG.iMessage;
  const { Icon, iconBg, iconClass, badgeClass, ConnIcon, connLabel } = cfg;
  const online = device.available;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{device.displayName}</p>
          {device.service === "iMessage" && device.accountId && (
            <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:block">
              {device.accountId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Monitor className="w-3 h-3 shrink-0" />
            {device.hostname}
          </span>
          {device.macosVersion && (
            <span className="text-[11px] text-muted-foreground hidden md:block">
              macOS {device.macosVersion}
            </span>
          )}
          {device.agentVersion && (
            <span className="text-[11px] text-muted-foreground/60 hidden lg:block">
              Agent v{device.agentVersion}
            </span>
          )}
        </div>
      </div>

      {/* Right side badges */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
        {/* Connection type */}
        <span className={`hidden sm:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
          <ConnIcon className="w-3 h-3" />
          {connLabel}
        </span>

        {/* Status */}
        <span className={`flex items-center gap-1 text-xs font-medium ${online ? "text-emerald-400" : "text-zinc-500"}`}>
          {online
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <XCircle className="w-3.5 h-3.5" />}
          {online ? "Online" : "Offline"}
        </span>

        {/* Last seen */}
        {device.lastUsedAt && (
          <span className="text-[11px] text-muted-foreground hidden lg:block">
            {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function DeviceSection({
  serviceKey,
  devices,
  globalIndex,
}: {
  serviceKey: keyof typeof SERVICE_CONFIG;
  devices: Device[];
  globalIndex: number;
}) {
  const cfg = SERVICE_CONFIG[serviceKey];
  const { Icon, iconClass, badgeClass, label, description } = cfg;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${iconClass}`} />
          <span className="text-xs font-semibold text-foreground tracking-wide">{label}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${badgeClass}`}>
            {devices.length}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden md:block">{description}</span>
      </div>

      {/* Rows */}
      {devices.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0" />
          No {label.toLowerCase()} detected.
          {serviceKey === "USB" && " Connect an iPhone with a cable to see it here."}
          {serviceKey === "SMS" && " Enable Text Message Forwarding on your iPhone (Settings → Messages → Text Message Forwarding)."}
          {serviceKey === "iMessage" && " Sign in to Messages.app with your Apple ID."}
        </div>
      ) : (
        devices.map((d, i) => <DeviceRow key={d.id} device={d} index={globalIndex + i} />)
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Devices() {
  const { data = [], isLoading, isFetching, refetch } = useGetDevices({
    query: { queryKey: getGetDevicesQueryKey(), refetchInterval: 15_000, staleTime: 0 },
  });

  const devices = data as Device[];
  const iMessage = devices.filter(d => d.service === "iMessage");
  const sms      = devices.filter(d => d.service === "SMS");
  const usb      = devices.filter(d => d.service === "USB");

  const totalLabel = [
    iMessage.length && `${iMessage.length} iMessage`,
    sms.length && `${sms.length} Wi-Fi`,
    usb.length && `${usb.length} USB`,
  ].filter(Boolean).join(" · ") || "No devices detected";

  // Count unique Macs
  const uniqueMacs = new Set(devices.map(d => d.agentId)).size;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Devices</h1>
          <p className="text-sm text-zinc-500">
            {isLoading ? "Loading…" : totalLabel}
            {!isLoading && uniqueMacs > 0 && (
              <span className="ml-2 text-zinc-600">
                across {uniqueMacs} Mac{uniqueMacs !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Stats row ── */}
      {!isLoading && devices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { key: "iMessage", count: iMessage.length, online: iMessage.filter(d => d.available).length },
              { key: "SMS",      count: sms.length,      online: sms.filter(d => d.available).length },
              { key: "USB",      count: usb.length,      online: usb.filter(d => d.available).length },
            ] as const
          ).map(({ key, count, online }) => {
            const cfg = SERVICE_CONFIG[key];
            return (
              <div key={key} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <cfg.Icon className={`w-5 h-5 shrink-0 ${cfg.iconClass}`} />
                <div>
                  <p className="text-xl font-semibold leading-none text-foreground">{count}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {cfg.label.split(" ")[0]}
                    {count > 0 && <span className="ml-1 text-emerald-400">{online} online</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        /* ── Full empty state ── */
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
          <div className="flex items-center justify-center gap-3 text-muted-foreground/30">
            <Smartphone className="w-8 h-8" />
            <Usb className="w-6 h-6" />
            <MessageSquare className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-foreground">No devices detected yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Connect a Mac Agent and open Messages.app on your Mac. iMessage accounts,
            Wi-Fi iPhones, and USB-connected iPhones will appear here automatically.
          </p>
        </div>
      ) : (
        /* ── Device sections ── */
        <div className="space-y-4">
          <DeviceSection serviceKey="iMessage" devices={iMessage} globalIndex={0} />
          <DeviceSection serviceKey="SMS"      devices={sms}      globalIndex={iMessage.length} />
          <DeviceSection serviceKey="USB"      devices={usb}      globalIndex={iMessage.length + sms.length} />
        </div>
      )}
    </div>
  );
}
