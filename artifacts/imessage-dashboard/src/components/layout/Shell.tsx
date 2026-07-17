import { Link, useLocation } from "wouter";
import { MessageSquare, Activity, Settings, Terminal, Wifi, WifiOff, Loader2 } from "lucide-react";
import React from "react";
import { useGetMacAgentStatus, getGetMacAgentStatusQueryKey } from "@workspace/api-client-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: macStatus, isFetching } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 8000,
      retry: false,
      staleTime: 0,
    }
  });

  const links = [
    { href: "/", label: "Compose", icon: MessageSquare },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/setup", label: "Setup Guide", icon: Terminal },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isConnected = macStatus?.connected === true;

  return (
    <div className="min-h-screen flex bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans relative">
      <nav className="w-60 border-r border-border bg-sidebar flex flex-col p-4 space-y-8 relative overflow-hidden shrink-0 z-10 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        <div className="flex items-center space-x-3 text-primary px-2 mt-2">
          <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,195,255,0.2)]">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-sm">COMMAND CENTER</span>
        </div>

        <div className="flex flex-col space-y-1">
          <div className="text-xs font-mono text-muted-foreground/60 mb-2 px-2 uppercase tracking-widest flex items-center gap-2">
            <span>Terminal</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {links.map(link => {
            const isActive = link.href === "/"
              ? location === "/"
              : location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(0,195,255,0.05)]'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent'
                }`}
              >
                <link.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm">{link.label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(0,195,255,0.5)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Connection status footer */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className={`flex items-center gap-3 px-3 py-3 rounded-md ${isConnected ? 'bg-[#34c759]/5' : 'bg-destructive/5'}`}>
            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
              {isFetching && !macStatus ? (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : isConnected ? (
                <>
                  <div className="absolute w-full h-full bg-[#34c759] rounded-full animate-ping opacity-25"></div>
                  <Wifi className="w-3.5 h-3.5 text-[#34c759] z-10" />
                </>
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-destructive" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-semibold truncate ${isConnected ? 'text-[#34c759]' : 'text-destructive'}`}>
                {isConnected ? "Mac Connected" : "Mac Offline"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {isConnected && macStatus?.latencyMs ? `${macStatus.latencyMs}ms latency` : 'Agent Status'}
              </span>
            </div>
            {!isConnected && (
              <Link href="/settings" className="ml-auto shrink-0 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
                Fix →
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-0">
        <div className="pointer-events-none fixed inset-0 z-[-1] opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="flex-1 overflow-auto p-6 md:p-10 relative">
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
