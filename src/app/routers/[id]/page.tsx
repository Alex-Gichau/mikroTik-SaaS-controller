'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Router, Activity, Camera, Shield, Wifi,
  Cpu, TrendingUp, TrendingDown, Clock, RefreshCw,
  Server, GitCompare, Flame, CheckCircle,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';
import { SparklineChart } from '@/components/dashboard/SparklineChart';
import { SnapshotDiff } from '@/components/dashboard/SnapshotDiff';

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_ROUTERS: Record<string, {
  id: string; name: string; model: string; status: string;
  firmware: string; tunnelIp: string; serial: string; uptime: string;
}> = {
  'Vortex-7721': {
    id: 'Vortex-7721', name: 'Main Office Gateway', model: 'RB5009UG+S+IN',
    status: 'online', firmware: '7.14.3', tunnelIp: '10.100.0.1',
    serial: 'HEX3B2F9A', uptime: '14d 6h 22m',
  },
  'Vortex-8832': {
    id: 'Vortex-8832', name: 'Warehouse Node 1', model: 'hAP ax3',
    status: 'online', firmware: '7.13.5', tunnelIp: '10.100.0.2',
    serial: 'HEX7C4D1B', uptime: '3d 14h 5m',
  },
  'Vortex-9910': {
    id: 'Vortex-9910', name: 'Guest Wi-Fi (East)', model: 'cap ac',
    status: 'offline', firmware: '6.49.10', tunnelIp: '10.100.0.3',
    serial: 'HEX2A8E0C', uptime: 'N/A',
  },
};

const FIREWALL_RULES = [
  { id: '1', chain: 'input',   action: 'drop',   src: '0.0.0.0/0',    dst: '',           comment: 'Block all inbound by default' },
  { id: '2', chain: 'input',   action: 'accept', src: '10.100.0.0/24', dst: '',           comment: 'Allow WireGuard tunnel' },
  { id: '3', chain: 'forward', action: 'accept', src: '',              dst: '8.8.8.8',    comment: 'Allow Google DNS' },
  { id: '4', chain: 'forward', action: 'drop',   src: '',              dst: '0.0.0.0/0',  comment: 'Drop unmatched forward' },
];

const MOCK_SNAPSHOTS = [
  {
    id: 'snap-001', created_at: '2026-05-04T06:00:00Z',
    config_blob: {
      '/ip/firewall/filter': ['chain=input action=drop', 'chain=forward action=accept'],
      '/ip/address':          ['192.168.1.1/24 ether1', '10.100.0.1/32 wg0'],
      '/system/ntp':          'server=time.google.com',
      '/system/clock':        'timezone=Africa/Nairobi',
    },
  },
  {
    id: 'snap-002', created_at: '2026-05-03T18:00:00Z',
    config_blob: {
      '/ip/firewall/filter': ['chain=input action=drop'],
      '/ip/address':          ['192.168.1.1/24 ether1', '10.100.0.1/32 wg0'],
      '/system/ntp':          'server=pool.ntp.org',
      '/system/clock':        'timezone=Africa/Nairobi',
    },
  },
  {
    id: 'snap-003', created_at: '2026-05-02T09:00:00Z',
    config_blob: {
      '/ip/firewall/filter': ['chain=input action=accept'],
      '/ip/address':          ['192.168.0.1/24 ether1'],
      '/system/ntp':          'server=pool.ntp.org',
    },
  },
];

function gen(base: number, variance: number, n = 24) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, base + Math.sin(i * 0.5) * variance + (Math.random() - 0.5) * variance * 0.4)
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

type Tab = 'overview' | 'traffic' | 'snapshots' | 'firewall';

