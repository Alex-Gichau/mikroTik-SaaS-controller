'use client';

import { useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { RouterCard } from '@/components/dashboard/RouterCard';
import { ProvisionModal } from '@/components/dashboard/ProvisionModal';
import { Zap, LayoutGrid, List, Shield } from 'lucide-react';

const MOCK_ROUTERS = [
  {
    id: 'Vortex-7721',
    name: 'Main Office Gateway',
    model: 'RB5009UG+S+IN',
    status: 'online' as const,
    cpuUsage: 14,
    trafficRx: 450.5,
    trafficTx: 120.2,
    lastSeen: 'Just now',
  },
  {
    id: 'Vortex-8832',
    name: 'Warehouse Node 1',
    model: 'hAP ax3',
    status: 'online' as const,
    cpuUsage: 8,
    trafficRx: 85.2,
    trafficTx: 42.1,
    lastSeen: '2m ago',
  },
  {
    id: 'Vortex-9910',
    name: 'Guest Wi-Fi (East)',
    model: 'cap ac',
    status: 'offline' as const,
    cpuUsage: 0,
    trafficRx: 0,
    trafficTx: 0,
    lastSeen: '1h ago',
  },
];

export default function Home() {
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [orgId] = useState('org-123');

  const online  = MOCK_ROUTERS.filter(r => r.status === 'online').length;
  const offline = MOCK_ROUTERS.filter(r => r.status === 'offline').length;

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto">

        {/* Page header */}
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Operations Dashboard</h1>
            <p className="text-white/40 mt-1 text-sm">
              Real-time status of your MikroTik infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Online / offline pills */}
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {online} Online
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {offline} Offline
            </span>

            {/* View toggle */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  view === 'grid' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                }`}
              >
                <LayoutGrid size={13} /> Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  view === 'list' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                }`}
              >
                <List size={13} /> List
              </button>
            </div>
          </div>
        </header>

        {/* Router cards */}
        <section
          className={
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {MOCK_ROUTERS.map((router) => (
            <RouterCard key={router.id} router={router} />
          ))}

          {/* Add Router card */}
          <button
            onClick={() => setIsProvisionModalOpen(true)}
            className="h-full min-h-[240px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col
              items-center justify-center gap-4 group hover:border-blue-500/30 transition-all hover:bg-blue-500/[0.02]"
          >
            <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-blue-500/10 transition-colors">
              <Zap className="text-white/20 group-hover:text-blue-400 transition-colors" size={28} />
            </div>
            <div className="text-center">
              <span className="block text-white font-semibold">Provision New Router</span>
              <span className="text-xs text-white/20">Generate &quot;One-Click&quot; onboarding script</span>
            </div>
          </button>
        </section>

        {/* Security banner */}
        <section className="mt-10 p-6 glass-card border-blue-500/20 bg-blue-500/[0.02] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
              <Shield size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white">Zero-Exposure Security Active</h4>
              <p className="text-sm text-white/40 mt-0.5">
                All routers communicate via encrypted WireGuard tunnels. Public API ports (8728/8729) are closed.
              </p>
            </div>
          </div>
          <button className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 shrink-0">
            Tunnel Health
          </button>
        </section>
      </div>

      <ProvisionModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        orgId={orgId}
      />
    </AppShell>
  );
}
