'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Globe2, Radio, Network, ArrowRight, ShieldCheck, Users, TrendingUp,
} from 'lucide-react';
import {
  SITES, OVERLAYS, allUplinks, totalContractedMbps, totalCurrentMbps,
  totalSubscribers, SITE_ROLE_META,
} from '@/lib/network';

/**
 * Compact WAN rollup strip shown at the top of the operations dashboard.
 * Gives an operator fleet-level WAN context without leaving the device view.
 */
export function WanSummaryStrip() {
  const contracted = totalContractedMbps();
  const current = totalCurrentMbps();
  const uplinks = allUplinks();
  const active = uplinks.filter(u => u.state === 'active').length;
  const degraded = SITES.filter(s => s.status === 'degraded').length;

  const cells = [
    {
      icon: Globe2,
      color: '#3b82f6',
      label: 'Sites',
      value: String(SITES.length),
      sub: `${SITES.length - degraded} online · ${degraded} degraded`,
    },
    {
      icon: Network,
      color: '#8b5cf6',
      label: 'Contracted',
      value: `${(contracted / 1000).toFixed(1)} Gbps`,
      sub: `${current.toLocaleString()} Mbps utilised`,
    },
    {
      icon: Radio,
      color: '#10b981',
      label: 'Circuits',
      value: String(uplinks.length),
      sub: `${active} active · ${uplinks.length - active} standby/down`,
    },
    {
      icon: ShieldCheck,
      color: '#a855f7',
      label: 'Overlay',
      value: `${OVERLAYS.length}`,
      sub: `${OVERLAYS.reduce((s, o) => s + o.memberSiteIds.length, 0)} mesh members`,
    },
    {
      icon: Users,
      color: '#f59e0b',
      label: 'Subscribers',
      value: totalSubscribers().toLocaleString(),
      sub: 'across all sites',
    },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white/70 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" /> Wide Area Network
        </h2>
        <Link
          href="/network"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Open WAN console <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {cells.map(({ icon: Icon, color, label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href="/network"
              className="glass-card p-3 sm:p-4 flex items-start gap-2 sm:gap-3 hover:border-white/20 transition-all h-full"
            >
              <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}22` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-white/35 uppercase tracking-widest">{label}</p>
                <p className="text-base font-black text-white mt-0.5 truncate">{value}</p>
                <p className="text-[10px] text-white/30 truncate">{sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Site pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SITES.map(site => {
          const role = SITE_ROLE_META[site.role];
          return (
            <Link
              key={site.id}
              href={`/sites/${site.id}`}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                site.status === 'online'
                  ? 'bg-emerald-500/[0.07] border-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/15'
                  : 'bg-amber-500/[0.07] border-amber-500/15 text-amber-400/80 hover:bg-amber-500/15'
              }`}
              title={`${site.name} — ${role.label}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  site.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {site.code}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
