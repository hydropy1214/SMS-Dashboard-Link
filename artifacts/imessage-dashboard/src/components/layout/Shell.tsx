import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, PenSquare, Activity, MonitorSmartphone,
  Smartphone, ScrollText, BookOpen, Settings,
} from "lucide-react";
import React from "react";
import { useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";

const PRIMARY_NAV = [
  { href: "/",         label: "Dashboard",     icon: LayoutDashboard },
  { href: "/compose",  label: "Compose",        icon: PenSquare },
  { href: "/activity", label: "Activity",        icon: Activity },
  { href: "/macs",     label: "Connected Macs", icon: MonitorSmartphone },
  { href: "/devices",  label: "Devices",         icon: Smartphone },
  { href: "/logs",     label: "Logs",            icon: ScrollText },
];

const RESOURCE_NAV = [
  { href: "/setup",    label: "Setup Guide", icon: BookOpen },
  { href: "/settings", label: "Settings",    icon: Settings },
];

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link href={href}>
      <span
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
          active
            ? "bg-[rgba(255,255,255,0.04)] text-white font-medium"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.02)]"
        }`}
      >
        <Icon
          size={14}
          strokeWidth={2}
          className={active ? "text-blue-500" : "text-zinc-500"}
        />
        <span className="text-sm">{label}</span>
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const { data: macStatus, isLoading } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
      staleTime: 0,
    },
  });

  const isConnected = !isLoading && macStatus?.connected === true;

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="min-h-screen flex bg-[#09090B] text-white font-sans selection:bg-blue-500/30">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-[224px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)] flex flex-col justify-between h-screen sticky top-0">

        {/* Logo + nav */}
        <div className="p-4">
          {/* Wordmark */}
          <div className="flex items-center gap-3 mb-8 px-2 mt-2">
            <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 font-semibold text-sm border border-blue-500/20 shrink-0">
              D
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Dispatch</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">iMessage sender</div>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="space-y-0.5">
            {PRIMARY_NAV.map(({ href, label, icon }) => (
              <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
            ))}

            {/* Resources section */}
            <div className="pt-6 pb-2 px-2 text-xs font-medium text-zinc-600 select-none">
              Resources
            </div>
            {RESOURCE_NAV.map(({ href, label, icon }) => (
              <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
            ))}
          </nav>
        </div>

        {/* Connection status footer */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            {isLoading ? (
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            ) : isConnected ? (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            )}
            <span className="text-xs text-zinc-500">
              {isLoading
                ? "Checking…"
                : isConnected
                  ? `Mac Agent online${macStatus?.latencyMs ? ` · ${macStatus.latencyMs}ms` : ""}`
                  : "Mac Agent offline"
              }
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto px-10 py-12 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
