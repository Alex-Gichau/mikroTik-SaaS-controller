'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Route, Layers, ShieldCheck, Zap, ArrowRight, Search,
  Play, Pause, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertTriangle,
  Network, Radio, Cpu, ArrowLeft,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import {
  SITES, OVERLAYS, APP_CLASS_META, UPLINK_TYPE_META, MODE_META,
  type PolicyRoute, type AppClass,
} from '@/lib/network';

export default function SdwanPage() {
  const [siteId, setSiteId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [policies, setPolicies] = useState<Record<string, PolicyRoute>>(() => {
    const map: Record<string, PolicyRoute> = {};
    for (const s of SITES) for (const p of s.policies) map[p.id] = p;
    return map;
  });
  const [appFilter, setAppFilter] = useState<AppClass | 'all'>('all');

  const togglePolicy = (id: string) => {
    setPolicies(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));
  };

  const site = SITES.find(s => s.id === siteId);

  const visiblePolicies = useMemo(() => {
    const all = SITES.flatMap(s => s.policies.map(p => ({ ...p, siteName: s.name, siteCode: s.code })));
    return all.filter(p => {
      const matchSite = siteId === 'all' || p.siteId === siteId;
      const matchApp = appFilter === 'all' || p.appClass === appFilter;
      const q = query.trim().toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.matchValue.toLowerCase().includes(q);
      return matchSite && matchApp && matchQ;
    });
  }, [siteId, appFilter, query]);

  const totals = useMemo(() => {
    const all = SITES.flatMap(s => s.policies);
    return {
      total: all.length,
      enabled: all.filter(p => p.enabled).length,
      hits: all.reduce((s, p) => s + p.hitCount, 0),
    };
  }, []);

  const appClasses = Array.from(new Set(SITES.flatMap(s => s.policies.map(p => p.appClass))));

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 sm:space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-white/30 mb-3">
              <Link href="/network" className="hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft size={13} /> WAN
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <Route className="text-purple-400 shrink-0" size={20} /> SD-WAN Control
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              Policy based routing, application classes and overlay mesh steering
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {totals.enabled} / {totals.total} policies active
            </span>
          </div>
        </header>

        {/* ── Overlays ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {OVERLAYS.map(o => {
            const hub = SITES.find(s => s.id === o.hubSiteId);
            const members = SITES.filter(s => o.memberSiteIds.includes(s.id));
            const up = members.filter(s => s.status === 'online').length;
            return (
              <div key={o.id} className="glass-card p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{o.name}</h3>
                      <p className="text-[11px] text-white/30 font-mono mt-0.5">
                        :{o.port} · {o.addressPool}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    o.status === 'up' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {o.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Hub', value: hub?.code ?? '—' },
                    { label: 'Members', value: `${up}/${members.length}` },
                    { label: 'Throughput', value: `${o.throughputMbps} M` },
                  ].map(x => (
                    <div key={x.label} className="bg-white/[0.03] rounded-xl p-3">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">{x.label}</p>
                      <p className="text-sm font-black text-white font-mono mt-0.5">{x.value}</p>
                    </div>
                  ))}
                </div>

                {/* Peer rows */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {members.map(m => (
                    <Link
                      key={m.id}
                      href={`/sites/${m.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        m.status === 'online' ? 'bg-emerald-400' : m.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <span className="text-xs text-white/60 truncate flex-1">{m.name}</span>
                      {m.id === o.hubSiteId && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">HUB</span>
                      )}
                      <span className="text-[10px] font-mono text-white/35">
                        {m.overlayPeers.find(p => p.siteId === m.id)?.roundTripMs ?? 0}ms
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="glass-card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px] sm:min-w-[220px] w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search policies, match values..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white
                focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-white/20"
            />
          </div>

          <select
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none cursor-pointer w-full sm:w-auto sm:min-w-[200px]"
          >
            <option value="all" className="bg-zinc-900">All sites</option>
            {SITES.map(s => (
              <option key={s.id} value={s.id} className="bg-zinc-900">{s.code} — {s.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setAppFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                appFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
              }`}
            >
              All
            </button>
            {appClasses.map(c => (
              <button
                key={c}
                onClick={() => setAppFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                  appFilter === c ? `${APP_CLASS_META[c].bg} ${APP_CLASS_META[c].color}` : 'text-white/30 hover:text-white'
                }`}
              >
                {APP_CLASS_META[c].label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Site uplink steering panel ── */}
        {site && (
          <div className="glass-card p-4 sm:p-6">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Network size={14} className="text-blue-400" /> Egress Steering — {site.code}
            </h2>
            <p className="text-[11px] text-white/30 mb-5">
              Traffic is steered across the site’s WAN circuits according to the rules below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {site.uplinks.map(u => {
                const steered = site.policies
                  .filter(p => p.enabled && p.uplinkIds.includes(u.id))
                  .map(p => p.name);
                return (
                  <div key={u.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: UPLINK_TYPE_META[u.type].color }} />
                        {u.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        u.state === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                        : u.state === 'standby' ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-black/20 rounded-lg p-2">
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Capacity</p>
                        <p className="text-xs font-bold text-white font-mono">{u.downMbps} M</p>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Latency</p>
                        <p className="text-xs font-bold text-white font-mono">{u.latencyMs} ms</p>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${u.utilizationPct}%`,
                          backgroundColor: u.utilizationPct > 80 ? '#ef4444' : u.utilizationPct > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>

                    {steered.length > 0 ? (
                      <div className="space-y-1">
                        {steered.map(name => (
                          <p key={name} className="text-[10px] text-white/40 truncate">→ {name}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/20">No policy steers over this circuit</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Policy table ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-400" /> Policy Based Routes
            </h2>
            <span className="text-[10px] text-white/30">
              {visiblePolicies.length} shown · {totals.hits.toLocaleString()} rule matches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left px-6 py-3 font-semibold">Policy</th>
                  <th className="text-left px-4 py-3 font-semibold">Site</th>
                  <th className="text-left px-4 py-3 font-semibold">Match</th>
                  <th className="text-left px-4 py-3 font-semibold">Class</th>
                  <th className="text-left px-4 py-3 font-semibold">Egress Order</th>
                  <th className="text-left px-4 py-3 font-semibold">Mode</th>
                  <th className="text-right px-4 py-3 font-semibold">Guaranteed</th>
                  <th className="text-right px-4 py-3 font-semibold">Hits</th>
                  <th className="text-right px-6 py-3 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visiblePolicies.map(p => {
                  const policy = policies[p.id];
                  if (!policy) return null;
                  const mode = MODE_META[policy.mode];
                  const app = APP_CLASS_META[policy.appClass];
                  const owner = SITES.find(s => s.id === policy.siteId);
                  const uplinks = policy.uplinkIds
                    .map(id => owner?.uplinks.find(u => u.id === id))
                    .filter((u): u is NonNullable<typeof u> => u !== undefined);

                  return (
                    <tr key={p.id} className={`transition-colors ${policy.enabled ? 'hover:bg-white/[0.02]' : 'opacity-45'}`}>
                      <td className="px-6 py-3">
                        <p className="text-white font-medium">{policy.name}</p>
                        <p className="text-[10px] text-white/25 font-mono mt-0.5">{policy.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/sites/${policy.siteId}`} className="text-white/60 hover:text-blue-400 transition-colors font-mono text-xs">
                          {p.siteCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider block">{policy.matchType}</span>
                        <span className="text-xs text-white/60 font-mono">{policy.matchValue}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${app.bg} ${app.border} ${app.color}`}>
                          {app.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {uplinks.map((u, i) => (
                            <span key={u.id} className="flex items-center gap-1">
                              {i > 0 && <ArrowRight size={10} className="text-white/20" />}
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: UPLINK_TYPE_META[u.type].color }}
                                title={u.name}
                              />
                            </span>
                          ))}
                          <span className="text-[10px] text-white/40 ml-1.5">
                            {uplinks.map(u => u.name.replace(/ \w$/, '')).join(' → ') || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mode.bg} ${mode.border} ${mode.color}`}>
                          {mode.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">
                        {policy.minBandwidthMbps || '—'}
                        {policy.minBandwidthMbps ? ' M' : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/50">
                        {policy.hitCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => togglePolicy(p.id)}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                            policy.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          {policy.enabled ? <Play size={10} /> : <Pause size={10} />}
                          {policy.enabled ? 'Active' : 'Paused'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visiblePolicies.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-white/30">No policies match your filters.</p>
            </div>
          )}
        </div>

        {/* ── App class legend ── */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Cpu size={14} className="text-amber-400" /> Application Classes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {appClasses.map(c => {
              const meta = APP_CLASS_META[c];
              const count = SITES.flatMap(s => s.policies).filter(p => p.appClass === c).length;
              return (
                <div key={c} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}>
                    {meta.label}
                  </span>
                  <p className="text-lg font-black text-white mt-2">{count}</p>
                  <p className="text-[10px] text-white/30">policies</p>
                  {meta.minBw > 0 && (
                    <p className="text-[10px] text-white/25 mt-1">min {meta.minBw} Mbps</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
