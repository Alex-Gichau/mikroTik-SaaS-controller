'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Radio, Route, Layers, Network, Users, Globe2,
  Clock, Cpu, Server, ShieldCheck, Wifi, Zap, CheckCircle2, AlertTriangle,
  XCircle, ArrowUpRight, ArrowDownLeft, Link2, Settings2, Loader2, ArrowRight,
  Activity,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import { SparklineChart } from '@/components/dashboard/SparklineChart';
import {
  getSite, SITES, SITE_ROLE_META, UPLINK_TYPE_META, APP_CLASS_META, MODE_META,
  type Uplink, type LinkState, type PolicyRoute,
} from '@/lib/network';
import { series, hashSeed } from '@/lib/prng';

const STATE_META: Record<LinkState, { color: string; bg: string; border: string; label: string }> = {
  active:   { label: 'Active',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  standby:  { label: 'Standby',  color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  degraded: { label: 'Degraded', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  down:     { label: 'Down',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
};

function fmtUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params.id as string;
  const site = getSite(siteId);

  const [tab, setTab] = useState<'uplinks' | 'policies' | 'subnets' | 'devices' | 'overlay'>('uplinks');
  const [switching, setSwitching] = useState<string | null>(null);
  const [activeUplinkId, setActiveUplinkId] = useState<string | null>(null);
  const [policyState, setPolicyState] = useState<Record<string, boolean>>({});
  /** Local circuit-state overrides, applied on top of the seeded model. */
  const [stateOverrides, setStateOverrides] = useState<Record<string, LinkState>>({});

  // Per-uplink traffic history.
  const uplinkSeries = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const u of site?.uplinks ?? []) {
      map[u.id] = series(
        u.downMbps * (u.utilizationPct / 100) * 1.1,
        u.downMbps * 0.18,
        28,
        hashSeed(u.id),
        0.45,
      );
    }
    return map;
  }, [site?.uplinks]);

  /** Uplinks with any local state overrides applied. */
  const uplinks = useMemo(
    () => (site?.uplinks ?? []).map(u => (stateOverrides[u.id] ? { ...u, state: stateOverrides[u.id] } : u)),
    [site?.uplinks, stateOverrides],
  );

  if (!site) {
    return (
      <AppShell>
        <div className="p-8 max-w-3xl mx-auto text-center py-24">
          <XCircle className="text-red-400 mx-auto mb-4" size={40} />
          <h1 className="text-xl font-bold text-white">Site not found</h1>
          <p className="text-white/40 text-sm mt-2">No site matches “{siteId}”.</p>
          <Link href="/network" className="inline-flex items-center gap-2 mt-6 text-sm text-blue-400 hover:text-blue-300">
            <ArrowLeft size={14} /> Back to WAN
          </Link>
        </div>
      </AppShell>
    );
  }

  const roleMeta = SITE_ROLE_META[site.role];

  const activeUplink = uplinks.find(u => u.id === activeUplinkId) ?? uplinks[0];

  /**
   * Failover — promote the target circuit to `active` and demote whichever
   * circuit was carrying traffic to `standby`.
   */
  const failoverTo = (target: Uplink) => {
    setSwitching(target.id);
    setTimeout(() => {
      const next: Record<string, LinkState> = {};
      for (const u of uplinks) {
        if (u.state === 'down') continue;
        next[u.id] = u.id === target.id ? 'active' : 'standby';
      }
      setStateOverrides(next);
      setSwitching(null);
      setActiveUplinkId(target.id);
    }, 1400);
  };

  const TABS = [
    { key: 'uplinks' as const, label: `WAN Uplinks (${site.uplinks.length})` },
    { key: 'policies' as const, label: `Policies (${site.policies.length})` },
    { key: 'subnets'  as const, label: `Subnets (${site.subnets.length})` },
    { key: 'devices'  as const, label: `Devices (${site.devices.length})` },
    { key: 'overlay'  as const, label: `Overlay (${site.overlayPeers.length})` },
  ];

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 sm:space-y-8">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-white/30">
          <Link href="/network" className="hover:text-white transition-colors flex items-center gap-1.5">
            <ArrowLeft size={13} /> WAN
          </Link>
          <span>/</span>
          <span className="text-white/60">{site.name}</span>
        </div>

        {/* ── Header ── */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
              <Building2 size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3 flex-wrap">
                {site.name}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${roleMeta.bg} ${roleMeta.border} ${roleMeta.color}`}>
                  {roleMeta.label}
                </span>
              </h1>
              <p className="text-white/40 text-sm mt-1 font-mono">
                {site.code} · {site.city}, {site.country} · {site.timezone}
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap text-[11px] text-white/35">
                <span className="flex items-center gap-1.5">
                  <Globe2 size={11} /> {site.region}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={11} /> {site.timezone}
                </span>
                {site.subscribers > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users size={11} /> {site.subscribers} subscribers
                  </span>
                )}
                <span className="font-mono">{site.lat.toFixed(3)}, {site.lon.toFixed(3)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all">
              <Settings2 size={14} /> Site Settings
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-xl text-sm text-white font-semibold transition-all">
              <Zap size={14} /> Push Template
            </button>
          </div>
        </header>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Contracted', value: site.contractedMbps, unit: 'Mbps', icon: Network,    color: '#3b82f6', sub: `${site.uplinks.length} circuits` },
            { label: 'Current',    value: site.currentMbps,    unit: 'Mbps', icon: Activity,   color: '#10b981', sub: `${site.contractedMbps ? Math.round((site.currentMbps / site.contractedMbps) * 100) : 0}% utilised` },
            { label: 'Devices',    value: site.devices.length, unit: '',     icon: Server,     color: '#8b5cf6', sub: `${site.devices.filter(d => d.status === 'online').length} online` },
            { label: 'Subnets',    value: site.subnets.length, unit: '',     icon: Wifi,       color: '#06b6d4', sub: `${site.subnets.reduce((s, x) => s + x.deviceCount, 0)} clients` },
            { label: 'Overlay peers', value: site.overlayPeers.length, unit: '', icon: Link2,   color: '#a855f7', sub: `${site.overlayPeers.filter(p => p.status === 'up').length} up` },
          ].map(({ label, value, unit, icon: Icon, color, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${color}22` }}>
                  <Icon size={13} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-black text-white">
                {value}
                {unit && <span className="text-sm font-normal text-white/40 ml-1">{unit}</span>}
              </p>
              <p className="text-[11px] text-white/30 mt-1">{sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0.5 border-b border-white/5 overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap shrink-0 ${
                tab === key ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {label}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Uplinks ── */}
        {tab === 'uplinks' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
            <div className="space-y-4">
              {uplinks.map(u => {
                const meta = STATE_META[u.state];
                const isActive = activeUplink?.id === u.id;
                const data = uplinkSeries[u.id] ?? [];
                return (
                  <motion.div
                    key={u.id}
                    layout
                    className={`glass-card p-5 ${isActive ? 'border-blue-500/30' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-xl"
                          style={{ background: `${UPLINK_TYPE_META[u.type].color}22` }}
                        >
                          <Radio size={17} style={{ color: UPLINK_TYPE_META[u.type].color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            {u.name}
                            {u.state === 'active' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                PRIMARY
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            {UPLINK_TYPE_META[u.type].label} · {u.provider}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${meta.bg} ${meta.border} ${meta.color}`}>
                          {meta.label}
                        </span>
                        {u.state !== 'down' && u.state !== 'active' && (
                          <button
                            onClick={() => failoverTo(u)}
                            disabled={switching !== null}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-white/70 hover:text-white transition-all disabled:opacity-40"
                          >
                            {switching === u.id
                              ? <><Loader2 size={11} className="animate-spin" /> Switching…</>
                              : <><ArrowUpRight size={11} /> Failover</>}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
                      {[
                        { label: 'Contracted', value: `↓${u.downMbps} ↑${u.upMbps}`, unit: 'Mbps' },
                        { label: 'Public IP',  value: u.publicIp, unit: '', mono: true },
                        { label: 'Latency',    value: `${u.latencyMs}`, unit: 'ms' },
                        { label: 'Jitter',     value: `${u.jitterMs}`, unit: 'ms' },
                        { label: 'Loss',       value: u.lossPct.toFixed(1), unit: '%' },
                      ].map(x => (
                        <div key={x.label} className="bg-black/20 rounded-lg p-2.5">
                          <p className="text-[9px] text-white/30 uppercase tracking-wider">{x.label}</p>
                          <p className={`text-xs font-bold text-white mt-0.5 truncate ${x.mono ? 'font-mono' : ''}`}>
                            {x.value}
                            {x.unit && <span className="text-white/30 font-normal ml-0.5">{x.unit}</span>}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${u.utilizationPct}%`,
                          backgroundColor: u.utilizationPct > 80 ? '#ef4444' : u.utilizationPct > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-white/30">
                      {u.utilizationPct}% of {u.downMbps} Mbps · ${u.monthlyCostUsd}/mo
                    </p>

                    {data.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <SparklineChart
                          data={data}
                          color={UPLINK_TYPE_META[u.type].color}
                          label="Throughput"
                          unit=" Mbps"
                          height={54}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Side panel */}
            <div className="space-y-5">
              <div className="glass-card p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Route size={13} className="text-purple-400" /> Failover Chain
                </h2>
                <div className="space-y-2">
                  {[...uplinks].sort((a, b) => a.priority - b.priority).map((u, i, arr) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          u.state === 'down' ? 'bg-red-500/15 text-red-400'
                          : u.state === 'active' ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                        <p className="text-[10px] text-white/30 font-mono">{u.downMbps} Mbps</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${STATE_META[u.state].bg} ${STATE_META[u.state].color}`}>
                        {u.state}
                      </span>
                      {i < arr.length - 1 && (
                        <ArrowDownLeft size={12} className="text-white/15 absolute" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25 mt-4 leading-relaxed">
                  When the primary circuit fails, traffic is steered to the next healthy uplink in priority order.
                </p>
              </div>

              <div className="glass-card p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Cpu size={13} className="text-amber-400" /> Site Load
                </h2>
                {site.devices.slice(0, 5).map(d => (
                  <div key={d.id} className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-white/60">{d.name}</span>
                      <span className="font-mono text-white/40">{d.cpuLoad}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${d.cpuLoad}%`,
                          backgroundColor: d.cpuLoad > 70 ? '#ef4444' : d.cpuLoad > 40 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Policies ── */}
        {tab === 'policies' && (
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={14} className="text-purple-400" /> Site Policy Routes
              </h2>
              <span className="text-[10px] text-white/30">{site.policies.length} rules</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                    <th className="text-left px-6 py-3 font-semibold">Policy</th>
                    <th className="text-left px-4 py-3 font-semibold">Match</th>
                    <th className="text-left px-4 py-3 font-semibold">Class</th>
                    <th className="text-left px-4 py-3 font-semibold">Egress</th>
                    <th className="text-left px-4 py-3 font-semibold">Mode</th>
                    <th className="text-right px-4 py-3 font-semibold">Min / Max</th>
                    <th className="text-right px-6 py-3 font-semibold">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {site.policies.map(p => {
                    const enabled = policyState[p.id] ?? p.enabled;
                    const mode = MODE_META[p.mode];
                    const app = APP_CLASS_META[p.appClass];
                    const uplinks = p.uplinkIds
                      .map(id => site.uplinks.find(u => u.id === id))
                      .filter(Boolean) as Uplink[];
                    return (
                      <tr key={p.id} className={`transition-colors ${enabled ? 'hover:bg-white/[0.02]' : 'opacity-45'}`}>
                        <td className="px-6 py-3 text-white font-medium">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] text-white/30 uppercase tracking-wider block">{p.matchType}</span>
                          <span className="text-xs text-white/60 font-mono">{p.matchValue}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${app.bg} ${app.border} ${app.color}`}>
                            {app.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            {uplinks.map((u, i) => (
                              <span key={u.id} className="flex items-center gap-1">
                                {i > 0 && <ArrowRight size={10} className="text-white/20" />}
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: UPLINK_TYPE_META[u.type].color }} />
                              </span>
                            ))}
                            <span className="text-[10px] text-white/40 ml-1.5">{uplinks.map(u => u.name).join(' → ')}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mode.bg} ${mode.border} ${mode.color}`}>
                            {mode.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-white/50">
                          {p.minBandwidthMbps || '—'} / {p.maxBandwidthMbps || '—'}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setPolicyState(prev => ({ ...prev, [p.id]: !enabled }))}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                              enabled ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                     : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {enabled ? 'Active' : 'Paused'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Subnets ── */}
        {tab === 'subnets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {site.subnets.map(s => {
              const purposeColor =
                s.purpose === 'guest' ? '#ec4899' : s.purpose === 'dmz' ? '#ef4444'
                : s.purpose === 'management' ? '#06b6d4' : s.purpose === 'voice' ? '#10b981' : '#3b82f6';
              return (
                <div key={s.id} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: purposeColor }} />
                      <p className="text-sm font-bold text-white">{s.name}</p>
                    </div>
                    <span className="text-[10px] font-mono text-white/30">VLAN {s.vlan}</span>
                  </div>
                  <p className="font-mono text-xs text-white/50 bg-black/30 rounded-lg px-3 py-2">{s.cidr}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/[0.03] rounded-lg p-2.5">
                      <p className="text-[9px] text-white/30 uppercase tracking-wider">Clients</p>
                      <p className="text-sm font-black text-white">{s.deviceCount}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5">
                      <p className="text-[9px] text-white/30 uppercase tracking-wider">Bandwidth</p>
                      <p className="text-sm font-black text-white">{s.bandwidthUtilizationPct}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.bandwidthUtilizationPct}%`,
                        backgroundColor: s.bandwidthUtilizationPct > 75 ? '#ef4444' : purposeColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Devices ── */}
        {tab === 'devices' && (
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Server size={14} className="text-blue-400" /> Devices at {site.code}
              </h2>
              <span className="text-[10px] text-white/30">{site.devices.length} devices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                    <th className="text-left px-6 py-3 font-semibold">Device</th>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Model</th>
                    <th className="text-left px-4 py-3 font-semibold">Serial</th>
                    <th className="text-left px-4 py-3 font-semibold">Tunnel IP</th>
                    <th className="text-right px-4 py-3 font-semibold">Uptime</th>
                    <th className="text-right px-4 py-3 font-semibold">CPU</th>
                    <th className="text-right px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {site.devices.map(d => (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-white font-medium">{d.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 uppercase">
                          {d.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/60">{d.model}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/40">{d.serial}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/50">{d.tunnelIp}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">{fmtUptime(d.uptimeSeconds)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">{d.cpuLoad}%</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          d.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Overlay ── */}
        {tab === 'overlay' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={14} className="text-cyan-400" /> Overlay Peers
                </h2>
                <span className="text-[10px] text-white/30">WireGuard</span>
              </div>
              <ul className="divide-y divide-white/5">
                {site.overlayPeers.map(p => {
                  const peer = SITES.find(s => s.id === p.siteId);
                  return (
                    <li key={p.id} className="px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            p.status === 'up' ? 'bg-emerald-400' : p.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                          }`} />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate flex items-center gap-2">
                              {peer?.name ?? p.siteId}
                              {p.isHub && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  HUB
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-white/30 font-mono mt-0.5 truncate">
                              {p.publicEndpoint} → {p.tunnelIp}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-white/60">{p.roundTripMs} ms</p>
                          <p className="text-[10px] text-white/30">
                            hs {p.lastHandshakeSeconds}s ago
                          </p>
                        </div>
                      </div>
                      {p.allowedNetworks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5 pl-5">
                          {p.allowedNetworks.map(n => (
                            <span key={n} className="text-[9px] font-mono text-white/35 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe2 size={14} className="text-blue-400" /> Transit
              </h2>
              {site.transitFor.length > 0 ? (
                <>
                  <p className="text-[11px] text-white/35 mb-3">
                    This site routes traffic for {site.transitFor.length} downstream site{site.transitFor.length !== 1 ? 's' : ''}.
                  </p>
                  <div className="space-y-1.5">
                    {site.transitFor.map(id => {
                      const child = SITES.find(s => s.id === id);
                      if (!child) return null;
                      return (
                        <Link
                          key={id}
                          href={`/sites/${id}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-xs text-white/60 flex-1 truncate">{child.name}</span>
                          <span className="text-[10px] font-mono text-white/30">{child.currentMbps} M</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-white/30">
                  This site is a leaf — it has no downstream transit sites.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
