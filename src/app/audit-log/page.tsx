'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, CheckCircle, AlertCircle, Camera,
  Flame, Wifi, GitMerge, RefreshCw, Filter,
} from 'lucide-react';
import { AppShell } from '@/components/ui/AppShell';

// ── Mock audit events ───────────────────────────────────────────────────────
const ACTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  snapshot_created:    { icon: Camera,    color: 'text-blue-400',    label: 'Snapshot'          },
  firewall_rule_pushed:{ icon: Flame,     color: 'text-orange-400',  label: 'Firewall'          },
  firmware_updated:    { icon: RefreshCw, color: 'text-emerald-400', label: 'Firmware Update'   },
  device_blocked:      { icon: Wifi,      color: 'text-red-400',     label: 'Device Blocked'    },
  bulk_push:           { icon: GitMerge,  color: 'text-purple-400',  label: 'Bulk Push'         },
  wifi_changed:        { icon: Wifi,      color: 'text-sky-400',     label: 'Wi-Fi Changed'     },
};

const RAW_EVENTS = [
  { id:'1',  action:'snapshot_created',     router:'Main Office Gateway', user:'alex@acme.com',  ok:true,  ts:'2026-05-04T08:45:00Z', detail:'Snapshot snap-001 created'                },
  { id:'2',  action:'firewall_rule_pushed',  router:'Main Office Gateway', user:'alex@acme.com',  ok:true,  ts:'2026-05-04T08:20:00Z', detail:'DROP rule added for 185.220.0.0/16'        },
  { id:'3',  action:'bulk_push',            router:'3 routers',           user:'admin@acme.com', ok:true,  ts:'2026-05-04T07:55:00Z', detail:'DNS updated → 8.8.8.8, 1.1.1.1'           },
  { id:'4',  action:'firmware_updated',     router:'Tower AP — Ngong',    user:'admin@acme.com', ok:true,  ts:'2026-05-04T07:30:00Z', detail:'7.13.5 → 7.14.3'                          },
  { id:'5',  action:'device_blocked',       router:'Main Office Gateway', user:'alex@acme.com',  ok:true,  ts:'2026-05-04T06:10:00Z', detail:"MAC AA:BB:CC:DD:EE:FF — Kid's iPad"        },
  { id:'6',  action:'wifi_changed',         router:'Warehouse Node 1',    user:'ops@acme.com',   ok:true,  ts:'2026-05-03T22:15:00Z', detail:'SSID changed to Warehouse_5G_Secure'       },
  { id:'7',  action:'snapshot_created',     router:'Branch Office — Msa', user:'ops@acme.com',   ok:true,  ts:'2026-05-03T20:00:00Z', detail:'Snapshot snap-002 created'                },
  { id:'8',  action:'firewall_rule_pushed',  router:'Guest Wi-Fi (East)',  user:'alex@acme.com',  ok:false, ts:'2026-05-03T18:30:00Z', detail:'Failed — router offline'                   },
  { id:'9',  action:'bulk_push',            router:'5 routers',           user:'admin@acme.com', ok:true,  ts:'2026-05-03T16:00:00Z', detail:'NTP set → time.google.com'                 },
  { id:'10', action:'firmware_updated',     router:'Branch Office — Msa', user:'admin@acme.com', ok:false, ts:'2026-05-03T14:20:00Z', detail:'Failed — insufficient storage'             },
  { id:'11', action:'snapshot_created',     router:'Main Office Gateway', user:'alex@acme.com',  ok:true,  ts:'2026-05-03T12:00:00Z', detail:'Snapshot snap-003 created'                },
  { id:'12', action:'device_blocked',       router:'Warehouse Node 1',    user:'ops@acme.com',   ok:true,  ts:'2026-05-03T09:45:00Z', detail:'MAC 11:22:33:44:55:66 — Unknown Device'    },
];

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_TYPES = ['all', ...Array.from(new Set(RAW_EVENTS.map(e => e.action)))];

// ── Page ───────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [filter, setFilter]   = useState<string>('all');
  const [showOk, setShowOk]   = useState<'all' | 'ok' | 'fail'>('all');
  const [page,   setPage]     = useState(0);
  const PER_PAGE = 8;

  const filtered = RAW_EVENTS.filter(e =>
    (filter  === 'all' || e.action === filter) &&
    (showOk  === 'all' || (showOk === 'ok' ? e.ok : !e.ok))
  );

  const pages    = Math.ceil(filtered.length / PER_PAGE);
  const visible  = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const totals = {
    ok:   RAW_EVENTS.filter(e => e.ok).length,
    fail: RAW_EVENTS.filter(e => !e.ok).length,
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-blue-400" size={24} /> Audit Log
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Every write action is logged here — immutable record of all changes.
          </p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Events', value: RAW_EVENTS.length, color: 'text-white',        icon: Activity    },
            { label: 'Successful',   value: totals.ok,          color: 'text-emerald-400', icon: CheckCircle },
            { label: 'Failed',       value: totals.fail,        color: 'text-red-400',      icon: AlertCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass-card p-5 flex items-center gap-4">
              <div className="p-2.5 bg-white/5 rounded-xl">
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {(['all', 'ok', 'fail'] as const).map(v => (
              <button key={v} onClick={() => { setShowOk(v); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  showOk === v
                    ? v === 'ok'   ? 'bg-emerald-500/20 text-emerald-400'
                    : v === 'fail' ? 'bg-red-500/20 text-red-400'
                    :                'bg-white/10 text-white'
                    : 'text-white/30 hover:text-white'
                }`}>
                {v === 'all' ? 'All' : v === 'ok' ? '✓ Success' : '✗ Failed'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Filter size={12} className="text-white/30" />
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(0); }}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              {ACTION_TYPES.map(t => (
                <option key={t} value={t} className="bg-zinc-900">
                  {t === 'all' ? 'All actions' : ACTION_META[t]?.label ?? t}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-xs text-white/30 self-center">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Time</th>
                <th className="px-5 py-3 text-left">Action</th>
                <th className="px-5 py-3 text-left">Router</th>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Detail</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((event, i) => {
                const meta = ACTION_META[event.action] ?? { icon: Activity, color: 'text-white/40', label: event.action };
                const Icon = meta.icon;
                return (
                  <motion.tr
                    key={event.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-white/30 font-mono whitespace-nowrap">
                      {fmtTs(event.ts)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}>
                        <Icon size={12} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/60">{event.router}</td>
                    <td className="px-5 py-3 text-xs text-white/40 font-mono">{event.user}</td>
                    <td className="px-5 py-3 text-xs text-white/50 max-w-[200px] truncate">{event.detail}</td>
                    <td className="px-5 py-3">
                      {event.ok
                        ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle size={11} /> OK
                          </span>
                        : <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                            <AlertCircle size={11} /> Failed
                          </span>
                      }
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="py-12 text-center text-white/30 text-sm">No events match the current filter.</div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                  page === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
