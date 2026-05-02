'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
