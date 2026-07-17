import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cable, Smartphone, CheckCircle2, AlertCircle, ArrowRight,
  Shield, MessageSquare, Wifi, Zap, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Step data ─────────────────────────────────────────────── */
const STEPS = [
  {
    icon: Cable,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    badge: "Step 1 of 5",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    title: "Plug your iPhone into your Mac",
    description: "Use the USB cable that came with your iPhone (Lightning or USB-C). Connect it directly to a USB port on your Mac — not through a hub if possible.",
    tips: [
      "Any iPhone running iOS 8+ works",
      "Use Apple's original cable for best reliability",
      "The cable used for charging works fine",
    ],
    visual: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-20 rounded-xl border-2 border-border bg-secondary/40 flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-muted-foreground/60" />
          </div>
          <span className="text-[10px] text-muted-foreground">iPhone</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-1 rounded-full bg-violet-400/60" />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">USB cable</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-20 h-14 rounded-xl border-2 border-border bg-secondary/40 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60 font-medium">Mac</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Your Mac</span>
        </div>
      </div>
    ),
  },
  {
    icon: Shield,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    badge: "Step 2 of 5",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: "Trust your Mac on the iPhone",
    description: "The first time you plug in, your iPhone will show a prompt. You must tap Trust to allow the Mac to communicate with it.",
    tips: [
      "Only appears the first time you connect",
      "Enter your iPhone passcode if asked",
      "If you missed it, unplug and replug to see it again",
    ],
    visual: (
      <div className="mx-auto w-48 rounded-2xl border-2 border-border bg-secondary/30 overflow-hidden">
        <div className="bg-secondary/60 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-foreground">iPhone</p>
        </div>
        <div className="p-4 text-center space-y-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 mx-auto flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground">Trust This Computer?</p>
            <p className="text-[9px] text-muted-foreground mt-1">Trusting this computer will allow it to access your iPhone data.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 py-1 rounded-lg border border-border text-[9px] text-muted-foreground text-center">Don't Trust</div>
            <div className="flex-1 py-1 rounded-lg bg-blue-500 text-[9px] text-white text-center font-medium">Trust</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: MessageSquare,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    badge: "Step 3 of 5",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Turn on Text Message Forwarding",
    description: "This tells your iPhone to route SMS messages through your Mac's Messages.app, so Dispatch can send them.",
    tips: [
      "Both iPhone and Mac must be on the same Apple ID",
      "Wi-Fi or USB connection required for forwarding",
      "One Mac can forward from multiple iPhones",
    ],
    visual: (
      <div className="mx-auto w-52 space-y-0.5">
        <div className="bg-secondary/40 rounded-t-xl px-3 py-2 flex items-center gap-2 border border-border border-b-0">
          <div className="w-4 h-4 rounded bg-green-500/80 flex items-center justify-center">
            <MessageSquare className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Settings → Messages</span>
        </div>
        {[
          { label: "Text Message Forwarding", value: true, highlight: true },
          { label: "Send as SMS", value: true, highlight: false },
          { label: "iMessage", value: true, highlight: false },
        ].map((row, i) => (
          <div key={i} className={`px-3 py-2 flex items-center justify-between border border-border ${row.highlight ? "bg-emerald-500/8 border-emerald-500/20" : "bg-secondary/20"} ${i === 2 ? "rounded-b-xl" : ""}`}>
            <span className={`text-[10px] ${row.highlight ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>{row.label}</span>
            <div className={`w-7 h-4 rounded-full border flex items-center ${row.value ? "bg-emerald-500/80 border-emerald-500/60 justify-end" : "bg-secondary/60 border-border justify-start"}`}>
              <div className="w-3 h-3 rounded-full bg-white mx-0.5" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Smartphone,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    badge: "Step 4 of 5",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    title: "Select your Mac in Forwarding list",
    description: "After tapping Text Message Forwarding, you'll see a list of nearby Macs. Toggle your Mac's name to ON.",
    tips: [
      "A 6-digit code may appear on your Mac — enter it on your iPhone",
      "The Mac must be nearby and on the same Apple ID",
      "Repeat for each additional iPhone you want to connect",
    ],
    visual: (
      <div className="mx-auto w-52 space-y-0.5">
        <div className="bg-secondary/40 rounded-t-xl px-3 py-2 flex items-center gap-2 border border-border border-b-0">
          <span className="text-[10px] font-medium text-foreground">Text Message Forwarding</span>
        </div>
        {[
          { name: "My MacBook Pro", on: true },
          { name: "Other Mac", on: false },
        ].map((row, i) => (
          <div key={i} className={`px-3 py-2.5 flex items-center justify-between border border-border ${row.on ? "bg-amber-500/8 border-amber-500/20" : "bg-secondary/20"} ${i === 1 ? "rounded-b-xl" : ""}`}>
            <span className={`text-[10px] ${row.on ? "text-amber-400 font-medium" : "text-muted-foreground"}`}>{row.name}</span>
            <div className={`w-7 h-4 rounded-full border flex items-center ${row.on ? "bg-amber-500/80 border-amber-500/60 justify-end" : "bg-secondary/60 border-border justify-start"}`}>
              <div className="w-3 h-3 rounded-full bg-white mx-0.5" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
    badge: "Step 5 of 5",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    title: "Your iPhone is ready in Dispatch!",
    description: "Once the Mac Agent's next heartbeat runs (within 30 seconds), your USB iPhone appears automatically in Dispatch.",
    tips: [
      "Settings → USB-Connected iPhones shows it instantly",
      "Compose → sender picker lets you pick it to send from",
      "Keep the USB cable plugged in while sending",
    ],
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-violet-500/8 border border-violet-500/20">
          <Cable className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">John's iPhone</p>
            <p className="text-[10px] text-muted-foreground">Connected via USB cable</p>
          </div>
          <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">USB</div>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-secondary/30 border border-border">
          <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-foreground/80">+1 (555) 000 0001</p>
          </div>
          <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">iMessage</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ready to send SMS through your iPhone</span>
        </div>
      </div>
    ),
  },
];

/* ── Main dialog component ──────────────────────────────────── */
interface UsbGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UsbGuideDialog({ open, onClose }: UsbGuideDialogProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function handleClose() {
    setStep(0);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-border bg-card">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${current.iconBg}`}>
              <Icon className={`w-4.5 h-4.5 ${current.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge className={`text-[10px] px-1.5 py-0 font-medium border ${current.badgeColor}`}>
                  {current.badge}
                </Badge>
              </div>
              <DialogTitle className="text-sm font-semibold text-foreground leading-tight">
                {current.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1 text-left">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {/* Visual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="px-6 py-5"
          >
            {current.visual}
          </motion.div>
        </AnimatePresence>

        {/* Tips */}
        <div className="px-6 pb-4 space-y-1">
          {current.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
              {tip}
            </div>
          ))}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isFirst ? handleClose() : setStep(s => s - 1)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            {isFirst ? "Close" : <><ChevronLeft className="w-3.5 h-3.5" /> Back</>}
          </Button>

          <Button
            size="sm"
            onClick={() => isLast ? handleClose() : setStep(s => s + 1)}
            className={`gap-1.5 h-8 text-xs font-medium ${
              isLast
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                : "bg-blue-500 hover:bg-blue-600 text-white border-0"
            }`}
          >
            {isLast ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Done</>
            ) : (
              <>Next <ChevronRight className="w-3.5 h-3.5" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Trigger button helpers ─────────────────────────────────── */
export function UsbGuideButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={`gap-1.5 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/8 hover:border-violet-500/50 h-7 ${className}`}
      >
        <Cable className="w-3 h-3" />
        How to connect via USB
      </Button>
      <UsbGuideDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
