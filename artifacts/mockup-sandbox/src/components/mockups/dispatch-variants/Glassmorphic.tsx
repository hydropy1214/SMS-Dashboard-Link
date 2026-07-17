import React from 'react';
import {
  Send,
  Activity,
  Monitor,
  Smartphone,
  FileText,
  Book,
  Settings,
  RefreshCw,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Server,
  PenSquare,
  Terminal,
  ActivitySquare
} from 'lucide-react';

export default function Glassmorphic() {
  const glassCardStyle = {
    background: 'rgba(20, 35, 70, 0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(99, 179, 237, 0.12)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
  };

  const navItems = [
    { name: 'Dashboard', icon: ActivitySquare, active: true },
    { name: 'Compose', icon: PenSquare, active: false },
    { name: 'Activity', icon: Activity, active: false },
    { name: 'Connected Macs', icon: Monitor, active: false },
    { name: 'Devices', icon: Smartphone, active: false },
    { name: 'Logs', icon: Terminal, active: false },
    { name: 'Setup Guide', icon: Book, active: false },
    { name: 'Settings', icon: Settings, active: false },
  ];

  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 50%), #040812'
      }}
      className="min-h-screen text-slate-200 flex font-sans selection:bg-blue-500/30"
    >
      {/* Sidebar */}
      <aside
        style={{
          background: 'rgba(15,25,50,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
        className="w-64 flex flex-col justify-between shrink-0"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#blue-cyan-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id="blue-cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#5B8DEF" />
                </linearGradient>
              </defs>
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <div>
              <h1 className="text-xl font-bold tracking-wide" style={{ background: 'linear-gradient(90deg, #38BDF8 0%, #5B8DEF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DISPATCH
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                iMessage Sender
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <a
                key={item.name}
                href="#"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  item.active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
                style={
                  item.active
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderLeft: '3px solid',
                        borderImage: 'linear-gradient(to bottom, #38BDF8, #5B8DEF) 1',
                        borderLeftWidth: '3px',
                      }
                    : {}
                }
              >
                {/* Because borderImage doesn't work well with border-radius, we use a pseudo element for the active left border if we want rounded corners, but inline styles limit us. We'll use box-shadow inset instead for the border effect */}
                <item.icon size={18} className={item.active ? "text-cyan-400" : "opacity-70"} />
                <span className="font-medium">{item.name}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="p-4">
          <div
            style={{
              background: 'rgba(20, 35, 70, 0.45)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
              boxShadow: '0 0 10px rgba(251, 113, 133, 0.1)'
            }}
            className="rounded-xl p-3 flex items-center gap-3 backdrop-blur-md"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-rose-300">Agent Offline</span>
              <span className="text-[10px] text-slate-400">Not connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Dashboard</h2>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                Live system overview 
                <span className="w-1 h-1 rounded-full bg-slate-600"></span> 
                Last updated: Just now
              </p>
            </div>
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 border border-white/10 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <RefreshCw size={14} className="text-cyan-400" />
              Refresh Data
            </button>
          </header>

          {/* Alert Banner */}
          <div 
            style={{
              background: 'linear-gradient(to right, rgba(225, 29, 72, 0.1), rgba(20, 35, 70, 0.4))',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(251, 113, 133, 0.3)',
              boxShadow: '0 4px 24px rgba(225, 29, 72, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
            className="rounded-2xl p-5 flex items-start sm:items-center gap-4 relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 to-rose-600"></div>
            <div className="p-2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-rose-300 font-semibold text-lg mb-0.5">Mac Agent Offline</h3>
              <p className="text-rose-200/70 text-sm">
                Your Mac Agent is currently disconnected. Messages cannot be sent until the agent is reconnected.
              </p>
            </div>
            <button className="whitespace-nowrap px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-sm font-medium border border-rose-500/30 transition-colors">
              Troubleshoot
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stat 1 */}
            <div style={glassCardStyle} className="rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Sent Today</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                  <Send size={16} />
                </div>
              </div>
              <span style={{ background: 'linear-gradient(135deg, #67E8F9 0%, #818CF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="text-4xl font-bold tabular-nums">
                1,248
              </span>
            </div>

            {/* Stat 2 */}
            <div style={glassCardStyle} className="rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-400/0 via-rose-400/50 to-rose-400/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Failed Today</span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(251,113,133,0.15)]">
                  <XCircle size={16} />
                </div>
              </div>
              <span style={{ background: 'linear-gradient(135deg, #FDA4AF 0%, #F43F5E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="text-4xl font-bold tabular-nums">
                12
              </span>
            </div>

            {/* Stat 3 */}
            <div style={glassCardStyle} className="rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400/50 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                  <Activity size={16} />
                </div>
              </div>
              <span style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="text-4xl font-bold tabular-nums">
                450
              </span>
            </div>

            {/* Stat 4 - Distinct Glow */}
            <div 
              style={{
                ...glassCardStyle,
                border: '1px solid rgba(91, 141, 239, 0.3)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 30px rgba(91,141,239,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
              }} 
              className="rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-400/0 via-blue-400/80 to-blue-400/0 opacity-50"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Total Sent</span>
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                  <MessageSquare size={16} />
                </div>
              </div>
              <span style={{ background: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="text-4xl font-bold tabular-nums">
                45.2K
              </span>
            </div>

          </div>

          {/* System Health */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
            <div style={glassCardStyle} className="rounded-2xl p-1 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-white/5">
                
                {/* Check 1 */}
                <div className="p-5 flex items-center justify-between" style={{ background: 'rgba(20, 35, 70, 0.7)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <Server size={18} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Mac Agent Connection</p>
                      <p className="text-xs text-slate-400 mt-0.5">Daemon status on host machine</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                    <span className="text-xs font-medium text-rose-400">Offline</span>
                  </div>
                </div>

                {/* Check 2 */}
                <div className="p-5 flex items-center justify-between" style={{ background: 'rgba(20, 35, 70, 0.7)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <MessageSquare size={18} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Messages.app</p>
                      <p className="text-xs text-slate-400 mt-0.5">Application responsiveness</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    <span className="text-xs font-medium text-rose-400">Unreachable</span>
                  </div>
                </div>

                {/* Check 3 */}
                <div className="p-5 flex items-center justify-between" style={{ background: 'rgba(20, 35, 70, 0.7)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <Terminal size={18} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">AppleScript Bridge</p>
                      <p className="text-xs text-slate-400 mt-0.5">Execution capability</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    <span className="text-xs font-medium text-rose-400">Failed</span>
                  </div>
                </div>

                {/* Check 4 */}
                <div className="p-5 flex items-center justify-between" style={{ background: 'rgba(20, 35, 70, 0.7)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <Smartphone size={18} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Connected Accounts</p>
                      <p className="text-xs text-slate-400 mt-0.5">Active iMessage endpoints</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    <span className="text-xs font-medium text-rose-400">0 Accounts</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-4">
            <button 
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)' }}
            >
              <PenSquare size={16} />
              Compose Message
            </button>
            <button 
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/10 hover:-translate-y-0.5"
              style={{ 
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(99, 179, 237, 0.2)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Settings size={16} />
              Setup Mac Agent
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
