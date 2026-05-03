'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RouterCard } from '@/components/dashboard/RouterCard';
import { ProvisionModal } from '@/components/dashboard/ProvisionModal';
import { Shield, Zap, LayoutGrid, Search, Bell } from 'lucide-react';

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
  }
];

export default function Home() {
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [orgId] = useState('org-123'); // Placeholder for actual org context

  return (
    <main className="flex-1 overflow-auto bg-[#09090b]">
      {/* Navigation Header */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-[#09090b]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">VORTEX</span>
        </div>
        
        <div className="flex-1 max-w-xl mx-12">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search routers, MACs, or IPs..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-white/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/client-portal" className="text-sm font-bold text-white/60 hover:text-white transition-colors mr-4">
            Client Portal
          </Link>
          <button className="p-2 text-white/40 hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090b]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600" />
        </div>
      </nav>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Operations Dashboard</h1>
            <p className="text-white/40 mt-1">Real-time status of your MikroTik infrastructure.</p>
          </div>
          
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
            <button className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-2">
              <LayoutGrid size={14} />
              Grid View
            </button>
            <button className="px-4 py-2 text-xs font-bold text-white/40 hover:text-white transition-colors">
              List View
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_ROUTERS.map((router) => (
            <RouterCard key={router.id} router={router} />
          ))}
          
          {/* Add Router Card */}
          <button 
            onClick={() => setIsProvisionModalOpen(true)}
            className="h-full min-h-[300px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 group hover:border-white/20 transition-all hover:bg-white/[0.02]"
          >
            <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
              <Zap className="text-white/20 group-hover:text-white/40" size={32} />
            </div>
            <div className="text-center">
              <span className="block text-white font-semibold">Provision New Router</span>
              <span className="text-xs text-white/20">Generate &quot;One-Click&quot; onboarding script</span>
            </div>
          </button>
        </section>

        {/* Security Alert Banner */}
        <section className="mt-12 p-6 glass-card border-blue-500/20 bg-blue-500/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white">Zero-Exposure Security Active</h4>
              <p className="text-sm text-white/40">All routers are communicating via encrypted WireGuard tunnels. Public API ports are closed.</p>
            </div>
          </div>
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20">
            View Tunnel Health
          </button>
        </section>
      </div>

      <ProvisionModal 
        isOpen={isProvisionModalOpen} 
        onClose={() => setIsProvisionModalOpen(false)} 
        orgId={orgId}
      />
    </main>
  );
}
