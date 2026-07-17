import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useGetMacAgentStatus,
  getGetMacAgentStatusQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon, Wifi, WifiOff, Save, RefreshCw,
  Loader2, CheckCircle2, AlertCircle, Clock, Monitor, Zap,
  MessageSquare, Smartphone, ExternalLink, Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function StatusRow({ label, ok, text }: { label: string; ok: boolean | null; text?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {text && <span className="text-xs font-mono text-muted-foreground">{text}</span>}
        {ok === null ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Unknown</span>
        ) : ok ? (
          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Ready</span>
        ) : (
          <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />Not Ready</span>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey(), staleTime: 5000 },
  });

  const { data: macStatus, isFetching: statusFetching, refetch: refetchStatus } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 10_000,
      retry: false,
      staleTime: 0,
    },
  });

  const updateSettings = useUpdateSettings();

  const [macAgentUrl, setMacAgentUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.macAgentUrl != null) {
      setMacAgentUrl(settings.macAgentUrl ?? "");
    }
  }, [settings]);

  const handleSave = async () => {
    const url = macAgentUrl.trim();
    if (url && !url.startsWith("http")) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    updateSettings.mutate(
      { data: { macAgentUrl: url || null } },
      {
        onSuccess: () => {
          toast.success("Settings saved");
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
        },
        onError: () => toast.error("Failed to save settings"),
        onSettled: () => setSaving(false),
      },
    );
  };

  const isConnected = macStatus?.connected === true;

  // Detect tunnel provider from URL
  function detectTunnel(url: string | null | undefined): string {
    if (!url) return "None";
    if (url.includes("trycloudflare.com") || url.includes("cloudflare")) return "Cloudflare Tunnel";
    if (url.includes("ngrok.io") || url.includes("ngrok.app")) return "ngrok";
    if (url.includes("localhost") || url.includes("127.0.0.1")) return "Local (no tunnel)";
    return "Custom";
  }

  const downloadUrl = `${window.location.origin}/api/agents/download`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">System configuration and Mac Agent management</p>
      </div>

      {/* General Settings */}
      <Section title="General Settings" icon={<SettingsIcon className="w-4 h-4" />}>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Mac Agent URL
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://abc123.trycloudflare.com"
              value={macAgentUrl}
              onChange={e => setMacAgentUrl(e.target.value)}
              className="flex-1 bg-input/40 font-mono text-sm"
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 dispatch-glow shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The HTTPS tunnel URL pointing to your Mac Agent (port 3001).
          </p>
        </div>
      </Section>

      {/* Connection Status */}
      <Section title="Connection Status" icon={<Wifi className="w-4 h-4" />}>
        {/* Live status banner */}
        <div className={`flex items-center gap-3 p-3.5 rounded-lg border ${
          isConnected
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-destructive/20 bg-destructive/5"
        }`}>
          <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
            {statusFetching ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : isConnected ? (
              <>
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />
                <Wifi className="w-4 h-4 text-emerald-400 relative z-10" />
              </>
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isConnected ? "text-emerald-300" : "text-destructive"}`}>
              {isConnected ? "Connected" : "Not Connected"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {macStatus?.error ?? (isConnected ? "Mac Agent is responding normally" : "Mac Agent unreachable")}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => refetchStatus()}>
            <RefreshCw className={`w-3 h-3 mr-1 ${statusFetching ? "animate-spin" : ""}`} />
            Test
          </Button>
        </div>

        {/* Status details */}
        <div className="space-y-0 divide-y divide-border/50">
          <StatusRow label="Connection" ok={isConnected} />
          <StatusRow
            label="Last Heartbeat"
            ok={macStatus?.lastHeartbeat ? true : null}
            text={macStatus?.lastHeartbeat
              ? formatDistanceToNow(new Date(macStatus.lastHeartbeat), { addSuffix: true })
              : undefined}
          />
          <StatusRow
            label="Latency"
            ok={macStatus?.latencyMs != null ? macStatus.latencyMs < 1000 : null}
            text={macStatus?.latencyMs != null ? `${macStatus.latencyMs}ms` : undefined}
          />
          <StatusRow
            label="Agent Version"
            ok={isConnected}
            text={macStatus?.agentVersion ?? undefined}
          />
          <StatusRow
            label="Messages.app"
            ok={macStatus?.messagesAppAvailable ?? null}
          />
          <StatusRow
            label="AppleScript"
            ok={macStatus?.appleScriptAvailable ?? null}
          />
          <StatusRow
            label="Tunnel Provider"
            ok={null}
            text={detectTunnel(macStatus?.url)}
          />
          <StatusRow
            label="Hostname"
            ok={null}
            text={macStatus?.hostname ?? undefined}
          />
        </div>
      </Section>

      {/* Connected Accounts */}
      {isConnected && ((macStatus?.connectedAccounts?.length ?? 0) > 0 || (macStatus?.connectedDevices?.length ?? 0) > 0) && (
        <Section title="Connected Accounts & Devices" icon={<MessageSquare className="w-4 h-4" />}>
          {(macStatus?.connectedAccounts?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-primary" /> iMessage Accounts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {macStatus!.connectedAccounts!.map(acct => (
                  <Badge key={acct} className="font-mono text-[11px] bg-primary/8 text-primary border-primary/20">
                    {acct}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {(macStatus?.connectedDevices?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-amber-400" /> SMS Forwarding Devices
              </p>
              <div className="flex flex-wrap gap-1.5">
                {macStatus!.connectedDevices!.map(dev => (
                  <Badge key={dev} className="font-mono text-[11px] bg-amber-500/8 text-amber-400 border-amber-500/20">
                    {dev}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Mac Agent download */}
      <Section title="Mac Agent" icon={<Monitor className="w-4 h-4" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Mac Agent is a self-contained Node.js server that runs on your Mac.
          It controls Messages.app via AppleScript and sends heartbeats to this dashboard every 30 seconds.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={downloadUrl} download>
            <Button variant="outline" className="font-medium border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50 gap-2">
              <Download className="w-4 h-4" />
              Download dispatch-agent-setup.sh
            </Button>
          </a>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>After downloading, run:</p>
          <code className="block bg-secondary/60 rounded px-3 py-2 font-mono text-foreground">
            chmod +x dispatch-agent-setup.sh && ./dispatch-agent-setup.sh
          </code>
        </div>
      </Section>

      {/* Adding more phones */}
      <Section title="Connecting More Phones" icon={<Smartphone className="w-4 h-4" />}>
        <ol className="space-y-3">
          {[
            "On each iPhone: Settings → Messages → Text Message Forwarding → toggle your Mac ON",
            "For iMessage: sign in with the same Apple ID on Messages.app → Settings → iMessage",
            "For a different Apple ID: Messages.app → Preferences → Accounts → add account",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
