'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Zap, Router, Activity, Shield, Wifi, Gauge, Smartphone,
  Power, Camera, ChevronRight, Globe, Lock, TrendingUp,
  Server, ArrowLeft, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

// --- Mock Data ---
const ROUTERS = [
  { id: 'VX-7721', name: 'Main Office Gateway', model: 'RB5009UG+S+IN', status: 'online' as const, cpu: 14, rx: 450.5, tx: 120.2 },
  { id: 'VX-8832', name: 'Warehouse Node 1',    model: 'hAP ax3',        status: 'online' as const, cpu: 8,  rx: 85.2,  tx: 42.1  },
  { id: 'VX-9910', name: 'Guest Wi-Fi (East)',   model: 'cap ac',         status: 'offline' as const, cpu: 0, rx: 0,    tx: 0     },
];

const DEVICES = [
  { id: '1', mac: '00:1A:2B:3C:4D:5E', name: 'Living Room TV',  blocked: false },
  { id: '2', mac: 'AA:BB:CC:DD:EE:FF', name: "Kid's iPad",      blocked: true  },
  { id: '3', mac: '11:22:33:44:55:66', name: 'Kitchen Sonos',   blocked: false },
];

const TABS = ['Overview', 'Routers', 'Client Portal', 'Security'] as const;
type Tab = typeof TABS[number];

// --- Sub-components ---

function VUBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="glass-card p-5 flex gap-4 items-start">
      <div className="p-3 rounded-xl" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white mt-0.5">{value}</p>
        <p className="text-xs text-white/30 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// --- Tabs ---

function OverviewTab() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const cpu   = Math.round(14 + Math.sin(tick * 0.7) * 8);
  const rxMbps = +(450 + Math.sin(tick * 0.5) * 40).toFixed(1);
  const txMbps = +(120 + Math.cos(tick * 0.6) * 20).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Server size={20}/>} label="Total Routers"   value="3"          sub="2 online · 1 offline" color="#3b82f6"/>
        <StatCard icon={<Activity size={20}/>} label="Live RX"       value={`${rxMbps} Mbps`} sub="Main Gateway"   color="#10b981"/>
        <StatCard icon={<TrendingUp size={20}/>} label="Live TX"     value={`${txMbps} Mbps`} sub="Main Gateway"   color="#6366f1"/>
        <StatCard icon={<Globe size={20}/>} label="Tunnel Status"    value="Active"     sub="WireGuard · Encrypted" color="#f59e0b"/>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Activity size={16} className="text-blue-400"/> Live Traffic — Main Office Gateway
        </h3>
        <MiniChart rxMbps={rxMbps} txMbps={txMbps} tick={tick}/>
        <div className="flex gap-6 mt-3 text-xs text-white/40">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded"/>RX</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded"/>TX</span>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
          <Shield size={16} className="text-blue-400"/> CPU Load (live)
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-black text-white">{cpu}%</span>
          <div className="flex-1"><VUBar value={cpu} color={cpu > 70 ? '#ef4444' : '#3b82f6'}/></div>
        </div>
      </div>
    </div>
  );
}

function MiniChart({ rxMbps, txMbps, tick }: { rxMbps: number; txMbps: number; tick: number }) {
  const bars = 20;
  const rx = Array.from({ length: bars }, (_, i) =>
    Math.round(440 + Math.sin((tick - i) * 0.5) * 40)
  ).reverse();
  const tx = Array.from({ length: bars }, (_, i) =>
    Math.round(115 + Math.cos((tick - i) * 0.6) * 20)
  ).reverse();
  const maxV = 520;

  return (
    <div className="flex items-end gap-1 h-20">
      {rx.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col-reverse gap-px">
          <div className="bg-blue-500/70 rounded-sm transition-all duration-300"   style={{ height: `${(v / maxV) * 80}px` }}/>
          <div className="bg-emerald-500/70 rounded-sm transition-all duration-300" style={{ height: `${(tx[i] / maxV) * 80}px` }}/>
        </div>
      ))}
    </div>
  );
}

