import { NextResponse } from 'next/server';
import { SITES, type PolicyRoute } from '@/lib/network';

/**
 * GET  /api/network/policies          → all policy routes
 * GET  /api/network/policies?site=…   → policies for one site
 *
 * PATCH /api/network/policies         → toggle or update a policy rule
 *   body: { id, enabled?, mode?, uplinkIds?, maxBandwidthMbps?, minBandwidthMbps? }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site');

  const all = SITES.flatMap(s =>
    s.policies.map(p => ({ ...p, siteName: s.name, siteCode: s.code })),
  );

  const policies = site ? all.filter(p => p.siteId === site) : all;

  return NextResponse.json({
    count: policies.length,
    enabled: policies.filter(p => p.enabled).length,
    totalHits: policies.reduce((s, p) => s + p.hitCount, 0),
    policies,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as Partial<PolicyRoute> & { id: string };

    if (!id) {
      return NextResponse.json({ error: 'Missing policy id' }, { status: 400 });
    }

    // Locate the owning site so we can validate the uplink references.
    const owner = SITES.find(s => s.policies.some(p => p.id === id));
    if (!owner) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    if (updates.uplinkIds) {
      const known = new Set(owner.uplinks.map(u => u.id));
      const invalid = updates.uplinkIds.filter(u => !known.has(u));
      if (invalid.length) {
        return NextResponse.json(
          { error: `Unknown uplink(s) for site ${owner.code}: ${invalid.join(', ')}` },
          { status: 400 },
        );
      }
    }

    if (updates.mode && !['primary', 'backup', 'load-balance', 'failover'].includes(updates.mode)) {
      return NextResponse.json({ error: `Invalid mode: ${updates.mode}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      id,
      updates,
      // In a live deployment this would write to `policy_routes` and push the
      // matching `/routing/rule` + `/ip/route` commands to the site edge.
      appliedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