// ── Page ───────────────────────────────────────────────────────────────────
export default function RouterDetailPage() {
  const params = useParams();
  const routerId = params.id as string;
  const router   = MOCK_ROUTERS[routerId] ?? MOCK_ROUTERS['Vortex-7721'];
  const isOnline = router.status === 'online';

  const [tab,           setTab]           = useState<Tab>('overview');
  const [snapshots,     setSnapshots]     = useState(MOCK_SNAPSHOTS);
  const [snapA,         setSnapA]         = useState<string>('snap-001');
  const [snapB,         setSnapB]         = useState<string>('snap-002');
  const [isTakingSnap,  setIsTakingSnap]  = useState(false);
  const [snapSaved,     setSnapSaved]     = useState(false);

  const rxData  = gen(450,  80);
  const txData  = gen(120,  30);
  const cpuData = gen(18,   12);
  const ramData = gen(42,    8);

  const blobA = snapshots.find(s => s.id === snapA)?.config_blob ?? {};
  const blobB = snapshots.find(s => s.id === snapB)?.config_blob ?? {};

  async function takeSnapshot() {
    setIsTakingSnap(true);
    await new Promise(r => setTimeout(r, 1500));
    setSnapshots(prev => [{
      id:         `snap-${Date.now()}`,
      created_at: new Date().toISOString(),
      config_blob: MOCK_SNAPSHOTS[0].config_blob,
    }, ...prev]);
    setIsTakingSnap(false);
    setSnapSaved(true);
    setTimeout(() => setSnapSaved(false), 2000);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',   label: 'Overview'                          },
    { key: 'traffic',    label: 'Traffic History'                   },
    { key: 'snapshots',  label: `Snapshots (${snapshots.length})`   },
    { key: 'firewall',   label: 'Firewall'                          },
  ];

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-6">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <span>/</span>
          <span className="text-white/60">{router.name}</span>
        </div>

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <Router size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{router.name}</h1>
              <p className="text-white/40 text-sm mt-0.5">{router.model} · {router.id}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {router.status.toUpperCase()}
                </span>
                <span className="text-xs text-white/30 flex items-center gap-1">
                  <Clock size={10} /> {router.uptime}
                </span>
                <span className="text-xs text-white/30 font-mono">
                  {router.tunnelIp}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={takeSnapshot}
              disabled={isTakingSnap || !isOnline}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              {snapSaved   ? <CheckCircle size={14} className="text-emerald-400" /> :
               isTakingSnap ? <RefreshCw size={14} className="animate-spin" /> :
               <Camera size={14} />}
              {snapSaved ? 'Saved!' : isTakingSnap ? 'Saving…' : 'Snapshot'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-xl text-sm text-white font-semibold transition-all">
              <Wifi size={14} /> Manage Wi-Fi
            </button>
          </div>
        </header>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Download',  value: rxData[rxData.length-1].toFixed(1),   unit: 'Mbps', icon: TrendingDown, color: '#3b82f6' },
            { label: 'Upload',    value: txData[txData.length-1].toFixed(1),   unit: 'Mbps', icon: TrendingUp,   color: '#10b981' },
            { label: 'CPU',       value: cpuData[cpuData.length-1].toFixed(0), unit: '%',    icon: Cpu,          color: '#f59e0b' },
            { label: 'RAM',       value: ramData[ramData.length-1].toFixed(0), unit: '%',    icon: Server,       color: '#8b5cf6' },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <motion.div key={label} whileHover={{ y: -3 }} className="glass-card p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${color}22` }}>
                  <Icon size={13} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-black text-white">
                {value}
                <span className="text-sm font-normal text-white/40 ml-1">{unit}</span>
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-white/5 mb-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-semibold transition-all relative ${
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

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={14} className="text-blue-400" /> Live Traffic
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SparklineChart data={rxData} color="#3b82f6" label="Download" unit=" Mbps" height={70} />
                <SparklineChart data={txData} color="#10b981" label="Upload"   unit=" Mbps" height={70} />
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Server size={14} className="text-purple-400" /> System Info
              </h2>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ['Firmware',    router.firmware],
                  ['Model',       router.model],
                  ['Serial No.',  router.serial],
                  ['Tunnel IP',   router.tunnelIp],
                  ['Uptime',      router.uptime],
                  ['Snapshots',   String(snapshots.length)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/[0.03] rounded-xl p-3">
                    <dt className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{k}</dt>
                    <dd className="text-sm font-semibold text-white font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* ── Traffic ── */}
        {tab === 'traffic' && (
          <div className="space-y-5">
            {[
              { data: rxData,  color: '#3b82f6', label: 'Download (RX)', unit: ' Mbps' },
              { data: txData,  color: '#10b981', label: 'Upload (TX)',    unit: ' Mbps' },
              { data: cpuData, color: '#f59e0b', label: 'CPU Load',       unit: '%'    },
              { data: ramData, color: '#8b5cf6', label: 'RAM Usage',      unit: '%'    },
            ].map(({ data, color, label, unit }) => (
              <div key={label} className="glass-card p-6">
                <SparklineChart data={data} color={color} label={label} unit={unit} height={90} />
                <div className="flex justify-between text-[10px] text-white/20 mt-1 px-1">
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Snapshots ── */}
        {tab === 'snapshots' && (
          <div className="space-y-6">
            {/* Snapshot list */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera size={14} className="text-blue-400" /> Config History
                </h2>
                <span className="text-[10px] text-white/30">Select two to compare</span>
              </div>
              <ul className="divide-y divide-white/5">
                {snapshots.map((snap) => (
                  <li key={snap.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-colors">
                    <div>
                      <p className="text-sm text-white font-mono">{snap.id}</p>
                      <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {fmtDate(snap.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSnapA(snap.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          snapA === snap.id
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => setSnapB(snap.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          snapB === snap.id
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                        }`}
                      >
                        B
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Diff viewer */}
            {snapA !== snapB && (
              <div className="glass-card p-6">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <GitCompare size={14} className="text-blue-400" />
                  Diff: <span className="text-red-400">{snapA}</span> → <span className="text-emerald-400">{snapB}</span>
                </h2>
                <SnapshotDiff
                  blobA={blobA as Record<string, unknown>}
                  blobB={blobB as Record<string, unknown>}
                  labelA={snapA}
                  labelB={snapB}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Firewall ── */}
        {tab === 'firewall' && (
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame size={14} className="text-orange-400" /> Active Firewall Rules
              </h2>
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5">
                <Shield size={12} /> Push New Rule
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left px-6 py-3 font-semibold">Chain</th>
                  <th className="text-left px-6 py-3 font-semibold">Action</th>
                  <th className="text-left px-6 py-3 font-semibold">Source</th>
                  <th className="text-left px-6 py-3 font-semibold">Destination</th>
                  <th className="text-left px-6 py-3 font-semibold">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FIREWALL_RULES.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-white/60">{rule.chain}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        rule.action === 'accept'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-white/50">{rule.src || '–'}</td>
                    <td className="px-6 py-3 font-mono text-xs text-white/50">{rule.dst || '–'}</td>
                    <td className="px-6 py-3 text-xs text-white/30">{rule.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
