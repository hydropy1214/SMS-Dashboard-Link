import React, { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Download, CheckCircle2, XCircle, RefreshCw, Globe, Zap, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { data: macStatus, isLoading: isLoadingStatus, isFetching: isFetchingStatus } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
      staleTime: 0,
    }
  });

  const [macAgentUrl, setMacAgentUrl] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.macAgentUrl && !isDirty) {
      setMacAgentUrl(settings.macAgentUrl);
    }
  }, [settings?.macAgentUrl]);

  const handleSave = () => {
    const trimmed = macAgentUrl.trim();
    updateSettings.mutate(
      { data: { macAgentUrl: trimmed || null } },
      {
        onSuccess: () => {
          toast.success("Saved — testing connection...");
          setIsDirty(false);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
          }, 300);
        },
        onError: (err: any) => {
          toast.error("Failed to save: " + (err?.error || "Unknown error"));
        }
      }
    );
  };

  const handleTestConnection = () => {
    queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
  };

  const isConnected = macStatus?.connected === true;
  const urlSaved = settings?.macAgentUrl;

  // Detect tunnel type from URL
  const urlLower = macAgentUrl.toLowerCase();
  const isNgrok = urlLower.includes("ngrok");
  const isCloudflare = urlLower.includes("trycloudflare") || urlLower.includes("cloudflare");

  return (
    <div className="space-y-6 pb-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary" />
          SETTINGS
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Configure Mac Agent connection</p>
      </div>

      {/* URL config card */}
      <Card className="border-primary/20 bg-card shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm uppercase tracking-widest text-primary flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Mac Agent URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="macAgentUrl" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Tunnel URL
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="macAgentUrl"
                  placeholder="https://something.trycloudflare.com"
                  value={macAgentUrl}
                  onChange={(e) => { setMacAgentUrl(e.target.value); setIsDirty(true); }}
                  className="font-mono bg-input/50 focus-visible:bg-input pr-20"
                  disabled={isLoadingSettings}
                />
                {(isNgrok || isCloudflare) && macAgentUrl && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    isNgrok ? 'bg-orange-500/15 text-orange-400' : 'bg-sky-500/15 text-sky-400'
                  }`}>
                    {isNgrok ? "ngrok" : "cloudflare"}
                  </span>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending || isLoadingSettings || !isDirty && !!urlSaved}
                className="shrink-0 font-mono tracking-widest"
              >
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Paste the HTTPS URL from your Cloudflare or ngrok tunnel.{" "}
              <Link href="/setup" className="text-primary hover:underline">
                Setup guide <ArrowRight className="inline w-2.5 h-2.5" />
              </Link>
            </p>
          </div>

          {/* Connection status */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-b border-border">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Connection Status</span>
              <Button
                onClick={handleTestConnection}
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono border-border bg-secondary/30 hover:bg-secondary/60"
                disabled={isFetchingStatus}
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isFetchingStatus ? 'animate-spin' : ''}`} />
                Test
              </Button>
            </div>

            <div className="p-4">
              {isLoadingStatus ? (
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
                </div>
              ) : isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#34c759] font-mono text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                    <StatRow label="Latency" value={macStatus.latencyMs ? `${macStatus.latencyMs}ms` : '—'} />
                    <StatRow label="Platform" value={macStatus.platform || '—'} />
                    <StatRow label="Messages.app" value={macStatus.messagesAppAvailable ? "Ready" : "Not detected"} ok={macStatus.messagesAppAvailable} />
                    <StatRow label="AppleScript" value={macStatus.appleScriptAvailable ? "Ready" : "Unavailable"} ok={macStatus.appleScriptAvailable} />
                  </div>
                  {!macStatus.messagesAppAvailable && (
                    <p className="text-xs text-amber-500/80 font-mono bg-amber-500/5 border border-amber-500/20 rounded px-3 py-2">
                      Messages.app not detected — open it on your Mac and keep it running.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-mono text-sm font-semibold">
                    <XCircle className="w-4 h-4" />
                    {urlSaved ? "Agent unreachable" : "No URL configured"}
                  </div>
                  {macStatus?.error && (
                    <p className="text-xs font-mono text-destructive/70 bg-destructive/5 border border-destructive/20 rounded px-3 py-2">
                      {macStatus.error}
                    </p>
                  )}
                  {!urlSaved && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Paste your tunnel URL above and click Save.
                    </p>
                  )}
                  {urlSaved && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Make sure the Mac Agent is running and the tunnel is active on your Mac.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-sm uppercase tracking-widest flex items-center gap-2 text-primary">
            <Download className="w-4 h-4" />
            Mac Agent Script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Mac Agent runs locally on your Mac and bridges this dashboard to Messages.app via AppleScript. It has zero dependencies — just Node.js (already on most Macs).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/api/mac-agent/download" download>
              <Button variant="outline" className="font-mono font-bold tracking-widest border-primary/30 text-primary hover:bg-primary/10 w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Download mac-agent-setup.sh
              </Button>
            </a>
            <Link href="/setup">
              <Button variant="ghost" className="font-mono text-xs text-muted-foreground hover:text-primary w-full sm:w-auto">
                <Zap className="w-3.5 h-3.5 mr-2" />
                View full setup guide
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ label, value, ok }: { label: string; value: string; ok?: boolean | null }) {
  const color = ok === true ? 'text-[#34c759]' : ok === false ? 'text-destructive' : 'text-foreground';
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={color}>{value}</span>
    </>
  );
}
