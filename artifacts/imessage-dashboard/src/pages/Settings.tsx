import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useGetMacAgentStatus,
  useGetAgents,
  getGetMacAgentStatusQueryKey,
  getGetSettingsQueryKey,
  getGetAgentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon, Wifi, WifiOff, Save, RefreshCw,
  Loader2, CheckCircle2, AlertCircle, Clock, Monitor, Zap,
  MessageSquare, Smartphone, Download, Link2, Activity,
  ChevronRight, Cable,
} from "lucide-react";
import { toast } from "sonner";
import { UsbGuideButton } from "@/components/UsbGuideDialog";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { getApiBase } from "@/lib/api";

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
          <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />Not ready</span>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const apiBase = getApiBase();

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

  const { data: agents, refetch: refetchAgents } = useGetAgents({
    query: {
      queryKey: getGetAgentsQueryKey(),
      refetchInterval: 30_000,
      staleTime: 0,
    },
  });

  const updateSettings = useUpdateSettings();
  const [macAgentUrl, setMacAgentUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.macAgentUrl != null) setMacAgentUrl(settings.macAgentUrl ?? "");
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
  const downloadUrl = `${apiBase}/api/mac-agent/download`;
  const dashboardUrl = window.location.origin;

  const OFFLINE_MS = 90_000;
  function agentIsOnline(agent: any) {
    if (!agent.lastHeartbeatAt) return false;
    return Date.now() - new Date(agent.lastHeartbeatAt).getTime() < OFFLINE_MS;
  }

  function detectTunnel(url: string | null | undefined): string {
    if (!url) return "None";
    if (url.includes("trycloudflare.com") || url.includes("cloudflare")) return "Cloudflare Tunnel";
    if (url.includes("ngrok") || url.includes("ngrok-free")) return "ngrok";
    if (url.includes("localhost") || url.includes("127.0.0.1")) return "Local";
    return "Custom";
  }

  const onlineAgents = (agents as any[] | undefined)?.filter(agentIsOnline) ?? [];
  const offlineAgents = (agents as any[] | undefined)?.filter(a => !agentIsOnline(a)) ?? [];

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-2.5 mb-6">
        <SettingsIcon className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
      </div>

      {/* ── Mac Agent URL ── */}
      <Section title="Mac Agent Connection" icon={<Link2 className="w-4 h-4" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paste the HTTPS tunnel URL that points to your Mac Agent (e.g.{" "}
          <code className="font-mono text-foreground/70 text-[11px]">https://abc123.trycloudflare.com</code>).
          This is where Dispatch proxies message-send requests.
        </p>

        <div className="space-y-2">
          <Label htmlFor="agentUrl" className="text-xs font-medium">Tunnel URL</Label>
          <div className="flex gap-2">
            <Input
              id="agentUrl"
              placeholder="https://your-tunnel.trycloudflare.com"
              value={macAgentUrl}
              onChange={e => setMacAgentUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              className="font-mono text-sm flex-1"
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0 shrink-0"
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </Button>
          </div>
          {macAgentUrl && (
            <p className="text-[11px] text-muted-foreground">
              Provider: <span className="text-foreground font-medium">{detectTunnel(macAgentUrl)}</span>
            </p>
          )}
        </div>

        {/* Live probe status */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/20 border-b border-border">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              {isConnected
                ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
              Live Connection Status
            </span>
            <button
              onClick={() => { refetchStatus(); refetchAgents(); }}
              disabled={statusFetching}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${statusFetching ? "animate-spin" : ""}`} />
              Check now
            </button>
          </div>
          <div className="px-4 py-1 divide-y divide-border/50">
            <StatusRow label="Agent reachable" ok={macStatus?.connected ?? null} />
            <StatusRow label="macOS platform" ok={macStatus?.isMac ?? null} text={macStatus?.platform ?? undefined} />
            <StatusRow label="Messages.app" ok={macStatus?.messagesAppAvailable ?? null} />
            <StatusRow label="AppleScript" ok={macStatus?.appleScriptAvailable ?? null} />
            {macStatus?.latencyMs != null && (
              <StatusRow label="Round-trip latency" ok={true} text={`${macStatus.latencyMs}ms`} />
            )}
          </div>
          {!isConnected && macStatus?.error && (
            <div className="px-4 py-3 bg-destructive/5 border-t border-border text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{macStatus.error}</span>
            </div>
          )}
          {!isConnected && !macStatus?.error && !macStatus && (
            <div className="px-4 py-3 bg-secondary/10 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              No Mac Agent URL configured. Go to{" "}
              <Link href="/setup"><span className="text-primary hover:underline cursor-pointer">Setup Guide</span></Link>{" "}
              to get started.
            </div>
          )}
        </div>
      </Section>

      {/* ── Connected Agents (heartbeat-based) ── */}
      <Section title="Connected Agents" icon={<Activity className="w-4 h-4" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Mac Agents that have sent a heartbeat in the last 90 seconds are shown as online.
          Heartbeats are sent every 30 seconds when the agent has a{" "}
          <code className="font-mono text-foreground/70 text-[11px]">DISPATCH_URL</code> configured.
        </p>

        {(!agents || (agents as any[]).length === 0) ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 rounded-lg border border-border/50 bg-secondary/10">
            <Monitor className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No agents have connected yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Run the Mac Agent with <code className="font-mono text-foreground/70">DISPATCH_URL={dashboardUrl}</code> to enable heartbeats.
            </p>
            <Link href="/setup">
              <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs h-7">
                Setup Guide <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {[...onlineAgents, ...offlineAgents].map((agent: any) => {
              const online = agentIsOnline(agent);
              const lastBeat = agent.lastHeartbeatAt
                ? formatDistanceToNow(new Date(agent.lastHeartbeatAt), { addSuffix: true })
                : "Never";
              return (
                <div
                  key={agent.agentId}
                  className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
                    online ? "border-emerald-500/20 bg-emerald-500/4" : "border-border bg-secondary/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Monitor className={`w-4 h-4 mt-0.5 shrink-0 ${online ? "text-emerald-400" : "text-muted-foreground"}`} />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{agent.hostname}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${online ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-secondary/40 text-muted-foreground border-border"}`}>
                          {online ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{agent.agentId?.slice(0, 16)}…</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {agent.agentVersion && <span>v{agent.agentVersion}</span>}
                        {agent.macosVersion && <span>macOS {agent.macosVersion}</span>}
                        <span>Last heartbeat: {lastBeat}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {(agent.connectedAccounts?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {agent.connectedAccounts.length} iMessage account{agent.connectedAccounts.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {(agent.connectedDevices?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {agent.connectedDevices.length} SMS device{agent.connectedDevices.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {agent.cpuUsage != null && (
                      <p className="text-[11px] text-muted-foreground">CPU {Math.round(agent.cpuUsage)}%</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link href="/macs">
          <span className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 cursor-pointer">
            View detailed agent cards <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </Section>

      {/* ── Connected accounts (when online) ── */}
      {isConnected && macStatus?.connected && (
        <Section title="Messaging Accounts" icon={<MessageSquare className="w-4 h-4" />}>
          <p className="text-sm text-muted-foreground">
            Accounts detected in Messages.app on your Mac. iMessage accounts can send to Apple devices; SMS devices
            (forwarded iPhones) can send to any phone number.
          </p>
          {onlineAgents.length > 0 && onlineAgents[0].connectedAccounts?.length > 0 ? (
            <div className="space-y-1.5">
              {onlineAgents[0].connectedAccounts.map((acct: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/30 border border-border/60 text-sm">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-mono text-xs text-foreground/80">{acct}</span>
                  <Badge className="ml-auto text-[10px] px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20">iMessage</Badge>
                </div>
              ))}
              {onlineAgents[0].connectedDevices?.map((dev: string, i: number) => (
                <div key={`d-${i}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/30 border border-border/60 text-sm">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-mono text-xs text-foreground/80">{dev}</span>
                  <Badge className="ml-auto text-[10px] px-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">SMS</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No accounts detected. Make sure Messages.app is open and signed in.
            </p>
          )}
        </Section>
      )}

      {/* ── Connected iPhones (USB + Wi-Fi) ── */}
      {isConnected && macStatus?.connected && (
        <Section title="Connected iPhones" icon={<Cable className="w-4 h-4" />}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            iPhones available for sending. USB-connected phones are detected automatically when plugged in.
            Wi-Fi phones appear after enabling Text Message Forwarding on the iPhone.
          </p>
          {(() => {
            const usbDevices: string[] = (onlineAgents[0] as any)?.usbDevices ?? [];
            const wifiDevices: string[] = (onlineAgents[0] as any)?.connectedDevices ?? [];
            const hasAny = usbDevices.length > 0 || wifiDevices.length > 0;

            if (!hasAny) {
              return (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 rounded-lg border border-border/50 bg-secondary/10">
                  <Cable className="w-5 h-5 text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No iPhones connected yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Connect via USB cable or enable Wi-Fi Text Message Forwarding on your iPhone.
                    </p>
                  </div>
                  <UsbGuideButton />
                </div>
              );
            }
            return (
              <div className="space-y-1.5">
                {usbDevices.map((dev: string, i: number) => (
                  <div key={`usb-${i}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <Cable className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{dev}</p>
                      <p className="text-[10px] text-muted-foreground">USB cable</p>
                    </div>
                    <Badge className="text-[10px] px-1.5 bg-violet-500/10 text-violet-400 border-violet-500/20">USB</Badge>
                  </div>
                ))}
                {wifiDevices.map((dev: string, i: number) => (
                  <div key={`wifi-${i}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{dev}</p>
                      <p className="text-[10px] text-muted-foreground">Wi-Fi forwarding</p>
                    </div>
                    <Badge className="text-[10px] px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20">Wi-Fi</Badge>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="rounded-lg border border-border/40 bg-secondary/10 px-4 py-3 space-y-2.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Cable className="w-3 h-3 text-violet-400" /> USB Cable
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Most reliable — no drops</li>
                  <li>Works without Wi-Fi</li>
                  <li>Plug & play detection</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-blue-400" />
                  Wi-Fi Forwarding
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>No cable needed</li>
                  <li>Same Wi-Fi required</li>
                  <li>Setup once per iPhone</li>
                </ul>
              </div>
            </div>
            <UsbGuideButton className="mt-1" />
          </div>
        </Section>
      )}

      {/* ── Mac Agent Download ── */}
      <Section title="Mac Agent" icon={<Monitor className="w-4 h-4" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Mac Agent is a self-contained Node.js server (zero npm dependencies) that runs on your Mac,
          controls Messages.app via AppleScript, and sends heartbeats here every 30 seconds.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={downloadUrl} download="dispatch-agent-setup.sh">
            <Button variant="outline" className="font-medium border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50 gap-2">
              <Download className="w-4 h-4" />
              Download dispatch-agent-setup.sh
            </Button>
          </a>
        </div>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Run with your dashboard URL to enable heartbeats:</p>
          <code className="block bg-secondary/60 rounded px-3 py-2 font-mono text-foreground break-all">
            DISPATCH_URL={window.location.origin} bash ~/Downloads/dispatch-agent-setup.sh
          </code>
          <p className="text-muted-foreground/60">
            See the <Link href="/setup"><span className="text-primary hover:underline cursor-pointer">Setup Guide</span></Link> for full step-by-step instructions.
          </p>
        </div>
      </Section>

      {/* ── Connecting more phones ── */}
      <Section title="Connecting More Phones" icon={<Smartphone className="w-4 h-4" />}>
        <ol className="space-y-3">
          {[
            "On each iPhone: Settings → Messages → Text Message Forwarding → toggle your Mac ON",
            "For iMessage from a different Apple ID: Messages.app → Settings → iMessage → add account",
            "Repeat for each iPhone — one Mac can forward SMS from multiple iPhones simultaneously",
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
