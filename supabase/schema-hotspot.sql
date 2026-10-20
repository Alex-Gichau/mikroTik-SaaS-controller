-- MikroTik SaaS Platform (Project Vortex) — Hotspot & Access Control Schema
--
-- Adds the two operator-grade features that complete the WISP / ISP console,
-- shaped after TP-Link Omada and Ubiquiti UniFi:
--
--   organizations
--     └─ sites
--          └─ hotspot_profiles    (reusable SSID templates: security, captive
--                                   portal, walled garden, rate limits)
--               └─ hotspot_instances  (a profile bound to a real AP device)
--                    └─ hotspot_sessions (live / historical client sessions)
--          └─ ip_access_lists     (named whitelist or blacklist per site)
--               └─ ip_access_entries (one address or CIDR inside a list)
--     └─ hotspot_vouchers      (prepaid access codes sold at the counter)

create extension if not exists "uuid-ossp";

-- ── Hotspot profiles ───────────────────────────────────────────────────────

create table if not exists hotspot_profiles (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  ssid text not null,
  -- 2.4ghz | 5ghz | both
  band text not null default 'both',
  -- wpa2-psk | wpa3 | wpa3-transition | open
  security text not null default 'wpa3',
  -- portal | voucher | psk | open
  auth_method text not null default 'portal',
  captive_portal_path text,
  walled_garden text[] not null default '{}',
  download_mbps_limit integer not null default 0,
  upload_mbps_limit integer not null default 0,
  session_timeout_minutes integer not null default 720,
  idle_timeout_minutes integer not null default 30,
  -- allow | deny | none
  mac_filter text not null default 'none',
  hide_ssid boolean not null default false,
  isolate_clients boolean not null default true,
  redirect_https boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (org_id, name)
);

create index if not exists hotspot_profiles_org_id_idx on hotspot_profiles (org_id);

-- ── Hotspot instances (a profile bound to a deployed AP) ───────────────────

create table if not exists hotspot_instances (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  device_id uuid references site_devices(id) on delete cascade,
  profile_id uuid not null references hotspot_profiles(id) on delete cascade,
  name text not null,
  bssid mac,
  channel integer,
  -- 2.4ghz | 5ghz
  band text not null default '5ghz',
  status text not null default 'online',
  max_clients integer not null default 100,
  active_clients integer not null default 0,
  utilization_pct numeric(5,2) not null default 0,
  tx_mbps numeric(10,2) not null default 0,
  rx_mbps numeric(10,2) not null default 0,
  sessions_today integer not null default 0,
  revenue_today_usd numeric(12,2) not null default 0,
  last_handshake_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (site_id, name)
);

create index if not exists hotspot_instances_site_idx on hotspot_instances (site_id);
create index if not exists hotspot_instances_status_idx on hotspot_instances (status);
create index if not exists hotspot_instances_profile_idx on hotspot_instances (profile_id);

-- ── Hotspot sessions (client association history) ──────────────────────────

create table if not exists hotspot_sessions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  hotspot_id uuid not null references hotspot_instances(id) on delete cascade,
  mac_address mac not null,
  ip_address inet,
  hostname text,
  vlan integer,
  signal_dbm smallint,
  -- portal | voucher | psk | open
  auth_method text not null default 'portal',
  voucher_id uuid,
  authorized boolean not null default false,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  download_mb numeric(12,2) not null default 0,
  upload_mb numeric(12,2) not null default 0,
  download_mbps numeric(10,2) not null default 0,
  upload_mbps numeric(10,2) not null default 0
);

create index if not exists hotspot_sessions_hotspot_idx on hotspot_sessions (hotspot_id, started_at desc);
create index if not exists hotspot_sessions_mac_idx on hotspot_sessions (mac_address);
create index if not exists hotspot_sessions_active_idx on hotspot_sessions (hotspot_id) where ended_at is null;

-- ── Hotspot vouchers ───────────────────────────────────────────────────────

create table if not exists hotspot_vouchers (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  code text not null,
  -- 1h | 6h | 12h | 1d | 3d | 7d | 30d
  package text not null default '1d',
  value_usd numeric(10,2) not null default 0,
  -- unused | active | expired | disabled
  status text not null default 'unused',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  valid_until timestamp with time zone not null,
  used_at timestamp with time zone,
  used_by_mac mac,
  unique (org_id, code)
);

