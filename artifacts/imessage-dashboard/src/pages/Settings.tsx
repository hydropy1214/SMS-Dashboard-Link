import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useGetMacAgentStatus,
  getGetMacAgentStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon, Download, CheckCircle2, XCircle, RefreshCw,
  Globe, Zap, Loader2, ArrowRight, Smartphone, Plus, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

/* ─── fetch accounts from Mac Agent via API ──────────────── */
async function fetchAccounts(apiBase: string): Promise<{ accounts: string[]; error?: string }> {
  const r = await fetch(`${apiBase}/api/mac-agent/accounts`);
  if (!r.ok) return { accounts: [], error: `Server error ${r.status}` };
  return r.json();
}

/* ─── helpers ────────────────────────────────────────────── */
function getApiBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok?: boolean | null }) {
  const color = ok === true ? "text-emerald-400" : ok === false ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={`font-mono font-medium ${color}`}>{value}</span>
    </div>
  );
}

/* ─── component ─────────────────────────────────────────── */
export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { data: macStatus, isFetching: fetchingStatus, isLoading: loadingStatus } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false, staleTime: 0 },
  });

  const [urlInput, setUrlInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.macAgentUrl && !isDirty) setUrlInput(settings.macAgentUrl);
  }, [settings?.macAgentUrl]);

  // Fetch accounts when Mac Agent is connected
  const { data: accountsData, isFetching: fetchingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ["mac-agent-accounts"],
    queryFn: () => fetchAccounts(getApiBase()),
    enabled: macStatus?.connected === true,
    staleTime: 30_000,
    retry: false,
  });

  const isConnected = macStatus?.connected === true;
  const savedUrl = settings?.macAgentUrl;

  // Detect tunnel type
  const urlLower = urlInput.toLowerCase();
  const tunnelTag = urlLower.includes("ngrok") ? "ngrok"
    : urlLower.includes("trycloudflare") || urlLower.includes("cloudflare") ? "cloudflare"
    : null;

  const handleSave = () => {
    const trimmed = urlInput.trim();
    updateSettings.mutate(
      { data: { macAgentUrl: trimmed || null } },
      {
        onSuccess: () => {
          toast.success("Saved — testing connection…");
          setIsDirty(false);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
          }, 400);
        },
        onError: (err: any) => toast.error("Save failed: " + (err?.error ?? "Unknown error")),
      }
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">Configure Mac Agent connection and connected devices.</p>
      </div>

      {/* ── Connection ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="p-5 space-y-5">

          <SectionLabel>Mac Agent Connection</SectionLabel>

          {/* URL input */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-xs font-medium text-muted-foreground">Tunnel URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="url"
                  placeholder="https://something.trycloudflare.com"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setIsDirty(true); }}
                  className="font-mono text-sm bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 pr-24"
                  disabled={loadingSettings}
                />
                {tunnelTag && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
                    tunnelTag === "ngrok" ? "bg-orange-500/15 text-orange-400"
                                         : "bg-sky-500/15 text-sky-400"
                  }`}>
                    {tunnelTag}
                  </span>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending || loadingSettings || (!isDirty && !!savedUrl)}
                className="shrink-0 font-medium"
              >
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste the HTTPS URL from Cloudflare or ngrok.{" "}
              <Link href="/setup" className="text-primary hover:underline">
                Setup guide <ArrowRight className="inline w-3 h-3" />
              </Link>
            </p>
          </div>

          {/* Status panel */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">Connection Status</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-border bg-secondary/30 hover:border-primary/30 hover:text-primary"
                disabled={fetchingStatus}
                onClick={() => queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() })}
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${fetchingStatus ? "animate-spin" : ""}`} />
                Test
              </Button>
            </div>

            <div className="p-4">
              {loadingStatus ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
                </div>
              ) : isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </div>
                  <div className="space-y-0">
                    <InfoRow label="Latency" value={macStatus?.latencyMs ? `${macStatus.latencyMs}ms` : "—"} />
                    <InfoRow label="Platform" value={macStatus?.platform ?? "—"} />
                    <InfoRow label="Messages.app" value={macStatus?.messagesAppAvailable ? "Ready" : "Not detected"} ok={macStatus?.messagesAppAvailable} />
                    <InfoRow label="AppleScript" value={macStatus?.appleScriptAvailable ? "Ready" : "Unavailable"} ok={macStatus?.appleScriptAvailable} />
                  </div>
                  {!macStatus?.messagesAppAvailable && (
                    <p className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                      Messages.app isn't open — launch it on your Mac and keep it running.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <XCircle className="w-4 h-4" />
                    {savedUrl ? "Agent unreachable" : "No URL configured"}
                  </div>
                  {macStatus?.error && (
                    <p className="text-xs font-mono text-destructive/75 bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
                      {macStatus.error}
                    </p>
                  )}
                  {savedUrl
                    ? <p className="text-xs text-muted-foreground">Make sure the Mac Agent is running and the tunnel is active.</p>
                    : <p className="text-xs text-muted-foreground">Enter your tunnel URL above and click Save.</p>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Connected Devices ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>Connected Devices</SectionLabel>
            </div>
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-border hover:border-primary/30 hover:text-primary -mt-3"
                onClick={() => refetchAccounts()}
                disabled={fetchingAccounts}
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${fetchingAccounts ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>

          {!isConnected ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/20">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                Connect your Mac Agent to see which messaging accounts are available.
                Each iPhone you've enabled <strong className="text-foreground">Text Message Forwarding</strong> for will appear here.
              </div>
            </div>
          ) : fetchingAccounts && !accountsData ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading accounts from Mac…
            </div>
          ) : accountsData?.accounts && accountsData.accounts.length > 0 ? (
            <div className="space-y-2">
              {accountsData.accounts.map((acc, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{acc}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Messages.app account</p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Active
                  </span>
                </div>
              ))}
              <div className="pt-1 px-1">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Adding a phone:</strong> On your iPhone, go to{" "}
                  <span className="font-mono text-foreground/80 text-[11px]">Settings → Messages → Text Message Forwarding</span>{" "}
                  and toggle your Mac on. It will appear here after reconnecting.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/20">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No messaging accounts found in Messages.app.
                  Make sure Messages.app is open and you're signed in with your Apple ID.
                  {accountsData?.error && <span className="block mt-1 font-mono text-[11px] text-destructive/70">{accountsData.error}</span>}
                </p>
              </div>
            </div>
          )}

          {/* How to connect more */}
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Connecting more phones
            </p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-none">
              {[
                "On each iPhone: Settings → Messages → Text Message Forwarding → toggle your Mac ON",
                "For iMessage: just sign in with the same Apple ID on Messages.app on your Mac",
                "For different Apple IDs / numbers: add a second account in Messages.app → Preferences → Accounts",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ── Download ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionLabel>Mac Agent</SectionLabel>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Mac Agent is a self-contained Node.js server that runs on your Mac.
          It has zero npm dependencies and controls Messages.app via AppleScript.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={`${getApiBase()}/api/mac-agent/download`} download>
            <Button variant="outline" className="font-medium border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50">
              <Download className="w-4 h-4 mr-2" />
              Download mac-agent-setup.sh
            </Button>
          </a>
          <Link href="/setup">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Full setup guide
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
