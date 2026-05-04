'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, CheckSquare, Loader2, CheckCircle, Terminal, X } from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';

const ALL_ROUTERS = [
  { id: 'Vortex-7721', name: 'Main Office Gateway', model: 'RB5009UG+S+IN', status: 'online'  as const },
  { id: 'Vortex-8832', name: 'Warehouse Node 1',    model: 'hAP ax3',        status: 'online'  as const },
  { id: 'Vortex-9910', name: 'Guest Wi-Fi (East)',  model: 'cap ac',          status: 'offline' as const },
  { id: 'Vortex-4401', name: 'Branch Office — Msa', model: 'RB4011',          status: 'online'  as const },
  { id: 'Vortex-5512', name: 'Tower AP — Ngong',    model: 'LHG 5 ac',        status: 'online'  as const },
];

const ACTIONS = [
  {
    id: 'block_ip', label: 'Block IP Address',
    description: 'Add a firewall DROP rule for a specific IP.',
    preview: (a: Record<string,string>) =>
      `/ip/firewall/filter add chain=input src-address=${a.ip||'<IP>'} action=drop comment="Vortex-bulk"`,
    fields: [{ key: 'ip', label: 'IP / CIDR', placeholder: '1.2.3.4/32' }],
  },
  {
    id: 'set_dns', label: 'Update DNS Servers',
    description: 'Set primary and secondary DNS resolvers.',
    preview: (a: Record<string,string>) =>
      `/ip/dns set servers=${a.dns1||'8.8.8.8'},${a.dns2||'8.8.4.4'}`,
    fields: [
      { key: 'dns1', label: 'Primary DNS',   placeholder: '8.8.8.8' },
      { key: 'dns2', label: 'Secondary DNS', placeholder: '8.8.4.4' },
    ],
  },
  {
    id: 'set_ntp', label: 'Set NTP Server',
    description: 'Sync clock across selected routers.',
    preview: (a: Record<string,string>) =>
      `/system/ntp/client set enabled=yes servers=${a.ntp||'time.google.com'}`,
    fields: [{ key: 'ntp', label: 'NTP Server', placeholder: 'time.google.com' }],
  },
  {
    id: 'disable_ipv6', label: 'Disable IPv6',
    description: 'Disable IPv6 to reduce attack surface.',
    preview: () => `/system/package disable ipv6`,
    fields: [],
  },
];

type Stage = 'idle' | 'running' | 'done';
interface LogLine { id: string; router: string; ok: boolean; msg: string }

export default function BulkPushPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionId, setActionId] = useState(ACTIONS[0].id);
  const [args,     setArgs]     = useState<Record<string,string>>({});
  const [stage,    setStage]    = useState<Stage>('idle');
  const [log,      setLog]      = useState<LogLine[]>([]);

  const action  = ACTIONS.find(a => a.id === actionId)!;
  const online  = ALL_ROUTERS.filter(r => r.status === 'online');

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => prev.size === online.length ? new Set() : new Set(online.map(r => r.id)));
  }

  async function execute() {
    if (!selected.size) return;
    setStage('running'); setLog([]);
    for (const r of ALL_ROUTERS.filter(r => selected.has(r.id))) {
      await new Promise(res => setTimeout(res, 500 + Math.random() * 500));
      const ok = r.status === 'online' && Math.random() > 0.1;
      setLog(prev => [...prev, {
        id: r.id, router: r.name, ok,
        msg: ok ? `Applied: ${action.preview(args).slice(0, 55)}…` : 'Connection timeout',
      }]);
    }
    setStage('done');
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitMerge className="text-blue-400" size={24} /> Bulk Push
          </h1>
          <p className="text-white/40 mt-1 text-sm">Select routers, choose an action, preview and execute.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Left */}
          <div className="space-y-5">
            {/* Router list */}
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare size={14} className="text-blue-400" /> Select Routers
                </h2>
                <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  {selected.size === online.length ? 'Deselect all' : 'Select all online'}
                </button>
              </div>
              <ul className="divide-y divide-white/5">
                {ALL_ROUTERS.map(r => {
                  const isOnline  = r.status === 'online';
                  const isChecked = selected.has(r.id);
                  return (
                    <li
                      key={r.id}
                      onClick={() => isOnline && toggle(r.id)}
                      className={`flex items-center gap-4 px-5 py-3.5 transition-colors
                        ${isOnline ? 'cursor-pointer hover:bg-white/[0.03]' : 'opacity-40 cursor-not-allowed'}
                        ${isChecked ? 'bg-blue-500/[0.05]' : ''}`}
                    >
                      <input type="checkbox" checked={isChecked} readOnly disabled={!isOnline}
                        className="accent-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-[11px] text-white/30 font-mono">{r.model} · {r.id}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                        ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                   : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {r.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Action selector */}
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-white mb-4">Choose Action</h2>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ACTIONS.map(a => (
                  <button key={a.id} onClick={() => { setActionId(a.id); setArgs({}); }}
                    className={`text-left p-3 rounded-xl border text-sm transition-all
                      ${actionId === a.id
                        ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'}`}>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-[11px] opacity-60 mt-0.5 leading-tight">{a.description}</p>
                  </button>
                ))}
              </div>
              {action.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {action.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-[11px] text-white/40 mb-1 uppercase tracking-wider">{f.label}</label>
                      <input type="text" value={args[f.key] ?? ''} placeholder={f.placeholder}
                        onChange={e => setArgs(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                          focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all
                          placeholder:text-white/20 font-mono" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — preview + log */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Terminal size={13} className="text-blue-400" /> Command Preview
              </h2>
              <pre className="bg-black/60 border border-white/5 rounded-xl p-4 text-[11px] text-emerald-400
                font-mono whitespace-pre-wrap break-all leading-relaxed">
                {action.preview(args)}
              </pre>
              <p className="mt-3 text-[10px] text-white/30">
                Targets: <span className="text-white/60">{selected.size}</span> router{selected.size !== 1 ? 's' : ''}
                {selected.size === 0 && <span className="text-amber-400/70 ml-2">← select at least one</span>}
              </p>
              <button
                onClick={execute}
                disabled={!selected.size || stage === 'running'}
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl
                  transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {stage === 'running'
                  ? <><Loader2 size={16} className="animate-spin" /> Executing…</>
                  : stage === 'done'
                  ? <><CheckCircle size={16} /> Done — Run Again?</>
                  : <>Push to {selected.size || '?'} Router{selected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>

            <AnimatePresence>
              {log.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Execution Log</h2>
                    <button onClick={() => { setLog([]); setStage('idle'); }}
                      className="text-white/30 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <ul className="divide-y divide-white/5 font-mono text-xs max-h-60 overflow-y-auto">
                    {log.map((line, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className={`flex items-start gap-3 px-5 py-2.5
                          ${line.ok ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                        {line.ok
                          ? <CheckCircle size={11} className="shrink-0 mt-0.5 text-emerald-500" />
                          : <X size={11} className="shrink-0 mt-0.5 text-red-500" />}
                        <div>
                          <span className="text-white/30 mr-1.5">[{line.router}]</span>{line.msg}
                        </div>
                      </motion.li>
                    ))}
                    {stage === 'running' && (
                      <li className="flex items-center gap-3 px-5 py-2.5 text-blue-400/60">
                        <Loader2 size={11} className="animate-spin shrink-0" /> Processing…
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
