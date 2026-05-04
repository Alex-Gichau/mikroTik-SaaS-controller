import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routerId } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') ?? '24');

    const since = new Date(Date.now() - hours * 3_600_000).toISOString();

    const { data, error } = await supabase
      .from('telemetry_metrics')
      .select('timestamp, tx_bps, rx_bps, cpu_load, ram_usage')
      .eq('router_id', routerId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ metrics: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
