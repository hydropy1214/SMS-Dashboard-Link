import React, { useState, useMemo } from "react";
import {
  useSendMessage,
  useGetMacAgentStatus,
  getGetMacAgentStatusQueryKey,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, X, AlertCircle, CheckCircle2, Settings as SettingsIcon, Zap, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";

/* ─── helpers ──────────────────────────────────────────────── */

function parseNumbers(raw: string): { unique: string[]; dupes: number } {
  const all = raw.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const n of all) {
    if (!seen.has(n)) { seen.add(n); unique.push(n); }
  }
  return { unique, dupes: all.length - unique.length };
}

/* ─── component ─────────────────────────────────────────────── */

export default function Compose() {
  const [rawNumbers, setRawNumbers] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useSendMessage();
  const { data: macStatus } = useGetMacAgentStatus({
    query: { queryKey: getGetMacAgentStatusQueryKey(), refetchInterval: 8000, retry: false },
  });

  const { unique: recipients, dupes } = useMemo(() => parseNumbers(rawNumbers), [rawNumbers]);

  const isConnected = macStatus?.connected === true;
  const macKnown = macStatus !== undefined;
  const canSend = recipients.length > 0 && message.trim().length > 0 && !sendMessage.isPending;

  const handleSend = () => {
    if (!canSend) return;
    sendMessage.mutate(
      { data: { phoneNumbers: recipients, content: message } },
      {
        onSuccess: (data: any[]) => {
          const sent = data.filter((r: any) => r.status === "sent").length;
          const failed = data.filter((r: any) => r.status === "failed").length;
          if (failed === 0)       toast.success(`Sent to ${sent} recipient${sent !== 1 ? "s" : ""}`);
          else if (sent === 0)    toast.error(`Failed for all ${failed} recipients`);
          else                    toast.warning(`Sent: ${sent} · Failed: ${failed}`);
          setRawNumbers("");
          setMessage("");
          queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
        },
        onError: (err: any) => toast.error("Send failed: " + (err?.error ?? "Unknown error")),
      }
    );
  };

  const removeRecipient = (idx: number) => {
    const updated = recipients.filter((_, i) => i !== idx);
    setRawNumbers(updated.join("\n"));
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse dispatch-glow-sm" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Compose Message</h1>
          </div>
          <p className="text-sm text-muted-foreground">Paste phone numbers, write your message, send.</p>
        </div>
        {macKnown && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
            isConnected
              ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
              : "bg-destructive/8 border-destructive/20 text-destructive"
          }`}>
            {isConnected
              ? <><CheckCircle2 className="w-3 h-3" /> Mac Connected</>
              : <><AlertCircle className="w-3 h-3" /> Mac Offline</>
            }
          </div>
        )}
      </div>

      {/* Offline banner */}
      <AnimatePresence>
        {macKnown && !isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-destructive/25 bg-destructive/8"
          >
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Mac Agent not connected</p>
              <p className="text-xs text-destructive/70 mt-0.5">
                Messages will fail until you connect your Mac. Follow the setup guide to get started.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/setup">
                <Button size="sm" variant="destructive" className="h-7 text-xs font-medium">
                  Setup Guide
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive">
                  <SettingsIcon className="w-3 h-3 mr-1" />Settings
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main compose card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        {/* Accent top line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="p-6 space-y-6">

          {/* Recipients */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Recipients
              </Label>
              {recipients.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {dupes > 0 && (
                    <span className="text-amber-500 font-medium">
                      {dupes} duplicate{dupes !== 1 ? "s" : ""} removed
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            <Textarea
              placeholder={`Paste phone numbers — one per line or comma-separated\n\n+1 555 000 0001\n+1 555 000 0002, +1 555 000 0003`}
              className="font-mono text-sm min-h-[110px] resize-y bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-input/60 transition-all placeholder:text-muted-foreground/40"
              value={rawNumbers}
              onChange={e => setRawNumbers(e.target.value)}
            />

            {/* Parsed chips */}
            <AnimatePresence>
              {recipients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-secondary/30 border border-border min-h-[40px]">
                    <AnimatePresence>
                      {recipients.map((num, idx) => (
                        <motion.span
                          key={`${num}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.12 }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-mono text-foreground/90 group"
                        >
                          {num}
                          <button
                            onClick={() => removeRecipient(idx)}
                            className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Message
              </Label>
              <span className={`text-xs font-mono transition-colors ${
                message.length > 1400 ? "text-amber-500" : "text-muted-foreground/50"
              }`}>
                {message.length} chars
              </span>
            </div>
            <Textarea
              placeholder="Write your message here…"
              className="min-h-[150px] resize-y bg-input/40 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 focus-visible:bg-input/60 transition-all text-[15px] leading-relaxed"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>

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
            className="gap-2 font-semibold px-6 dispatch-glow disabled:opacity-40 disabled:shadow-none"
          >
            {sendMessage.isPending ? "Sending…" : <>Send <Send className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
