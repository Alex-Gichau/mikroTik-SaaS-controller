'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutGrid, Cpu, GitMerge, Activity,
  Users, Bell, Search, Shield, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/',               label: 'Operations',     icon: LayoutGrid },
  { href: '/firmware-audit', label: 'Firmware Audit', icon: Cpu        },
  { href: '/bulk-push',      label: 'Bulk Push',      icon: GitMerge   },
  { href: '/audit-log',      label: 'Audit Log',      icon: Activity   },
  { href: '/client-portal',  label: 'Client Portal',  icon: Users      },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col fixed h-full z-40 bg-[#09090b]">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Zap className="text-white fill-white" size={15} />
          </div>
          <span className="text-lg font-black tracking-tighter text-white">VORTEX</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 py-2 mt-1">
            Management
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon size={16} />
                {label}
                {isActive && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Tunnel status */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Shield size={13} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-400">Tunnels Active</p>
              <p className="text-[10px] text-emerald-400/60">2 / 3 online</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Admin User</p>
              <p className="text-[10px] text-white/30 truncate">admin@org.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-[#09090b]/90 backdrop-blur-xl z-30">
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors"
                size={15}
              />
              <input
                type="text"
                placeholder="Search routers, MACs, IPs..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-white/20 text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="p-2 text-white/40 hover:text-white transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
