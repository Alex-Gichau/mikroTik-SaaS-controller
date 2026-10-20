'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Layers, ArrowRight, CheckCircle2, XCircle, Loader2,
  Search, Filter, Copy, Zap, GitMerge, ShieldCheck, Terminal,
  Globe2, Network, Radio, Users, Server,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import {
  SITES, SITE_ROLE_META, totalContractedMbps, totalSubscribers,
  allUplinks, type Site, type SiteStatus,
} from '@/lib/network';

const STATUS_META: Record<SiteStatus, { label: string; color: string; dot: string }> = {
  online:      { label: 'Online',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
  degraded:    { label: 'Degraded', color: 'text-amber-400',   dot: 'bg-amber-400'   },
  offline:     { label: 'Offline',  color: 'text-red-400',     dot: 'bg-red-400'     },
  maintenance: { label: 'Maint.',   color: 'text-white/50',   dot: 'bg-white/40'    },
};

const TEMPLATES = [
  {
    id: 'tpl-branch-standard',
    name: 'Branch Standard Profile',
    description: 'Baseline hardening for all branch sites: DNS, NTP, firewall, MTU.',
    category: 'Baseline',
    commands: [
      '/ip/dns set servers=1.1.1.1,9.9.9.9',
      '/system/ntp/client set enabled=yes servers=time.google.com',
      '/ip/service set api disabled=yes address=10.100.0.0/16',
      '/interface/wireguard set wireguard-vortex mtu=1420',
    ],
  },
  {
    id: 'tpl-hub-core',
    name: 'Hub Core Profile',
    description: 'Routing, BGP-style prefix exchange and VRF isolation for HQ/POP.',
    category: 'Core',
    commands: [
      '/routing/filter add chain=vortex prefix=0.0.0.0/0 action=accept',
      '/ip/route add dst-address=0.0.0.0/0 gateway=10.100.0.1 distance=1',
      '/interface/ethernet set ether1 mtu=1500 l2mtu=1598',
      '/system/ntp/client set enabled=yes servers=time.google.com',
    ],
  },
  {
    id: 'tpl-lte-failover',
    name: 'LTE Failover Profile',
    description: 'Cellular backup with lower preference and automatic route swap.',
    category: 'Resilience',
    commands: [
      '/interface/lte set lte1 disabled=no',
      '/routing/table add name=vortex-backup fib',
      '/ip/route add dst-address=0.0.0.0/0 gateway=lte1 routing-table=vortex-backup distance=10',
      '/system/script add name=vortex-failover source="/routing/table switch"',
    ],
  },
  {
    id: 'tpl-guest-isolation',
    name: 'Guest Isolation Profile',
    description: 'Client-side segmentation: guest VLAN walled off from corporate.',
    category: 'Security',
    commands: [
      '/interface/bridge add name=bridge-guest vlan-filtering=yes',
      '/ip/firewall/filter add chain=forward src-address=192.168.20.0/24 out-interface-list=!LAN action=drop',
      '/ip/dhcp-server/lease add address=192.168.20.50 client-id=00:1A:2B:3C:4D:5E',
    ],
  },
];

export default function SitesPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [pushing, setPushing] = useState(false);
  const [results, setResults] = useState<Array<{ site: string; ok: boolean; msg: string }> | null>(null);

  const template = TEMPLATES.find(t => t.id === templateId)!;
  const roles = Array.from(new Set(SITES.map(s => s.role)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SITES.filter(s => {
      const matchRole = roleFilter === 'all' || s.role === roleFilter;
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q);
      return matchRole && matchQ;
    });
  }, [query, roleFilter]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)),
    );
  };

  const pushTemplate = async () => {
    if (!selected.size) return;
    setPushing(true);
    setResults(null);
    const targets = SITES.filter(s => selected.has(s.id));
    const out: Array<{ site: string; ok: boolean; msg: string }> = [];

    for (const s of targets) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
      const ok = s.status !== 'offline';
      out.push({
        site: s.name,
        ok,
        msg: ok
          ? `${template.commands.length} commands applied`
          : 'Failed — site offline',
      });
    }
    setResults(out);
    setPushing(false);
  };

  const contract = totalContractedMbps();
  const uplinks = allUplinks();

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 sm:space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <Building2 className="text-blue-400 shrink-0" size={20} /> Sites & Templates
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              {SITES.length} sites · {(contract / 1000).toFixed(1)} Gbps contracted · {totalSubscribers().toLocaleString()} subscribers
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
            {[
              { label: 'Sites',   value: SITES.length,                      color: 'text-blue-400'   },
              { label: 'Circuits', value: uplinks.length,                   color: 'text-purple-400' },
              { label: 'Degraded', value: SITES.filter(s => s.status !== 'online').length, color: 'text-amber-400' },
            ].map(x => (
              <div key={x.label} className="glass-card px-3 sm:px-4 py-2.5 text-center">
                <p className="text-[9px] text-white/35 uppercase tracking-widest">{x.label}</p>
                <p className={`text-lg font-black ${x.color}`}>{x.value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">

          {/* ── Site list ── */}
          <div className="space-y-5">
            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search sites, codes, cities..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-white/20"
                />
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                    roleFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                  }`}
                >
                  All
                </button>
                {roles.map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                      roleFilter === r ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {SITE_ROLE_META[r].label}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(site => {
                const meta = STATUS_META[site.status];
                const role = SITE_ROLE_META[site.role];
                const isChecked = selected.has(site.id);
                const utilisation = site.contractedMbps
                  ? (site.currentMbps / site.contractedMbps) * 100
                  : 0;

                return (
                  <motion.div
                    key={site.id}
                    layout
                    className={`glass-card p-4 sm:p-5 transition-all ${isChecked ? 'border-blue-500/30 bg-blue-500/[0.04]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(site.id)}
                          className="accent-blue-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/sites/${site.id}`}
                            className="text-sm font-bold text-white hover:text-blue-400 transition-colors block truncate"
                          >
                            {site.name}
                          </Link>
                          <p className="text-[11px] text-white/30 font-mono mt-0.5">{site.code}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${role.bg} ${role.border} ${role.color}`}>
                        {role.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Current',  value: `${site.currentMbps} M`, icon: Radio },
                        { label: 'Contract', value: `${site.contractedMbps} M`, icon: Network },
                        { label: 'Devices',  value: `${site.devices.length}`, icon: Server },
                      ].map(x => (
                        <div key={x.label} className="bg-black/20 rounded-lg p-2">
                          <p className="text-[9px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                            <x.icon size={9} /> {x.label}
                          </p>
                          <p className="text-xs font-bold text-white font-mono mt-0.5">{x.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(utilisation, 100)}%`,
                          backgroundColor: utilisation > 80 ? '#ef4444' : utilisation > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className={meta.color}>{meta.label}</span>
                      </span>
                      <span className="text-[10px] text-white/30 font-mono">
                        {utilisation.toFixed(0)}% · {site.uplinks.length} uplinks
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Template panel ── */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Layers size={14} className="text-purple-400" /> Config Templates
              </h2>
              <p className="text-[11px] text-white/30 mb-4">
                Push a standardised profile to one or many sites.
              </p>

              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      templateId === t.id
                        ? 'bg-purple-600/15 border-purple-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold ${templateId === t.id ? 'text-purple-300' : 'text-white/70'}`}>
                        {t.name}
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/35 border border-white/10 uppercase shrink-0">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview + push */}
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Terminal size={13} className="text-emerald-400" /> RouterOS Preview
              </h2>
              <pre className="bg-black/60 border border-white/5 rounded-xl p-4 text-[10.5px] text-emerald-400 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-52 overflow-y-auto">
                {template.commands.join('\n')}
              </pre>

              <div className="mt-4 flex items-center justify-between text-[10px] text-white/30">
                <span>
                  Targets:{' '}
                  <span className="text-white/60 font-bold">{selected.size}</span> site{selected.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(template.commands.join('\n'));
                  }}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>

              <button
                onClick={pushTemplate}
                disabled={!selected.size || pushing}
                className="mt-4 w-full py-3 bg-purple-600/80 hover:bg-purple-600 text-white font-bold rounded-xl
                  transition-all shadow-lg shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {pushing
                  ? <><Loader2 size={15} className="animate-spin" /> Pushing…</>
                  : <><GitMerge size={15} /> Push to {selected.size || '?'} Site{selected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck size={13} className="text-emerald-400" /> Push Results
                    </h2>
                    <button onClick={() => setResults(null)} className="text-white/30 hover:text-white transition-colors">
                      <XCircle size={14} />
                    </button>
                  </div>
                  <ul className="divide-y divide-white/5">
                    {results.map((r, i) => (
                      <motion.li
                        key={r.site}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-5 py-2.5"
                      >
                        {r.ok
                          ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          : <XCircle size={12} className="text-red-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 truncate">{r.site}</p>
                          <p className="text-[10px] text-white/30">{r.msg}</p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick links */}
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Globe2 size={13} className="text-blue-400" /> WAN Views
              </h2>
              <div className="space-y-1.5">
                {[
                  { href: '/network', label: 'Topology & circuits', icon: Network },
                  { href: '/sdwan', label: 'SD-WAN policies', icon: GitMerge },
                ].map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <l.icon size={14} className="text-white/30 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xs text-white/60 group-hover:text-white transition-colors flex-1">{l.label}</span>
                    <ArrowRight size={12} className="text-white/15 group-hover:text-blue-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
