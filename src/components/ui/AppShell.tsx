'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutGrid, Cpu, GitMerge, Activity,
  Users, Bell, Search, Shield, ChevronRight,
  Globe2, Route, Building2, Menu, X, Radio, ShieldCheck,
} from 'lucide-react';
import { SITES } from '@/lib/network';

const NAV = [
  { href: '/network',         label: 'WAN Overview',   icon: Globe2     },
  { href: '/sites',           label: 'Sites',          icon: Building2  },
  { href: '/sdwan',           label: 'SD-WAN',         icon: Route      },
  { href: '/hotspots',        label: 'Hotspots',       icon: Radio      },
  { href: '/access-control',  label: 'Access Control', icon: ShieldCheck },
  { href: '/',                label: 'Operations',     icon: LayoutGrid },
  { href: '/firmware-audit',  label: 'Firmware Audit', icon: Cpu        },
  { href: '/bulk-push',       label: 'Bulk Push',      icon: GitMerge   },
  { href: '/audit-log',       label: 'Audit Log',      icon: Activity   },
  { href: '/client-portal',   label: 'Client Portal',  icon: Users      },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onlineSites = SITES.filter(s => s.status === 'online').length;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const navList = (
    <>
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
            onClick={() => setMobileNavOpen(false)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              isActive
                ? 'bg-blue-600/15 text-blue-400 border-blue-500/20'
                : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Icon size={16} className="shrink-0" />
            {label}
            {isActive && <ChevronRight size={12} className="ml-auto opacity-60" />}
          </Link>
        );
      })}
    </>
  );

  const sidebarFooter = (
    <>
      {/* Tunnel status */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Shield size={13} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400">Tunnels Active</p>
            <p className="text-[10px] text-emerald-400/60">{onlineSites} / {SITES.length} sites online</p>
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
    </>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 border-r border-white/5 flex-col fixed h-full z-40 bg-[#09090b]">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Zap className="text-white fill-white" size={15} />
          </div>
          <span className="text-lg font-black tracking-tighter text-white">VORTEX</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">{navList}</nav>

        {sidebarFooter}
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 h-full w-[17rem] max-w-[85vw] bg-[#09090b] border-r border-white/10 flex flex-col shadow-2xl">
            <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  <Zap className="text-white fill-white" size={15} />
                </div>
                <span className="text-lg font-black tracking-tighter text-white">VORTEX</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="p-2 -mr-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">{navList}</nav>

            {sidebarFooter}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:ml-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 flex items-center gap-3 px-4 sm:px-6 lg:px-8 sticky top-0 bg-[#09090b]/90 backdrop-blur-xl z-30">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden p-2 -ml-1 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Brand — mobile only */}
          <Link
            href="/"
            className="lg:hidden flex items-center gap-2 shrink-0"
            aria-label="Vortex home"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white fill-white" size={13} />
            </div>
            <span className="text-base font-black tracking-tighter text-white hidden min-[380px]:inline">
              VORTEX
            </span>
          </Link>

          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors"
                size={15}
              />
              <input
                type="text"
                placeholder="Search sites, routers, circuits, MACs..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-white/20 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              aria-label="Notifications"
              className="p-2 text-white/40 hover:text-white transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
