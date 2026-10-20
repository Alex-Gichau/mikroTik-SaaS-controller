import { NextResponse } from 'next/server';
import {
  HOTSPOTS, HOTSPOT_PROFILES, VOUCHERS, allHotspotClients,
  hotspotTotals, voucherTotals, getHotspot, getHotspotProfile,
  routerOsHotspotCommands, VOUCHER_PACKAGE_META,
  type VoucherPackage,
} from '@/lib/hotspot';
import { getSite } from '@/lib/network';
import { hashSeed } from '@/lib/prng';

/**
 * GET /api/network/hotspots
 *
 *   ?site=<siteId>     → hotspots at one site
 *   ?id=<hotspotId>    → one hotspot with its live client list
 *   ?clients=1         → the flattened fleet-wide client list
 *   ?profiles=1        → the reusable hotspot profiles
 *   ?vouchers=1        → prepaid voucher inventory
 *
 * POST /api/network/hotspots
 *   body: { action: 'push-profile' | 'restart' | 'create-voucher', ... }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site');
  const id = searchParams.get('id');

  if (siteId) {
    const site = getSite(siteId);
    if (!site) {
      return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 404 });
    }
  }

  if (id) {
    const hotspot = getHotspot(id);
    if (!hotspot) {
      return NextResponse.json({ error: `Hotspot not found: ${id}` }, { status: 404 });
    }
    return NextResponse.json({
      hotspot,
      profile: getHotspotProfile(hotspot.profileId) ?? null,
      commands: routerOsHotspotCommands(hotspot),
    });
  }

  if (searchParams.get('clients')) {
    return NextResponse.json({
      clients: allHotspotClients(),
      totals: hotspotTotals(),
    });
  }

  if (searchParams.get('profiles')) {
    return NextResponse.json({
      profiles: HOTSPOT_PROFILES.map(p => ({
        ...p,
        deployedCount: HOTSPOTS.filter(h => h.profileId === p.id).length,
        clientCount: HOTSPOTS.filter(h => h.profileId === p.id)
          .reduce((s, h) => s + h.activeClients, 0),
      })),
    });
  }

  if (searchParams.get('vouchers')) {
    return NextResponse.json({ vouchers: VOUCHERS, totals: voucherTotals() });
  }

  const hotspots = siteId ? HOTSPOTS.filter(h => h.siteId === siteId) : HOTSPOTS;

  return NextResponse.json({
    hotspots: hotspots.map(h => ({
      ...h,
      clientCount: h.clients.length,
    })),
    totals: hotspotTotals(),
  });
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    hotspotId?: string;
    profileId?: string;
    package?: string;
    quantity?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = body;

  switch (action) {
    case 'push-profile': {
      const { hotspotId, profileId } = body;
      if (!hotspotId || !profileId) {
        return NextResponse.json(
          { error: 'Missing hotspotId or profileId' },
          { status: 400 },
        );
      }
      const hotspot = getHotspot(hotspotId);
      if (!hotspot) {
        return NextResponse.json({ error: `Hotspot not found: ${hotspotId}` }, { status: 404 });
      }
      const profile = getHotspotProfile(profileId);
      if (!profile) {
        return NextResponse.json({ error: `Profile not found: ${profileId}` }, { status: 404 });
      }
      if (hotspot.status === 'offline') {
        return NextResponse.json(
          { error: `${hotspot.apName} is offline and cannot accept configuration` },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        hotspot: hotspot.apName,
        profile: profile.name,
        changed: hotspot.profileId !== profileId,
        commands: routerOsHotspotCommands({ ...hotspot, profileId }),
        pushedAt: new Date().toISOString(),
      });
    }

    case 'restart': {
      const { hotspotId } = body;
      if (!hotspotId) {
        return NextResponse.json({ error: 'Missing hotspotId' }, { status: 400 });
      }
      const hotspot = getHotspot(hotspotId);
      if (!hotspot) {
        return NextResponse.json({ error: `Hotspot not found: ${hotspotId}` }, { status: 404 });
      }
      if (hotspot.status === 'offline') {
        return NextResponse.json(
          { error: `${hotspot.apName} is offline` },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        hotspot: hotspot.apName,
        message: 'Wireless interface scheduled for restart',
        commands: [
          `/interface wireless set [find name=${hotspot.apName}] disabled=no`,
          `/system scheduler add name=vortex-wifi-restart interval=5m on-event="/interface wireless refresh"`,
        ],
        restartedAt: new Date().toISOString(),
      });
    }

    case 'create-voucher': {
      const { package: pkg, quantity } = body;
      if (!pkg) {
        return NextResponse.json({ error: 'Missing package' }, { status: 400 });
      }
      const count = Math.min(Math.max(Number(quantity) || 1, 1), 100);

      // Codes are derived from a stable hash of the request so a retried
      // call returns the same batch instead of a different one.
      const batch = hashSeed(`${pkg}:${count}:${VOUCHERS.length}`);
      const meta = VOUCHER_PACKAGE_META[pkg as VoucherPackage];
      if (!meta) {
        return NextResponse.json({ error: `Unknown package: ${pkg}` }, { status: 400 });
      }

      const templates = Array.from({ length: Math.min(count, 5) }, (_, i) => {
        const h = hashSeed(`${pkg}-${batch}-${i}`);
        const block = (n: number) => n.toString(16).padStart(4, '0').toUpperCase();
        return {
          code: `VX-${block(h % 0xffff)}-`,
          package: pkg,
          valueUsd: meta.priceUsd,
        };
      });

      return NextResponse.json({
        success: true,
        created: count,
        package: pkg,
        valueUsd: meta.priceUsd,
        templates,
        createdAt: new Date().toISOString(),
      });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action ?? '(none)'}` },
        { status: 400 },
      );
  }
}
