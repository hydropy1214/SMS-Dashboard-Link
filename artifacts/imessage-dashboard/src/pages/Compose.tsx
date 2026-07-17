import React, { useState, useMemo } from "react";
import { useSendMessage, useGetMacAgentStatus, getGetMacAgentStatusQueryKey, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, X, AlertCircle, CheckCircle2, Settings as SettingsIcon, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";

function parseAndDedupeNumbers(raw: string): { numbers: string[]; dupeCount: number } {
  const all = raw
    .split(/[\n,]+/)
    .map(n => n.trim())
    .filter(n => n.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const n of all) {
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
  }
  return { numbers: unique, dupeCount: all.length - unique.length };
}

export default function Compose() {
  const [rawNumbers, setRawNumbers] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useSendMessage();
  const { data: macStatus } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
    }
  });

  const { numbers: parsedNumbers, dupeCount } = useMemo(
    () => parseAndDedupeNumbers(rawNumbers),
    [rawNumbers]
  );

  const handleSend = () => {
    if (parsedNumbers.length === 0) {
      toast.error("Paste at least one phone number");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    sendMessage.mutate(
      { data: { phoneNumbers: parsedNumbers, content: message } },
      {
        onSuccess: (data) => {
          const sent = data.filter((r: any) => r.status === "sent").length;
          const failed = data.filter((r: any) => r.status === "failed").length;
          if (failed === 0) {
            toast.success(`Sent to ${sent} recipient${sent !== 1 ? 's' : ''}`);
          } else if (sent === 0) {
            toast.error(`Failed to send to all ${failed} recipient${failed !== 1 ? 's' : ''}`);
          } else {
            toast.warning(`Sent to ${sent}, failed for ${failed}`);
          }
          setRawNumbers("");
          setMessage("");
          queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
        },
        onError: (err: any) => {
          toast.error("Send error: " + (err?.error || "Unknown error"));
        }
      }
    );
  };

  const removeNumber = (indexToRemove: number) => {
    const updated = parsedNumbers.filter((_, idx) => indexToRemove !== idx);
    setRawNumbers(updated.join("\n"));
  };

  const isConnected = macStatus?.connected === true;
  const macStatusKnown = macStatus !== undefined;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,195,255,0.8)] animate-pulse" />
          COMPOSE
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Send iMessages from your Mac</p>
      </div>

      {/* Mac offline banner */}
      {macStatusKnown && !isConnected && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-mono uppercase tracking-wider text-sm font-bold">Mac Agent Offline</AlertTitle>
          <AlertDescription className="font-mono text-xs mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Mac Agent not running — messages will fail. Go to Setup to connect your Mac.</span>
            <div className="flex gap-2 shrink-0">
              <Link href="/setup">
                <Button size="sm" variant="destructive" className="h-7 text-xs font-mono uppercase tracking-widest">
                  Setup Guide
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="h-7 text-xs font-mono uppercase tracking-widest border-destructive/40 text-destructive hover:bg-destructive/10">
                  <SettingsIcon className="w-3 h-3 mr-1" /> Settings
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {macStatusKnown && isConnected && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#34c759]/10 border border-[#34c759]/30 text-[#34c759] text-xs font-mono uppercase w-max">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mac Agent Connected
          {macStatus?.latencyMs && <span className="opacity-60 normal-case ml-1">· {macStatus.latencyMs}ms</span>}
        </div>
      )}

      <Card className="border-primary/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)] bg-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10" />
        <CardContent className="p-6 space-y-7">

          {/* Phone numbers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipients" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Phone Numbers
              </Label>
              {parsedNumbers.length > 0 && (
                <span className="text-xs font-mono text-muted-foreground">
                  {parsedNumbers.length} recipient{parsedNumbers.length !== 1 ? 's' : ''}
                  {dupeCount > 0 && (
                    <span className="ml-2 text-amber-500">· {dupeCount} duplicate{dupeCount !== 1 ? 's' : ''} removed</span>
                  )}
                </span>
              )}
            </div>

            <Textarea
              id="recipients"
              placeholder={`Paste phone numbers here — one per line or comma-separated:\n+1 555 000 0001\n+1 555 000 0002, +1 555 000 0003`}
              className="font-mono text-sm min-h-[110px] resize-y bg-input/50 focus-visible:bg-input border-border focus-visible:ring-primary/50 transition-colors"
              value={rawNumbers}
              onChange={(e) => setRawNumbers(e.target.value)}
            />

            {/* Parsed number chips */}
            {parsedNumbers.length > 0 && (
              <div className="min-h-[36px] bg-secondary/30 rounded-md border border-border p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {parsedNumbers.map((num, idx) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12 }}
                        key={`${num}-${idx}`}
                      >
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs pl-2 pr-1 py-1 gap-1 border-primary/20 bg-primary/10 text-primary-foreground hover:bg-primary/20 flex items-center"
                        >
                          {num}
                          <button
                            onClick={() => removeNumber(idx)}
                            className="ml-1 p-0.5 rounded hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {parsedNumbers.length === 0 && rawNumbers.length === 0 && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/50">
                <Info className="w-3 h-3" />
                Duplicates are automatically removed when you paste
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Label htmlFor="message" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Message
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                placeholder="Type your message here..."
                className="min-h-[140px] resize-y bg-input/50 focus-visible:bg-input border-border focus-visible:ring-primary/50 transition-colors text-base pr-14"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 text-xs font-mono text-muted-foreground/50">
                {message.length}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-secondary/20 p-5 border-t border-border flex justify-between items-center">
          <div className="text-xs font-mono text-muted-foreground">
            {sendMessage.isPending ? (
              <span className="text-primary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Sending to {parsedNumbers.length} recipient{parsedNumbers.length !== 1 ? 's' : ''}...
              </span>
            ) : (
              <span>
                {parsedNumbers.length > 0 && message.trim()
                  ? `Ready to send to ${parsedNumbers.length} recipient${parsedNumbers.length !== 1 ? 's' : ''}`
                  : 'Waiting for input'}
              </span>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={parsedNumbers.length === 0 || !message.trim() || sendMessage.isPending}
            className="w-36 font-mono font-bold tracking-widest shadow-[0_0_15px_rgba(0,195,255,0.3)] hover:shadow-[0_0_25px_rgba(0,195,255,0.5)] transition-all"
          >
            {sendMessage.isPending ? (
              "SENDING..."
            ) : (
              <>SEND <Send className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
