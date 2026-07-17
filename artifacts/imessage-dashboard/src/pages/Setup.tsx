import React from "react";
import { Link } from "wouter";
import { useGetMacAgentStatus, getGetMacAgentStatusQueryKey, useGetSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Terminal, Download, Zap, ArrowRight, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative group">
      {label && (
        <div className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider mb-1">{label}</div>
      )}
      <div className="flex items-center gap-2 bg-black/70 border border-border rounded-md pl-3 pr-2 py-2.5">
        <code className="text-xs font-mono text-primary/90 flex-1 break-all">{code}</code>
        <button
          onClick={() => copyToClipboard(code, label || "Command")}
          className="shrink-0 p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors opacity-60 group-hover:opacity-100"
          title="Copy"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StepNumber({ n, done }: { n: number; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 border ${
      done
        ? 'bg-[#34c759]/15 border-[#34c759]/40 text-[#34c759]'
        : 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,195,255,0.15)]'
    }`}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

export default function Setup() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const { data: macStatus, isFetching } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
    }
  });

  const isConnected = macStatus?.connected === true;
  const hasUrl = Boolean(settings?.macAgentUrl);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            SETUP GUIDE
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            3 steps to connect your Mac and start sending
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="font-mono text-xs border-primary/20 hover:bg-primary/10 hover:text-primary shrink-0"
          disabled={isFetching}
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Check status
        </Button>
      </div>

      {/* Overall status */}
      {isConnected && (
        <div className="flex items-center gap-3 p-4 bg-[#34c759]/10 border border-[#34c759]/30 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-[#34c759] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#34c759]">Mac Agent is connected!</p>
            <p className="text-xs text-[#34c759]/70 font-mono">
              {macStatus?.messagesAppAvailable ? "Messages.app is ready. You can send now." : "Messages.app not detected — make sure it's open on your Mac."}
            </p>
          </div>
          <Link href="/" className="ml-auto">
            <Button size="sm" className="font-mono text-xs uppercase tracking-widest">
              Compose <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">

        {/* STEP 1 */}
        <Card className={`border-border bg-card ${!isConnected ? 'border-primary/20' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest text-primary">
              <StepNumber n={1} done={isConnected} />
              Download &amp; run the Mac Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Mac Agent is a small script that runs on your Mac and controls Messages.app. Download it, then run these two commands in Terminal:
            </p>
            <div className="space-y-2">
              <a href="/api/mac-agent/download" download>
                <Button variant="outline" className="font-mono text-xs border-primary/30 text-primary hover:bg-primary/10">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download mac-agent-setup.sh
                </Button>
              </a>
              <CodeBlock code="cd ~/Downloads" label="1. Go to Downloads" />
              <CodeBlock code="chmod +x mac-agent-setup.sh && ./mac-agent-setup.sh" label="2. Run the agent" />
            </div>
            <p className="text-xs text-muted-foreground font-mono bg-secondary/20 border border-border rounded px-3 py-2">
              Leave the Terminal window open — the agent needs to stay running while you use the dashboard.
            </p>
          </CardContent>
        </Card>

        {/* STEP 2 */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest text-primary">
              <StepNumber n={2} done={isConnected} />
              Create a tunnel &amp; paste the URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open a <strong className="text-foreground">second</strong> Terminal window and run one of these to expose your Mac Agent securely:
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-mono text-primary uppercase font-semibold">Cloudflare</span>
                  <span className="text-[10px] text-muted-foreground font-mono">(free, no account)</span>
                </div>
                <CodeBlock code="npx cloudflared tunnel --url http://localhost:3001" />
                <p className="text-[10px] text-muted-foreground font-mono">
                  Copy the <strong>trycloudflare.com</strong> URL it prints.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4 bg-secondary/10 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-mono text-primary uppercase font-semibold">ngrok</span>
                  <span className="text-[10px] text-muted-foreground font-mono">(free account)</span>
                </div>
                <CodeBlock code="ngrok http 3001" />
                <p className="text-[10px] text-muted-foreground font-mono">
                  Copy the <strong>ngrok.io</strong> or <strong>ngrok-free.app</strong> HTTPS URL.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className={`flex items-center gap-2 text-xs font-mono ${hasUrl && isConnected ? 'text-[#34c759]' : hasUrl ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : hasUrl ? <RefreshCw className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {isConnected ? "URL saved & connected" : hasUrl ? "URL saved — not reachable yet" : "No URL configured yet"}
              </div>
              <Link href="/settings" className="ml-auto">
                <Button size="sm" variant="outline" className="h-7 text-xs font-mono border-primary/20 hover:bg-primary/10 text-primary">
                  <Zap className="w-3 h-3 mr-1.5" />
                  Paste URL in Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* STEP 3 */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest text-primary">
              <StepNumber n={3} done={isConnected && (macStatus?.messagesAppAvailable ?? false)} />
              Open Messages.app &amp; enable iPhone forwarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-secondary/60 text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">A</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Open Messages.app on your Mac</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sign in with your Apple ID if prompted. Keep it running in the background.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-secondary/60 text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">B</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Text Message Forwarding on iPhone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    iPhone <ArrowRight className="inline w-3 h-3" /> Settings <ArrowRight className="inline w-3 h-3" /> Messages <ArrowRight className="inline w-3 h-3" /> Text Message Forwarding <ArrowRight className="inline w-3 h-3" /> toggle your Mac <strong className="text-foreground">ON</strong>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">Required only for SMS (green bubble) messages to non-Apple phones.</p>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono ${
              macStatus?.messagesAppAvailable
                ? 'bg-[#34c759]/10 border-[#34c759]/30 text-[#34c759]'
                : 'bg-secondary/20 border-border text-muted-foreground'
            }`}>
              {macStatus?.messagesAppAvailable
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Messages.app detected</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Messages.app status will show here once agent is connected</>}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Connecting multiple phones note */}
      <div className="border border-border rounded-lg p-4 bg-secondary/10">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          <strong className="text-foreground uppercase tracking-wider">Multiple phones:</strong>{" "}
          Messages.app handles all numbers registered to your Apple ID. To send from a different phone/number, sign that Apple ID into Messages.app on your Mac — all numbers linked to it become available automatically.
        </p>
      </div>
    </div>
  );
}
