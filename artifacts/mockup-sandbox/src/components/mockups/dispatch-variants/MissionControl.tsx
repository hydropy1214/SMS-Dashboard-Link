import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Activity, 
  Send, 
  AlertCircle, 
  Monitor, 
  Server, 
  BookOpen, 
  Settings, 
  ChevronRight,
  Database,
  Cpu,
  RefreshCw,
  Zap
} from "lucide-react";

export default function MissionControl() {
  const [uptime, setUptime] = useState(0);

  // Fake uptime counter
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const navItems = [
    { icon: Activity, label: "DASHBOARD", active: true },
    { icon: Send, label: "COMPOSE" },
    { icon: Database, label: "ACTIVITY" },
    { icon: Server, label: "CONNECTED MACS" },
    { icon: Monitor, label: "DEVICES" },
    { icon: Terminal, label: "LOGS" },
    { icon: BookOpen, label: "SETUP GUIDE" },
    { icon: Settings, label: "SETTINGS" },
  ];

  return (
    <div 
      className="min-h-screen bg-[#030810] text-[#8ea4b8] font-sans flex overflow-hidden selection:bg-[#00D4FF] selection:text-black"
      style={{ 
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }}
    >
      {/* SIDEBAR */}
      <aside className="w-[220px] flex-shrink-0 border-r border-[#00D4FF]/15 bg-[#060E18]/90 flex flex-col h-screen z-10">
        <div className="p-5 border-b border-[#00D4FF]/15">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.5)]" />
            <h1 className="font-mono text-white text-lg tracking-[0.2em] font-bold">DISPATCH</h1>
          </div>
          <p className="font-mono text-[10px] text-[#00D4FF]/70 mt-2 tracking-widest uppercase">iMessage Sender</p>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              className={`flex items-center w-full px-4 py-2.5 text-xs font-mono tracking-wider transition-all duration-200 group
                ${item.active 
                  ? "text-[#00D4FF] border-l-2 border-[#00D4FF] bg-[#00D4FF]/10" 
                  : "text-[#597b9c] border-l-2 border-transparent hover:text-[#8ea4b8] hover:bg-white/5"}`}
            >
              <item.icon className="w-4 h-4 mr-3 opacity-70 group-hover:opacity-100" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.active && <ChevronRight className="w-3 h-3 text-[#00D4FF]" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#00D4FF]/15 bg-[#030810]">
          <div className="border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#FF3B3B] tracking-widest">SYS // STATUS</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B3B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3B3B]"></span>
              </span>
            </div>
            <div className="font-mono text-sm text-white font-bold">MAC OFFLINE</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-0">
        {/* TOP BAR */}
        <header className="h-14 border-b border-[#00D4FF]/15 bg-[#060E18]/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="font-mono text-sm text-[#00D4FF] tracking-[0.15em]">DISPATCH // MISSION CONTROL</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#597b9c]">UPTIME:</span>
              <span className="text-[#00FF94] w-20">{formatUptime(uptime)}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 px-3 py-1 text-[#FF3B3B]">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B3B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3B3B]"></span>
              </span>
              CRITICAL
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
          
          {/* HEADER AREA */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-light text-white tracking-wide">Live Dashboard</h1>
              <p className="font-mono text-xs text-[#597b9c] mt-2">SYS_TIME: {new Date().toISOString()}</p>
            </div>
            <button className="flex items-center gap-2 font-mono text-xs text-[#00D4FF] border border-[#00D4FF]/30 px-4 py-2 hover:bg-[#00D4FF]/10 transition-colors uppercase tracking-wider">
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>

          {/* ALERT BANNER */}
          <div className="border border-[#FF3B3B] bg-[#FF3B3B]/5 p-5 relative overflow-hidden flex items-start gap-4 shadow-[0_0_20px_rgba(255,59,59,0.1)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF3B3B]"></div>
            <AlertCircle className="w-6 h-6 text-[#FF3B3B] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-mono text-lg text-[#FF3B3B] font-bold tracking-wide">NO MAC AGENT DETECTED</h3>
              <p className="text-sm text-[#FF3B3B]/80 mt-1 font-mono">CRITICAL ERROR: Messages cannot be dispatched. Please launch the Mac Agent on your host machine to re-establish connection to Messages.app.</p>
            </div>
            <button className="font-mono text-xs bg-[#FF3B3B]/20 text-[#FF3B3B] border border-[#FF3B3B]/50 px-4 py-2 hover:bg-[#FF3B3B]/30 transition-colors uppercase tracking-wider whitespace-nowrap">
              Setup Agent
            </button>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "SENT / 24H", value: "3,402", status: "ok", change: "+12.4%" },
              { label: "FAILED / 24H", value: "87", status: "warn", change: "-2.1%" },
              { label: "QUEUE DEPTH", value: "0", status: "neutral", change: "0" },
              { label: "TOTAL DISPATCHED", value: "1.2M", status: "ok", change: "N/A" }
            ].map((stat, idx) => (
              <div key={idx} className="border border-[#00D4FF]/15 bg-[#060E18] p-5 relative group hover:border-[#00D4FF]/30 transition-colors">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#00D4FF]/0 via-[#00D4FF]/20 to-[#00D4FF]/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono text-[10px] text-[#597b9c] tracking-widest">{stat.label}</span>
                  {stat.status === 'ok' && <Zap className="w-4 h-4 text-[#00FF94]" />}
                  {stat.status === 'warn' && <AlertCircle className="w-4 h-4 text-[#FFAA00]" />}
                  {stat.status === 'neutral' && <Activity className="w-4 h-4 text-[#00D4FF]" />}
                </div>
                <div className="font-mono text-4xl text-white font-light tracking-tight">{stat.value}</div>
                <div className="mt-4 flex items-center justify-between border-t border-[#00D4FF]/10 pt-3">
                  <span className="font-mono text-[10px] text-[#597b9c]">Δ {stat.change}</span>
                  <span className="flex h-2 w-2">
                    <span className={`inline-flex rounded-full h-2 w-2 ${
                      stat.status === 'ok' ? 'bg-[#00FF94]' : 
                      stat.status === 'warn' ? 'bg-[#FFAA00]' : 
                      'bg-[#00D4FF]'
                    }`}></span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* DIAGNOSTICS & LOGS */}
          <div className="grid grid-cols-2 gap-6 mt-2">
            
            {/* SYSTEM DIAGNOSTICS */}
            <div className="border border-[#00D4FF]/15 bg-[#060E18] flex flex-col">
              <div className="border-b border-[#00D4FF]/15 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#00D4FF]" />
                  <h3 className="font-mono text-xs text-[#00D4FF] tracking-widest uppercase">System Diagnostics</h3>
                </div>
                <span className="font-mono text-[10px] text-[#FF3B3B] border border-[#FF3B3B]/30 px-2 py-0.5 bg-[#FF3B3B]/10">ERR_STATE</span>
              </div>
              <div className="p-0 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#00D4FF]/10">
                      <th className="py-3 px-4 font-mono text-[10px] text-[#597b9c] tracking-widest font-normal">COMPONENT</th>
                      <th className="py-3 px-4 font-mono text-[10px] text-[#597b9c] tracking-widest font-normal text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {[
                      { name: "MAC AGENT CONNECTION", status: "ERR_TIMEOUT", ok: false },
                      { name: "MESSAGES.APP BRIDGE", status: "UNREACHABLE", ok: false },
                      { name: "APPLESCRIPT ENGINE", status: "OFFLINE", ok: false },
                      { name: "CONNECTED ACCOUNTS (0)", status: "NO_DATA", ok: false }
                    ].map((check, idx) => (
                      <tr key={idx} className="border-b border-[#00D4FF]/5 hover:bg-[#00D4FF]/5">
                        <td className="py-3 px-4 text-[#8ea4b8]">{check.name}</td>
                        <td className="py-3 px-4 text-right text-[#FF3B3B] flex items-center justify-end gap-2">
                          {check.status}
                          <span className="text-[#FF3B3B]">✗</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECENT TRANSMISSIONS */}
            <div className="border border-[#00D4FF]/15 bg-[#060E18] flex flex-col">
              <div className="border-b border-[#00D4FF]/15 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00D4FF]" />
                  <h3 className="font-mono text-xs text-[#00D4FF] tracking-widest uppercase">Recent Transmissions</h3>
                </div>
                <span className="font-mono text-[10px] text-[#597b9c] border border-[#00D4FF]/30 px-2 py-0.5">FILTER: ALL</span>
              </div>
              <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-16 h-16 border border-[#00D4FF]/20 rounded-full flex items-center justify-center mb-4 bg-[#030810]">
                  <Database className="w-6 h-6 text-[#597b9c]/50" />
                </div>
                <p className="font-mono text-sm text-[#597b9c] text-center mb-2">NO ACTIVE TRANSMISSIONS</p>
                <div className="flex items-center gap-2 font-mono text-xs text-[#00D4FF]/70">
                  <span>AWAITING INPUT</span>
                  <span className="w-2 h-3 bg-[#00D4FF] animate-pulse"></span>
                </div>
              </div>
            </div>

          </div>
          
        </div>
      </main>
    </div>
  );
}
