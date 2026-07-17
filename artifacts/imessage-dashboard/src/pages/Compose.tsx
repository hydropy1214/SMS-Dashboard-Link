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
  Zap, Users, Upload, Loader2, Monitor, Cable, MessageSquare,
  Wifi, HelpCircle,
} from "lucide-react";
import { UsbGuideDialog } from "@/components/UsbGuideDialog";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

/* ─── helpers ────────────────────────────────────────────── */

function isValidPhone(n: string) {
  const stripped = n.replace(/[\s\-().+]/g, "");
  return stripped.length >= 7 && stripped.length <= 15 && /^\d+$/.test(stripped);
}

function parseNumbers(raw: string): { unique: string[]; dupes: number; invalid: string[] } {
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
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

const OFFLINE_MS = 90_000;
function agentIsOnline(lastHeartbeatAt?: string | null) {
  if (!lastHeartbeatAt) return false;
  return Date.now() - new Date(lastHeartbeatAt).getTime() < OFFLINE_MS;
}

type SenderMode = "all" | "specific";

/* ─── SenderRow sub-component ────────────────────────────── */

function SenderRow({
  icon, label, sublabel, badge, badgeClass, accentClass, selected, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  badge?: string;
  badgeClass?: string;
  accentClass: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all w-full ${
        selected ? accentClass : "border-border hover:border-primary/20 hover:bg-secondary/20"
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sublabel}</p>
      </div>
      {badge && (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${badgeClass}`}>
          {badge}
        </span>
      )}
      {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}

/* ─── main component ─────────────────────────────────────── */

interface SendProgress { sent: number; failed: number; total: number; }

export default function Compose() {
  const [rawNumbers, setRawNumbers]     = useState("");
  const [message, setMessage]           = useState("");
  const [showInvalid, setShowInvalid]   = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const [senderMode, setSenderMode]     = useState<SenderMode>("all");
  const [selectedAgentId, setSelectedAgentId]     = useState<string | null>(null);
  const [selectedFromPhone, setSelectedFromPhone] = useState<string | null>(null);
  const [guideOpen, setGuideOpen]       = useState(false);
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
  const selectedAgent = onlineAgents.find(a => a.agentId === selectedAgentId) ?? null;
  const { unique: recipients, dupes, invalid } = useMemo(() => parseNumbers(rawNumbers), [rawNumbers]);

  const isConnected = macStatus?.connected === true;
  const macKnown    = macStatus !== undefined;
  const canSend     = recipients.length > 0 && message.trim().length > 0 && !sendMessage.isPending;
  const segments    = estimateSmsSegments(message.length);

  /* ── file upload ─────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRawNumbers(prev => [prev.trim(), text.trim()].filter(Boolean).join("\n"));
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

  /* ── send ────────────────────────────────────────────── */
  const handleSend = () => {
    if (!canSend) return;
    setSendProgress({ sent: 0, failed: 0, total: recipients.length });

    const sendData: Record<string, unknown> = { phoneNumbers: recipients, content: message };
    if (senderMode === "specific" && selectedAgent) {
      sendData.agentId = selectedAgent.agentId;
      if (selectedFromPhone) sendData.fromPhone = selectedFromPhone;
    }

    sendMessage.mutate(
      { data: sendData as any },
      {
        onSuccess: (data: any) => {
          const { sent = 0, failed = 0, total = 0 } = data ?? {};
          setSendProgress({ sent, failed, total });
          setTimeout(() => {
            setSendProgress(null);
            if (failed === 0)      toast.success(`Sent to ${sent} recipient${sent !== 1 ? "s" : ""}`);
            else if (sent === 0)   toast.error(`Failed for all ${failed} recipients`);
            else                   toast.warning(`Sent: ${sent} · Failed: ${failed}`);
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
    setRawNumbers(recipients.filter((_, i) => i !== idx).join("\n"));
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="space-y-5 pb-12">

      {/* ── Page header ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sp-page-title mb-1">Compose Message</h1>
          <p className="text-sm text-zinc-500">Paste phone numbers, write your message, send.</p>
        </div>
        {macKnown && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium shrink-0 ${
            isConnected
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {isConnected
              ? <><CheckCircle2 className="w-3 h-3" /> {onlineAgents.length > 1 ? `${onlineAgents.length} Macs online` : "Mac Connected"}</>
              : <><AlertCircle className="w-3 h-3" /> Mac Offline</>
            }
          </div>
        )}
      </div>

      {/* ── Send from panel ────────────────────────────── */}
      {onlineAgents.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">

          {/* Header row */}
          <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground tracking-tight">Send from</span>
            </div>
            {/* Mode toggle */}
            <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary border border-border shrink-0">
              {(["all", "specific"] as SenderMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setSenderMode(m);
                    if (m === "all") { setSelectedAgentId(null); setSelectedFromPhone(null); }
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    senderMode === m
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "all" ? "All online Macs" : "Specific device"}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">

            {senderMode === "all" ? (
              /* ── All Macs view ─────────────────────── */
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dispatch picks the least-loaded online Mac automatically. All {onlineAgents.length} Mac{onlineAgents.length !== 1 ? "s" : ""} are eligible.
                </p>
                <div className="flex flex-wrap gap-2">
                  {onlineAgents.map(agent => {
                    const usb:  string[] = (agent as any).usbDevices ?? [];
                    const wifi: string[] = (agent as any).connectedDevices ?? [];
                    const acct: string[] = agent.connectedAccounts ?? [];
                    return (
                      <div key={agent.agentId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-medium text-foreground">{agent.hostname}</span>
                        {usb.length > 0 && (
                          <span className="flex items-center gap-0.5 text-violet-400" title={usb.join(", ")}>
                            <Cable className="w-3 h-3" />{usb.length}
                          </span>
                        )}
                        {wifi.length > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-400" title={wifi.join(", ")}>
                            <Wifi className="w-3 h-3" />{wifi.length}
                          </span>
                        )}
                        {acct.length > 0 && (
                          <span className="flex items-center gap-0.5 text-muted-foreground" title={acct.join(", ")}>
                            <MessageSquare className="w-3 h-3" />{acct.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── Specific device view ──────────────── */
              <div className="space-y-5">

                {/* Step 1 — pick Mac */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step 1 · Choose Mac</p>
                  <div className="grid gap-1.5">
                    {onlineAgents.map(agent => {
                      const usb:  string[] = (agent as any).usbDevices ?? [];
                      const wifi: string[] = (agent as any).connectedDevices ?? [];
                      const acct: string[] = agent.connectedAccounts ?? [];
                      const sel  = selectedAgent?.agentId === agent.agentId;
                      return (
                        <button
                          key={agent.agentId}
                          onClick={() => { setSelectedAgentId(agent.agentId); setSelectedFromPhone(null); }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all w-full ${
                            sel ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20 hover:bg-secondary/20"
                          }`}
                        >
                          <Monitor className={`w-4 h-4 shrink-0 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{agent.hostname}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {usb.length > 0 && (
                                <span className="text-[10px] text-violet-400 flex items-center gap-1">
                                  <Cable className="w-2.5 h-2.5" />{usb.length} USB iPhone{usb.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {wifi.length > 0 && (
                                <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                  <Wifi className="w-2.5 h-2.5" />{wifi.length} Wi-Fi iPhone{wifi.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {acct.length > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5" />{acct.length} iMessage account{acct.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {usb.length === 0 && wifi.length === 0 && acct.length === 0 && (
                                <span className="text-[10px] text-muted-foreground/60">No devices detected</span>
                              )}
                            </div>
                          </div>
                          {sel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 — pick sender (shown once a Mac is selected) */}
                <AnimatePresence>
                  {selectedAgent && (() => {
                    const usb:  string[] = (selectedAgent as any).usbDevices ?? [];
                    const wifi: string[] = (selectedAgent as any).connectedDevices ?? [];
                    const acct: string[] = selectedAgent.connectedAccounts ?? [];
                    const hasSenders = usb.length > 0 || wifi.length > 0 || acct.length > 0;

                    return (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-border space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Step 2 · Send through <span className="normal-case font-normal opacity-60">(optional — defaults to auto)</span>
                            </p>
                            <button
                              onClick={() => setGuideOpen(true)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <HelpCircle className="w-3 h-3" />
                              How to connect iPhones
                            </button>
                          </div>

                          {!hasSenders ? (
                            <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg border border-dashed border-border bg-secondary/10">
                              <AlertCircle className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <p className="text-xs font-semibold text-foreground">No iPhones detected on {selectedAgent.hostname}</p>
                                <p className="text-[11px] text-muted-foreground">Plug in via USB cable, or enable Wi-Fi Text Message Forwarding on your iPhone.</p>
                              </div>
                              <button
                                onClick={() => setGuideOpen(true)}
                                className="shrink-0 text-[10px] px-2.5 py-1 rounded-md border border-border hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors font-medium"
                              >
                                Setup guide
                              </button>
                            </div>
                          ) : (
                            <div className="grid gap-1.5">
                              {/* Auto */}
                              <SenderRow
                                icon={<Zap className={`w-4 h-4 ${!selectedFromPhone ? "text-primary" : "text-muted-foreground"}`} />}
                                label="Auto"
                                sublabel="Messages.app picks — tries iMessage → SMS → fallback"
                                accentClass="border-primary/40 bg-primary/5"
                                selected={!selectedFromPhone}
                                onClick={() => setSelectedFromPhone(null)}
                              />
                              {/* USB iPhones */}
                              {usb.map(dev => (
                                <SenderRow
                                  key={`usb-${dev}`}
                                  icon={<Cable className={`w-4 h-4 ${selectedFromPhone === dev ? "text-violet-400" : "text-muted-foreground"}`} />}
                                  label={dev}
                                  sublabel="USB cable · SMS & iMessage via this iPhone"
                                  badge="USB"
                                  badgeClass="bg-violet-500/10 text-violet-400 border-violet-500/20"
                                  accentClass="border-violet-500/40 bg-violet-500/5"
                                  selected={selectedFromPhone === dev}
                                  onClick={() => setSelectedFromPhone(dev)}
                                />
                              ))}
                              {/* Wi-Fi iPhones */}
                              {wifi.map(dev => (
                                <SenderRow
                                  key={`wifi-${dev}`}
                                  icon={<Wifi className={`w-4 h-4 ${selectedFromPhone === dev ? "text-blue-400" : "text-muted-foreground"}`} />}
                                  label={dev}
                                  sublabel="Wi-Fi forwarding · SMS routed via this iPhone's cellular"
                                  badge="Wi-Fi"
                                  badgeClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  accentClass="border-blue-500/40 bg-blue-500/5"
                                  selected={selectedFromPhone === dev}
                                  onClick={() => setSelectedFromPhone(dev)}
                                />
                              ))}
                              {/* iMessage accounts */}
                              {acct.map(a => (
                                <SenderRow
                                  key={`acct-${a}`}
                                  icon={<MessageSquare className={`w-4 h-4 ${selectedFromPhone === a ? "text-primary" : "text-muted-foreground"}`} />}
                                  label={a}
                                  sublabel="iMessage account"
                                  accentClass="border-primary/40 bg-primary/5"
                                  selected={selectedFromPhone === a}
                                  onClick={() => setSelectedFromPhone(a)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection guide dialog */}
      <UsbGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* ── Mac offline warning ─────────────────────────── */}
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

      {/* ── Main compose card ──────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 space-y-6">

          {/* Recipients */}
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

            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs border-border hover:border-primary/30 hover:text-primary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Upload CSV/TXT
              </Button>
              {rawNumbers && (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setRawNumbers("")}
                >
                  <X className="w-3 h-3 mr-1" />Clear
                </Button>
              )}
            </div>

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

            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
              <Textarea
                placeholder={`Paste phone numbers — one per line or comma-separated\n\n+1 555 000 0001\n+1 555 000 0002, +1 555 000 0003`}
                className="min-h-[120px] resize-y bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-input/60 transition-all font-mono text-sm"
                value={rawNumbers}
                onChange={e => setRawNumbers(e.target.value)}
              />
            </div>

            <AnimatePresence>
              {recipients.length > 0 && recipients.length <= 20 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5">
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

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Message</Label>
              <div className="flex items-center gap-3">
                {message.length > 0 && segments > 1 && (
                  <span className="text-[11px] text-amber-400">{segments} SMS segments</span>
                )}
                <span className={`text-xs font-mono transition-colors ${message.length > 1400 ? "text-amber-500" : "text-muted-foreground/50"}`}>
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

        {/* Progress */}
        <AnimatePresence>
          {sendProgress && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 pb-2 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" />Sending…
                </span>
                <span>
                  {sendProgress.sent} sent · {sendProgress.failed} failed · {sendProgress.total - sendProgress.sent - sendProgress.failed} remaining
                </span>
              </div>
              <Progress value={((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100} className="h-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/20 border-t border-border flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground min-w-0">
            {sendMessage.isPending ? (
              <span className="flex items-center gap-2 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Sending to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}…
              </span>
            ) : recipients.length > 0 && message.trim() ? (
              <span className="flex items-center gap-2 truncate">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">
                  Ready — {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                  {senderMode === "specific" && selectedAgent && (
                    <span className="text-muted-foreground/60">
                      {" "}· via {selectedAgent.hostname}{selectedFromPhone ? ` (${selectedFromPhone})` : " (auto)"}
                    </span>
                  )}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground/50">Fill in recipients and message to send</span>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="lg"
            className="gap-2 font-semibold px-6 bg-blue-500 hover:bg-blue-600 text-white border-0 disabled:opacity-40 shrink-0"
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
