import React, { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Download, ArrowRight, CheckCircle2, XCircle, RefreshCw, Smartphone, Globe, Monitor, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { data: macStatus, isLoading: isLoadingStatus, isFetching: isFetchingStatus } = useGetMacAgentStatus({ 
    query: { 
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 15000 
    } 
  });

  const [macAgentUrl, setMacAgentUrl] = useState("");

  useEffect(() => {
    if (settings?.macAgentUrl) {
      setMacAgentUrl(settings.macAgentUrl);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: { macAgentUrl: macAgentUrl.trim() || null }
    }, {
      onSuccess: () => {
        toast.success("Settings saved successfully");
        queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
      },
      onError: (err: any) => {
        toast.error("Failed to save settings: " + (err?.error || "Unknown error"));
      }
    });
  };

  const handleTestConnection = () => {
    queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
  };

  const handleDownload = () => {
    window.open('/api/mac-agent/download', '_blank');
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary" />
          MAC AGENT CONFIGURATION
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Configure remote bridge to macOS Messages.app</p>
      </div>

      <Card className="border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-transparent" />
        <CardHeader className="bg-secondary/10 pb-4">
          <CardTitle className="font-mono text-sm uppercase tracking-widest text-primary flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Mac Agent Connection
          </CardTitle>
          <CardDescription className="text-xs">Link your local dashboard to your remote Mac</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <Label htmlFor="macAgentUrl" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Mac Agent URL</Label>
            <div className="flex gap-3">
              <Input 
                id="macAgentUrl"
                placeholder="https://your-tunnel-url.trycloudflare.com" 
                value={macAgentUrl}
                onChange={(e) => setMacAgentUrl(e.target.value)}
                className="font-mono bg-input/50 focus-visible:bg-input flex-1"
                disabled={isLoadingSettings}
              />
              <Button onClick={handleSave} disabled={updateSettings.isPending || isLoadingSettings} className="w-24 border-primary/20 hover:bg-primary/20 text-primary bg-primary/10">
                {updateSettings.isPending ? "SAVING..." : "SAVE"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter the HTTPS URL provided by your tunnel (Cloudflare or ngrok).</p>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm tracking-wider uppercase text-muted-foreground">Connection Status</h3>
              <Button onClick={handleTestConnection} variant="outline" size="sm" className="h-8 border-border bg-secondary/30" disabled={isFetchingStatus}>
                <RefreshCw className={`w-3 h-3 mr-2 ${isFetchingStatus ? 'animate-spin' : ''}`} />
                Test Connection
              </Button>
            </div>

            <div className="bg-secondary/20 rounded-md p-4 border border-border">
              {macStatus?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#34c759] font-mono text-sm uppercase">
                    <CheckCircle2 className="w-4 h-4" />
                    Agent Online
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="text-muted-foreground uppercase">Latency</div>
                      <div>{macStatus.latencyMs ? `${macStatus.latencyMs}ms` : '---'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground uppercase">Platform</div>
                      <div>{macStatus.platform || 'Unknown'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground uppercase">Messages.app</div>
                      <div className={macStatus.messagesAppAvailable ? "text-[#34c759]" : "text-destructive"}>
                        {macStatus.messagesAppAvailable ? "READY" : "UNAVAILABLE"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground uppercase">AppleScript</div>
                      <div className={macStatus.appleScriptAvailable ? "text-[#34c759]" : "text-destructive"}>
                        {macStatus.appleScriptAvailable ? "READY" : "UNAVAILABLE"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-destructive font-mono text-sm uppercase">
                  <XCircle className="w-5 h-5" />
                  Agent Offline or Unreachable
                  {macStatus?.error && <span className="text-xs normal-case opacity-80 mt-0.5 ml-2">- {macStatus.error}</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase tracking-widest flex items-center gap-2 text-primary">
            <Download className="w-4 h-4" />
            Download Mac Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="text-center p-6 border border-border bg-secondary/10 rounded-lg space-y-4">
            <p className="text-sm text-foreground/80 max-w-lg mx-auto">
              The Mac Agent runs on your physical Mac, listens for incoming commands from this dashboard, and executes AppleScript to send messages through the native Messages.app.
            </p>
            <Button onClick={handleDownload} className="font-mono font-bold tracking-widest shadow-[0_0_15px_rgba(0,195,255,0.2)] hover:shadow-[0_0_20px_rgba(0,195,255,0.4)]" size="lg">
              <Download className="w-4 h-4 mr-2" />
              DOWNLOAD MAC-AGENT-SETUP.SH
            </Button>
          </div>

          <div className="space-y-6">
            <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Setup Instructions</h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold shrink-0 shadow-[0_0_10px_rgba(0,195,255,0.1)]">1</div>
                <div>
                  <h4 className="font-medium mb-1">Run the setup script on your Mac</h4>
                  <p className="text-sm text-muted-foreground mb-2">Open Terminal on your Mac, navigate to your downloads, and run:</p>
                  <pre className="bg-black/80 p-3 rounded-md text-xs font-mono border border-border text-primary/90 overflow-x-auto shadow-inner">
                    chmod +x mac-agent-setup.sh && ./mac-agent-setup.sh
                  </pre>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold shrink-0 shadow-[0_0_10px_rgba(0,195,255,0.1)]">2</div>
                <div className="w-full">
                  <h4 className="font-medium mb-1">Start a secure tunnel</h4>
                  <p className="text-sm text-muted-foreground mb-4">Expose the agent to the internet so this dashboard can reach it securely.</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-border rounded-md p-4 bg-secondary/10 shadow-sm">
                      <div className="font-mono text-xs uppercase text-primary mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Option A: Cloudflare
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">Recommended, free, no signup required.</div>
                      <pre className="bg-black/80 p-2 rounded-md text-xs font-mono border border-border text-primary/90 overflow-x-auto shadow-inner">
                        npx cloudflared tunnel --url http://localhost:3001
                      </pre>
                    </div>
                    <div className="border border-border rounded-md p-4 bg-secondary/10 shadow-sm">
                      <div className="font-mono text-xs uppercase text-primary mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Option B: ngrok
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">Requires a free ngrok account.</div>
                      <pre className="bg-black/80 p-2 rounded-md text-xs font-mono border border-border text-primary/90 overflow-x-auto shadow-inner">
                        ngrok http 3001
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold shrink-0 shadow-[0_0_10px_rgba(0,195,255,0.1)]">3</div>
                <div>
                  <h4 className="font-medium mb-1">Link the Dashboard</h4>
                  <p className="text-sm text-muted-foreground">Copy the HTTPS URL the tunnel gives you and paste it into the "Mac Agent URL" field above.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4" />
            Architecture Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-8 bg-secondary/10 border border-border rounded-lg overflow-x-auto">
            <div className="flex flex-col items-center gap-2 text-center w-32 shrink-0">
              <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center shadow-md">
                <Globe className="w-6 h-6 text-foreground" />
              </div>
              <span className="text-xs font-mono uppercase text-muted-foreground">This Dashboard</span>
            </div>
            
            <ArrowRight className="w-5 h-5 text-border hidden md:block shrink-0" />
            <div className="w-px h-8 bg-border md:hidden" />
            
            <div className="flex flex-col items-center gap-2 text-center w-32 shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,195,255,0.1)]">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-mono uppercase text-primary">Secure Tunnel</span>
            </div>
            
            <ArrowRight className="w-5 h-5 text-border hidden md:block shrink-0" />
            <div className="w-px h-8 bg-border md:hidden" />
            
            <div className="flex flex-col items-center gap-2 text-center w-32 shrink-0">
              <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center shadow-md">
                <Terminal className="w-6 h-6 text-foreground" />
              </div>
              <span className="text-xs font-mono uppercase text-muted-foreground">Mac Agent</span>
            </div>
            
            <ArrowRight className="w-5 h-5 text-border hidden md:block shrink-0" />
            <div className="w-px h-8 bg-border md:hidden" />
            
            <div className="flex flex-col items-center gap-2 text-center w-32 shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#0a84ff]/10 border border-[#0a84ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(10,132,255,0.1)]">
                <Monitor className="w-6 h-6 text-[#0a84ff]" />
              </div>
              <span className="text-xs font-mono uppercase text-[#0a84ff]">Messages.app</span>
            </div>
            
            <ArrowRight className="w-5 h-5 text-border hidden md:block shrink-0" />
            <div className="w-px h-8 bg-border md:hidden" />
            
            <div className="flex flex-col items-center gap-2 text-center w-32 shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#34c759]/10 border border-[#34c759]/30 flex items-center justify-center shadow-[0_0_15px_rgba(52,199,89,0.1)]">
                <Smartphone className="w-6 h-6 text-[#34c759]" />
              </div>
              <span className="text-xs font-mono uppercase text-[#34c759]">iPhone</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