create index if not exists hotspot_vouchers_status_idx on hotspot_vouchers (org_id, status);
create index if not exists hotspot_vouchers_site_idx on hotspot_vouchers (site_id);

alter table hotspot_sessions
  add constraint hotspot_sessions_voucher_fk
  foreign key (voucher_id) references hotspot_vouchers(id) on delete set null;

-- ── IP access lists (whitelist / blacklist) ────────────────────────────────

create table if not exists ip_access_lists (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  -- whitelist | blacklist
  kind text not null default 'blacklist',
  -- forward | input | hotspot
  scope text not null default 'forward',
  description text,
  enabled boolean not null default false,
  hit_count bigint not null default 0,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (site_id, name)
);

create index if not exists ip_access_lists_site_idx on ip_access_lists (site_id);
create index if not exists ip_access_lists_kind_idx on ip_access_lists (org_id, kind);

-- ── IP access entries ──────────────────────────────────────────────────────

create table if not exists ip_access_entries (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references ip_access_lists(id) on delete cascade,
  cidr cidr not null,
  comment text,
  status text not null default 'active',
  hit_count bigint not null default 0,
  last_hit_at timestamp with time zone,
  added_by uuid,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists ip_access_entries_list_idx on ip_access_entries (list_id);
create index if not exists ip_access_entries_cidr_idx on ip_access_entries (cidr);

-- Prevent the same address appearing twice inside one list.
create unique index if not exists ip_access_entries_unique_per_list
  on ip_access_entries (list_id, cidr);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table hotspot_profiles   enable row level security;
alter table hotspot_instances  enable row level security;
alter table hotspot_sessions   enable row level security;
alter table hotspot_vouchers   enable row level security;
alter table ip_access_lists    enable row level security;
alter table ip_access_entries  enable row level security;

create policy "Users can see hotspot profiles in their organization"
  on hotspot_profiles for select
  using ( org_id in (select org_id from profiles where user_id = auth.uid()) );

create policy "Users can see hotspots at their sites"
  on hotspot_instances for select
  using ( site_id in (select id from sites where org_id in (select org_id from profiles where user_id = auth.uid())) );

create policy "Users can see hotspot sessions at their sites"
  on hotspot_sessions for select
  using ( hotspot_id in (
    select hi.id from hotspot_instances hi
    join sites s on s.id = hi.site_id
    where s.org_id in (select org_id from profiles where user_id = auth.uid())
  ) );

create policy "Users can see vouchers in their organization"
  on hotspot_vouchers for select
  using ( org_id in (select org_id from profiles where user_id = auth.uid()) );

create policy "Users can see access lists at their sites"
  on ip_access_lists for select
  using ( site_id in (select id from sites where org_id in (select org_id from profiles where user_id = auth.uid())) );

create policy "Users can see access entries in their lists"
  on ip_access_entries for select
  using ( list_id in (
    select l.id from ip_access_lists l
    join sites s on s.id = l.site_id
    where s.org_id in (select org_id from profiles where user_id = auth.uid())
  ) );

-- Writes are audit-logged; the API layer resolves org_id from the session.

-- ── Helper: the RouterOS rule an access list expands to ───────────────────

create or replace function ip_access_list_commands(list_id uuid)
returns text[] language plpgsql as $$
declare
  l record;
  e record;
  out text[] := '{}';
  comment text;
  action text;
begin
  select * into l from ip_access_lists where id = list_id;
  if not found then
    return out;
  end if;

  comment := 'vortex-acl:' || l.kind || ':' || l.name;
  action  := case when l.kind = 'whitelist' then 'accept' else 'drop' end;

  for e in select cidr::text as cidr from ip_access_entries where list_id = list_id loop
    if l.scope = 'hotspot' then
      if l.kind = 'whitelist' then
        out := array_append(out, '/ip/hotspot/allowed-address add address=' || e.cidr || ' comment="' || comment || '"');
      else
        out := array_append(out, '/ip/hotspot/ip-binding add address=' || e.cidr || ' type=blocked comment="' || comment || '"');
      end if;
    else
      out := array_append(out, '/ip/firewall/filter add chain=' || l.scope || ' src-address=' || e.cidr || ' action=' || action || ' comment="' || comment || '" place-before=0');
    end if;
  end loop;

  return out;
end;
$$;
