-- MikroTik SaaS Platform (Project Vortex) — WAN / SD-WAN Schema
--
-- Extends the original per-router model with the multi-site concepts used by
-- service providers running a wide-area network, in the shape of Ubiquiti UniFi
-- or TP-Link Omada:
--
--   organizations
--     └─ sites              (HQ, branch, POP, CPE)
--          └─ site_devices  (edge / core / access / AP / cellular routers)
--          └─ wan_uplinks   (ISP circuits: fibre, DSL, LTE, 5G, satellite)
--          └─ subnets        (LAN / DMZ / guest / mgmt / voice VLANs)
--          └─ policy_routes  (SD-WAN steering: which egress for which traffic)
--          └─ overlay_peers  (WireGuard mesh members)
--     └─ sdwan_overlays     (named WireGuard meshes with a hub site)
--     └─ config_templates   (site-level templates pushed to a whole site)
--     └─ bandwidth_events   (per-uplink time series for capacity planning)

create extension if not exists "uuid-ossp";

-- ── Enumerations (as check constraints for easy migration) ─────────────────

create table if not exists sites (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text not null,
  -- hq | branch | pop | cpe | customer
  role text not null default 'branch',
  -- online | degraded | offline | maintenance
  status text not null default 'online',
  region text,
  country text,
  city text,
  lat double precision,
  lon double precision,
  timezone text default 'UTC',
  contact_email text,
  subscribers integer not null default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (org_id, code)
);

create index if not exists sites_org_id_idx on sites (org_id);
create index if not exists sites_status_idx on sites (status);

-- ── Devices deployed at a site ────────────────────────────────────────────

