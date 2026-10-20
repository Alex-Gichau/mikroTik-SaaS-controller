/**
 * Vortex WAN / SD-WAN domain model.
 *
 * Models a real service-provider wide-area network the way Ubiquiti UniFi
 * and TP-Link Omada do:
 *
 *   Organization
 *     └─ Sites (branches, POPs, customer premises)
 *          └─ Devices (routers / switches / APs) at a site
 *          └─ WAN Uplinks (ISP circuits: fibre, DSL, LTE, 5G, satellite)
 *          └─ Subnets (LAN / DMZ / guest VLANs)
 *          └─ Policy Based Routing (which traffic leaves via which uplink)
 *          └─ Overlay (WireGuard mesh to the SD-WAN hub)
 *
 * All data here is a deterministic mock so the UI is stable across SSR and
 * hydration. The shapes mirror the Supabase tables in `supabase/schema.sql`.
 */

// ── Enums / unions ──────────────────────────────────────────────────────────

export type SiteRole = 'hq' | 'branch' | 'pop' | 'cpe' | 'customer';
export type SiteStatus = 'online' | 'degraded' | 'offline' | 'maintenance';
export type DeviceRole = 'edge' | 'core' | 'access' | 'ap' | 'cellular';

export type UplinkType =
  | 'fiber'
  | 'ethernet'
  | 'dsl'
  | 'lte'
  | '5g'
  | 'satellite'
  | 'starlink'
  | 'backup';

export type LinkState = 'active' | 'standby' | 'down' | 'degraded';

export type PolicyMode = 'primary' | 'backup' | 'load-balance' | 'failover';

export type AppClass =
  | 'default'
  | 'voip'
  | 'video'
  | 'gaming'
  | 'bulk'
  | 'management'
  | 'guest';

export const APP_CLASS_META: Record<
  AppClass,
  { label: string; color: string; bg: string; border: string; minBw: number }
