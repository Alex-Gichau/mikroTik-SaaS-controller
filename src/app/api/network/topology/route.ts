import { NextResponse } from 'next/server';
import {
  SITES, OVERLAYS, allUplinks, totalContractedMbps, totalCurrentMbps,
  totalSubscribers, capacityBuckets,
} from '@/lib/network';

/**
 * GET /api/network/topology
 *
 * Returns the full WAN picture: sites with their devices, uplinks, subnets
 * and policies, plus overlay membership and fleet-level rollups.
 */
export async function GET() {
  const contracted = totalContractedMbps();
  const current = totalCurrentMbps();

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      sites: SITES.length,
      uplinks: allUplinks().length,
      contractedMbps: contracted,
      currentMbps: current,
      utilizationPct: contracted ? Number(((current / contracted) * 100).toFixed(1)) : 0,
      subscribers: totalSubscribers(),
      capacity: capacityBuckets(),
      health: {
        online: SITES.filter(s => s.status === 'online').length,
        degraded: SITES.filter(s => s.status === 'degraded').length,
        offline: SITES.filter(s => s.status === 'offline').length,
      },
    },
    overlays: OVERLAYS,
    sites: SITES.map(site => ({
      id: site.id,
      name: site.name,
      code: site.code,
      role: site.role,
      status: site.status,
      region: site.region,
      city: site.city,
      country: site.country,
      lat: site.lat,
      lon: site.lon,
      subscribers: site.subscribers,
      contractedMbps: site.contractedMbps,
      currentMbps: site.currentMbps,
      transitFor: site.transitFor,
      uplinks: site.uplinks,
      subnets: site.subnets,
      policies: site.policies,
      overlayPeers: site.overlayPeers,
      devices: site.devices,
    })),
  });
}
