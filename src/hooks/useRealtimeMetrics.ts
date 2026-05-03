'use client';

import { useEffect, useState } from 'react';
import { supabase, isDemoMode } from '@/lib/supabase';

export interface TelemetryData {
  router_id: string;
  cpu_load: number;
  tx_bps: number;
  rx_bps: number;
  ram_usage: number;
  timestamp: string;
}

export const useRealtimeMetrics = (routerId?: string) => {
  const [metrics, setMetrics] = useState<TelemetryData | null>(null);

  useEffect(() => {
    if (!routerId) return;

    if (isDemoMode) {
      // Demo Mode: Generate random fluctuations every 2 seconds
      const interval = setInterval(() => {
        setMetrics({
          router_id: routerId,
          cpu_load: Math.floor(Math.random() * 40) + 10, // 10% - 50%
          tx_bps: Math.floor(Math.random() * 500000000) + 50000000, // 50Mbps - 550Mbps
          rx_bps: Math.floor(Math.random() * 800000000) + 100000000, // 100Mbps - 900Mbps
          ram_usage: Math.floor(Math.random() * 1024 * 1024 * 500),
          timestamp: new Date().toISOString(),
        });
      }, 2000);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel(`telemetry:${routerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_metrics',
          filter: `router_id=eq.${routerId}`,
        },
        (payload) => {
          setMetrics(payload.new as TelemetryData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routerId]);

  return metrics;
};
