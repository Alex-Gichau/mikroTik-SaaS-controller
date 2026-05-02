'use client';

import { motion } from 'framer-motion';
import { Router, Activity, Shield, Wifi } from 'lucide-react';
import { VUMeter } from './VUMeter';

interface RouterCardProps {
  router: {
    id: string;
    name: string;
    model: string;
    status: 'online' | 'offline';
    cpuUsage: number;
    trafficRx: number; // in Mbps
    trafficTx: number; // in Mbps
    lastSeen: string;
  };
}

export const RouterCard = ({ router }: RouterCardProps) => {
  const isOnline = router.status === 'online';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 bg-zinc-900 rounded-2xl border border-white/5 hover:border-white/20 transition-colors shadow-2xl"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4 items-center">
          <div className={`p-3 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            <Router size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{router.name}</h3>
            <p className="text-xs text-white/40">{router.model} • {router.id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {router.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <VUMeter value={router.cpuUsage} label="CPU Load" color="#ef4444" />
        <VUMeter value={(router.trafficRx / 1000) * 100} label="RX Traffic" unit="Gbps" color="#3b82f6" />
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-xs text-white/30">
        <div className="flex items-center gap-1">
          <Activity size={12} />
          <span>Last Seen: {router.lastSeen}</span>
        </div>
        <div className="flex gap-3">
          <Shield size={16} className="hover:text-white cursor-pointer transition-colors" />
          <Wifi size={16} className="hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};