function RoutersTab() {
  const [snap, setSnap] = useState<string|null>(null);
  const doSnap = (id: string) => {
    setSnap(id);
    setTimeout(() => setSnap(null), 2000);
  };

  return (
    <div className="space-y-4">
      {ROUTERS.map(r => (
        <div key={r.id} className="glass-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-3 items-center">
              <div className={`p-2.5 rounded-xl ${r.status==='online'?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>
                <Router size={20}/>
              </div>
              <div>
                <p className="font-semibold text-white">{r.name}</p>
                <p className="text-xs text-white/40">{r.model} · {r.id}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
              r.status==='online' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${r.status==='online'?'bg-emerald-400 animate-pulse':'bg-red-400'}`}/>
              {r.status}
            </div>
          </div>

          {r.status === 'online' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1"><span>CPU</span><span>{r.cpu}%</span></div>
                <VUBar value={r.cpu} color={r.cpu > 70 ? '#ef4444' : '#3b82f6'}/>
              </div>
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1"><span>RX</span><span>{r.rx} Mbps</span></div>
                <VUBar value={(r.rx/1000)*100} color="#10b981"/>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
            <button
              onClick={() => doSnap(r.id)}
              disabled={r.status==='offline'}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white/60 hover:text-white transition-all"
            >
              {snap===r.id ? <CheckCircle size={14} className="text-emerald-400"/> : <Camera size={14}/>}
              {snap===r.id ? 'Saved!' : 'Snapshot'}
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-white/60 hover:text-white transition-all">
              <Wifi size={14}/> Wi-Fi
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-white/60 hover:text-white transition-all">
              <Shield size={14}/> Security
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientTab() {
  const [devices, setDevices] = useState(DEVICES);
  const [speed, setSpeed] = useState<null|number>(null);
  const [testing, setTesting] = useState(false);

  const toggle = (id: string) =>
    setDevices(d => d.map(x => x.id===id ? {...x, blocked: !x.blocked} : x));

  const runTest = () => {
    setTesting(true); setSpeed(null);
    setTimeout(() => { setSpeed(Math.round(80 + Math.random()*120)); setTesting(false); }, 2200);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center">
        <Gauge size={40} className="text-emerald-400 mx-auto mb-3"/>
        <h3 className="font-bold text-white text-lg mb-1">Speed Test</h3>
        <p className="text-white/40 text-sm mb-4">Test from router to ISP uplink</p>
        {speed && <p className="text-4xl font-black text-emerald-400 mb-3">{speed} Mbps</p>}
        <button
          onClick={runTest} disabled={testing}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-full transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-60 disabled:cursor-wait"
        >
          {testing ? 'Testing…' : 'Run Speed Test'}
        </button>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Smartphone size={16} className="text-purple-400"/> Connected Devices</h3>
        <div className="space-y-3">
          {devices.map(d => (
            <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${
              d.blocked ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'
            }`}>
              <div>
                <p className={`font-semibold text-sm ${d.blocked?'text-red-300':'text-white'}`}>{d.name}</p>
                <p className="text-xs text-white/30 font-mono">{d.mac}</p>
              </div>
              <button
                onClick={() => toggle(d.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  d.blocked
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <Power size={12}/> {d.blocked ? 'Unblock' : 'Pause'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const events = [
    { time: '17:42', msg: 'WireGuard tunnel VX-7721 re-keyed', ok: true  },
    { time: '17:30', msg: 'Config snapshot saved — VX-7721',   ok: true  },
    { time: '16:55', msg: 'VX-9910 went offline',               ok: false },
    { time: '15:00', msg: 'Firewall rule pushed to 2 routers',  ok: true  },
    { time: '14:22', msg: 'Firmware audit completed',           ok: true  },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 flex items-center gap-4 border-blue-500/20 bg-blue-500/5">
        <div className="p-3 bg-blue-500/10 rounded-xl"><Lock size={24} className="text-blue-400"/></div>
        <div>
          <p className="font-bold text-white">Zero-Exposure Active</p>
          <p className="text-sm text-white/40">All traffic via WireGuard · Public ports closed</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold border border-blue-500/20">SECURE</span>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity size={16} className="text-blue-400"/> Audit Log</h3>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <Clock size={12} className="text-white/20 shrink-0"/>
              <span className="text-xs text-white/30 font-mono w-10 shrink-0">{e.time}</span>
              {e.ok
                ? <CheckCircle size={14} className="text-emerald-400 shrink-0"/>
                : <AlertCircle size={14} className="text-red-400 shrink-0"/>
              }
              <span className="text-sm text-white/70">{e.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 bg-[#09090b]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Zap size={18} className="text-white fill-white"/>
          </div>
          <span className="text-lg font-black tracking-tighter">VORTEX</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-md border border-blue-500/20 tracking-widest uppercase">Demo</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={14}/> Dashboard
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-14 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full"/>
        </div>
        <p className="text-xs font-bold text-blue-400 uppercase tracking-[4px] mb-3">Interactive Demo</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white max-w-2xl mx-auto leading-tight">
          MikroTik Management,<br/>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Reimagined.</span>
        </h1>
        <p className="text-white/40 mt-4 max-w-lg mx-auto">
          Explore live-animated features — router monitoring, client portal, and zero-exposure security. All data is simulated.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {(['No login required','Live animated data','Full feature preview'] as const).map(t => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <CheckCircle size={12} className="text-emerald-400"/>{t}
            </span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 flex gap-1 border-b border-white/5 max-w-3xl mx-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold transition-all relative ${
              tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"/>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {tab === 'Overview'      && <OverviewTab/>}
        {tab === 'Routers'       && <RoutersTab/>}
        {tab === 'Client Portal' && <ClientTab/>}
        {tab === 'Security'      && <SecurityTab/>}
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="glass-card p-8 text-center border-blue-500/20 bg-blue-500/5">
          <h2 className="text-2xl font-black text-white mb-2">Ready to deploy Vortex?</h2>
          <p className="text-white/40 mb-6 text-sm">Connect your first MikroTik router in under 5 minutes.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30"
          >
            Open Dashboard <ChevronRight size={16}/>
          </Link>
        </div>
      </div>
    </div>
  );
}