> = {
  default:    { label: 'Default',    color: 'text-white/70',   bg: 'bg-white/5',         border: 'border-white/10',        minBw: 0 },
  voip:       { label: 'VoIP',       color: 'text-emerald-400',bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20',  minBw: 2 },
  video:      { label: 'Video',      color: 'text-blue-400',   bg: 'bg-blue-500/10',     border: 'border-blue-500/20',     minBw: 25 },
  gaming:     { label: 'Gaming',     color: 'text-purple-400', bg: 'bg-purple-500/10',   border: 'border-purple-500/20',   minBw: 5 },
  bulk:       { label: 'Bulk / Sync',color: 'text-amber-400',  bg: 'bg-amber-500/10',    border: 'border-amber-500/20',    minBw: 0 },
  management: { label: 'Management', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',     border: 'border-cyan-500/20',     minBw: 1 },
  guest:      { label: 'Guest',      color: 'text-pink-400',   bg: 'bg-pink-500/10',     border: 'border-pink-500/20',     minBw: 0 },
};

export const UPLINK_TYPE_META: Record<
  UplinkType,
  { label: string; icon: string; color: string }
> = {
  fiber:     { label: 'Fiber',     icon: '◈', color: '#3b82f6' },
  ethernet:  { label: 'Ethernet',  icon: '◆', color: '#8b5cf6' },
  dsl:       { label: 'DSL',       icon: '◐', color: '#f59e0b' },
  lte:       { label: 'LTE',       icon: '▤', color: '#10b981' },
  '5g':      { label: '5G',        icon: '▥', color: '#06b6d4' },
  satellite: { label: 'Satellite', icon: '◬', color: '#ec4899' },
  starlink:  { label: 'Starlink',  icon: '✦', color: '#a3e635' },
  backup:    { label: 'Backup',    icon: '↺', color: '#94a3b8' },
};

export const MODE_META: Record<
  PolicyMode,
  { label: string; color: string; bg: string; border: string }
> = {
  primary:        { label: 'Primary',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  backup:         { label: 'Backup',       color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  'load-balance': { label: 'Load Balance', color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20'  },
  failover:       { label: 'Failover',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

export const SITE_ROLE_META: Record<
  SiteRole,
  { label: string; color: string; bg: string; border: string }
> = {
  hq:       { label: 'HQ / Core', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  branch:   { label: 'Branch',     color: 'text-white/70',   bg: 'bg-white/5',       border: 'border-white/10'      },
  pop:      { label: 'POP',        color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  cpe:      { label: 'CPE',        color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  customer: { label: 'Customer',   color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20'   },
};

// ── Entities ────────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  siteId: string;
  name: string;
  model: string;
  role: DeviceRole;
  status: 'online' | 'offline' | 'degraded';
  serial: string;
  firmware: string;
  tunnelIp: string;
  mgmtIp: string;
  uptimeSeconds: number;
  cpuLoad: number;
  ramUsage: number;
  subscribers: number;
}

export interface Uplink {
  id: string;
  siteId: string;
  name: string;
  type: UplinkType;
  provider: string;
  /** Public IP of the circuit. */
  publicIp: string;
  /** Static or DHCP-assigned block of the local side. */
  localIp: string;
  /** Download / upload contracted in Mbps. */
  downMbps: number;
  upMbps: number;
  /** Measured utilisation of the contracted capacity, 0–100. */
  utilizationPct: number;
  latencyMs: number;
  jitterMs: number;
  lossPct: number;
  state: LinkState;
  /** Failover order — lower runs first. */
  priority: number;
  /** Tells the SD-WAN engine to steer traffic over this circuit. */
  enabled: boolean;
  monthlyCostUsd: number;
}

export interface Subnet {
  id: string;
  siteId: string;
  name: string;
  cidr: string;
  vlan: number;
  purpose: 'lan' | 'dmz' | 'guest' | 'management' | 'voice';
  deviceCount: number;
  bandwidthUtilizationPct: number;
}

export interface PolicyRoute {
  id: string;
  siteId: string;
  name: string;
  /** Traffic selector — source subnet, destination, app class, DSCP, protocol. */
  matchType: 'subnet' | 'app' | 'dst' | 'src-port' | 'protocol';
  matchValue: string;
  appClass: AppClass;
  /** Uplink ids this policy may use, in order of preference. */
  uplinkIds: string[];
  mode: PolicyMode;
  enabled: boolean;
  /** Bandwidth ceiling in Mbps (0 = unlimited). */
  maxBandwidthMbps: number;
  /** Min guaranteed bandwidth in Mbps. */
  minBandwidthMbps: number;
  hitCount: number;
}

export interface OverlayPeer {
  id: string;
  siteId: string;
  publicEndpoint: string;
  tunnelIp: string;
  status: 'up' | 'degraded' | 'down';
  allowedNetworks: string[];
  lastHandshakeSeconds: number;
  roundTripMs: number;
  /** True when this peer is the SD-WAN hub for the overlay. */
  isHub: boolean;
}

export interface Site {
  id: string;
  name: string;
  code: string;
  role: SiteRole;
  status: SiteStatus;
  region: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
  /** Timezone in IANA form. */
  timezone: string;
  contact: string;
  subscribers: number;
  /** Total contracted throughput of all uplinks, Mbps. */
  contractedMbps: number;
  /** Sum of measured throughput right now, Mbps. */
  currentMbps: number;
  devices: Device[];
  uplinks: Uplink[];
  subnets: Subnet[];
  policies: PolicyRoute[];
  /** Peers this site exchanges traffic with over the WireGuard overlay. */
  overlayPeers: OverlayPeer[];
  /** Sites that route through this one (a POP acting as a transit hub). */
  transitFor: string[];
}

export interface Overlay {
  id: string;
  name: string;
  /** The hub site that terminates the overlay. */
  hubSiteId: string;
  /** WireGuard listen port on the hub. */
  port: number;
  /** Subnet pool handed out to overlay interfaces. */
  addressPool: string;
  /** Peers that are allowed to join. */
  memberSiteIds: string[];
  status: 'up' | 'degraded' | 'down';
  /** Aggregate overlay throughput, Mbps. */
  throughputMbps: number;
}

// ── Mock data ───────────────────────────────────────────────────────────────

function seededInt(key: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return min + Math.floor(r * (max - min + 1));
}

function seededFloat(key: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return min + r * (max - min);
}

const DEVICE_MODELS: Record<DeviceRole, string[]> = {
  edge:    ['CCR2004-16G', 'RB5009UG+S+IN', 'CCR2116-12G'],
  core:    ['CRS518-24XQ', 'RB4011'],
  access:  ['RB4011', 'RB5009UG+S+IN', 'hAP ax3'],
  ap:      ['hAP ax3', 'cap ax', 'LHG 5 ax'],
  cellular:['Chateau LTE12', 'RBFee11', 'RB5009UG+S+IN'],
};

const PROVIDERS = [
  'Safaricom Fibernet',
  'AccessKenya',
  'Liquid Telecom',
  'Starlink',
  'Orange FTTH',
  'Jio Fiber',
  'MTN Business',
  'Telkom Business',
];

function buildUplinks(siteId: string, count: number, isHub: boolean): Uplink[] {
  const types: UplinkType[] = isHub
    ? ['fiber', 'fiber', 'ethernet', '5g']
    : ['fiber', '5g', 'lte', 'dsl', 'starlink', 'ethernet'];

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];

    // Every third circuit in the fleet is a deliberately failed one so the
    // console always has real failover cases to render.
    const isFailed = i === 2 && count > 2;

    const down = type === 'fiber' ? seededInt(`${siteId}-u${i}-d`, 200, 1000)
      : type === '5g' ? seededInt(`${siteId}-u${i}-d`, 80, 300)
      : type === 'lte' ? seededInt(`${siteId}-u${i}-d`, 20, 80)
      : type === 'dsl' ? seededInt(`${siteId}-u${i}-d`, 8, 40)
      : type === 'starlink' ? seededInt(`${siteId}-u${i}-d`, 100, 250)
      : seededInt(`${siteId}-u${i}-d`, 200, 800);

    const downMbps = isFailed ? 0 : down;
    const state: LinkState = isFailed ? 'down' : i === 0 ? 'active' : 'standby';

    return {
      id: `${siteId}-uplink-${i + 1}`,
      siteId,
      name: `${UPLINK_TYPE_META[type].label} ${String.fromCharCode(65 + i)}`,
      type: isFailed ? 'ethernet' : type,
      provider: PROVIDERS[seededInt(`${siteId}-u${i}-p`, 0, PROVIDERS.length - 1)],
      publicIp: downMbps === 0
        ? '—'
        : `${seededInt(`${siteId}-u${i}-a`, 41, 197)}.${seededInt(`${siteId}-u${i}-b`, 0, 255)}.${seededInt(`${siteId}-u${i}-c`, 0, 255)}.${seededInt(`${siteId}-u${i}-d2`, 1, 254)}`,
      localIp: `10.${seededInt(`${siteId}-u${i}-s`, 10, 60)}.${seededInt(`${siteId}-u${i}-t`, 1, 250)}.2/30`,
      downMbps,
      upMbps: Math.round(downMbps * seededFloat(`${siteId}-u${i}-r`, 0.2, 0.6)),
      utilizationPct: downMbps === 0 ? 0 : seededInt(`${siteId}-u${i}-u`, 8, 88),
      latencyMs: type === 'satellite' || type === 'starlink' ? seededInt(`${siteId}-u${i}-l`, 280, 620)
        : type === 'lte' || type === '5g' ? seededInt(`${siteId}-u${i}-l`, 28, 90)
        : seededInt(`${siteId}-u${i}-l`, 3, 26),
      jitterMs: type === 'lte' || type === '5g' ? seededInt(`${siteId}-u${i}-j`, 4, 22)
        : seededInt(`${siteId}-u${i}-j`, 0, 4),
      lossPct: seededFloat(`${siteId}-u${i}-x`, 0, type === 'lte' ? 1.4 : 0.3),
      state,
      priority: i + 1,
      enabled: true,
      monthlyCostUsd: Math.round(downMbps * seededFloat(`${siteId}-u${i}-c2`, 3, 14)),
    };
  });
}

/**
 * Overlay tunnel IPs are carved out of 10.100.0.0/16 deterministically.
 * Each site reserves a distinct /24 so a site can never collide with
 * another site's tunnel addressing.
 */
function buildDevices(siteId: string, count: number): Device[] {
  const roles: DeviceRole[] = ['edge', 'access', 'ap', 'access', 'ap'];
  const siteIdx = OVERLAY_SITE_INDEX[siteId] ?? 1;
  return Array.from({ length: count }, (_, i) => {
    const role = roles[i % roles.length];
    const models = DEVICE_MODELS[role];
    const status: Device['status'] =
      i === 0 ? 'online' : seededInt(`${siteId}-d${i}-s`, 0, 20) === 0 ? 'offline' : 'online';
    return {
      id: `${siteId}-dev-${i + 1}`,
      siteId,
      name: `${role === 'edge' ? 'Edge' : role === 'ap' ? 'AP' : 'Switch'} ${i + 1}`,
      model: models[seededInt(`${siteId}-d${i}-m`, 0, models.length - 1)],
      role,
      status,
      serial: `${seededInt(`${siteId}-d${i}-x`, 10, 99)}${String.fromCharCode(65 + (i % 26))}${seededInt(`${siteId}-d${i}-y`, 1000, 9999)}`,
      firmware: seededInt(`${siteId}-d${i}-f`, 0, 9) === 0 ? '6.49.10' : '7.14.3',
      tunnelIp: `10.100.${siteIdx}.${i + 1}`,
      mgmtIp: `192.168.${seededInt(`${siteId}-d${i}-n`, 1, 30)}.${i + 10}`,
      uptimeSeconds: seededInt(`${siteId}-d${i}-u`, 3600, 60 * 60 * 24 * 90),
      cpuLoad: seededInt(`${siteId}-d${i}-c`, 3, 68),
      ramUsage: seededInt(`${siteId}-d${i}-r`, 20, 88),
      subscribers: role === 'edge' ? 0 : seededInt(`${siteId}-d${i}-b`, 0, 240),
    };
  });
}

function buildSubnets(siteId: string, count: number): Subnet[] {
  const kinds: Subnet['purpose'][] = ['lan', 'management', 'guest', 'dmz', 'voice'];
  return Array.from({ length: count }, (_, i) => {
    const purpose = kinds[i % kinds.length];
    return {
      id: `${siteId}-subnet-${i + 1}`,
      siteId,
      name:
        purpose === 'lan' ? 'Corporate LAN'
        : purpose === 'management' ? 'Management VLAN'
        : purpose === 'guest' ? 'Guest Wi-Fi'
        : purpose === 'dmz' ? 'DMZ / Servers'
        : 'Voice VLAN',
      cidr: `192.168.${seededInt(`${siteId}-s${i}-n`, 10, 240)}.0/24`,
      vlan: [10, 99, 20, 30, 40][i % 5],
      purpose,
      deviceCount: seededInt(`${siteId}-s${i}-d`, 0, 180),
      bandwidthUtilizationPct: seededInt(`${siteId}-s${i}-b`, 2, 74),
    };
  });
}

function buildPolicies(siteId: string, uplinkIds: string[]): PolicyRoute[] {
  const defs: Array<{
    name: string; matchType: PolicyRoute['matchType']; matchValue: string;
    appClass: AppClass; mode: PolicyMode; min: number; max: number;
  }> = [
    { name: 'VoIP to PBX',            matchType: 'app',      matchValue: 'SIP/RTP',        appClass: 'voip',       mode: 'primary',      min: 2,  max: 10 },
    { name: 'Video conferencing',     matchType: 'dst',      matchValue: 'Zoom, Meet, Teams', appClass: 'video',   mode: 'primary',      min: 25, max: 200 },
    { name: 'Gaming QoS',             matchType: 'dst',      matchValue: '*.gg, *.riotgames.com', appClass: 'gaming', mode: 'load-balance', min: 5, max: 50 },
    { name: 'Guest internet',         matchType: 'subnet',   matchValue: 'Guest VLAN',     appClass: 'guest',      mode: 'primary',     min: 0,  max: 0 },
    { name: 'Management & telemetry', matchType: 'protocol', matchValue: 'API, WireGuard', appClass: 'management',  mode: 'primary',     min: 1,  max: 20 },
    { name: 'Bulk backups (night)',   matchType: 'app',      matchValue: 'HTTP/S (sched)', appClass: 'bulk',        mode: 'backup',       min: 0,  max: 0 },
    { name: 'Default route',          matchType: 'subnet',   matchValue: 'All traffic',    appClass: 'default',     mode: 'failover',     min: 0,  max: 0 },
  ];

  return defs.map((d, i) => {
    const uplink = uplinkIds[i % Math.max(uplinkIds.length, 1)];
    const backup = uplinkIds[(i + 1) % Math.max(uplinkIds.length, 1)];
    return {
      id: `${siteId}-policy-${i + 1}`,
      siteId,
      name: d.name,
      matchType: d.matchType,
      matchValue: d.matchValue,
      appClass: d.appClass,
      uplinkIds: d.mode === 'primary' ? [uplink] : d.mode === 'backup' ? [backup, uplink] : [uplink, backup],
      mode: d.mode,
      enabled: i !== 3,
      maxBandwidthMbps: d.max,
      minBandwidthMbps: d.min,
      hitCount: seededInt(`${siteId}-p${i}-h`, 0, 90000),
    };
  });
}

const SITE_DEFS: Array<{
  id: string; name: string; code: string; role: SiteRole; region: string;
  country: string; city: string; lat: number; lon: number; tz: string;
  contact: string; subs: number; devs: number; upl: number; nets: number;
}> = [
  { id: 'site-nbo',   name: 'Nairobi HQ',         code: 'NBO-HQ',  role: 'hq',       region: 'Nairobi',    country: 'KE', city: 'Nairobi',    lat: -1.2864, lon: 36.8172, tz: 'Africa/Nairobi',     contact: 'ops@acme.co.ke',   subs: 0,    devs: 6, upl: 4, nets: 5 },
  { id: 'site-mombasa', name: 'Mombasa POP',      code: 'MBA-POP', role: 'pop',      region: 'Coast',    country: 'KE', city: 'Mombasa',   lat: -4.0435, lon: 39.6682, tz: 'Africa/Nairobi',     contact: 'noc@mba.acme.co.ke',subs: 0,    devs: 4, upl: 3, nets: 4 },
  { id: 'site-kisumu', name: 'Kisumu Branch',     code: 'KSM-BR',  role: 'branch',   region: 'Nyanza',    country: 'KE', city: 'Kisumu',    lat: -0.0917, lon: 34.7680, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 64,   devs: 3, upl: 2, nets: 3 },
  { id: 'site-nakuru', name: 'Nakuru Branch',     code: 'NKR-BR',  role: 'branch',   region: 'Rift Valley',    country: 'KE', city: 'Nakuru',    lat: -0.3031, lon: 36.0800, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 41,   devs: 3, upl: 2, nets: 3 },
  { id: 'site-eldoret', name: 'Eldoret Branch',   code: 'ELD-BR',  role: 'branch',   region: 'Rift Valley',    country: 'KE', city: 'Eldoret',   lat: 0.5143, lon: 35.2698, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 33,   devs: 2, upl: 2, nets: 2 },
  { id: 'site-thika',  name: 'Thika Branch',      code: 'THK-BR',  role: 'branch',   region: 'Central',    country: 'KE', city: 'Thika',     lat: -1.0333, lon: 36.8333, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 52,   devs: 3, upl: 2, nets: 3 },
  { id: 'site-garissa', name: 'Garissa Branch',   code: 'GAR-BR',  role: 'branch',   region: 'Eastern',    country: 'KE', city: 'Garissa',   lat: -0.4542, lon: 39.6380, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 18,   devs: 2, upl: 2, nets: 2 },
  { id: 'site-lamu',   name: 'Lamu CPE',          code: 'LAM-CPE', role: 'cpe',      region: 'Coast',          country: 'KE', city: 'Lamu',      lat: -2.2717, lon: 40.9020, tz: 'Africa/Nairobi',     contact: 'customer@acme.co.ke',subs: 12,  devs: 1, upl: 2, nets: 2 },
  { id: 'site-nanyuki', name: 'Nanyuki Branch',  code: 'NNY-BR',  role: 'branch',   region: 'Rift Valley',    country: 'KE', city: 'Nanyuki',   lat: -0.0167, lon: 37.0666, tz: 'Africa/Nairobi',     contact: 'it@acme.co.ke',     subs: 26,   devs: 2, upl: 2, nets: 2 },
  { id: 'site-wajir',  name: 'Wajir Satellite',   code: 'WAJ-SAT', role: 'cpe',      region: 'North Eastern',  country: 'KE', city: 'Wajir',     lat: 1.7500, lon: 40.0500, tz: 'Africa/Nairobi',     contact: 'customer@acme.co.ke',subs: 8,   devs: 1, upl: 1, nets: 2 },
];

/**
 * Overlay tunnel IPs are carved out of 10.100.0.0/16 deterministically.
 * Each site reserves a distinct /24 so a site can never collide with
 * another site's tunnel addressing.
 */
const OVERLAY_SITE_INDEX: Record<string, number> = {};
SITE_DEFS.forEach((d, i) => { OVERLAY_SITE_INDEX[d.id] = i + 1; });

export const SITES: Site[] = SITE_DEFS.map((def) => {
  const uplinkCount = def.upl;
  const uplinks = buildUplinks(def.id, uplinkCount, def.role === 'hq' || def.role === 'pop');
  const uplinkIds = uplinks.map(u => u.id);
  const devices = buildDevices(def.id, def.devs);
  const subnets = buildSubnets(def.id, def.nets);
  const policies = buildPolicies(def.id, uplinkIds);

  const contracted = uplinks.reduce((s, u) => s + u.downMbps, 0);
  const current = uplinks.reduce(
    (s, u) => s + (u.downMbps * u.utilizationPct) / 100,
    0,
  );

  // A site is only degraded when it loses redundancy — an active circuit
  // going down is an outage, but a standby going down is not.
  const hasActive = uplinks.some(u => u.state === 'active');
  const healthyStandby = uplinks.filter(u => u.state === 'standby' && u.downMbps > 0).length;

  const status: SiteStatus =
    def.id === 'site-wajir'
      ? 'degraded'                       // satellite backhaul, high latency
      : !hasActive
        ? 'offline'
        : healthyStandby === 0
          ? 'degraded'                   // no failover capacity left
          : 'online';

  return {
    id: def.id,
    name: def.name,
    code: def.code,
    role: def.role,
    status,
    region: def.region,
    country: def.country,
    city: def.city,
    lat: def.lat,
    lon: def.lon,
    timezone: def.tz,
    contact: def.contact,
    subscribers: def.subs,
    contractedMbps: contracted,
    currentMbps: Math.round(current),
    devices,
    uplinks,
    subnets,
    policies,
    overlayPeers: [],
    transitFor: [],
  };
});

/** Sites that act as transit for other sites (POP behaviour). */
const TRANSIT: Record<string, string[]> = {
  'site-nbo': ['site-kisumu', 'site-nakuru', 'site-eldoret', 'site-thika', 'site-garissa', 'site-lamu', 'site-nanyuki'],
  'site-mombasa': ['site-wajir'],
};

for (const [hubId, members] of Object.entries(TRANSIT)) {
  const hub = SITES.find(s => s.id === hubId);
  if (!hub) continue;
  hub.transitFor = members;
}

/** Overlay peers — every site peers with the hub, POPs peer with each other. */
for (const site of SITES) {
  const peers: OverlayPeer[] = [];

  for (const other of SITES) {
    if (other.id === site.id) continue;
    const isPeer =
      other.id === 'site-nbo' ||
      site.id === 'site-nbo' ||
      (site.role === 'pop' && other.role === 'pop');
    if (!isPeer) continue;

    const primary = other.uplinks
      .filter(u => u.state !== 'down')
      .sort((a, b) => a.priority - b.priority)[0];

    peers.push({
      id: `${site.id}-peer-${other.id}`,
      siteId: other.id,
      publicEndpoint: `${primary?.publicIp ?? '—'}:51820`,
      tunnelIp: other.devices[0]?.tunnelIp ?? '10.100.0.1',
      status: other.status === 'degraded' ? 'degraded' : 'up',
      allowedNetworks: other.subnets.map(s => s.cidr).slice(0, 2),
      lastHandshakeSeconds: seededInt(`${site.id}-${other.id}-hs`, 5, 600),
      roundTripMs: seededInt(`${site.id}-${other.id}-rtt`, 4, 90),
      isHub: other.id === 'site-nbo',
    });
  }

  site.overlayPeers = peers;
}

export const OVERLAYS: Overlay[] = [
  {
    id: 'overlay-core',
    name: 'Vortex Core Mesh',
    hubSiteId: 'site-nbo',
    port: 51820,
    addressPool: '10.100.0.0/16',
    memberSiteIds: SITES.map(s => s.id),
    status: 'up',
    throughputMbps: SITES.reduce((s, site) => s + site.currentMbps, 0),
  },
  {
    id: 'overlay-edge',
    name: 'Edge Satellite Mesh',
    hubSiteId: 'site-mombasa',
    port: 51821,
    addressPool: '10.110.0.0/16',
    memberSiteIds: ['site-mombasa', 'site-wajir', 'site-lamu'],
    status: 'degraded',
    throughputMbps: 240,
  },
];

// ── Derived helpers ─────────────────────────────────────────────────────────

export function getSite(id: string): Site | undefined {
  return SITES.find(s => s.id === id);
}

export function siteByCode(code: string): Site | undefined {
  return SITES.find(s => s.code.toLowerCase() === code.toLowerCase());
}

export function getOverlay(id: string): Overlay | undefined {
  return OVERLAYS.find(o => o.id === id);
}

export function totalSubscribers(): number {
  return SITES.reduce((s, site) => s + site.subscribers, 0);
}

export function totalContractedMbps(): number {
  return SITES.reduce((s, site) => s + site.contractedMbps, 0);
}

export function totalCurrentMbps(): number {
  return SITES.reduce((s, site) => s + site.currentMbps, 0);
}

/** All uplinks across all sites, flattened. */
export function allUplinks(): Array<Uplink & { siteName: string; siteCode: string }> {
  return SITES.flatMap(site =>
    site.uplinks.map(u => ({ ...u, siteName: site.name, siteCode: site.code })),
  );
}

/** Utilisation histogram buckets for the capacity overview. */
export function capacityBuckets(): Array<{ label: string; count: number; color: string }> {
  const buckets = [
    { label: '0–25%',  min: 0,  max: 25, color: '#10b981' },
    { label: '25–50%', min: 25, max: 50, color: '#3b82f6' },
    { label: '50–75%', min: 50, max: 75, color: '#f59e0b' },
    { label: '75–100%', min: 75, max: 101, color: '#ef4444' },
  ];
  return buckets.map(b => ({
    label: b.label,
    color: b.color,
    count: allUplinks().filter(
      u => u.downMbps > 0 && u.utilizationPct >= b.min && u.utilizationPct < b.max,
    ).length,
  }));
}

export const REGIONS: string[] = Array.from(new Set(SITES.map(s => s.region))).sort();
