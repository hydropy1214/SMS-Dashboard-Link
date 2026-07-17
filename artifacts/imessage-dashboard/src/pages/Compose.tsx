import React, { useState, useMemo } from "react";
import { useSendMessage, useGetContacts, useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Send, Users, X, AlertCircle, CheckCircle2, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Compose() {
  const [rawNumbers, setRawNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);

  const sendMessage = useSendMessage();
  const { data: contacts } = useGetContacts();
  const { data: macStatus } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 15000
    }
  });

  // Parse phone numbers from raw input
  const parsedNumbers = useMemo(() => {
    if (!rawNumbers.trim()) return [];
    // Split by comma or newline, trim spaces, remove empty
    return rawNumbers
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
  }, [rawNumbers]);

  const handleSend = () => {
    if (parsedNumbers.length === 0) {
      toast.error("No valid phone numbers provided");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    sendMessage.mutate({
      data: {
        phoneNumbers: parsedNumbers,
        content: message
      }
    }, {
      onSuccess: () => {
        toast.success(`Message dispatched to ${parsedNumbers.length} recipient(s)`);
        setRawNumbers("");
        setMessage("");
      },
      onError: (err) => {
        toast.error("Failed to send message: " + (err.error?.error || "Unknown error"));
      }
    });
  };

  const addContactNumber = (phone: string) => {
    const newNumbers = rawNumbers ? `${rawNumbers}\n${phone}` : phone;
    setRawNumbers(newNumbers);
    setIsContactPopoverOpen(false);
  };

  const removeNumber = (indexToRemove: number) => {
    const updated = parsedNumbers.filter((_, idx) => indexToRemove !== idx);
    setRawNumbers(updated.join("\n"));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,195,255,0.8)] animate-pulse" />
            COMPOSE
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Initialize transmission sequence</p>
        </div>
      </div>

      {macStatus && !macStatus.connected && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-mono uppercase tracking-wider text-sm font-bold">Mac Agent Offline</AlertTitle>
          <AlertDescription className="font-mono text-xs mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>Mac Agent not connected — messages will fail. Configure it in Settings.</span>
            <Link href="/settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 px-3 text-xs uppercase tracking-widest shrink-0">
              <SettingsIcon className="w-3 h-3 mr-2" /> Settings
            </Link>
          </AlertDescription>
        </Alert>
      )}
      
      {macStatus?.connected && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#34c759]/10 border border-[#34c759]/30 text-[#34c759] text-xs font-mono uppercase w-max mb-4 shadow-[0_0_10px_rgba(52,199,89,0.1)]">
          <CheckCircle2 className="w-3.5 h-3.5" /> Agent Connected
        </div>
      )}

      <Card className="border-primary/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)] bg-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10" />
        <CardContent className="p-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipients" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Target Identifiers</Label>
              <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-mono bg-secondary/50 hover:bg-secondary border-secondary-border">
                    <Users className="w-3 h-3 mr-2" />
                    Load from Directory
                    <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 bg-card border-border shadow-xl shadow-black/50" align="end">
                  <div className="p-2 border-b border-border font-mono text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
                    Registered Contacts
                  </div>
                  <ScrollArea className="h-64">
                    {contacts?.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground font-mono">No contacts found</div>
                    ) : (
                      <div className="flex flex-col p-1">
                        {contacts?.map(contact => (
                          <button
                            key={contact.id}
                            onClick={() => addContactNumber(contact.phoneNumber)}
                            className="flex flex-col items-start px-3 py-2 hover:bg-secondary/50 rounded-md transition-colors text-left"
                          >
                            <span className="font-medium text-sm text-foreground">{contact.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">{contact.phoneNumber}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-3">
              <Textarea 
                id="recipients"
                placeholder="Paste numbers here, separated by newlines or commas..."
                className="font-mono text-sm min-h-[100px] resize-y bg-input/50 focus-visible:bg-input border-border focus-visible:ring-primary/50 transition-colors"
                value={rawNumbers}
                onChange={(e) => setRawNumbers(e.target.value)}
              />
              
              <div className="min-h-[40px] bg-secondary/30 rounded-md border border-border p-3">
                {parsedNumbers.length === 0 ? (
                  <div className="text-xs font-mono text-muted-foreground/50 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Awaiting input parameters...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {parsedNumbers.map((num, idx) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          key={`${num}-${idx}`}
                        >
                          <Badge variant="secondary" className="font-mono text-xs pl-2 pr-1 py-1 gap-1 border-primary/20 bg-primary/10 text-primary-foreground hover:bg-primary/20 flex items-center">
                            {num}
                            <button 
                              onClick={() => removeNumber(idx)}
                              className="ml-1 p-0.5 rounded hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="message" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Payload Data</Label>
            <div className="relative">
              <Textarea 
                id="message"
                placeholder="Enter message content..."
                className="min-h-[160px] resize-y bg-input/50 focus-visible:bg-input border-border focus-visible:ring-primary/50 transition-colors text-base"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 text-xs font-mono text-muted-foreground/60">
                {message.length} chars
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-secondary/20 p-6 border-t border-border flex justify-between items-center">
          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            {sendMessage.isPending ? (
              <span className="text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Transmitting...
              </span>
            ) : (
              <span>System Ready</span>
            )}
          </div>
          <Button 
            onClick={handleSend} 
            disabled={parsedNumbers.length === 0 || !message.trim() || sendMessage.isPending}
            className="w-40 font-mono font-bold tracking-widest shadow-[0_0_15px_rgba(0,195,255,0.3)] hover:shadow-[0_0_25px_rgba(0,195,255,0.5)] transition-all"
          >
            {sendMessage.isPending ? (
              "SENDING..."
            ) : (
              <>
                EXECUTE <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
