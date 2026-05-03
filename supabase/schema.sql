-- MikroTik SaaS Platform (Project Vortex) Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Organizations
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  billing_status text default 'active',
  api_key uuid default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Routers
create table routers (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  serial_number text unique not null,
  model text,
  tunnel_ip inet,
  last_seen timestamp with time zone,
  firmware_version text,
  credentials_encrypted text, -- AES-256 encrypted
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Device Inventory (Friendly Mapper)
create table device_inventory (
  id uuid primary key default uuid_generate_v4(),
  router_id uuid references routers(id) on delete cascade not null,
  mac_address macaddr not null,
  nickname text,
  icon_type text,
  is_blocked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(router_id, mac_address)
);

-- Telemetry Metrics (Time-Series)
create table telemetry_metrics (
  id bigserial primary key,
  router_id uuid references routers(id) on delete cascade not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  tx_bps bigint default 0,
  rx_bps bigint default 0,
  cpu_load smallint default 0,
  ram_usage bigint default 0,
  signal_strength_dbm smallint
);

-- Index for performance on time-series data
create index telemetry_metrics_router_id_timestamp_idx on telemetry_metrics (router_id, timestamp desc);

-- Config Snapshots
create table config_snapshots (
  id uuid primary key default uuid_generate_v4(),
  router_id uuid references routers(id) on delete cascade not null,
  config_blob jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- System Audits
create table system_audits (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid, -- Link to Supabase Auth user
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies

alter table organizations enable row level security;
alter table routers enable row level security;
alter table device_inventory enable row level security;
alter table telemetry_metrics enable row level security;
alter table config_snapshots enable row level security;
alter table system_audits enable row level security;

-- Basic Policies (Placeholder: assumes auth.uid() links to user profiles with org_id)
-- These should be refined based on actual auth implementation

create policy "Users can see their own organization"
  on organizations for select
  using ( id in (select org_id from profiles where user_id = auth.uid()) );

create policy "Users can see routers in their organization"
  on routers for select
  using ( org_id in (select org_id from profiles where user_id = auth.uid()) );

-- ... more policies for other tables

-- Data Aggregation Functions (Phase 3)
-- This function can be called via pg_cron to periodically roll up metrics

create table if not exists telemetry_metrics_15m (
  id bigserial primary key,
  router_id uuid references routers(id) on delete cascade not null,
  timestamp timestamp with time zone not null,
  avg_tx_bps bigint,
  avg_rx_bps bigint,
  avg_cpu_load smallint,
  avg_ram_usage bigint,
  unique(router_id, timestamp)
);

create or replace function rollup_metrics_15m()
returns void language plpgsql as $$
begin
  insert into telemetry_metrics_15m (router_id, timestamp, avg_tx_bps, avg_rx_bps, avg_cpu_load, avg_ram_usage)
  select 
    router_id,
    date_trunc('hour', timestamp) + date_part('minute', timestamp)::int / 15 * interval '15 min' as timestamp,
    avg(tx_bps)::bigint,
    avg(rx_bps)::bigint,
    avg(cpu_load)::smallint,
    avg(ram_usage)::bigint
  from telemetry_metrics
  where timestamp >= now() - interval '1 hour' -- Only look at recent un-aggregated data
  group by 1, 2
  on conflict (router_id, timestamp) 
  do update set 
    avg_tx_bps = excluded.avg_tx_bps,
    avg_rx_bps = excluded.avg_rx_bps,
    avg_cpu_load = excluded.avg_cpu_load,
    avg_ram_usage = excluded.avg_ram_usage;
end;
$$;
