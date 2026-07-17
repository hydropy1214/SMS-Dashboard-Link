import React, { useState } from "react";
import { Link } from "wouter";
import {
  useGetMacAgentStatus,
  getGetMacAgentStatusQueryKey,
  useGetSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, XCircle, Terminal, Download, Zap,
  ArrowRight, RefreshCw, Copy, Smartphone, Globe,
  AlertCircle, Send, Loader2, Cable,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBase } from "@/lib/api";
import { UsbGuideDialog } from "@/components/UsbGuideDialog";

/* ─── helpers ─────────────────────────────────────────── */
function copy(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="group">
      {label && (
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1.5">{label}</p>
      )}
      <div className="flex items-start gap-2 bg-black/60 border border-border/80 rounded-lg pl-3.5 pr-2 py-2.5">
        <code className="text-xs font-mono text-primary/90 flex-1 break-all leading-relaxed whitespace-pre-wrap">{code}</code>
        <button
          onClick={() => copy(code, label ?? "Command")}
          className="shrink-0 p-1.5 rounded-md hover:bg-white/8 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-60 group-hover:opacity-100 mt-0.5"
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

/* ─── component ───────────────────────────────────────── */
export default function Setup() {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const { data: macStatus, isFetching, refetch } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false },
  });

  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean; error?: string; method?: string; durationMs?: number;
  } | null>(null);

  const connected = macStatus?.connected === true;
  const hasUrl = Boolean(settings?.macAgentUrl);
  const msgReady = Boolean(macStatus?.messagesAppAvailable);

  const dashboardUrl = window.location.origin;
  const apiBase = getApiBase();
  const downloadUrl = `${apiBase}/api/mac-agent/download`;

  const handleTestSend = async () => {
    const phone = testPhone.trim();
    if (!phone) { toast.error("Enter a phone number to test"); return; }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/api/mac-agent/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) toast.success("Test message sent!");
      else toast.error("Test failed — see details below");
    } catch (err: any) {
      const msg = err?.message ?? "Request failed";
      setTestResult({ success: false, error: msg });
      toast.error("Test request failed");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Setup Guide</h1>
          </div>
          <p className="text-sm text-muted-foreground">Connect your Mac and start sending in 4 steps.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() }); }}
          disabled={isFetching}
          className="h-8 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh status
        </Button>
      </div>

      {/* Overall status banner */}
      {connected ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Mac Agent is connected and ready to send.{" "}
          <Link href="/compose">
            <span className="underline underline-offset-2 cursor-pointer hover:text-emerald-300">
              Compose a message →
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Not connected yet. Follow the steps below.
        </div>
      )}

      {/* ── Step 1: Dashboard URL ── */}
      <Step n={1} done={false} title="Copy your Dispatch dashboard URL">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Mac Agent needs your dashboard URL to send heartbeats back here, so the <Link href="/macs"><span className="text-primary hover:underline cursor-pointer">Connected Macs</span></Link> page updates automatically.
        </p>
        <div className="flex items-center gap-2 bg-black/60 border border-border/80 rounded-lg pl-3.5 pr-2 py-2.5">
          <Globe className="w-3.5 h-3.5 text-primary/60 shrink-0" />
          <code className="text-xs font-mono text-primary flex-1 break-all select-all">{dashboardUrl}</code>
          <button
            onClick={() => copy(dashboardUrl, "Dashboard URL")}
            className="shrink-0 p-1.5 rounded-md hover:bg-white/8 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            title="Copy URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          If you've published/deployed the app, use the production URL instead.
        </p>
      </Step>

      {/* ── Step 2: Download & run agent ── */}
      <Step n={2} done={connected} title="Download and run the Mac Agent on your Mac">
        <p className="text-sm text-muted-foreground leading-relaxed">
          A zero-dependency Node.js server that runs on your Mac and drives Messages.app via AppleScript.
          Requires <strong className="text-foreground">macOS</strong> and <strong className="text-foreground">Node.js 18+</strong>.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">A. Download the installer</p>
          <a href={downloadUrl} download="dispatch-agent-setup.sh">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50">
              <Download className="w-4 h-4" />
              Download dispatch-agent-setup.sh
            </Button>
          </a>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">B. Run it in Terminal — include your dashboard URL</p>
          <CodeBlock
            code={`DISPATCH_URL="${dashboardUrl}" bash ~/Downloads/dispatch-agent-setup.sh`}
            label="Open Terminal on your Mac and run:"
          />
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            <code className="font-mono text-foreground/70">DISPATCH_URL</code> is saved on first run — you only need to set it once.
            Future restarts will use it automatically.
          </p>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-secondary/20 rounded-lg border border-border/60 text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong className="text-foreground">Don't have Node.js?</strong> Install the LTS version from{" "}
            <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              nodejs.org
            </a>{" "}
            — it takes about 2 minutes.
          </span>
        </div>
      </Step>

      {/* ── Step 3: Tunnel ── */}
      <Step n={3} done={hasUrl} title="Expose the agent with a free tunnel">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Mac Agent runs on <code className="font-mono text-foreground/80 text-[11px]">localhost:3001</code>.
          A tunnel gives it a public HTTPS URL so Dispatch can reach it over the internet.
          Open a <strong className="text-foreground">new Terminal window</strong> (keep the agent running) and start one of these:
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">A</span>
              Cloudflare <span className="text-[10px] font-normal text-emerald-400">(free, no account)</span>
            </p>
            <CodeBlock code="npx cloudflared tunnel --url http://localhost:3001" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">B</span>
              ngrok <span className="text-[10px] font-normal text-muted-foreground">(free account needed)</span>
            </p>
            <CodeBlock code="ngrok http 3001" />
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-secondary/20 rounded-lg border border-border/60">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Copy the <strong className="text-foreground">HTTPS</strong> URL the tunnel prints (e.g.{" "}
            <code className="font-mono text-foreground/80 text-[11px]">https://abc123.trycloudflare.com</code>),
            then paste it in{" "}
            <Link href="/settings">
              <span className="text-primary hover:underline cursor-pointer">Settings → Mac Agent URL</span>
            </Link>
            {" "}and click Save.
          </p>
        </div>

        {hasUrl && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tunnel URL saved — Dispatch knows where to reach the agent
          </div>
        )}
      </Step>

      {/* ── Step 4: Messages.app + iPhone ── */}
      <Step n={4} done={msgReady} title="Open Messages.app and link your iPhones">
        <div className="space-y-3">
          {[
            {
              label: "Open Messages.app on your Mac",
              detail: "Sign in with your Apple ID if prompted. Keep it running whenever you use Dispatch.",
            },
            {
              label: "Enable SMS forwarding on each iPhone",
              detail: "Settings → Messages → Text Message Forwarding → toggle your Mac ON. This lets Dispatch send regular SMS (green bubbles) to any phone via your iPhone's cellular.",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium ${
          msgReady
            ? "bg-emerald-500/6 border-emerald-500/20 text-emerald-400"
            : "bg-secondary/20 border-border text-muted-foreground"
        }`}>
          {msgReady
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Messages.app is running and ready</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Messages.app status shows once the agent connects</>}
        </div>
      </Step>

      {/* ── Test send (only shown when connected) ── */}
      {connected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-primary/15">
            <Send className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Send a Test Message</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Verify the whole pipeline end-to-end: agent → Messages.app → recipient's phone.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="+1 555 000 0000"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleTestSend(); }}
                className="flex-1 font-mono text-sm h-9"
              />
              <Button
                onClick={handleTestSend}
                disabled={testLoading || !testPhone.trim()}
                size="sm"
                className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0 h-9 shrink-0"
              >
                {testLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : <><Send className="w-3.5 h-3.5" /> Send test</>}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs ${
                testResult.success
                  ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/8 border-red-500/20 text-red-400"
              }`}>
                {testResult.success
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                <div>
                  {testResult.success ? (
                    <p>
                      ✓ Sent via <strong>{testResult.method}</strong>
                      {testResult.durationMs != null ? ` in ${testResult.durationMs}ms` : ""}.{" "}
                      Check your phone!
                    </p>
                  ) : (
                    <p><strong>Failed:</strong> {testResult.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 5: USB iPhones ── */}
      {(() => {
        const [usbGuideOpen, setUsbGuideOpen] = React.useState(false);
        return (
          <Step n={5} done={false} title="Connect iPhones via USB for faster, more reliable sends">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plug your iPhone into your Mac with a USB cable. USB is more stable than Wi-Fi for Text Message Forwarding
              — no dropped connections during bulk sends. Each plugged-in iPhone shows up as a selectable sender in{" "}
              <Link href="/compose"><span className="text-primary hover:underline cursor-pointer">Compose</span></Link>.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                <div className="flex items-center gap-2">
                  <Cable className="w-3.5 h-3.5 text-violet-400" />
                  <p className="text-xs font-semibold text-foreground">USB connection</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Stable during long bulk sends</li>
                  <li>Works with Wi-Fi off</li>
                  <li>Detected automatically</li>
                </ul>
              </div>
              <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-secondary/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">Wi-Fi forwarding</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Cable-free, more convenient</li>
                  <li>Can drop under congestion</li>
                  <li>Requires same Wi-Fi network</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setUsbGuideOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Cable className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Step-by-step USB setup guide</p>
                  <p className="text-[11px] text-muted-foreground">Trust the computer, enable forwarding, and verify in Dispatch</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400 opacity-60 group-hover:opacity-100 shrink-0 transition-opacity" />
            </button>
            <UsbGuideDialog open={usbGuideOpen} onClose={() => setUsbGuideOpen(false)} />
          </Step>
        );
      })()}

      {/* Multiple phones note */}
      <div className="rounded-xl border border-border/60 bg-secondary/10 p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Connecting multiple iPhones</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              One Mac can forward SMS from <strong className="text-foreground">multiple iPhones</strong> at once —
              repeat the USB or Text Message Forwarding step on each iPhone.
              All linked phones appear in{" "}
              <Link href="/devices"><span className="text-primary hover:underline cursor-pointer">Devices</span></Link>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For multiple Apple IDs:{" "}
              <span className="font-mono text-foreground/80 text-[11px]">Messages.app → Settings → iMessage → add account</span>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
