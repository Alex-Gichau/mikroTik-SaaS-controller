'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';

// ── Mock data ───────────────────────────────────────────────────────────────
const LATEST_STABLE = '7.14.3';

type FwStatus = 'current' | 'outdated' | 'critical';

function classify(v: string): FwStatus {
  const [maj] = v.split('.').map(Number);
  if (v === LATEST_STABLE) return 'current';
  if (maj >= 7)             return 'outdated';
  return 'critical';
}

const ROUTERS = [
  { id: 'Vortex-7721', name: 'Main Office Gateway',  model: 'RB5009UG+S+IN', firmware: '7.14.3', org: 'Acme Corp'   },
  { id: 'Vortex-8832', name: 'Warehouse Node 1',     model: 'hAP ax3',        firmware: '7.13.5', org: 'Acme Corp'   },
  { id: 'Vortex-9910', name: 'Guest Wi-Fi (East)',    model: 'cap ac',          firmware: '6.49.10', org: 'Acme Corp'  },
  { id: 'Vortex-4401', name: 'Branch Office — Msa',  model: 'RB4011',          firmware: '7.12.1', org: 'FastNet ISP' },
  { id: 'Vortex-5512', name: 'Tower AP — Ngong',     model: 'LHG 5 ac',        firmware: '7.14.3', org: 'FastNet ISP' },
  { id: 'Vortex-6623', name: 'CPE — Client 001',     model: 'wAP ac',          firmware: '6.48.6',  org: 'FastNet ISP' },
  { id: 'Vortex-7734', name: 'Core Router',          model: 'CCR2004-16G',     firmware: '7.14.1', org: 'SkyLink'    },
  { id: 'Vortex-8845', name: 'Backup Link',          model: 'RB750Gr3',        firmware: '6.49.7',  org: 'SkyLink'    },
];

const STATUS_META: Record<FwStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  current:  { label: 'Up to date', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
  outdated: { label: 'Outdated',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: AlertTriangle },
  critical: { label: 'Critical',   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: XCircle },
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function FirmwareAuditPage() {
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [updating,    setUpdating]    = useState<Set<string>>(new Set());
  const [updated,     setUpdated]     = useState<Set<string>>(new Set());
  const [filterOrg,   setFilterOrg]   = useState('All');
  const [filterState, setFilterState] = useState<FwStatus | 'all'>('all');

  const orgs   = ['All', ...Array.from(new Set(ROUTERS.map(r => r.org)))];
  const counts = {
    current:  ROUTERS.filter(r => classify(r.firmware) === 'current').length,
    outdated: ROUTERS.filter(r => classify(r.firmware) === 'outdated').length,
    critical: ROUTERS.filter(r => classify(r.firmware) === 'critical').length,
  };

  const visible = ROUTERS.filter(r => {
    const s = classify(r.firmware);
    return (filterOrg === 'All' || r.org === filterOrg)
        && (filterState === 'all' || s === filterState);
  });

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev =>
      prev.size === visible.length ? new Set() : new Set(visible.map(r => r.id))
    );
  }

  async function pushUpdate(ids: string[]) {
    const targets = ids.filter(id => classify(ROUTERS.find(r => r.id === id)!.firmware) !== 'current');
    setUpdating(new Set(targets));
    await new Promise(r => setTimeout(r, 2500));
    setUpdating(new Set());
    setUpdated(prev => new Set([...prev, ...targets]));
    setSelected(new Set());
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-blue-400" size={24} /> Firmware Auditor
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Identify routers running outdated or vulnerable RouterOS versions.
            Latest stable: <span className="text-emerald-400 font-mono">{LATEST_STABLE}</span>
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {([ 'current', 'outdated', 'critical' ] as FwStatus[]).map(s => {
            const m = STATUS_META[s];
            const Icon = m.icon;
            return (
              <motion.button
                key={s}
                whileHover={{ y: -2 }}
                onClick={() => setFilterState(prev => prev === s ? 'all' : s)}
                className={`glass-card p-5 text-left transition-all border ${
                  filterState === s ? m.border + ' ' + m.bg : 'border-white/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{m.label}</p>
                    <p className={`text-3xl font-black ${m.color}`}>{counts[s]}</p>
                    <p className="text-xs text-white/30 mt-0.5">router{counts[s] !== 1 ? 's' : ''}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${m.bg}`}>
                    <Icon size={18} className={m.color} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <span className="text-xs text-white/40">Org:</span>
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              {orgs.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
            </select>
            <ChevronDown size={12} className="text-white/30" />
          </div>

          {selected.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => pushUpdate([...selected])}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              <RefreshCw size={14} /> Update {selected.size} selected
            </motion.button>
          )}

          <span className="text-xs text-white/30 ml-auto">{visible.length} router{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={toggleAll}
                    className="accent-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left">Router</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Org</th>
                <th className="px-4 py-3 text-left">Firmware</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map(router => {
                const status = updated.has(router.id) ? 'current' : classify(router.firmware);
                const m       = STATUS_META[status];
                const Icon    = m.icon;
                const isUpd   = updating.has(router.id);
                const fw      = updated.has(router.id) ? LATEST_STABLE : router.firmware;

                return (
                  <motion.tr
                    key={router.id}
                    layout
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(router.id)}
                        onChange={() => toggle(router.id)}
                        className="accent-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{router.name}</p>
                      <p className="text-[10px] text-white/30 font-mono">{router.id}</p>
                    </td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{router.model}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{router.org}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/80">{fw}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${m.bg} ${m.border} ${m.color}`}>
                        <Icon size={11} /> {m.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {status !== 'current' ? (
                        <button
                          onClick={() => pushUpdate([router.id])}
                          disabled={isUpd}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-all disabled:opacity-40"
                        >
                          <RefreshCw size={11} className={isUpd ? 'animate-spin' : ''} />
                          {isUpd ? 'Updating…' : `→ ${LATEST_STABLE}`}
                        </button>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
