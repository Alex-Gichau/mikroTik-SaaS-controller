import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MikroTikService } from '@/lib/mikrotik';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const routerId = params.id;

    // 1. Get router details
    const { data: router, error: routerError } = await supabase
      .from('routers')
      .select('*')
      .eq('id', routerId)
      .single();

    if (routerError || !router) {
      return NextResponse.json({ error: 'Router not found' }, { status: 404 });
    }

    // 2. Connect to Router and get config
    // In a real scenario, decrypt password from router.credentials_encrypted
    const mk = new MikroTikService({
      host: router.tunnel_ip,
      user: 'admin',
      password: '', 
    });

    const configData = await mk.getConfiguration();

    // 3. Save snapshot to Supabase
    const { data: snapshot, error: snapshotError } = await supabase
      .from('config_snapshots')
      .insert([
        {
          router_id: routerId,
          config_blob: configData,
        }
      ])
      .select()
      .single();

    if (snapshotError) throw snapshotError;

    // 4. Log Audit Action
    await supabase.from('system_audits').insert([{
      org_id: router.org_id,
      action: 'snapshot_created',
      details: { router_id: routerId, snapshot_id: snapshot.id }
    }]);

    return NextResponse.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Snapshot error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const routerId = params.id;
    const { data: snapshots, error } = await supabase
      .from('config_snapshots')
      .select('id, created_at')
      .eq('router_id', routerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
