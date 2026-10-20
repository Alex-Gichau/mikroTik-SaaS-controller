'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Globe2, Network, Layers, Zap, TrendingUp, TrendingDown, Server,
  Radio, ShieldCheck, ArrowRight, Activity, Building2, AlertTriangle,
  CheckCircle2, XCircle, Gauge, Route, Wifi,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import { TopologyMap } from '@/components/network/TopologyMap';
import { SparklineChart } from '@/components/dashboard/SparklineChart';
import {
  SITES, OVERLAYS, REGIONS, allUplinks, capacityBuckets,
  totalContractedMbps, totalCurrentMbps, totalSubscribers,
  SITE_ROLE_META, UPLINK_TYPE_META,
  type Site, type SiteStatus,
} from '@/lib/network';
import { series, hashSeed } from '@/lib/prng';

const STATUS_META: Record<SiteStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  online:      { label: 'Online',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  degraded:    { label: 'Degraded',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: AlertTriangle },
  offline:     { label: 'Offline',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: XCircle },
  maintenance: { label: 'Maintenance', color: 'text-white/50',   bg: 'bg-white/5',       border: 'border-white/10',      icon: AlertTriangle },
};

export default function NetworkPage() {
  const [regionFilter, setRegionFilter] = useState('All');
  const [overlayId, setOverlayId] = useState(OVERLAYS[0].id);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const filtered = useMemo(
    () => SITES.filter(s => regionFilter === 'All' || s.region === regionFilter),
    [regionFilter],
  );

  const uplinkList = useMemo(() => allUplinks(), []);
  const buckets = useMemo(() => capacityBuckets(), []);

  const health = useMemo(() => {
    const online = SITES.filter(s => s.status === 'online').length;
    const degraded = SITES.filter(s => s.status === 'degraded').length;
    const offline = SITES.filter(s => s.status === 'offline').length;
    return { online, degraded, offline, total: SITES.length };
  }, []);

  const contracted = totalContractedMbps();
  const current = totalCurrentMbps();
  const utilisation = contracted ? (current / contracted) * 100 : 0;

  const activeUplinks = uplinkList.filter(u => u.state === 'active');
  const standbyUplinks = uplinkList.filter(u => u.state === 'standby');
  const downUplinks = uplinkList.filter(u => u.state === 'down');

  /** Aggregate WAN throughput series for the top chart. */
  const wanSeries = useMemo(
    () => series(current * 1.15, current * 0.22, 36, hashSeed('wan-aggregate'), 0.4),
    [current],
  );

  const overlay = OVERLAYS.find(o => o.id === overlayId)!;

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <Globe2 className="text-blue-400 shrink-0" size={20} /> Wide Area Network
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              {SITES.length} sites · {uplinkList.length} WAN circuits · {totalSubscribers().toLocaleString()} subscribers
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar">
              {OVERLAYS.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOverlayId(o.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    overlayId === o.id ? 'bg-blue-600/20 text-blue-400' : 'text-white/30 hover:text-white'
                  }`}
                >
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Contracted',   value: `${(contracted / 1000).toFixed(1)}`, unit: 'Gbps', icon: Network,      color: '#3b82f6', sub: `${uplinkList.length} circuits` },
            { label: 'Utilised',     value: utilisation.toFixed(0),           unit: '%',     icon: Gauge,        color: '#10b981', sub: `${current.toLocaleString()} Mbps now` },
            { label: 'Active / Standby', value: `${activeUplinks.length}/${standbyUplinks.length}`, unit: '', icon: Zap, color: '#f59e0b', sub: `${downUplinks.length} down` },
            { label: 'Sites online', value: `${health.online}/${health.total}`, unit: '', icon: Building2, color: '#22c55e', sub: `${health.degraded} degraded` },
            { label: 'Overlay',      value: overlay.status.toUpperCase(),      unit: '',      icon: ShieldCheck, color: '#a855f7', sub: `${overlay.memberSiteIds.length} members` },
          ].map(({ label, value, unit, icon: Icon, color, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">{label}</p>
                <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${color}22` }}>
                  <Icon size={13} style={{ color }} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {value}
                {unit && <span className="text-sm font-normal text-white/40 ml-1">{unit}</span>}
              </p>
              <p className="text-[11px] text-white/30 mt-1 truncate">{sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Topology + site list ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">

          {/* Map */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 shrink-0">
                <Layers size={14} className="text-blue-400" /> Network Topology
              </h2>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar max-w-full">
                {['All', ...REGIONS].map(r => (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                      regionFilter === r ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <TopologyMap
              focusOverlayId={overlayId}
              selectedSiteId={selectedSite?.id ?? null}
              onSelectSite={setSelectedSite}
              visibleSiteIds={regionFilter === 'All' ? null : filtered.map(s => s.id)}
            />
          </div>

          {/* Site list */}
          <div className="glass-card overflow-hidden flex flex-col max-h-[640px]">
            <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Server size={14} className="text-emerald-400" /> Sites
              </h2>
              <span className="text-[10px] text-white/30">{filtered.length} shown</span>
            </div>
            <ul className="divide-y divide-white/5 overflow-y-auto flex-1">
              {filtered.map(site => {
                const meta = STATUS_META[site.status];
                const roleMeta = SITE_ROLE_META[site.role];
                const active = selectedSite?.id === site.id;
                return (
                  <li key={site.id}>
                    <button
                      onClick={() => setSelectedSite(site)}
                      className={`w-full text-left px-6 py-3.5 transition-colors ${
                        active ? 'bg-blue-500/[0.07]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{site.name}</p>
                          <p className="text-[11px] text-white/30 font-mono mt-0.5">
                            {site.code} · {site.city}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleMeta.bg} ${roleMeta.border} ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.color.replace('text-', 'bg-')}`} />
                          <span className={meta.color}>{meta.label}</span>
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          {site.currentMbps} / {site.contractedMbps} Mbps
                        </span>
                        <span className="ml-auto text-[10px] text-white/25">
                          {site.uplinks.length} uplink{site.uplinks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {/* Capacity bar */}
                      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((site.currentMbps / Math.max(site.contractedMbps, 1)) * 100, 100)}%`,
                            background: meta.color.replace('text-', 'bg-'),
                          }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedSite && (
              <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <Link
                  href={`/sites/${selectedSite.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Open {selectedSite.code}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Throughput + capacity distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={14} className="text-blue-400" /> Aggregate WAN Throughput
            </h2>
            <SparklineChart data={wanSeries} color="#3b82f6" label="All sites" unit=" Mbps" height={110} />
            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
              {[
                { label: 'Peak',  value: Math.max(...wanSeries).toFixed(0), unit: 'Mbps', icon: TrendingUp,   color: '#3b82f6' },
                { label: 'Mean',  value: (wanSeries.reduce((s, v) => s + v, 0) / wanSeries.length).toFixed(0), unit: 'Mbps', icon: Activity, color: '#10b981' },
                { label: 'Headroom', value: (contracted - current).toLocaleString(), unit: 'Mbps', icon: TrendingDown, color: '#8b5cf6' },
              ].map(({ label, value, unit, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${color}22` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/35 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-black text-white">
                      {value}
                      <span className="text-[10px] font-normal text-white/40 ml-1">{unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Gauge size={14} className="text-amber-400" /> Circuit Utilisation
            </h2>
            <div className="space-y-3">
              {buckets.map(b => {
                const pct = uplinkList.length ? (b.count / uplinkList.length) * 100 : 0;
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-white/50 font-mono">{b.label}</span>
                      <span className="text-white/70 font-bold">{b.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-5 border-t border-white/5 space-y-2">
              {(['fiber', '5g', 'lte', 'starlink', 'dsl'] as const).map(t => {
                const count = uplinkList.filter(u => u.type === t).length;
                return (
                  <div key={t} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: UPLINK_TYPE_META[t].color }} />
                    <span className="text-white/50">{UPLINK_TYPE_META[t].label}</span>
                    <span className="ml-auto font-mono text-white/70">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Circuits table ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio size={14} className="text-purple-400" /> WAN Circuits
            </h2>
            <span className="text-[10px] text-white/30">
              {activeUplinks.length} active · {standbyUplinks.length} standby · {downUplinks.length} down
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left px-6 py-3 font-semibold">Site</th>
                  <th className="text-left px-4 py-3 font-semibold">Circuit</th>
                  <th className="text-left px-4 py-3 font-semibold">Provider</th>
                  <th className="text-left px-4 py-3 font-semibold">Public IP</th>
                  <th className="text-right px-4 py-3 font-semibold">Down</th>
                  <th className="text-left px-4 py-3 font-semibold">Utilisation</th>
                  <th className="text-right px-4 py-3 font-semibold">Latency</th>
                  <th className="text-right px-4 py-3 font-semibold">Loss</th>
                  <th className="text-right px-6 py-3 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {uplinkList.map(u => {
                  const stateColor =
                    u.state === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : u.state === 'standby' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : u.state === 'degraded' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20';

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/sites/${u.siteId}`} className="text-white hover:text-blue-400 transition-colors">
                          {u.siteName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-white/70">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: UPLINK_TYPE_META[u.type].color }} />
                          {u.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">{u.provider}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/50">{u.publicIp}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/70">
                        {u.downMbps || '—'}
                        <span className="text-white/30"> M</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${u.utilizationPct}%`,
                                backgroundColor:
                                  u.utilizationPct > 80 ? '#ef4444' : u.utilizationPct > 50 ? '#f59e0b' : '#10b981',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-white/40">{u.utilizationPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">{u.latencyMs} ms</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">{u.lossPct.toFixed(1)}%</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${stateColor}`}>
                          {u.state}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SD-WAN shortcuts ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { href: '/sdwan', icon: Route, color: '#a855f7', title: 'SD-WAN Policies', body: 'Per-site policy based routing, application classes and egress steering.' },
            { href: '/sdwan', icon: Layers, color: '#06b6d4', title: 'Overlay Mesh', body: 'WireGuard hub-and-spoke meshes with per-peer handshakes and RTT.' },
            { href: '/sites', icon: Wifi, color: '#10b981', title: 'Site Templates', body: 'Push a standardised site profile to every branch in one operation.' },
          ].map(({ href, icon: Icon, color, title, body }) => (
            <Link
              key={title}
              href={href}
              className="glass-card p-5 flex items-start gap-4 hover:border-white/20 transition-all group"
            >
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${color}22` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{title}</p>
                <p className="text-xs text-white/35 mt-1 leading-relaxed">{body}</p>
              </div>
              <ArrowRight size={15} className="text-white/20 group-hover:text-blue-400 transition-colors mt-1" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
