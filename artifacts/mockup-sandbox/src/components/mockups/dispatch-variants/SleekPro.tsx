import React from 'react';
import { 
  LayoutDashboard, 
  PenSquare, 
  Activity, 
  MonitorSmartphone, 
  Smartphone, 
  ScrollText, 
  BookOpen, 
  Settings, 
  RefreshCcw, 
  Send, 
  XCircle, 
  Clock, 
  BarChart3,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function SleekPro() {
  return (
    // Body #09090B
    <div className="flex min-h-screen bg-[#09090B] text-white font-sans selection:bg-blue-500/30">
      
      {/* Sidebar #111113 */}
      <aside className="w-[224px] flex-shrink-0 bg-[#111113] border-r border-[rgba(255,255,255,0.06)] flex flex-col justify-between">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-8 px-2 mt-2">
            <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 font-semibold text-sm border border-blue-500/20">
              D
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Dispatch</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">iMessage sender</div>
            </div>
          </div>
          
          <nav className="space-y-0.5">
            <NavItem icon={<LayoutDashboard size={14} strokeWidth={2} />} label="Dashboard" active />
            <NavItem icon={<PenSquare size={14} strokeWidth={2} />} label="Compose" />
            <NavItem icon={<Activity size={14} strokeWidth={2} />} label="Activity" />
            <NavItem icon={<MonitorSmartphone size={14} strokeWidth={2} />} label="Connected Macs" />
            <NavItem icon={<Smartphone size={14} strokeWidth={2} />} label="Devices" />
            <NavItem icon={<ScrollText size={14} strokeWidth={2} />} label="Logs" />
            
            <div className="pt-6 pb-2 px-2 text-xs font-medium text-zinc-600">Resources</div>
            <NavItem icon={<BookOpen size={14} strokeWidth={2} />} label="Setup Guide" />
            <NavItem icon={<Settings size={14} strokeWidth={2} />} label="Settings" />
          </nav>
        </div>
        
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
            <span className="text-xs text-zinc-500">Mac Agent offline</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto px-10 py-12 flex-1 flex flex-col">
          
          <header className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Dashboard</h1>
              <p className="text-sm text-zinc-500">Live system overview • Last updated 10:42 AM</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[rgba(255,255,255,0.06)] text-sm text-zinc-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <RefreshCcw size={14} />
              <span>Refresh</span>
            </button>
          </header>

          <div className="flex items-start gap-3 p-4 mb-8 rounded-lg bg-red-500/5 border-l-2 border-l-red-500/50 border-y border-y-[rgba(255,255,255,0.03)] border-r border-r-[rgba(255,255,255,0.03)]">
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-200">Mac Agent Disconnected</h3>
              <p className="text-sm text-red-200/70 mt-1">
                Dispatch cannot send messages right now. Please ensure the Mac Agent is running on your host machine and connected to the internet.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard label="Sent Today" value="1,248" icon={<Send size={14} className="text-zinc-500" strokeWidth={1.5} />} />
            <StatCard label="Failed Today" value="12" icon={<XCircle size={14} className="text-zinc-500" strokeWidth={1.5} />} />
            <StatCard label="Pending" value="450" icon={<Clock size={14} className="text-zinc-500" strokeWidth={1.5} />} />
            <StatCard label="Total Sent" value="84.2k" icon={<BarChart3 size={14} className="text-zinc-500" strokeWidth={1.5} />} />
          </div>

          <h2 className="text-sm font-medium text-white mb-4">System Health</h2>
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg divide-y divide-[rgba(255,255,255,0.06)] mb-8">
            <HealthItem label="Mac Agent Connection" status="offline" />
            <HealthItem label="Messages.app State" status="unknown" />
            <HealthItem label="AppleScript Automation" status="unknown" />
            <HealthItem label="Connected Accounts (0)" status="warning" />
          </div>

          <div className="flex items-center gap-6 mt-auto border-t border-[rgba(255,255,255,0.06)] pt-6">
            <button className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors">
              <ArrowRight size={14} /> Compose Message
            </button>
            <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
              <ArrowRight size={14} /> Setup Mac Agent
            </button>
          </div>

        </div>
      </main>

    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active 
          ? 'bg-[rgba(255,255,255,0.04)] text-white font-medium' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <span className={active ? 'text-blue-500' : 'text-zinc-500'}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </a>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#111113] p-5 rounded-lg border border-[rgba(255,255,255,0.06)] relative flex flex-col">
      <div className="absolute top-5 right-5">
        {icon}
      </div>
      <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="text-3xl font-semibold text-white tracking-tight">
        {value}
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string, status: 'online' | 'offline' | 'warning' | 'unknown' }) {
  const getBadge = () => {
    switch (status) {
      case 'online':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Connected</span>;
      case 'offline':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-red-500/10 text-red-400 border border-red-500/20">Offline ✗</span>;
      case 'warning':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Warning ✗</span>;
      case 'unknown':
      default:
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Unknown ✗</span>;
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      <div className="text-sm text-zinc-300">{label}</div>
      <div>{getBadge()}</div>
    </div>
  );
}
