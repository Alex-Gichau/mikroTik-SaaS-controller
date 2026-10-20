import { NextResponse } from 'next/server';
import { SITES, OVERLAYS, getSite } from '@/lib/network';

/**
 * GET /api/network/overlay            → all overlays with their peers
 * GET /api/network/overlay?site=…     → overlays a given site participates in
 *
 * POST /api/network/overlay           → request a failover switch between
 *                                       WAN uplinks at a site.
 *   body: { siteId, uplinkId }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site');

  const site = siteId ? getSite(siteId) : undefined;
  if (siteId && !site) {
    return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 404 });
  }

  const overlays = OVERLAYS.map(o => ({
    ...o,
    hub: SITES.find(s => s.id === o.hubSiteId)?.name ?? null,
    members: o.memberSiteIds
      .map(id => SITES.find(s => s.id === id))
      .filter(Boolean)
      .map(s => ({
        id: s!.id,
        name: s!.name,
        code: s!.code,
        status: s!.status,
        role: s!.role,
        tunnelIp: s!.devices[0]?.tunnelIp ?? null,
        peer: s!.overlayPeers.find(p => p.siteId === o.hubSiteId) ?? null,
      })),
  }));

  return NextResponse.json({
    overlays,
    ...(site
      ? {
          site: {
            id: site.id,
            code: site.code,
            uplinks: site.uplinks.map(u => ({
              id: u.id,
              name: u.name,
              type: u.type,
              state: u.state,
              priority: u.priority,
              downMbps: u.downMbps,
              latencyMs: u.latencyMs,
            })),
            peers: site.overlayPeers,
          },
        }
      : {}),
  });
}

export async function POST(request: Request) {
  try {
    const { siteId, uplinkId } = await request.json();

    if (!siteId || !uplinkId) {
      return NextResponse.json({ error: 'Missing siteId or uplinkId' }, { status: 400 });
    }

    const site = getSite(siteId);
    if (!site) {
      return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 404 });
    }

    const uplink = site.uplinks.find(u => u.id === uplinkId);
    if (!uplink) {
      return NextResponse.json({ error: `Uplink not found: ${uplinkId}` }, { status: 404 });
    }

    if (uplink.state === 'down') {
      return NextResponse.json(
        { error: `Circuit ${uplink.name} is down and cannot carry traffic` },
        { status: 409 },
      );
    }

    // The circuit carrying traffic today is whichever one is currently active.
    const currentPrimary = site.uplinks.find(u => u.state === 'active') ?? null;

    if (currentPrimary?.id === uplink.id) {
      return NextResponse.json({
        success: true,
        site: site.code,
        previousPrimary: currentPrimary.name,
        newPrimary: uplink.name,
        requested: uplink.name,
        changed: false,
        message: `${uplink.name} is already carrying traffic.`,
        switchedAt: new Date().toISOString(),
      });
    }

    // The requested circuit becomes the new primary; everything else that is
    // healthy drops to standby, so the response mirrors what the SD-WAN
    // engine would commit on the site edge.
    const demoted = site.uplinks
      .filter(u => u.state !== 'down' && u.id !== uplink.id)
      .map(u => u.name);

    return NextResponse.json({
      success: true,
      site: site.code,
      previousPrimary: currentPrimary?.name ?? null,
      newPrimary: uplink.name,
      requested: uplink.name,
      demotedToStandby: demoted,
      changed: true,
      // In a live deployment this would rewrite `/ip/route` distance values and
      // the `/routing/rule` preference on the site edge, then audit-log it.
      switchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
