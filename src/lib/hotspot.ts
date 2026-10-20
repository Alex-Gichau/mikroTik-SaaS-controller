/**
 * Vortex Hotspot & Access-Control domain model.
 *
 * Extends the WAN model in `network.ts` with two operator-grade features
 * that every WISP / ISP console needs (Omada and UniFi both ship them):
 *
 *   1. Hotspot access-point management
 *        HotspotProfile  — a reusable SSID template (security, captive
 *                          portal, walled garden, rate limits)
 *        Hotspot         — a profile bound to a real AP device, with the
 *                          live client list attached to it
 *        HotspotClient   — a currently associated station
 *        Voucher         — a prepaid access code sold at the counter
 *
 *   2. IP allow / deny lists
 *        AccessList      — a named whitelist or blacklist bound to a site
 *        AclEntry        — one address (single host or CIDR) inside a list
 *
 * Everything is generated deterministically from the shared PRNG so the
 * server render and the client hydration produce byte-identical markup
 * (React hydration error #418 otherwise).
 */

import { SITES, type Site } from './network';
import { rngFor, hashSeed, randInt, randFloat } from './prng';

// ── Enums / unions ──────────────────────────────────────────────────────────

export type HotspotBand = '2.4ghz' | '5ghz' | 'both';

export type HotspotSecurity =
  | 'wpa2-psk'
  | 'wpa3'
  | 'wpa3-transition'
  | 'open';

export type HotspotAuth = 'portal' | 'voucher' | 'psk' | 'open';

export type HotspotStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

export type VoucherPackage = '1h' | '6h' | '12h' | '1d' | '3d' | '7d' | '30d';

export type VoucherStatus = 'unused' | 'active' | 'expired' | 'disabled';

export type AclKind = 'whitelist' | 'blacklist';

export type AclScope = 'forward' | 'input' | 'hotspot';

export const HOTSPOT_AUTH_META: Record<
  HotspotAuth,
  { label: string; color: string; bg: string; border: string }
