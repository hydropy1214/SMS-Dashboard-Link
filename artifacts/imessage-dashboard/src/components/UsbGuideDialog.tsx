import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Cable, Smartphone, CheckCircle2, Shield, MessageSquare,
  Wifi, Zap, ChevronLeft, ChevronRight, Badge,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── USB steps ─────────────────────────────────────────── */
const USB_STEPS = [
  {
    icon: Cable,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/25",
    badge: "USB · Step 1 of 4",
    badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    title: "Plug your iPhone into your Mac",
    desc: "Use the USB cable that came with your iPhone (Lightning or USB-C). Connect it directly to a USB port on your Mac.",
    tips: [
      "Any iPhone running iOS 8+ works",
      "The same cable you use for charging is fine",
      "Plug directly into Mac, not through a hub",
    ],
    visual: (
      <div className="flex items-center justify-center gap-5 py-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-20 rounded-xl border-2 border-border bg-secondary/40 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <span className="text-[10px] text-muted-foreground">iPhone</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-2.5 h-1 rounded-full bg-violet-400/70" />
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
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    badge: "USB · Step 2 of 4",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: 'Tap "Trust" on your iPhone',
    desc: "The first time you plug in, your iPhone shows a Trust prompt. Tap Trust and enter your passcode if asked.",
    tips: [
      "Only appears the first time you connect",
      "If you missed it: unplug and replug",
      "Enter your iPhone passcode when prompted",
    ],
    visual: (
      <div className="mx-auto w-44 rounded-2xl border-2 border-border bg-secondary/30 overflow-hidden">
        <div className="bg-secondary/60 px-3 py-1.5 text-center border-b border-border">
          <p className="text-[10px] font-medium text-foreground">iPhone</p>
        </div>
        <div className="p-4 text-center space-y-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 mx-auto flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground">Trust This Computer?</p>
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">Trusting allows the computer to access your data.</p>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 py-1.5 rounded-lg border border-border text-[9px] text-muted-foreground text-center">Don't Trust</div>
            <div className="flex-1 py-1.5 rounded-lg bg-blue-500 text-[9px] text-white text-center font-semibold">Trust</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    badge: "USB · Step 3 of 4",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Enable Text Message Forwarding",
    desc: 'On your iPhone go to Settings → Messages → Text Message Forwarding, then toggle your Mac\'s name ON.',
    tips: [
      "iPhone and Mac must share the same Apple ID",
      "A 6-digit code may appear on your Mac — type it on the iPhone",
      "Repeat for each iPhone you want to connect",
    ],
    visual: (
      <div className="mx-auto w-52 space-y-0.5">
        <div className="bg-secondary/40 rounded-t-xl px-3 py-2 border border-border border-b-0 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/80 flex items-center justify-center">
            <MessageSquare className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Settings → Messages</span>
        </div>
        {[
          { label: "Text Message Forwarding", on: true, highlight: true },
          { label: "Send as SMS", on: true, highlight: false },
          { label: "iMessage", on: true, highlight: false },
        ].map((row, i, arr) => (
          <div key={i} className={`px-3 py-2 flex items-center justify-between border border-border ${
            row.highlight ? "bg-emerald-500/8 border-emerald-500/20" : "bg-secondary/20"
          } ${i === arr.length - 1 ? "rounded-b-xl" : ""}`}>
            <span className={`text-[10px] ${row.highlight ? "text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
              {row.label}
            </span>
            <div className={`w-7 h-4 rounded-full border flex items-center px-0.5 ${
              row.on ? "bg-emerald-500/80 border-emerald-500/60 justify-end" : "bg-secondary/60 border-border justify-start"
            }`}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/25",
    badge: "USB · Step 4 of 4",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    title: "Done — iPhone appears in Dispatch!",
    desc: "Within 30 seconds your iPhone shows up in Settings and in the Compose → Specific device picker.",
    tips: [
      "Settings → Connected iPhones shows it live",
      "Compose → Specific device lets you send through it",
      "Keep the USB cable plugged in while sending",
    ],
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-violet-500/8 border border-violet-500/20">
          <Cable className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">John's iPhone</p>
            <p className="text-[10px] text-muted-foreground">USB cable · SMS & iMessage</p>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">USB</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 px-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Ready to send SMS through this iPhone
        </div>
      </div>
    ),
  },
];

/* ─── Wi-Fi steps ────────────────────────────────────────── */
const WIFI_STEPS = [
  {
    icon: Wifi,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    badge: "Wi-Fi · Step 1 of 4",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: "Sign into the same Apple ID on both devices",
    desc: "Your iPhone and Mac must use the same Apple ID for Wi-Fi forwarding to work. Check in iPhone Settings → [your name].",
    tips: [
      "Both devices need iCloud / Apple ID signed in",
      "They don't need to be on the same Wi-Fi right now to check",
      "Same Apple ID = messages can flow between them",
    ],
    visual: (
      <div className="flex items-center justify-center gap-6 py-3">
        {[
          { label: "iPhone", icon: <Smartphone className="w-6 h-6 text-muted-foreground/50" />, size: "w-14 h-20" },
          { label: "Mac", icon: <span className="text-[10px] text-muted-foreground/60 font-medium">Mac</span>, size: "w-20 h-14" },
        ].map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className={`${d.size} rounded-xl border-2 border-blue-500/30 bg-blue-500/5 flex items-center justify-center`}>
              {d.icon}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[9px] text-blue-400 font-medium">same Apple ID</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    badge: "Wi-Fi · Step 2 of 4",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "On iPhone: open Settings → Messages",
    desc: "Open the Settings app on your iPhone and scroll down to Messages. Make sure iMessage is turned on.",
    tips: [
      "iMessage must be enabled first",
      "Signed into Apple ID in Messages settings",
      "Scroll down past Notifications to find Messages",
    ],
    visual: (
      <div className="mx-auto w-44 rounded-2xl border-2 border-border bg-secondary/30 overflow-hidden">
        <div className="bg-secondary/60 px-3 py-1.5 border-b border-border flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/80 flex items-center justify-center">
            <MessageSquare className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[10px] font-semibold text-foreground">Messages</span>
        </div>
        {[
          { label: "iMessage", value: "On", highlight: true },
          { label: "Send as SMS", value: "On", highlight: false },
          { label: "Text Message Forwarding", value: "→", highlight: true },
        ].map((row, i) => (
          <div key={i} className={`px-3 py-2 flex items-center justify-between border-b border-border/50 ${row.highlight && i === 2 ? "bg-emerald-500/8" : ""}`}>
            <span className={`text-[10px] ${i === 2 ? "text-emerald-400 font-medium" : "text-foreground"}`}>{row.label}</span>
            <span className="text-[10px] text-muted-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Smartphone,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
    badge: "Wi-Fi · Step 3 of 4",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    title: "Tap Text Message Forwarding → toggle your Mac ON",
    desc: "You'll see a list of nearby Macs linked to your Apple ID. Toggle your Mac's name to ON. Enter the 6-digit code if one appears on your Mac.",
    tips: [
      "Your Mac must be awake and nearby",
      "Enter the code shown on your Mac's screen",
      "Toggle each iPhone separately for multiple phones",
    ],
    visual: (
      <div className="mx-auto w-52 space-y-0.5">
        <div className="bg-secondary/40 rounded-t-xl px-3 py-2 border border-border border-b-0">
          <span className="text-[10px] font-semibold text-foreground">Text Message Forwarding</span>
        </div>
        {[
          { name: "My MacBook Pro", on: true },
          { name: "MacBook Air", on: false },
        ].map((row, i) => (
          <div key={i} className={`px-3 py-2.5 flex items-center justify-between border border-border ${
            row.on ? "bg-amber-500/8 border-amber-500/20" : "bg-secondary/20"
          } ${i === 1 ? "rounded-b-xl" : ""}`}>
            <span className={`text-[10px] ${row.on ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>{row.name}</span>
            <div className={`w-7 h-4 rounded-full border flex items-center px-0.5 ${
              row.on ? "bg-amber-500/80 border-amber-500/60 justify-end" : "bg-secondary/60 border-border justify-start"
            }`}>
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/25",
    badge: "Wi-Fi · Step 4 of 4",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    title: "Done — iPhone appears in Dispatch!",
    desc: "Within 30 seconds the Mac Agent detects the new SMS service and sends it in the next heartbeat.",
    tips: [
      "iPhone and Mac must be on the same Wi-Fi to forward",
      "Settings → Connected iPhones shows it live",
      "USB is more reliable for bulk sends — use both!",
    ],
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-500/8 border border-blue-500/20">
          <Wifi className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">John's iPhone</p>
            <p className="text-[10px] text-muted-foreground">Wi-Fi forwarding · SMS via cellular</p>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Wi-Fi</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 px-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Ready to route SMS through this iPhone
        </div>
      </div>
    ),
  },
];

/* ─── Dialog component ───────────────────────────────────── */

type Tab = "usb" | "wifi";

interface UsbGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UsbGuideDialog({ open, onClose }: UsbGuideDialogProps) {
  const [tab, setTab]   = useState<Tab>("usb");
  const [step, setStep] = useState(0);

  const steps  = tab === "usb" ? USB_STEPS : WIFI_STEPS;
  const cur    = steps[step];
  const Icon   = cur.icon;
  const isLast = step === steps.length - 1;

  function handleClose() {
    setStep(0);
    onClose();
  }

  function switchTab(t: Tab) {
    setTab(t);
    setStep(0);
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-border bg-card">

        {/* Tab bar */}
        <div className="flex border-b border-border bg-secondary/10">
          {([
            { id: "usb" as Tab,  label: "USB Cable",        icon: Cable },
            { id: "wifi" as Tab, label: "Wi-Fi Forwarding", icon: Wifi },
          ] as const).map(t => {
            const TIcon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TIcon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cur.bg}`}>
              <Icon className={`w-4.5 h-4.5 ${cur.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mb-0.5 ${cur.badgeClass}`}>
                {cur.badge}
              </span>
              <DialogTitle className="text-sm font-semibold text-foreground leading-tight">
                {cur.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed text-left mt-1">
            {cur.desc}
          </DialogDescription>
        </DialogHeader>

        {/* Visual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${step}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
            className="px-6 py-5"
          >
            {cur.visual}
          </motion.div>
        </AnimatePresence>

        {/* Tips */}
        <div className="px-6 pb-4 space-y-1">
          {cur.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
              {tip}
            </div>
          ))}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {steps.map((_, i) => (
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
        <div className="px-6 py-3.5 border-t border-border bg-secondary/10 flex items-center justify-between gap-3">
          <Button
            variant="ghost" size="sm"
            onClick={() => step === 0 ? handleClose() : setStep(s => s - 1)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            {step === 0 ? "Close" : <><ChevronLeft className="w-3.5 h-3.5" />Back</>}
          </Button>
          <Button
            size="sm"
            onClick={() => isLast ? handleClose() : setStep(s => s + 1)}
            className={`gap-1.5 h-8 text-xs font-semibold ${
              isLast
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                : "bg-blue-500 hover:bg-blue-600 text-white border-0"
            }`}
          >
            {isLast
              ? <><CheckCircle2 className="w-3.5 h-3.5" />Done</>
              : <>Next<ChevronRight className="w-3.5 h-3.5" /></>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Convenience trigger buttons ────────────────────────── */

export function UsbGuideButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline" size="sm"
        onClick={() => setOpen(true)}
        className={`gap-1.5 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/8 hover:border-violet-500/50 h-7 ${className}`}
      >
        <Cable className="w-3 h-3" />
        How to connect iPhones
      </Button>
      <UsbGuideDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
