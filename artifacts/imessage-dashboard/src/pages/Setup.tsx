import React from "react";
import { Link } from "wouter";
import {
  useGetMacAgentStatus,
  getGetMacAgentStatusQueryKey,
  useGetSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Terminal, Download, Zap,
  ArrowRight, RefreshCw, Copy, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

/* ─── helpers ─────────────────────────────────────────────── */
function copy(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="group">
      {label && (
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1.5">{label}</p>
      )}
      <div className="flex items-center gap-2 bg-black/60 border border-border/80 rounded-lg pl-3.5 pr-2 py-2.5">
        <code className="text-xs font-mono text-primary/90 flex-1 break-all leading-relaxed">{code}</code>
        <button
          onClick={() => copy(code, label ?? "Command")}
          className="shrink-0 p-1.5 rounded-md hover:bg-white/8 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-60 group-hover:opacity-100"
          title="Copy"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Step({ n, done, title, children }: {
  n: number; done: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/20">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
          done
            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            : "bg-primary/10 border border-primary/25 text-primary"
        }`}>
          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
        </div>
        <h2 className={`text-sm font-semibold tracking-tight ${done ? "text-emerald-400" : "text-foreground"}`}>
          {title}
        </h2>
        {done && (
          <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Done
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function getApiBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
}

/* ─── component ───────────────────────────────────────────── */
export default function Setup() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const { data: macStatus, isFetching } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false },
  });

  const connected = macStatus?.connected === true;
  const hasUrl = Boolean(settings?.macAgentUrl);
  const msgReady = Boolean(macStatus?.messagesAppAvailable);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Setup Guide</h1>
          </div>
          <p className="text-sm text-muted-foreground">3 steps to connect your Mac and start sending.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium border-border hover:border-primary/30 hover:text-primary shrink-0"
          onClick={() => queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() })}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Check status
        </Button>
      </div>

      {/* All-connected banner */}
      {connected && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-400">Mac Agent connected!</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              {msgReady
                ? "Messages.app is ready. You can start sending."
                : "Open Messages.app on your Mac to complete setup."}
            </p>
          </div>
          <Link href="/">
            <Button size="sm" className="font-medium shrink-0">
              Compose <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">

        {/* STEP 1 — Download & run */}
        <Step n={1} done={connected} title="Download & run the Mac Agent">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Mac Agent is a small script that runs on your Mac and controls Messages.app.
            Download it, then run these two commands in <strong className="text-foreground">Terminal</strong>:
          </p>
          <div className="space-y-3">
            <a href={`${getApiBase()}/api/mac-agent/download`} download>
              <Button variant="outline" size="sm" className="font-medium border-primary/25 text-primary hover:bg-primary/8 hover:border-primary/40">
                <Download className="w-3.5 h-3.5 mr-2" />
                Download mac-agent-setup.sh
              </Button>
            </a>
            <CodeBlock code="cd ~/Downloads" label="1. Navigate to Downloads" />
            <CodeBlock code="chmod +x mac-agent-setup.sh && ./mac-agent-setup.sh" label="2. Make executable and run" />
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border/60 text-xs text-muted-foreground">
            <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
            Keep this Terminal window open — the agent must stay running while you use Dispatch.
          </div>
        </Step>

        {/* STEP 2 — Tunnel + URL */}
        <Step n={2} done={connected} title="Create a tunnel & paste the URL">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open a <strong className="text-foreground">second</strong> Terminal window and run one of these
            to expose your Mac Agent securely over HTTPS:
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Cloudflare */}
            <div className="rounded-lg border border-border bg-secondary/15 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-xs font-semibold text-foreground">Cloudflare</span>
                <span className="text-[10px] text-muted-foreground">(free · no account)</span>
              </div>
              <CodeBlock code="npx cloudflared tunnel --url http://localhost:3001" />
              <p className="text-[10px] text-muted-foreground font-mono">
                Copy the <strong className="text-foreground">trycloudflare.com</strong> URL it prints.
              </p>
            </div>
            {/* ngrok */}
            <div className="rounded-lg border border-border bg-secondary/15 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-foreground">ngrok</span>
                <span className="text-[10px] text-muted-foreground">(free account)</span>
              </div>
              <CodeBlock code="ngrok http 3001" />
              <p className="text-[10px] text-muted-foreground font-mono">
                Copy the <strong className="text-foreground">ngrok.io</strong> or <strong className="text-foreground">ngrok-free.app</strong> HTTPS URL.
              </p>
            </div>
          </div>

          {/* URL status + link to settings */}
          <div className="flex items-center gap-3 pt-1">
            <div className={`flex items-center gap-2 text-xs font-medium ${
              connected ? "text-emerald-400" : hasUrl ? "text-amber-400" : "text-muted-foreground"
            }`}>
              {connected ? <CheckCircle2 className="w-3.5 h-3.5" />
                : hasUrl ? <RefreshCw className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {connected ? "URL saved & connected"
                : hasUrl ? "URL saved — not reachable yet"
                : "No URL configured"}
            </div>
            <Link href="/settings" className="ml-auto">
              <Button size="sm" variant="outline" className="h-8 text-xs font-medium border-primary/25 text-primary hover:bg-primary/8">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Paste URL in Settings
              </Button>
            </Link>
          </div>
        </Step>

        {/* STEP 3 — Messages.app + iPhone forwarding */}
        <Step n={3} done={connected && msgReady} title="Open Messages.app & link your phones">
          <div className="space-y-4">
            {/* Sub-step A */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary/60 border border-border text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">A</div>
              <div>
                <p className="text-sm font-medium text-foreground">Open Messages.app on your Mac</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Sign in with your Apple ID if prompted. Keep it running in the background — the Mac Agent needs it open to send.
                </p>
              </div>
            </div>

            {/* Sub-step B */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary/60 border border-border text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">B</div>
              <div>
                <p className="text-sm font-medium text-foreground">Enable iPhone forwarding <span className="text-muted-foreground font-normal">(for SMS)</span></p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  On each iPhone you want to send SMS from:
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-xs font-mono text-foreground/75 bg-secondary/30 border border-border/60 rounded-lg px-3 py-2 flex-wrap">
                  Settings <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  Messages <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  Text Message Forwarding <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-emerald-400 font-semibold">toggle your Mac ON</span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-mono">
                  Repeat for each iPhone. All linked phones appear in Settings → Connected Devices.
                </p>
              </div>
            </div>

            {/* Messages.app status */}
            <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium ${
              msgReady
                ? "bg-emerald-500/6 border-emerald-500/20 text-emerald-400"
                : "bg-secondary/20 border-border text-muted-foreground"
            }`}>
              {msgReady
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Messages.app detected and ready</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Messages.app status shown once Mac Agent connects</>}
            </div>
          </div>
        </Step>

      </div>

      {/* Multi-mobile note */}
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Connecting multiple phones</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              One Mac can forward SMS from <strong className="text-foreground">multiple iPhones</strong> simultaneously.
              Each iPhone that has <em>Text Message Forwarding</em> toggled on will route its SMS through your Mac Agent.
              To add more phones, simply repeat step B above on each additional iPhone — no changes needed to the Mac Agent or Dispatch.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For <strong className="text-foreground">multiple Apple IDs</strong> (sending iMessage from different accounts):
              go to <span className="font-mono text-foreground/80 text-[11px]">Messages.app → Settings → iMessage</span> and add each Apple ID.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
