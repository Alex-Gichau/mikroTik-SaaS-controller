import pLimit from 'p-limit';
import { supabase } from './supabase';
import { MikroTikService } from './mikrotik';

// Concurrent limit for polling (as per spec Step 2)
const limit = pLimit(10); 

export async function pollRouters() {
  // 1. Fetch all online routers
  const { data: routers, error } = await supabase
    .from('routers')
    .select('*')
    .eq('status', 'online');

  if (error) {
    console.error('Error fetching routers:', error);
    return;
  }

  console.log(`Polling ${routers.length} routers...`);

  // 2. Poll metrics concurrently
  const tasks = routers.map((router: any) => {
    return limit(async () => {
      try {
        const mk = new MikroTikService({
          host: router.tunnel_ip,
          user: 'admin', // Should be scoped credentials from encrypted storage
          password: '', // Decrypt from router.credentials_encrypted
        });

        const resources = await mk.getSystemResources();
        const traffic = await mk.getTrafficStats('ether1');

        // 3. Log metrics to Supabase
        await supabase.from('telemetry_metrics').insert({
          router_id: router.id,
          cpu_load: parseInt(resources['cpu-load']),
          ram_usage: parseInt(resources['free-memory']),
          tx_bps: traffic[0]['tx-bits-per-second'],
          rx_bps: traffic[0]['rx-bits-per-second'],
        });

        console.log(`Successfully polled ${router.name}`);
      } catch (err) {
        console.error(`Failed to poll router ${router.name}:`, err);
      }
    });
  });

  await Promise.all(tasks);
}

// If run directly
if (require.main === module) {
  pollRouters()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