create table if not exists site_devices (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  router_id uuid references routers(id) on delete set null,
  name text not null,
  model text,
  -- edge | core | access | ap | cellular
  role text not null default 'access',
  status text not null default 'online',
  serial_number text,
  firmware_version text,
  tunnel_ip inet,
  mgmt_ip inet,
  wan_role text,
  uptime_seconds bigint default 0,
  last_seen timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists site_devices_site_id_idx on site_devices (site_id);

-- ── WAN uplinks (ISP circuits) ─────────────────────────────────────────────

create table if not exists wan_uplinks (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  -- fiber | ethernet | dsl | lte | 5g | satellite | starlink | backup
  type text not null,
  provider text,
  public_ip inet,
  local_ip inet,
  contracted_down_mbps integer not null default 0,
  contracted_up_mbps integer not null default 0,
  measured_down_mbps integer not null default 0,
  measured_up_mbps integer not null default 0,
  utilization_pct numeric(5,2) not null default 0,
  latency_ms integer not null default 0,
  jitter_ms integer not null default 0,
  loss_pct numeric(5,2) not null default 0,
  -- active | standby | down | degraded
  state text not null default 'standby',
  -- failover order, lower wins
  priority smallint not null default 1,
  enabled boolean not null default true,
  monthly_cost_usd numeric(10,2) not null default 0,
  circuit_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists wan_uplinks_site_id_idx on wan_uplinks (site_id, priority);

-- ── Subnets / VLANs ───────────────────────────────────────────────────────

create table if not exists subnets (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  cidr cidr not null,
  vlan smallint not null,
  -- lan | dmz | guest | management | voice
  purpose text not null default 'lan',
  device_count integer not null default 0,
  bandwidth_utilization_pct numeric(5,2) not null default 0,
  dhcp_enabled boolean not null default true
);

create index if not exists subnets_site_id_idx on subnets (site_id);

-- ── SD-WAN policy based routing ───────────────────────────────────────────

create table if not exists policy_routes (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  -- subnet | app | dst | src-port | protocol
  match_type text not null,
  match_value text not null,
  -- default | voip | video | gaming | bulk | management | guest
  app_class text not null default 'default',
  -- primary | backup | load-balance | failover
  mode text not null default 'primary',
  -- ordered list of wan_uplink ids
  uplink_ids uuid[] not null default '{}',
  enabled boolean not null default true,
  max_bandwidth_mbps integer not null default 0,
  min_bandwidth_mbps integer not null default 0,
  hit_count bigint not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists policy_routes_site_id_idx on policy_routes (site_id);

-- ── SD-WAN overlays (WireGuard meshes) ────────────────────────────────────

create table if not exists sdwan_overlays (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  hub_site_id uuid references sites(id) on delete set null,
  listen_port integer not null default 51820,
  address_pool cidr not null,
  public_key text,
  -- up | degraded | down
  status text not null default 'up',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists overlay_peers (
  id uuid primary key default uuid_generate_v4(),
  overlay_id uuid not null references sdwan_overlays(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  public_endpoint text,
  tunnel_ip inet,
  allowed_networks cidr[] not null default '{}',
  -- up | degraded | down
  status text not null default 'up',
  last_handshake_at timestamp with time zone,
  round_trip_ms integer not null default 0,
  is_hub boolean not null default false,
  unique (overlay_id, site_id)
);

-- ── Config templates (Omada-style device profiles) ────────────────────────

create table if not exists config_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'general',
  -- jsonb of RouterOS commands / structured config
  payload jsonb not null default '{}'::jsonb,
  -- number of sites/devices this template has been applied to
  applied_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists template_applications (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references config_templates(id) on delete cascade,
  site_id uuid references sites(id) on delete cascade,
  router_id uuid references routers(id) on delete cascade,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  applied_by uuid,
  result text not null default 'pending'
);

-- ── Per-uplink time series for capacity planning ──────────────────────────

create table if not exists bandwidth_events (
  id bigserial primary key,
  uplink_id uuid not null references wan_uplinks(id) on delete cascade,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  tx_bps bigint default 0,
  rx_bps bigint default 0,
  latency_ms integer default 0,
  loss_pct numeric(5,2) default 0
);

create index if not exists bandwidth_events_uplink_ts_idx on bandwidth_events (uplink_id, timestamp desc);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table sites            enable row level security;
alter table site_devices     enable row level security;
alter table wan_uplinks      enable row level security;
alter table subnets          enable row level security;
alter table policy_routes    enable row level security;
alter table sdwan_overlays   enable row level security;
alter table overlay_peers    enable row level security;
alter table config_templates enable row level security;
alter table bandwidth_events enable row level security;

create policy "Users can see sites in their organization"
  on sites for select
  using ( org_id in (select org_id from profiles where user_id = auth.uid()) );

create policy "Users can see devices at their sites"
  on site_devices for select
  using ( site_id in (select id from sites where org_id in (select org_id from profiles where user_id = auth.uid())) );

create policy "Users can see uplinks at their sites"
  on wan_uplinks for select
  using ( site_id in (select id from sites where org_id in (select org_id from profiles where user_id = auth.uid())) );

create policy "Users can see policies at their sites"
  on policy_routes for select
  using ( site_id in (select id from sites where org_id in (select org_id from profiles where user_id = auth.uid())) );

create policy "Users can see overlays in their organization"
  on sdwan_overlays for select
  using ( org_id in (select org_id from profiles where user_id = auth.uid()) );

-- Writes are audit-logged; the API layer resolves org_id from the session.

-- ── Aggregation: 15-minute uplink utilisation rollup ──────────────────────

create table if not exists bandwidth_events_15m (
  id bigserial primary key,
  uplink_id uuid not null references wan_uplinks(id) on delete cascade,
  timestamp timestamp with time zone not null,
  avg_tx_bps bigint,
  avg_rx_bps bigint,
  avg_latency_ms integer,
  max_utilization_pct numeric(5,2),
  unique (uplink_id, timestamp)
);

create or replace function rollup_bandwidth_15m()
returns void language plpgsql as $$
begin
  insert into bandwidth_events_15m
    (uplink_id, timestamp, avg_tx_bps, avg_rx_bps, avg_latency_ms, max_utilization_pct)
  select
    uplink_id,
    date_trunc('hour', timestamp) + date_part('minute', timestamp)::int / 15 * interval '15 min' as timestamp,
    avg(tx_bps)::bigint,
    avg(rx_bps)::bigint,
    avg(latency_ms)::integer,
    max(((tx_bps + rx_bps)::numeric / 8 / 1000000) / 100 * 100) as max_utilization_pct
  from bandwidth_events
  where timestamp >= now() - interval '1 hour'
  group by 1, 2
  on conflict (uplink_id, timestamp)
  do update set
    avg_tx_bps = excluded.avg_tx_bps,
    avg_rx_bps = excluded.avg_rx_bps,
    avg_latency_ms = excluded.avg_latency_ms,
    max_utilization_pct = excluded.max_utilization_pct;
end;
$$;
