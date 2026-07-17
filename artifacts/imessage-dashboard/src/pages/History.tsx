import React from "react";
import { useGetMessages, useDeleteMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, CheckCircle, Clock, RefreshCw, Trash } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function History() {
  const { data: messages, isLoading } = useGetMessages();
  const deleteMessage = useDeleteMessage();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    deleteMessage.mutate({ id }, {
      onSuccess: () => {
        toast.success("Log entry expunged");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
      },
      onError: () => {
        toast.error("Failed to delete log entry");
      }
    });
  };

  const getStatusBadge = (status: string, error?: string | null) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] uppercase tracking-wider">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[10px] uppercase tracking-wider" title={error || "Unknown error"}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-mono text-[10px] uppercase tracking-wider">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            TRANSMISSION LOG
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Archived outgoing data</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="font-mono text-xs"
          onClick={() => queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() })}
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Syncing logs...
            </span>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center border-t border-border">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4 border border-border">
              <History className="w-6 h-6 opacity-50" />
            </div>
            <p className="font-mono text-sm uppercase tracking-wider">Log empty</p>
            <p className="text-xs mt-2 opacity-60">No transmissions have been recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-12 gap-4 p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider bg-secondary/20">
              <div className="col-span-3">Target / Time</div>
              <div className="col-span-6">Payload</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <div className="flex flex-col">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
                    key={msg.id} 
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-secondary/30 transition-colors group"
                  >
                    <div className="col-span-3 space-y-1">
                      <div className="font-mono text-sm font-medium text-foreground truncate">{msg.phoneNumber}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {format(new Date(msg.sentAt), "MMM d, HH:mm:ss")}
                      </div>
                    </div>
                    <div className="col-span-6">
                      <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-center items-center">
                      {getStatusBadge(msg.status, msg.error)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleteMessage.isPending}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
