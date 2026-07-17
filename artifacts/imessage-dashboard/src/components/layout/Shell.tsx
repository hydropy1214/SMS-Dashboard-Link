import { Link, useLocation } from "wouter";
import { Send, Activity, Settings, Terminal, Wifi, WifiOff, Loader2 } from "lucide-react";
import React from "react";
import { useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";

const NAV = [
  { href: "/",         label: "Compose",     icon: Send },
  { href: "/activity", label: "Activity",    icon: Activity },
  { href: "/setup",    label: "Setup Guide", icon: Terminal },
  { href: "/settings", label: "Settings",    icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: macStatus, isFetching, isLoading } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
      staleTime: 0,
    },
  });

  const isConnected = macStatus?.connected === true;
  const isFirstLoad = isLoading && !macStatus;

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans relative select-none">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-sidebar relative z-10">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pt-6 pb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center dispatch-glow-sm shrink-0">
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5">
              <path d="M12.5 1.5L7 7" stroke="hsl(196 100% 50%)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12.5 1.5L9 12.5L7 7L1.5 5L12.5 1.5Z" stroke="hsl(196 100% 50%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="hsl(196 100% 50% / 0.15)"/>
            </svg>
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-foreground">Dispatch</span>
            <span className="block text-[10px] text-muted-foreground leading-none mt-0.5 font-mono">iMessage sender</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-border mb-3" />

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">Navigation</p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <span className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer group
                  ${active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                  }`}>
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                  {label}
                  {active && <div className="ml-auto w-1 h-3.5 rounded-full bg-primary opacity-70" />}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Connection status footer */}
        <div className="p-3 border-t border-border mt-2">
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
            isConnected
              ? "bg-emerald-500/5 border-emerald-500/15"
              : "bg-destructive/5 border-destructive/15"
          }`}>
            {/* Status icon */}
            <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
              {isFirstLoad ? (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : isConnected ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 relative z-10" />
                </>
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-destructive" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold leading-none ${isConnected ? "text-emerald-400" : "text-destructive"}`}>
                {isFirstLoad ? "Checking…" : isConnected ? "Mac Connected" : "Not connected"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none font-mono">
                {isConnected && macStatus?.latencyMs ? `${macStatus.latencyMs}ms` : "Mac Agent"}
              </p>
            </div>

            {/* Fix link */}
            {!isFirstLoad && !isConnected && (
              <Link href="/setup">
                <span className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0">
                  Fix →
                </span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0 grid-bg opacity-100" />
        <div className="flex-1 overflow-auto relative z-10">
          <div className="max-w-3xl mx-auto px-8 py-10 w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
