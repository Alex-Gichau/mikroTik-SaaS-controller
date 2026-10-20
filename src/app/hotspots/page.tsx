'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Radio, Users, Signal, ShieldCheck, Ticket, TicketCheck,
  ArrowLeft, Search, Terminal, RefreshCw, Ban,
  CheckCircle2, XCircle, AlertTriangle, Clock, Download, Upload,
  TrendingUp, Zap, ChevronRight, CircleSlash, KeyRound,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import { SparklineChart } from '@/components/dashboard/SparklineChart';
import {
  HOTSPOTS, HOTSPOT_PROFILES, VOUCHERS, HOTSPOT_SITES,
  hotspotTotals, voucherTotals, getHotspotProfile,
  HOTSPOT_AUTH_META, HOTSPOT_SECURITY_META, VOUCHER_PACKAGE_META,
  routerOsHotspotCommands, formatClock, formatSignal, signalColor,
  relativeTime, type Hotspot, type HotspotStatus, type VoucherStatus,
} from '@/lib/hotspot';
import { series, hashSeed } from '@/lib/prng';

const STATUS_META: Record<HotspotStatus, { label: string; color: string; bg: string; border: string }> = {
  online:      { label: 'Online',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  degraded:    { label: 'Degraded',    color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  offline:     { label: 'Offline',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  maintenance: { label: 'Maintenance', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
};

const VOUCHER_META: Record<VoucherStatus, { label: string; color: string; bg: string; border: string }> = {
  unused:  { label: 'Unused',  color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  active:  { label: 'Active',  color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  expired: { label: 'Expired', color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/10'      },
  disabled:{ label: 'Disabled',color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
};

type Tab = 'fleet' | 'clients' | 'profiles' | 'vouchers';

export default function HotspotsPage() {
  const [tab, setTab] = useState<Tab>('fleet');
  const [siteId, setSiteId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HotspotStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const totals = useMemo(() => hotspotTotals(), []);
  const vTotals = useMemo(() => voucherTotals(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOTSPOTS.filter(h => {
      const matchSite = siteId === 'all' || h.siteId === siteId;
      const matchStatus = statusFilter === 'all' || h.status === statusFilter;
      const matchQ =
        !q ||
        h.apName.toLowerCase().includes(q) ||
        h.ssid.toLowerCase().includes(q) ||
        h.siteName.toLowerCase().includes(q) ||
        h.siteCode.toLowerCase().includes(q) ||
        h.model.toLowerCase().includes(q);
      return matchSite && matchStatus && matchQ;
    });
  }, [siteId, statusFilter, query]);

  const selected = useMemo(
    () => HOTSPOTS.find(h => h.id === selectedId) ?? null,
    [selectedId],
  );

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOTSPOTS.flatMap(h =>
      h.clients.map(c => ({ ...c, hotspot: h, siteName: h.siteName })),
    ).filter(c => {
      const matchSite = siteId === 'all' || c.hotspot.siteId === siteId;
      const matchQ =
        !q ||
        c.mac.toLowerCase().includes(q) ||
        c.hostname.toLowerCase().includes(q) ||
        c.ip.includes(q) ||
        c.hotspot.ssid.toLowerCase().includes(q);
      return matchSite && matchQ;
    });
  }, [siteId, query]);

  const vouchers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VOUCHERS.filter(v => {
      const matchSite = siteId === 'all' || v.siteId === siteId;
      const matchQ = !q || v.code.toLowerCase().includes(q) || v.siteName.toLowerCase().includes(q);
      return matchSite && matchQ;
    });
  }, [siteId, query]);

  const appendLog = (lines: string[]) => {
    setLog(prev => [...lines.map(l => `> ${l}`), ...prev].slice(0, 40));
  };

  const pushProfile = async (hotspot: Hotspot) => {
    setPushing(hotspot.id);
    try {
      const res = await fetch('/api/network/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push-profile', hotspotId: hotspot.id, profileId: hotspot.profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        appendLog([`! ${data.error ?? 'Push failed'}`]);
      } else {
        appendLog(data.commands as string[]);
      }
    } catch {
      appendLog(['! Network error while pushing profile']);
    } finally {
      setPushing(null);
    }
  };

  const TABS: Array<{ key: Tab; label: string; icon: typeof Radio; count: number }> = [
    { key: 'fleet',    label: 'AP Fleet',  icon: Radio,       count: HOTSPOTS.length },
    { key: 'clients',  label: 'Clients',   icon: Users,       count: totals.clients },
    { key: 'profiles', label: 'Profiles',  icon: ShieldCheck, count: HOTSPOT_PROFILES.length },
    { key: 'vouchers', label: 'Vouchers',  icon: Ticket,      count: VOUCHERS.length },
  ];

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
              <Radio className="text-cyan-400 shrink-0" size={20} /> Hotspot Management
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              Access point fleet, captive portal sessions, vouchers and client onboarding
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {totals.online} / {totals.aps} APs live
            </span>
          </div>
        </header>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Access Points', value: totals.aps, sub: `${totals.online} online`, color: 'text-white',        icon: Radio },
            { label: 'Live Clients',  value: totals.clients, sub: `of ${totals.capacity} capacity`, color: 'text-cyan-400', icon: Users },
            { label: 'Sessions Today',value: totals.sessionsToday, sub: 'authentications', color: 'text-purple-400', icon: TrendingUp },
            { label: 'Revenue Today', value: `$${totals.revenueTodayUsd.toFixed(0)}`, sub: 'voucher + portal', color: 'text-emerald-400', icon: Zap },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="glass-card p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-white/5 rounded-xl shrink-0">
                <Icon size={18} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest truncate">{label}</p>
                <p className={`text-xl sm:text-2xl font-black ${color} truncate`}>{value}</p>
                <p className="text-[10px] text-white/25 truncate hidden sm:block">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0.5 border-b border-white/5 overflow-x-auto no-scrollbar -mb-6 sm:-mb-8">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap shrink-0 flex items-center gap-2 ${
                tab === key ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <Icon size={15} className="shrink-0" />
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === key ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/30'
              }`}>
                {count}
              </span>
              {tab === key && (
                <motion.div
                  layoutId="hotspot-tab"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-cyan-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
          <div className="relative group w-full min-w-0 sm:w-64 sm:flex-none">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-500 transition-colors"
              size={15}
            />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search AP, SSID, MAC, voucher…"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-white/20 text-white"
            />
          </div>

          <select
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            aria-label="Filter by site"
            className="max-w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
          >
            <option value="all" className="bg-zinc-900">All sites</option>
            {HOTSPOT_SITES.map(s => (
              <option key={s.id} value={s.id} className="bg-zinc-900">{s.code} — {s.name}</option>
            ))}
          </select>

          {tab === 'fleet' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | HotspotStatus)}
              aria-label="Filter by status"
              className="max-w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Any status</option>
              {(Object.keys(STATUS_META) as HotspotStatus[]).map(s => (
                <option key={s} value={s} className="bg-zinc-900">{STATUS_META[s].label}</option>
              ))}
            </select>
          )}

          <span className="ml-auto text-xs text-white/30 self-center">
            {tab === 'fleet' ? `${filtered.length} APs`
              : tab === 'clients' ? `${clients.length} clients`
              : tab === 'vouchers' ? `${vouchers.length} vouchers`
              : `${HOTSPOT_PROFILES.length} profiles`}
          </span>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="min-w-0 space-y-6">

            {/* Fleet table */}
            {tab === 'fleet' && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                        <th className="px-4 sm:px-5 py-3 text-left">Access Point</th>
                        <th className="px-4 sm:px-5 py-3 text-left">SSID / Auth</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Clients</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Throughput</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Today</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Status</th>
                        <th className="px-4 sm:px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((h, i) => {
                        const meta = STATUS_META[h.status];
                        const profile = getHotspotProfile(h.profileId);
                        const auth = profile ? HOTSPOT_AUTH_META[profile.auth] : null;
                        return (
                          <motion.tr
                            key={h.id}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => setSelectedId(h.id === selectedId ? null : h.id)}
                            className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${
                              selectedId === h.id ? 'bg-cyan-500/[0.06]' : ''
                            }`}
                          >
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  h.status === 'online' ? 'bg-cyan-500/10 text-cyan-400'
                                  : h.status === 'offline' ? 'bg-red-500/10 text-red-400'
                                  : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  <Radio size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{h.apName}</p>
                                  <p className="text-[10px] text-white/30 font-mono truncate">
                                    {h.siteCode} · {h.model} · ch {h.channel}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <p className="text-xs font-semibold text-white/80 truncate">{h.ssid}</p>
                              {auth && (
                                <span className={`text-[10px] font-bold ${auth.color}`}>{auth.label}</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-14 sm:w-20 h-1.5 rounded-full bg-white/5 overflow-hidden shrink-0">
                                  <div
                                    className={`h-full rounded-full ${
                                      h.utilizationPct > 85 ? 'bg-red-500'
                                      : h.utilizationPct > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                                    }`}
                                    style={{ width: `${h.utilizationPct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-white/50 font-mono whitespace-nowrap">
                                  {h.activeClients}/{h.maxClients}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-2 text-[11px] font-mono">
                                <span className="text-emerald-400 flex items-center gap-0.5">
                                  <Download size={10} /> {h.rxMbps.toFixed(0)}
                                </span>
                                <span className="text-blue-400 flex items-center gap-0.5">
                                  <Upload size={10} /> {h.txMbps.toFixed(0)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <p className="text-xs text-white/70 font-mono">{h.sessionsToday} sess</p>
                              <p className="text-[10px] text-white/30">${h.revenueTodayUsd.toFixed(2)}</p>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${meta.bg} ${meta.color} border ${meta.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full bg-current ${h.status === 'online' ? 'animate-pulse' : ''}`} />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right">
                              <button
                                onClick={e => { e.stopPropagation(); pushProfile(h); }}
                                disabled={pushing === h.id || h.status === 'offline'}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {pushing === h.id
                                  ? <RefreshCw size={11} className="animate-spin" />
                                  : <RefreshCw size={11} />}
                                Push
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-white/30 text-sm">No access points match the current filter.</div>
                )}
              </motion.div>
            )}

            {/* Clients table */}
            {tab === 'clients' && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                        <th className="px-4 sm:px-5 py-3 text-left">Device</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Network</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Signal</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Usage</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Session</th>
                        <th className="px-4 sm:px-5 py-3 text-left">Auth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clients.slice(0, 60).map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.015 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 sm:px-5 py-3">
                            <p className="text-xs font-bold text-white/80 truncate">{c.hostname}</p>
                            <p className="text-[10px] text-white/30 font-mono">{c.mac}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3">
                            <p className="text-xs text-white/70 font-mono">{c.ip}</p>
                            <p className="text-[10px] text-white/30">VLAN {c.vlan} · {c.siteName}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <Signal size={13} className={signalColor(c.signalDbm)} />
                              <span className={`text-[11px] font-bold ${signalColor(c.signalDbm)}`}>
                                {c.signalDbm} dBm
                              </span>
                            </div>
                            <p className={`text-[10px] ${signalColor(c.signalDbm)}`}>{formatSignal(c.signalDbm)}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3">
                            <p className="text-[11px] font-mono text-emerald-400">↓ {c.totalDownloadMb} MB</p>
                            <p className="text-[11px] font-mono text-blue-400">↑ {c.totalUploadMb} MB</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3">
                            <p className="text-xs text-white/60 font-mono">{formatClock(c.uptimeSeconds)}</p>
                            <p className="text-[10px] text-white/30">{c.downloadMbps.toFixed(1)} Mbps down</p>
                          </td>
                          <td className="px-4 sm:px-5 py-3">
                            {c.authorized ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 size={10} /> {c.method === 'voucher' ? 'Voucher' : 'Portal'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock size={10} /> Pending
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {clients.length === 0 && (
                  <div className="py-12 text-center text-white/30 text-sm">No associated clients.</div>
                )}
                {clients.length > 60 && (
                  <div className="px-5 py-3 text-center text-[11px] text-white/30 border-t border-white/5">
                    Showing 60 of {clients.length} clients — narrow the filter to see more.
                  </div>
                )}
              </motion.div>
            )}

            {/* Profiles */}
            {tab === 'profiles' && (
              <motion.div
                key="profiles"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {HOTSPOT_PROFILES.map((p, i) => {
                  const deployed = HOTSPOTS.filter(h => h.profileId === p.id);
                  const clients = deployed.reduce((s, h) => s + h.activeClients, 0);
                  const auth = HOTSPOT_AUTH_META[p.auth];
                  const sec = HOTSPOT_SECURITY_META[p.security];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-white/40 font-mono truncate">{p.ssid}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${auth.bg} ${auth.color} border ${auth.border}`}>
                          {auth.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${sec.bg} ${sec.color} border ${sec.border}`}>
                          {sec.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 text-white/50 border border-white/10">
                          {p.band === 'both' ? '2.4 + 5 GHz' : p.band.toUpperCase()}
                        </span>
                        {p.hideSsid && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Hidden
                          </span>
                        )}
                        {p.isolateClients && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Client isolation
                          </span>
                        )}
                        {p.macFilter !== 'none' && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            MAC {p.macFilter}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: 'Down', value: `${p.downloadMbpsLimit} Mb` },
                          { label: 'Up', value: `${p.uploadMbpsLimit} Mb` },
                          { label: 'Session', value: formatClock(p.sessionTimeoutMinutes * 60) },
                        ].map(x => (
                          <div key={x.label} className="bg-white/[0.03] rounded-lg p-2 min-w-0">
                            <p className="text-[9px] text-white/30 uppercase tracking-widest truncate">{x.label}</p>
                            <p className="text-xs font-bold text-white truncate">{x.value}</p>
                          </div>
                        ))}
                      </div>

                      {p.walledGarden.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5">
                            Walled garden · {p.walledGarden.length} hosts
                          </p>
                          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                            {p.walledGarden.slice(0, 6).map(h => (
                              <span key={h} className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                        <span className="text-[10px] text-white/30">
                          {deployed.length} APs · {clients} clients
                        </span>
                        {p.captivePortalPath && (
                          <span className="text-[10px] font-mono text-cyan-400 truncate">
                            {p.captivePortalPath}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Vouchers */}
            {tab === 'vouchers' && (
              <motion.div
                key="vouchers"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  {[
                    { label: 'Unused',  value: vTotals.unused,  color: 'text-blue-400',    icon: Ticket },
                    { label: 'Active',  value: vTotals.active,  color: 'text-emerald-400',icon: TicketCheck },
                    { label: 'Expired', value: vTotals.expired, color: 'text-white/40',   icon: Clock },
                    { label: 'Face Value', value: `$${vTotals.revenueUsd.toFixed(0)}`, color: 'text-purple-400', icon: Zap },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="glass-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <div className="p-2 bg-white/5 rounded-xl shrink-0">
                        <Icon size={16} className={color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{label}</p>
                        <p className={`text-lg sm:text-xl font-black ${color} truncate`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                          <th className="px-4 sm:px-5 py-3 text-left">Code</th>
                          <th className="px-4 sm:px-5 py-3 text-left">Package</th>
                          <th className="px-4 sm:px-5 py-3 text-left">Site</th>
                          <th className="px-4 sm:px-5 py-3 text-left">Value</th>
                          <th className="px-4 sm:px-5 py-3 text-left">Redeemed</th>
                          <th className="px-4 sm:px-5 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {vouchers.map((v, i) => {
                          const meta = VOUCHER_META[v.status];
                          const pkg = VOUCHER_PACKAGE_META[v.package];
                          return (
                            <motion.tr
                              key={v.id}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.015 }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-4 sm:px-5 py-3">
                                <span className="text-xs font-mono font-bold text-white/80">{v.code}</span>
                              </td>
                              <td className="px-4 sm:px-5 py-3">
                                <p className="text-xs text-white/70">{pkg.label}</p>
                                <p className="text-[10px] text-white/30">expires {relativeTime(v.validUntil)}</p>
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-xs text-white/50">{v.siteName}</td>
                              <td className="px-4 sm:px-5 py-3 text-xs font-mono text-white/70">${v.valueUsd}</td>
                              <td className="px-4 sm:px-5 py-3">
                                {v.usedAt ? (
                                  <>
                                    <p className="text-[11px] text-white/50 font-mono">{relativeTime(v.usedAt)}</p>
                                    <p className="text-[10px] text-white/30 font-mono">{v.usedByMac}</p>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-white/25">—</span>
                                )}
                              </td>
                              <td className="px-4 sm:px-5 py-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${meta.bg} ${meta.color} border ${meta.border}`}>
                                  {v.status === 'active' && <CheckCircle2 size={10} />}
                                  {v.status === 'expired' && <Clock size={10} />}
                                  {v.status === 'disabled' && <CircleSlash size={10} />}
                                  {v.status === 'unused' && <KeyRound size={10} />}
                                  {meta.label}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {vouchers.length === 0 && (
                    <div className="py-12 text-center text-white/30 text-sm">No vouchers match the current filter.</div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right rail ── */}
          <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
            {/* Selected AP detail */}
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                className="glass-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{selected.apName}</p>
                    <p className="text-[11px] text-white/40 font-mono truncate">
                      {selected.siteCode} · {selected.model}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label="Close detail panel"
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                  >
                    <XCircle size={16} />
                  </button>
                </div>

                {/* Client load chart */}
                <div className="mb-4">
                  <SparklineChart
                    data={series(
                      selected.activeClients * 1.15,
                      Math.max(2, selected.maxClients * 0.12),
                      24,
                      hashSeed(selected.id),
                      0.6,
                    )}
                    color="#06b6d4"
                    label="Concurrent clients"
                    height={70}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'BSSID', value: selected.bssid },
                    { label: 'Channel', value: `${selected.channel} (${selected.band})` },
                    { label: 'Clients', value: `${selected.activeClients} / ${selected.maxClients}` },
                    { label: 'Uptime', value: formatClock(selected.uptimeSeconds) },
                  ].map(x => (
                    <div key={x.label} className="bg-white/[0.03] rounded-lg p-2 min-w-0">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest truncate">{x.label}</p>
                      <p className="text-[11px] font-mono text-white/80 truncate">{x.value}</p>
                    </div>
                  ))}
                </div>

                {/* Client list */}
                {selected.clients.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">
                      Associated clients
                    </p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                      {selected.clients.slice(0, 12).map(c => (
                        <div key={c.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 min-w-0">
                          <Signal size={11} className={`shrink-0 ${signalColor(c.signalDbm)}`} />
                          <span className="text-[11px] text-white/70 truncate flex-1 min-w-0">{c.hostname}</span>
                          <span className="text-[10px] text-white/30 font-mono shrink-0">{c.signalDbm}dBm</span>
                        </div>
                      ))}
                    </div>
                    {selected.clients.length > 12 && (
                      <p className="text-[10px] text-white/25 mt-1.5">
                        + {selected.clients.length - 12} more associated
                      </p>
                    )}
                  </div>
                )}

                {/* RouterOS preview */}
                <div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Terminal size={10} /> RouterOS preview
                  </p>
                  <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {routerOsHotspotCommands(selected).map((cmd, i) => (
                      <p key={i} className="text-[10px] font-mono text-emerald-400/80 leading-relaxed break-all">
                        {cmd}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-4 sm:p-5">
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Fleet overview</p>
                <div className="space-y-3">
                  {[
                    { label: 'Online APs',   value: `${totals.online}`, color: 'text-emerald-400' },
                    { label: 'Total clients',value: `${totals.clients}`, color: 'text-cyan-400' },
                    { label: 'Fleet capacity',value: `${totals.capacity}`, color: 'text-white' },
                    { label: 'Throughput',   value: `${totals.throughputMbps} Mb/s`, color: 'text-purple-400' },
                    { label: 'Sessions today',value: `${totals.sessionsToday}`, color: 'text-blue-400' },
                    { label: 'Revenue today',value: `$${totals.revenueTodayUsd.toFixed(2)}`, color: 'text-emerald-400' },
                  ].map(x => (
                    <div key={x.label} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/40 truncate">{x.label}</span>
                      <span className={`text-sm font-black ${x.color} shrink-0`}>{x.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-white/25">
                    Select an access point to inspect its radio, clients and the exact RouterOS commands the controller pushes.
                  </p>
                </div>
              </div>
            )}

            {/* Command log */}
            {log.length > 0 && (
              <div className="glass-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[9px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal size={10} /> Push log
                  </p>
                  <button
                    onClick={() => setLog([])}
                    className="text-[10px] text-white/30 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 max-h-48 overflow-y-auto no-scrollbar">
                  {log.map((l, i) => (
                    <p
                      key={i}
                      className={`text-[10px] font-mono leading-relaxed break-all ${
                        l.startsWith('!') ? 'text-red-400' : 'text-emerald-400/80'
                      }`}
                    >
                      {l}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Portal / security notes */}
            <div className="glass-card p-4 sm:p-5">
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ShieldCheck size={10} /> Portal status
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'Captive portal', value: 'Operational', ok: true },
                  { label: 'RADIUS failover', value: 'Local', ok: true },
                  { label: 'HTTPS redirect', value: 'Enforced', ok: true },
                  { label: 'Walled garden sync', value: '2m ago', ok: true },
                ].map(x => (
                  <div key={x.label} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/40 truncate">{x.label}</span>
                    <span className={`text-[11px] font-bold flex items-center gap-1 shrink-0 ${x.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {x.ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      {x.value}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/access-control"
                className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Ban size={12} className="shrink-0" />
                  <span className="truncate">IP allow / deny lists</span>
                </span>
                <ChevronRight size={13} className="shrink-0" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
