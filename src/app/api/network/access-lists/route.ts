import { NextResponse } from 'next/server';
import {
  allAccessLists, getAccessList, accessListsForSite,
  aclTotals, routerOsAclCommands, validateCidr, isHostAddress,
  type AclKind, type AclScope,
} from '@/lib/hotspot';
import { getSite } from '@/lib/network';

/**
 * GET /api/network/access-lists
 *
 *   ?site=<siteId>      → lists at one site
 *   ?id=<listId>        → one list with its entries
 *   ?kind=whitelist|blacklist
 *
 * POST /api/network/access-lists
 *   body: { listId, cidr, comment }   → add an entry
 *
 * PATCH /api/network/access-lists
 *   body: { listId, enabled }          → enable / disable a list
 *
 * DELETE /api/network/access-lists
 *   body: { listId, entryId }          → remove an entry
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site');
  const id = searchParams.get('id');
  const kind = searchParams.get('kind') as AclKind | null;

  if (siteId) {
    const site = getSite(siteId);
    if (!site) {
      return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 404 });
    }
  }

  if (id) {
    const list = getAccessList(id);
    if (!list) {
      return NextResponse.json({ error: `Access list not found: ${id}` }, { status: 404 });
    }
    return NextResponse.json({
      list,
      commands: routerOsAclCommands(list),
    });
  }

  let lists = siteId ? accessListsForSite(siteId) : allAccessLists();
  if (kind === 'whitelist' || kind === 'blacklist') {
    lists = lists.filter(l => l.kind === kind);
  }

  return NextResponse.json({
    lists: lists.map(l => ({
      ...l,
      entryCount: l.entries.length,
      hostCount: l.entries.filter(e => isHostAddress(e.cidr)).length,
      rangeCount: l.entries.filter(e => !isHostAddress(e.cidr)).length,
    })),
    totals: aclTotals(),
  });
}

export async function POST(request: Request) {
  let body: { listId?: string; cidr?: string; comment?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { listId, cidr, comment } = body;

  if (!listId || !cidr) {
    return NextResponse.json(
      { error: 'Missing listId or cidr' },
      { status: 400 },
    );
  }

  const list = getAccessList(listId);
  if (!list) {
    return NextResponse.json({ error: `Access list not found: ${listId}` }, { status: 404 });
  }

  const validation = validateCidr(cidr);
  if (!validation.ok || !validation.cidr) {
    return NextResponse.json(
      { error: validation.error ?? 'Invalid address' },
      { status: 400 },
    );
  }

  const duplicate = list.entries.find(e => e.cidr === validation.cidr);
  if (duplicate) {
    return NextResponse.json(
      { error: `${validation.cidr} is already in ${list.name}` },
      { status: 409 },
    );
  }

  const action = list.kind === 'whitelist' ? 'accept' : 'drop';
  const chain = list.scope === 'hotspot' ? 'hotspot' : list.scope;

  return NextResponse.json({
    success: true,
    list: list.name,
    site: list.siteCode,
    kind: list.kind,
    entry: {
      cidr: validation.cidr,
      comment: comment?.trim() || 'Added from console',
      status: 'active',
      hitCount: 0,
    },
    command:
      list.scope === 'hotspot'
        ? list.kind === 'whitelist'
          ? `/ip/hotspot/allowed-address add address=${validation.cidr}`
          : `/ip/hotspot/ip-binding add address=${validation.cidr} type=blocked`
        : `/ip/firewall/filter add chain=${chain} src-address=${validation.cidr} action=${action} place-before=0`,
    addedAt: new Date().toISOString(),
  });
}

export async function PATCH(request: Request) {
  let body: { listId?: string; enabled?: boolean; scope?: AclScope };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { listId } = body;
  if (!listId) {
    return NextResponse.json({ error: 'Missing listId' }, { status: 400 });
  }

  const list = getAccessList(listId);
  if (!list) {
    return NextResponse.json({ error: `Access list not found: ${listId}` }, { status: 404 });
  }

  if (typeof body.enabled === 'boolean') {
    return NextResponse.json({
      success: true,
      list: list.name,
      enabled: body.enabled,
      message: body.enabled
        ? `${list.name} armed — rules pushed to the site edge`
        : `${list.name} disarmed — rules withdrawn`,
      commands: body.enabled ? routerOsAclCommands(list) : [],
      syncedAt: new Date().toISOString(),
    });
  }

  if (body.scope) {
    if (!['forward', 'input', 'hotspot'].includes(body.scope)) {
      return NextResponse.json({ error: `Invalid scope: ${body.scope}` }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      list: list.name,
      scope: body.scope,
      commands: routerOsAclCommands({ ...list, scope: body.scope }),
      syncedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { error: 'Nothing to update — provide enabled or scope' },
    { status: 400 },
  );
}

export async function DELETE(request: Request) {
  let body: { listId?: string; entryId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { listId, entryId } = body;
  if (!listId || !entryId) {
    return NextResponse.json(
      { error: 'Missing listId or entryId' },
      { status: 400 },
    );
  }

  const list = getAccessList(listId);
  if (!list) {
    return NextResponse.json({ error: `Access list not found: ${listId}` }, { status: 404 });
  }

  const entry = list.entries.find(e => e.id === entryId);
  if (!entry) {
    return NextResponse.json(
      { error: `Entry not found: ${entryId}` },
      { status: 404 },
    );
  }

  const action = list.kind === 'whitelist' ? 'accept' : 'drop';

  return NextResponse.json({
    success: true,
    list: list.name,
    removed: entry.cidr,
    command:
      list.scope === 'hotspot'
        ? list.kind === 'whitelist'
          ? `/ip/hotspot/allowed-address remove [find address=${entry.cidr}]`
          : `/ip/hotspot/ip-binding remove [find address=${entry.cidr}]`
        : `/ip/firewall/filter remove [find src-address=${entry.cidr} comment="vortex-acl:${list.kind}:${list.name}"]`,
    action,
    removedAt: new Date().toISOString(),
  });
}
