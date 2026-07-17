import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  useSendMessage,
  useGetMacAgentStatus,
  useGetAgents,
  getGetMacAgentStatusQueryKey,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Send, X, AlertCircle, CheckCircle2, Settings as SettingsIcon,
  Zap, Users, Upload, FileText, Loader2, XCircle, Clock, Monitor, ChevronDown, Cable, MessageSquare, Smartphone,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

/* ─── phone number helpers ──────────────────────────────────── */

const PHONE_RE = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,10}$/;

function isValidPhone(n: string) {
  const stripped = n.replace(/[\s\-().+]/g, "");
  return stripped.length >= 7 && stripped.length <= 15 && /^\d+$/.test(stripped);
}

function parseNumbers(raw: string): {
  unique: string[];
  dupes: number;
  invalid: string[];
} {
  const all = raw.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  const invalid: string[] = [];
  let dupes = 0;
  for (const n of all) {
    if (!isValidPhone(n)) { invalid.push(n); continue; }
    if (seen.has(n)) { dupes++; continue; }
    seen.add(n);
    unique.push(n);
  }
  return { unique, dupes, invalid };
}

function estimateSmsSegments(len: number) {
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

/* ─── send progress ──────────────────────────────────────────── */

interface SendProgress {
  sent: number;
  failed: number;
  total: number;
}

/* ─── component ─────────────────────────────────────────────── */

const OFFLINE_MS = 90_000;

function agentIsOnline(lastHeartbeatAt?: string | null) {
  if (!lastHeartbeatAt) return false;
  return Date.now() - new Date(lastHeartbeatAt).getTime() < OFFLINE_MS;
}

export default function Compose() {
  const [rawNumbers, setRawNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [showInvalid, setShowInvalid] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedFromPhone, setSelectedFromPhone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sendMessage = useSendMessage();
  const { data: macStatus } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false },
  });
  const { data: allAgents = [] } = useGetAgents({
    query: { refetchInterval: 15_000, retry: false },
  });

  const onlineAgents = useMemo(
    () => allAgents.filter(a => agentIsOnline(a.lastHeartbeatAt)),
    [allAgents],
  );

  // Auto-clear selectedAgentId if that agent goes offline
  const selectedAgent = onlineAgents.find(a => a.agentId === selectedAgentId) ?? null;

  const { unique: recipients, dupes, invalid } = useMemo(() => parseNumbers(rawNumbers), [rawNumbers]);

  const isConnected = macStatus?.connected === true;
  const macKnown = macStatus !== undefined;
  const canSend = recipients.length > 0 && message.trim().length > 0 && !sendMessage.isPending;
  const segments = estimateSmsSegments(message.length);

  /* ── file upload ─────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawNumbers(prev => {
        const combined = [prev.trim(), text.trim()].filter(Boolean).join("\n");
        return combined;
      });
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      handleFile(file);
    } else {
      toast.error("Please drop a .csv or .txt file");
    }
  }, [handleFile]);

  /* ── send ────────────────────────────────────────────────── */
  const handleSend = () => {
    if (!canSend) return;
    setSendProgress({ sent: 0, failed: 0, total: recipients.length });

    sendMessage.mutate(
      { data: { phoneNumbers: recipients, content: message, ...(selectedAgent ? { agentId: selectedAgent.agentId } : {}), ...(selectedFromPhone ? { fromPhone: selectedFromPhone } : {}) } },
      {
        onSuccess: (data: any) => {
          const { sent = 0, failed = 0, total = 0, results = [] } = data ?? {};
          setSendProgress({ sent, failed, total });

          setTimeout(() => {
            setSendProgress(null);
            if (failed === 0) toast.success(`Sent to ${sent} recipient${sent !== 1 ? "s" : ""}`);
            else if (sent === 0) toast.error(`Failed for all ${failed} recipients`);
            else toast.warning(`Sent: ${sent} · Failed: ${failed}`);
            setRawNumbers("");
            setMessage("");
            queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
          }, 1200);
        },
        onError: (err: any) => {
          setSendProgress(null);
          toast.error("Send failed: " + (err?.message ?? "Unknown error"));
        },
      }
    );
  };

  const removeRecipient = (idx: number) => {
    const updated = recipients.filter((_, i) => i !== idx);
    setRawNumbers(updated.join("\n"));
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Compose Message</h1>
          <p className="text-sm text-zinc-500">Paste phone numbers, write your message, send.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Agent / iPhone picker — visible when 2+ agents are online */}
          {onlineAgents.length >= 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  <Monitor className="w-3 h-3" />
                  {selectedAgent
                    ? <span className="max-w-[120px] truncate">{selectedAgent.hostname}</span>
                    : <span>Any Mac ({onlineAgents.length} online)</span>
                  }
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Send from…</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setSelectedAgentId(null)}
                  className="gap-2 cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Any available Mac</p>
                    <p className="text-[10px] text-muted-foreground">Dispatch picks the least-loaded agent</p>
                  </div>
                  {!selectedAgent && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onlineAgents.map(agent => {
                  const accounts = agent.connectedAccounts ?? [];
                  const isSelected = selectedAgent?.agentId === agent.agentId;
                  return (
                    <DropdownMenuItem
                      key={agent.agentId}
                      onSelect={() => setSelectedAgentId(agent.agentId)}
                      className="gap-2 cursor-pointer"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{agent.hostname}</p>
                        {accounts.length > 0
                          ? <p className="text-[10px] text-muted-foreground truncate">{accounts.join(", ")}</p>
                          : <p className="text-[10px] text-muted-foreground">No accounts detected</p>
                        }
                      </div>
                      {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
                {onlineAgents.length === 0 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No Macs online
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* iPhone / account sender picker */}
          {onlineAgents.length >= 1 && (() => {
            const sourceAgent = selectedAgent ?? onlineAgents[0];
            const usbDevices: string[] = (sourceAgent as any)?.usbDevices ?? [];
            const accounts: string[] = sourceAgent?.connectedAccounts ?? [];
            const allSenders = [
              ...usbDevices.map(d => ({ label: d, kind: "usb" as const })),
              ...accounts.map(a => ({ label: a, kind: "imessage" as const })),
            ];
            if (allSenders.length === 0) return null;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground hover:border-violet-400/40 hover:text-foreground transition-colors">
                    {selectedFromPhone
                      ? usbDevices.includes(selectedFromPhone)
                        ? <Cable className="w-3 h-3 text-violet-400" />
                        : <MessageSquare className="w-3 h-3 text-blue-400" />
                      : <Smartphone className="w-3 h-3" />}
                    <span className="max-w-[130px] truncate">
                      {selectedFromPhone ?? "Auto sender"}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Send from iPhone / account…</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setSelectedFromPhone(null)} className="gap-2 cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Auto (Messages.app picks)</p>
                      <p className="text-[10px] text-muted-foreground">Tries iMessage → SMS → fallback</p>
                    </div>
                    {!selectedFromPhone && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                  </DropdownMenuItem>
                  {usbDevices.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal px-2 py-1">USB iPhones</DropdownMenuLabel>
                      {usbDevices.map(dev => (
                        <DropdownMenuItem key={dev} onSelect={() => setSelectedFromPhone(dev)} className="gap-2 cursor-pointer">
                          <Cable className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{dev}</p>
                            <p className="text-[10px] text-muted-foreground">Connected via USB cable</p>
                          </div>
                          {selectedFromPhone === dev && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {accounts.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal px-2 py-1">iMessage accounts</DropdownMenuLabel>
                      {accounts.map(acct => (
                        <DropdownMenuItem key={acct} onSelect={() => setSelectedFromPhone(acct)} className="gap-2 cursor-pointer">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <p className="text-xs font-mono truncate">{acct}</p>
                          {selectedFromPhone === acct && <CheckCircle2 className="w-3 h-3 ml-auto text-primary shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}

          {/* Mac connection status pill */}
          {macKnown && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium ${
              isConnected
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {isConnected
                ? <><CheckCircle2 className="w-3 h-3" /> {onlineAgents.length > 1 ? `${onlineAgents.length} Macs` : "Mac Connected"}</>
                : <><AlertCircle className="w-3 h-3" /> Mac Offline</>
              }
            </div>
          )}
        </div>
      </div>

      {/* Mac Agent warning */}
      <AnimatePresence>
        {macKnown && !isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5"
          >
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Mac Agent not connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">Messages will fail until you connect your Mac.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/setup">
                <Button size="sm" variant="destructive" className="h-7 text-xs">Setup Guide</Button>
              </Link>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30">
                  <SettingsIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 space-y-6">

          {/* Recipients section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Recipients
              </Label>
              <div className="flex items-center gap-2">
                {dupes > 0 && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                    {dupes} duplicate{dupes !== 1 ? "s" : ""} removed
                  </Badge>
                )}
                {invalid.length > 0 && (
                  <button
                    onClick={() => setShowInvalid(v => !v)}
                    className="text-[10px] text-destructive border border-destructive/30 rounded px-2 py-0.5 hover:bg-destructive/8 transition-colors"
                  >
                    {invalid.length} invalid {showInvalid ? "▲" : "▼"}
                  </button>
                )}
                {recipients.length > 0 && (
                  <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Upload buttons */}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-border hover:border-primary/30 hover:text-primary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Upload CSV/TXT
              </Button>
              {rawNumbers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setRawNumbers("")}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Invalid numbers warning */}
            <AnimatePresence>
              {showInvalid && invalid.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1"
                >
                  <p className="text-[11px] font-medium text-destructive">Skipped — invalid format:</p>
                  {invalid.slice(0, 8).map((n, i) => (
                    <p key={i} className="text-[11px] font-mono text-muted-foreground">• {n}</p>
                  ))}
                  {invalid.length > 8 && (
                    <p className="text-[11px] text-muted-foreground">…and {invalid.length - 8} more</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea + drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Textarea
                placeholder={`Paste phone numbers — one per line or comma-separated\n\n+1 555 000 0001\n+1 555 000 0002, +1 555 000 0003`}
                className="min-h-[120px] resize-y bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-input/60 transition-all font-mono text-sm"
                value={rawNumbers}
                onChange={e => setRawNumbers(e.target.value)}
              />
            </div>

            {/* Recipient chips */}
            <AnimatePresence>
              {recipients.length > 0 && recipients.length <= 20 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-1.5"
                >
                  {recipients.map((r, i) => (
                    <motion.span
                      key={r}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/8 border border-primary/15 text-primary text-[11px] font-mono"
                    >
                      {r}
                      <button onClick={() => removeRecipient(i)} className="hover:text-destructive transition-colors ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </motion.span>
                  ))}
                </motion.div>
              )}
              {recipients.length > 20 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                  {recipients.length} recipients loaded
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Message section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Message</Label>
              <div className="flex items-center gap-3">
                {message.length > 0 && (
                  <span className="text-[11px] text-muted-foreground/60">
                    {segments > 1 && <span className="text-amber-400 mr-1">{segments} SMS segments</span>}
                  </span>
                )}
                <span className={`text-xs font-mono transition-colors ${
                  message.length > 1400 ? "text-amber-500" : "text-muted-foreground/50"
                }`}>
                  {message.length} chars
                </span>
              </div>
            </div>
            <Textarea
              placeholder="Write your message here…"
              className="min-h-[150px] resize-y bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-input/60 transition-all text-[15px] leading-relaxed"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* Send progress bar */}
        <AnimatePresence>
          {sendProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-2 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Sending…
                </span>
                <span>
                  {sendProgress.sent} sent · {sendProgress.failed} failed · {sendProgress.total - sendProgress.sent - sendProgress.failed} remaining
                </span>
              </div>
              <Progress
                value={((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}
                className="h-1"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/20 border-t border-border flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {sendMessage.isPending ? (
              <span className="flex items-center gap-2 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Sending to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}…
              </span>
            ) : recipients.length > 0 && message.trim() ? (
              <span className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Ready — {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-muted-foreground/50">Fill in recipients and message to send</span>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="lg"
            className="gap-2 font-semibold px-6 bg-blue-500 hover:bg-blue-600 text-white border-0 disabled:opacity-40"
          >
            {sendMessage.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