> = {
  portal:  { label: 'Captive Portal', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  voucher: { label: 'Voucher',        color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  psk:     { label: 'Pre-shared Key', color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  open:    { label: 'Open',           color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
};

export const HOTSPOT_SECURITY_META: Record<
  HotspotSecurity,
  { label: string; color: string; bg: string; border: string }
> = {
  'wpa2-psk':       { label: 'WPA2-PSK',      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  wpa3:             { label: 'WPA3',          color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  'wpa3-transition':{ label: 'WPA3 Mixed',    color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/20'   },
  open:             { label: 'Open',          color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
};

export const ACL_KIND_META: Record<
  AclKind,
  { label: string; color: string; bg: string; border: string; icon: 'shield' | 'ban' }
> = {
  whitelist: { label: 'Whitelist', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'shield' },
  blacklist: { label: 'Blacklist', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'ban' },
};

export const ACL_SCOPE_META: Record<
  AclScope,
  { label: string; description: string; chain: string }
> = {
  forward: { label: 'Forward chain', description: 'Traffic routed between networks', chain: 'forward' },
  input:   { label: 'Input chain',   description: 'Traffic terminating on the router', chain: 'input' },
  hotspot: { label: 'Hotspot users', description: 'Clients on the guest SSIDs',      chain: 'hotspot' },
};

export const VOUCHER_PACKAGE_META: Record<
  VoucherPackage,
  { label: string; minutes: number; priceUsd: number }
> = {
  '1h':  { label: '1 Hour',  minutes: 60,    priceUsd: 1 },
  '6h':  { label: '6 Hours', minutes: 360,   priceUsd: 4 },
  '12h': { label: '12 Hours',minutes: 720,   priceUsd: 7 },
  '1d':  { label: '1 Day',   minutes: 1440,  priceUsd: 10 },
  '3d':  { label: '3 Days',  minutes: 4320,  priceUsd: 24 },
  '7d':  { label: '7 Days',  minutes: 10080, priceUsd: 48 },
  '30d': { label: '30 Days', minutes: 43200, priceUsd: 150 },
};

// ── Entities ────────────────────────────────────────────────────────────────

export interface HotspotProfile {
  id: string;
  name: string;
  ssid: string;
  band: HotspotBand;
  security: HotspotSecurity;
  auth: HotspotAuth;
  /** Captive portal path served by the controller, e.g. `/hotspot/guest`. */
  captivePortalPath: string | null;
  /** Hosts the guest may always reach without authenticating. */
  walledGarden: string[];
  downloadMbpsLimit: number;
  uploadMbpsLimit: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  macFilter: 'allow' | 'deny' | 'none';
  hideSsid: boolean;
  isolateClients: boolean;
  redirectHttps: boolean;
}

export interface HotspotClient {
  id: string;
  mac: string;
  hostname: string;
  ip: string;
  /** Seconds since the station associated. */
  uptimeSeconds: number;
  downloadMbps: number;
  uploadMbps: number;
  totalDownloadMb: number;
  totalUploadMb: number;
  signalDbm: number;
  vlan: number;
  authorized: boolean;
  method: HotspotAuth;
  voucherCode: string | null;
}

export interface Hotspot {
  id: string;
  deviceId: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  apName: string;
  model: string;
  profileId: string;
  profileName: string;
  ssid: string;
  status: HotspotStatus;
  bssid: string;
  channel: number;
  band: '2.4ghz' | '5ghz';
  activeClients: number;
  maxClients: number;
  utilizationPct: number;
  txMbps: number;
  rxMbps: number;
  sessionsToday: number;
  revenueTodayUsd: number;
  uptimeSeconds: number;
  lastHandshakeSeconds: number;
  clients: HotspotClient[];
}

export interface Voucher {
  id: string;
  code: string;
  package: VoucherPackage;
  siteId: string;
  siteName: string;
  status: VoucherStatus;
  valueUsd: number;
  createdAt: string;
  validUntil: string;
  usedAt: string | null;
  usedByMac: string | null;
}

export interface AclEntry {
  id: string;
  cidr: string;
  comment: string;
  addedAt: string;
  addedBy: string;
  hitCount: number;
  lastHitAt: string | null;
  status: 'active' | 'pending';
}

export interface AccessList {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  name: string;
  kind: AclKind;
  scope: AclScope;
  description: string;
  enabled: boolean;
  entries: AclEntry[];
  createdAt: string;
  lastSyncedAt: string;
  /** Count of packets matched in the last hour. */
  hitCount: number;
}

// ── Deterministic helpers ───────────────────────────────────────────────────

/**
 * Fixed reference timestamp. Using `Date.now()` would produce a different
 * value on the server and in the browser, so every relative date in this
 * model is derived from this constant instead.
 */
export const REF_TIME = Date.UTC(2025, 5, 12, 9, 30, 0); // 2025-06-12 09:30 UTC

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function int(key: string, min: number, max: number): number {
  return randInt(rngFor(key), min, max);
}

function float(key: string, min: number, max: number): number {
  return randFloat(rngFor(key), min, max);
}

function hex(key: string, bytes: number): string {
  const rand = rngFor(key);
  let out = '';
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(rand() * 256).toString(16).padStart(2, '0').toUpperCase();
  }
  return out;
}

function macFrom(key: string): string {
  const h = hex(key, 6).split('');
  return [
    h[0] + h[1],
    h[2] + h[3],
    h[4] + h[5],
    h[6] + h[7],
    h[8] + h[9],
    h[10] + h[11],
  ].join(':');
}

function isoAt(offsetMs: number): string {
  return new Date(REF_TIME + offsetMs).toISOString();
}

function minutesAgo(mins: number): string {
  return isoAt(-mins * MINUTE);
}

// ── Hotspot profiles ────────────────────────────────────────────────────────

const WALLED_GUEST = [
  '*.google.com',
  '*.gstatic.com',
  '*.apple.com',
  '*.icloud.com',
  '*.wikipedia.org',
  '*.microsoft.com',
  '*.mozilla.org',
  '*.ubuntu.com',
  'captive.apple.com',
  'connectivitycheck.gstatic.com',
];

const WALLED_HOTEL = [
  '*.booking.com',
  '*.expedia.com',
  '*.airbnb.com',
  '*.netflix.com',
  '*.spotify.com',
  '*.paypal.com',
  'captive.apple.com',
  'connectivitycheck.gstatic.com',
];

const PROFILE_DEFS: Array<{
  key: string;
  name: string;
  ssid: string;
  band: HotspotBand;
  security: HotspotSecurity;
  auth: HotspotAuth;
  captivePortalPath: string | null;
  walledGarden: string[];
  downloadMbpsLimit: number;
  uploadMbpsLimit: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  macFilter: 'allow' | 'deny' | 'none';
  hideSsid: boolean;
  isolateClients: boolean;
  redirectHttps: boolean;
}> = [
  {
    key: 'guest-5g',
    name: 'Vortex Guest 5G',
    ssid: 'Vortex-Guest-5G',
    band: '5ghz',
    security: 'wpa3',
    auth: 'portal',
    captivePortalPath: '/hotspot/guest',
    walledGarden: WALLED_GUEST,
    downloadMbpsLimit: 25,
    uploadMbpsLimit: 10,
    sessionTimeoutMinutes: 720,
    idleTimeoutMinutes: 30,
    macFilter: 'none',
    hideSsid: false,
    isolateClients: true,
    redirectHttps: true,
  },
  {
    key: 'guest-24',
    name: 'Vortex Guest 2.4G',
    ssid: 'Vortex-Guest-2.4G',
    band: '2.4ghz',
    security: 'wpa2-psk',
    auth: 'portal',
    captivePortalPath: '/hotspot/guest',
    walledGarden: WALLED_GUEST,
    downloadMbpsLimit: 10,
    uploadMbpsLimit: 5,
    sessionTimeoutMinutes: 720,
    idleTimeoutMinutes: 30,
    macFilter: 'none',
    hideSsid: false,
    isolateClients: true,
    redirectHttps: true,
  },
  {
    key: 'staff',
    name: 'Vortex Staff',
    ssid: 'Vortex-Staff',
    band: 'both',
    security: 'wpa3',
    auth: 'psk',
    captivePortalPath: null,
    walledGarden: [],
    downloadMbpsLimit: 200,
    uploadMbpsLimit: 100,
    sessionTimeoutMinutes: 1440,
    idleTimeoutMinutes: 60,
    macFilter: 'allow',
    hideSsid: true,
    isolateClients: false,
    redirectHttps: false,
  },
  {
    key: 'lounge',
    name: 'Airport Lounge Fast',
    ssid: 'Vortex-Lounge',
    band: '5ghz',
    security: 'wpa3',
    auth: 'voucher',
    captivePortalPath: '/hotspot/voucher',
    walledGarden: WALLED_HOTEL,
    downloadMbpsLimit: 50,
    uploadMbpsLimit: 25,
    sessionTimeoutMinutes: 180,
    idleTimeoutMinutes: 15,
    macFilter: 'none',
    hideSsid: false,
    isolateClients: true,
    redirectHttps: true,
  },
  {
    key: 'promo',
    name: 'Retail Promo',
    ssid: 'Vortex-Free-Promo',
    band: '2.4ghz',
    security: 'open',
    auth: 'portal',
    captivePortalPath: '/hotspot/promo',
    walledGarden: WALLED_GUEST,
    downloadMbpsLimit: 5,
    uploadMbpsLimit: 2,
    sessionTimeoutMinutes: 60,
    idleTimeoutMinutes: 10,
    macFilter: 'none',
    hideSsid: false,
    isolateClients: true,
    redirectHttps: false,
  },
  {
    key: 'responder',
    name: 'CPE Responder',
    ssid: 'Vortex-Responder',
    band: 'both',
    security: 'wpa2-psk',
    auth: 'psk',
    captivePortalPath: null,
    walledGarden: [],
    downloadMbpsLimit: 100,
    uploadMbpsLimit: 50,
    sessionTimeoutMinutes: 1440,
    idleTimeoutMinutes: 120,
    macFilter: 'allow',
    hideSsid: true,
    isolateClients: false,
    redirectHttps: false,
  },
];

export const HOTSPOT_PROFILES: HotspotProfile[] = PROFILE_DEFS.map(d => ({
  id: `profile-${d.key}`,
  name: d.name,
  ssid: d.ssid,
  band: d.band,
  security: d.security,
  auth: d.auth,
  captivePortalPath: d.captivePortalPath,
  walledGarden: d.walledGarden,
  downloadMbpsLimit: d.downloadMbpsLimit,
  uploadMbpsLimit: d.uploadMbpsLimit,
  sessionTimeoutMinutes: d.sessionTimeoutMinutes,
  idleTimeoutMinutes: d.idleTimeoutMinutes,
  macFilter: d.macFilter,
  hideSsid: d.hideSsid,
  isolateClients: d.isolateClients,
  redirectHttps: d.redirectHttps,
}));

export function getHotspotProfile(id: string): HotspotProfile | undefined {
  return HOTSPOT_PROFILES.find(p => p.id === id);
}

// ── Hotspot fleet ───────────────────────────────────────────────────────────

/** Every AP-role device in the WAN fleet, flattened with its site. */
export interface ApDevice {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  name: string;
  model: string;
  status: 'online' | 'offline' | 'degraded';
  mgmtIp: string;
  tunnelIp: string;
  serial: string;
  firmware: string;
  cpuLoad: number;
  ramUsage: number;
}

export function allApDevices(): ApDevice[] {
  const out: ApDevice[] = [];
  for (const site of SITES) {
    for (const dev of site.devices) {
      if (dev.role !== 'ap') continue;
      out.push({
        id: dev.id,
        siteId: site.id,
        siteName: site.name,
        siteCode: site.code,
        name: dev.name,
        model: dev.model,
        status: dev.status,
        mgmtIp: dev.mgmtIp,
        tunnelIp: dev.tunnelIp,
        serial: dev.serial,
        firmware: dev.firmware,
        cpuLoad: dev.cpuLoad,
        ramUsage: dev.ramUsage,
      });
    }
  }
  return out;
}

const HOSTNAMES = [
  'iPhone', 'Galaxy-S23', 'Pixel-8', 'MacBook-Pro', 'ThinkPad-X1', 'iPad-Air',
  'Redmi-Note', 'Galaxy-A54', 'OnePlus-11', 'Surface-Laptop', 'iPhone-15-Pro',
  'Xperia-5', 'Huawei-P60', 'Nokia-G42', 'Infinix-Hot', 'Tecno-Spark',
];

function buildClients(hotspotKey: string, count: number): HotspotClient[] {
  return Array.from({ length: count }, (_, i) => {
    const key = `${hotspotKey}-c${i}`;
    const mac = macFrom(`${key}-mac`);
    const authorized = int(`${key}-auth`, 0, 9) > 1;
    const method: HotspotAuth = authorized
      ? (int(`${key}-m`, 0, 9) > 5 ? 'voucher' : 'portal')
      : 'portal';
    return {
      id: `${hotspotKey}-client-${i + 1}`,
      mac,
      hostname: `${HOSTNAMES[int(`${key}-h`, 0, HOSTNAMES.length - 1)]}-${int(`${key}-h2`, 1, 99)}`,
      ip: `10.${int(`${key}-a`, 20, 60)}.${int(`${key}-b`, 1, 250)}.${int(`${key}-c`, 2, 254)}`,
      uptimeSeconds: int(`${key}-u`, 30, 60 * 60 * 14),
      downloadMbps: Number(float(`${key}-d`, 0.2, 18).toFixed(2)),
      uploadMbps: Number(float(`${key}-up`, 0.1, 4).toFixed(2)),
      totalDownloadMb: int(`${key}-td`, 5, 9800),
      totalUploadMb: int(`${key}-tu`, 1, 2400),
      signalDbm: -int(`${key}-s`, 28, 84),
      vlan: [10, 20, 30, 40, 99][int(`${key}-v`, 0, 4)],
      authorized,
      method,
      voucherCode: method === 'voucher' ? `VX-${hex(`${key}-vc`, 3)}-${hex(`${key}-vc2`, 2)}` : null,
    };
  });
}

function buildHotspots(): Hotspot[] {
  const out: Hotspot[] = [];

  for (const ap of allApDevices()) {
    // Rotate profiles across the fleet so every access method is represented.
    const profileIndex = Math.abs(hashSeed(ap.id)) % HOTSPOT_PROFILES.length;
    const profile = HOTSPOT_PROFILES[profileIndex];
    const key = ap.id;

    const maxClients = profile.band === '2.4ghz' ? int(`${key}-max`, 40, 80) : int(`${key}-max`, 80, 200);
    const isDown = ap.status === 'offline';
    const clientCount = isDown ? 0 : int(`${key}-n`, 3, Math.min(34, maxClients));

    const band: '2.4ghz' | '5ghz' = profile.band === '2.4ghz' ? '2.4ghz' : '5ghz';
    const status: HotspotStatus = isDown
      ? 'offline'
      : ap.status === 'degraded'
        ? 'degraded'
        : int(`${key}-st`, 0, 9) === 0
          ? 'maintenance'
          : 'online';

    const sessionsToday = isDown ? 0 : int(`${key}-sess`, 4, 480);
    const pricePerSession = profile.auth === 'voucher' ? 4 : profile.auth === 'portal' ? 1.5 : 0;

    out.push({
      id: `${ap.id}-hs`,
      deviceId: ap.id,
      siteId: ap.siteId,
      siteName: ap.siteName,
      siteCode: ap.siteCode,
      apName: ap.name,
      model: ap.model,
      profileId: profile.id,
      profileName: profile.name,
      ssid: profile.ssid,
      status,
      bssid: hex(`${key}-bssid`, 6),
      channel: band === '2.4ghz' ? int(`${key}-ch`, 1, 13) : int(`${key}-ch`, 36, 165),
      band,
      activeClients: clientCount,
      maxClients,
      utilizationPct: Math.round((clientCount / maxClients) * 100),
      txMbps: isDown ? 0 : Number(float(`${key}-tx`, 1, 45).toFixed(2)),
      rxMbps: isDown ? 0 : Number(float(`${key}-rx`, 2, 60).toFixed(2)),
      sessionsToday,
      revenueTodayUsd: Number((sessionsToday * pricePerSession).toFixed(2)),
      uptimeSeconds: int(`${key}-up`, 3600, 60 * 60 * 24 * 45),
      lastHandshakeSeconds: isDown ? 86400 : int(`${key}-hs`, 3, 900),
      clients: buildClients(key, clientCount),
    });
  }

  return out;
}

export const HOTSPOTS: Hotspot[] = buildHotspots();

export function allHotspots(): Hotspot[] {
  return HOTSPOTS;
}

export function getHotspot(id: string): Hotspot | undefined {
  return HOTSPOTS.find(h => h.id === id);
}

export function hotspotsForSite(siteId: string): Hotspot[] {
  return HOTSPOTS.filter(h => h.siteId === siteId);
}

export function hotspotTotals() {
  const active = HOTSPOTS.filter(h => h.status === 'online').length;
  return {
    aps: HOTSPOTS.length,
    online: active,
    offline: HOTSPOTS.length - active,
    clients: HOTSPOTS.reduce((s, h) => s + h.activeClients, 0),
    sessionsToday: HOTSPOTS.reduce((s, h) => s + h.sessionsToday, 0),
    revenueTodayUsd: Number(HOTSPOTS.reduce((s, h) => s + h.revenueTodayUsd, 0).toFixed(2)),
    capacity: HOTSPOTS.reduce((s, h) => s + h.maxClients, 0),
    throughputMbps: Number(
      HOTSPOTS.reduce((s, h) => s + h.rxMbps + h.txMbps, 0).toFixed(1),
    ),
  };
}

/** Every distinct client across the fleet, flattened. */
export function allHotspotClients(): Array<HotspotClient & { hotspotId: string; siteName: string; ssid: string }> {
  return HOTSPOTS.flatMap(h =>
    h.clients.map(c => ({
      ...c,
      hotspotId: h.id,
      siteName: h.siteName,
      ssid: h.ssid,
    })),
  );
}

// ── Vouchers ────────────────────────────────────────────────────────────────

const VOUCHER_COUNT = 48;

function buildVouchers(): Voucher[] {
  const sites = SITES.filter(s => s.devices.some(d => d.role === 'ap'));
  if (sites.length === 0) return [];

  return Array.from({ length: VOUCHER_COUNT }, (_, i) => {
    const key = `voucher-${i + 1}`;
    const site = sites[int(`${key}-site`, 0, sites.length - 1)];
    const pkgKeys = Object.keys(VOUCHER_PACKAGE_META) as VoucherPackage[];
    const pkg = pkgKeys[int(`${key}-pkg`, 0, pkgKeys.length - 1)];
    const meta = VOUCHER_PACKAGE_META[pkg];

    const roll = int(`${key}-roll`, 0, 9);
    const status: VoucherStatus =
      roll === 0 ? 'disabled' : roll === 1 ? 'expired' : roll <= 3 ? 'active' : 'unused';

    const createdMinsAgo = int(`${key}-c`, 5, 60 * 24 * 40);
    const usedMinsAgo = status === 'active' ? int(`${key}-u`, 1, Math.max(2, createdMinsAgo - 1)) : null;

    return {
      id: `voucher-${i + 1}`,
      code: `VX-${hex(`${key}-a`, 4)}-${hex(`${key}-b`, 4)}`,
      package: pkg,
      siteId: site.id,
      siteName: site.name,
      status,
      valueUsd: meta.priceUsd,
      createdAt: minutesAgo(createdMinsAgo),
      validUntil: isoAt(-createdMinsAgo * MINUTE + meta.minutes * MINUTE),
      usedAt: usedMinsAgo === null ? null : minutesAgo(usedMinsAgo),
      usedByMac: usedMinsAgo === null ? null : macFrom(`${key}-mac`),
    };
  });
}

export const VOUCHERS: Voucher[] = buildVouchers();

export function allVouchers(): Voucher[] {
  return VOUCHERS;
}

export function voucherTotals() {
  return {
    total: VOUCHERS.length,
    unused: VOUCHERS.filter(v => v.status === 'unused').length,
    active: VOUCHERS.filter(v => v.status === 'active').length,
    expired: VOUCHERS.filter(v => v.status === 'expired').length,
    disabled: VOUCHERS.filter(v => v.status === 'disabled').length,
    revenueUsd: Number(
      VOUCHERS.filter(v => v.status === 'active' || v.status === 'unused')
        .reduce((s, v) => s + v.valueUsd, 0)
        .toFixed(2),
    ),
  };
}

// ── IP access lists ─────────────────────────────────────────────────────────

const ACL_DEFS: Array<{
  key: string;
  name: string;
  kind: AclKind;
  scope: AclScope;
  description: string;
  enabled: boolean;
}> = [
  {
    key: 'corp-block',
    name: 'Corporate Block',
    kind: 'blacklist',
    scope: 'forward',
    description: 'Scanner and hostile ranges never allowed onto the WAN',
    enabled: true,
  },
  {
    key: 'office-allow',
    name: 'Office Allow',
    kind: 'whitelist',
    scope: 'forward',
    description: 'NOC, support and partner addresses permitted to reach the core',
    enabled: true,
  },
  {
    key: 'hotspot-allow',
    name: 'Hotspot Allow',
    kind: 'whitelist',
    scope: 'hotspot',
    description: 'Roaming and partner devices allowed on the guest SSIDs',
    enabled: false,
  },
  {
    key: 'mgmt-allow',
    name: 'Management Allow',
    kind: 'whitelist',
    scope: 'input',
    description: 'Jump hosts allowed to open the router management interface',
    enabled: true,
  },
];

const ACL_COMMENTS: Record<AclKind, string[]> = {
  blacklist: [
    'SSH brute-force scanner',
    'Known C2 range',
    'Port scan from residential IP',
    'Tor exit node',
    'Credential stuffing host',
    'NTP amplification source',
    'Blocked after 14 failed logins',
    'Cloud provider abuse range',
  ],
  whitelist: [
    'Core NOC jump host',
    'Upstream transit provider',
    'SentinelOne egress',
    'Field engineer on site',
    'Peering router',
    'Backup collector node',
    'Support engineer VPN',
    'Payment gateway allowlist',
  ],
};

function buildAclEntries(listKey: string, kind: AclKind, count: number): AclEntry[] {
  const pool = ACL_COMMENTS[kind];
  return Array.from({ length: count }, (_, i) => {
    const key = `${listKey}-e${i}`;
    const isRange = int(`${key}-r`, 0, 9) > 6;
    const cidr = isRange
      ? `${int(`${key}-a`, 10, 220)}.${int(`${key}-b`, 0, 255)}.${int(`${key}-c`, 0, 255)}.0/24`
      : `${int(`${key}-a`, 10, 220)}.${int(`${key}-b`, 0, 255)}.${int(`${key}-c`, 0, 255)}.${int(`${key}-d`, 1, 254)}/32`;

    const hit = int(`${key}-h`, 0, 9800);
    return {
      id: `${listKey}-entry-${i + 1}`,
      cidr,
      comment: pool[int(`${key}-c2`, 0, pool.length - 1)],
      addedAt: minutesAgo(int(`${key}-t`, 60, 60 * 24 * 120)),
      addedBy: int(`${key}-by`, 0, 2) === 0 ? 'ops@acme.co.ke' : 'noc@acme.co.ke',
      hitCount: hit,
      lastHitAt: hit === 0 ? null : minutesAgo(int(`${key}-lh`, 1, 720)),
      status: 'active',
    };
  });
}

function buildAccessLists(): AccessList[] {
  const out: AccessList[] = [];

  for (const site of SITES) {
    for (const def of ACL_DEFS) {
      const key = `${site.id}-acl-${def.key}`;
      const count = int(`${key}-n`, 3, 9);
      out.push({
        id: key,
        siteId: site.id,
        siteName: site.name,
        siteCode: site.code,
        name: def.name,
        kind: def.kind,
        scope: def.scope,
        description: def.description,
        enabled: def.enabled,
        entries: buildAclEntries(key, def.kind, count),
        createdAt: minutesAgo(int(`${key}-c`, 60 * 24 * 30, 60 * 24 * 400)),
        lastSyncedAt: minutesAgo(int(`${key}-s`, 2, 240)),
        hitCount: int(`${key}-h`, 0, 250000),
      });
    }
  }

  return out;
}

export const ACCESS_LISTS: AccessList[] = buildAccessLists();

export function allAccessLists(): AccessList[] {
  return ACCESS_LISTS;
}

export function getAccessList(id: string): AccessList | undefined {
  return ACCESS_LISTS.find(l => l.id === id);
}

export function accessListsForSite(siteId: string): AccessList[] {
  return ACCESS_LISTS.filter(l => l.siteId === siteId);
}

export function aclTotals() {
  const entries = ACCESS_LISTS.flatMap(l => l.entries);
  return {
    lists: ACCESS_LISTS.length,
    enabled: ACCESS_LISTS.filter(l => l.enabled).length,
    whitelistEntries: ACCESS_LISTS
      .filter(l => l.kind === 'whitelist')
      .reduce((s, l) => s + l.entries.length, 0),
    blacklistEntries: ACCESS_LISTS
      .filter(l => l.kind === 'blacklist')
      .reduce((s, l) => s + l.entries.length, 0),
    blockedHits: ACCESS_LISTS
      .filter(l => l.kind === 'blacklist')
      .reduce((s, l) => s + l.entries.reduce((n, e) => n + e.hitCount, 0), 0),
    allowedHits: ACCESS_LISTS
      .filter(l => l.kind === 'whitelist')
      .reduce((s, l) => s + l.entries.reduce((n, e) => n + e.hitCount, 0), 0),
  };
}

// ── Address validation ──────────────────────────────────────────────────────

export interface CidrValidation {
  ok: boolean;
  cidr?: string;
  error?: string;
}

/** Validate an IPv4 address or CIDR block and return it normalised to /32 or /n. */
export function validateCidr(input: string): CidrValidation {
  const raw = (input ?? '').trim();
  if (!raw) return { ok: false, error: 'Address is required' };

  const parts = raw.split('/');
  if (parts.length > 2) return { ok: false, error: 'Invalid address format' };

  const octets = parts[0].split('.');
  if (octets.length !== 4) {
    return { ok: false, error: 'Only IPv4 addresses are supported' };
  }
  for (const o of octets) {
    if (!/^\d{1,3}$/.test(o)) return { ok: false, error: 'Invalid address format' };
    const n = Number(o);
    if (n < 0 || n > 255) return { ok: false, error: 'Address octet out of range' };
  }

  if (parts.length === 1) {
    return { ok: true, cidr: `${octets.join('.')}/32` };
  }

  const prefix = Number(parts[1]);
  if (!/^\d{1,2}$/.test(parts[1]) || prefix < 0 || prefix > 32) {
    return { ok: false, error: 'Prefix length must be between 0 and 32' };
  }
  return { ok: true, cidr: `${octets.join('.')}/${prefix}` };
}

/** True when the address is a plain host address rather than a range. */
export function isHostAddress(cidr: string): boolean {
  return cidr.endsWith('/32');
}

// ── RouterOS command generation ─────────────────────────────────────────────

/**
 * Build the RouterOS commands that enforce an access list on a device.
 * These are the exact lines the controller pushes to the RouterOS REST API.
 */
export function routerOsAclCommands(list: AccessList): string[] {
  const comment = `vortex-acl:${list.kind}:${list.name}`;
  const chain = ACL_SCOPE_META[list.scope].chain;

  if (list.scope === 'hotspot') {
    if (list.kind === 'whitelist') {
      return list.entries.map(
        e => `/ip/hotspot/allowed-address add address=${e.cidr} comment="${comment}"`,
      );
    }
    return list.entries.map(
      e => `/ip/hotspot/ip-binding add address=${e.cidr} type=blocked comment="${comment}"`,
    );
  }

  const action = list.kind === 'whitelist' ? 'accept' : 'drop';
  return list.entries.map(
    e => `/ip/firewall/filter add chain=${chain} src-address=${e.cidr} action=${action} comment="${comment}" place-before=0`,
  );
}

/** RouterOS commands that push a hotspot profile onto an access point. */
export function routerOsHotspotCommands(hotspot: Hotspot): string[] {
  const profile = getHotspotProfile(hotspot.profileId);
  if (!profile) return [];

  const lines: string[] = [];
  lines.push(
    `/interface wireless set [find name=${hotspot.apName}] disabled=no ssid="${profile.ssid}" mode=ap-bridge`,
  );
  lines.push(
    `/interface wireless security-profiles set [find name="${profile.name}"] mode=${profile.security}`,
  );
  if (profile.auth === 'portal' && profile.captivePortalPath) {
    lines.push(
      `/ip hotspot profile set [find name="${profile.name}"] hotspot-address=${hotspot.siteId} html-directory=hotspot login-by=http-chap,http-pap use-radius=no`,
    );
    lines.push(
      `/ip hotspot walled-garden ip add [find comment="${profile.name}"] ${profile.walledGarden.join(' ')}`,
    );
  }
  lines.push(
    `/queue simple add name="${profile.name}-${hotspot.apName}" target=${hotspot.apName} max-limit=${profile.downloadMbpsLimit}M/${profile.uploadMbpsLimit}M`,
  );
  lines.push(
    `/ip hotspot user profile set [find name="${profile.name}"] rate-limit=${profile.downloadMbpsLimit}M/${profile.uploadMbpsLimit}M session-timeout=${profile.sessionTimeoutMinutes}m idle-timeout=${profile.idleTimeoutMinutes}m`,
  );
  return lines;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function formatBytesFromMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatSignal(dbm: number): string {
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  return 'Weak';
}

export function signalColor(dbm: number): string {
  if (dbm >= -55) return 'text-emerald-400';
  if (dbm >= -65) return 'text-amber-400';
  return 'text-red-400';
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = REF_TIME - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / MINUTE);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function formatClock(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Sites that actually operate a hotspot fleet, in menu order. */
export const HOTSPOT_SITES: Site[] = SITES.filter(s =>
  s.devices.some(d => d.role === 'ap'),
);
