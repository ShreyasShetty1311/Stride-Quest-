-- ============================================================
-- Stride Quest — Supabase Database Schema
-- Run this once in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable PostGIS for geographic queries (Supabase has it pre-installed)
-- create extension if not exists postgis;

-- ────────────────────────────────────────────────────────────
-- 1. USERS (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null default 'Runner',
  faction       text not null default 'Unaffiliated',
  level         int  not null default 1,
  total_distance_m float not null default 0,   -- cumulative metres walked
  captured_tiles   int  not null default 0,
  streak_days      int  not null default 0,
  stamina          int  not null default 10,
  armor            int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Row Level Security: users can only read/write their own profile
alter table public.user_profiles enable row level security;

create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. SESSIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  status          text not null default 'active'
                    check (status in ('active','paused','ended')),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  distance_m      float not null default 0,
  tiles_captured  int   not null default 0,
  suspicious      boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. PATH POINTS  (GPS track for a session)
-- ────────────────────────────────────────────────────────────
create table if not exists public.path_points (
  id          bigserial primary key,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  lat         double precision not null,
  lon         double precision not null,
  accuracy    float,
  speed       float,
  recorded_at timestamptz not null default now()
);

-- Index for fast retrieval of a session's track
create index if not exists path_points_session_idx on public.path_points(session_id, recorded_at);

alter table public.path_points enable row level security;

create policy "Users manage own path points"
  on public.path_points for all
  using (
    auth.uid() = (
      select user_id from public.sessions where id = session_id
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. TILES  (50m grid cells — the core territory unit)
-- ────────────────────────────────────────────────────────────
create table if not exists public.tiles (
  id              text primary key,         -- "lat_lon" of NW corner (7 decimals)
  nw_lat          double precision not null,
  nw_lon          double precision not null,
  owner_id        uuid references public.user_profiles(id) on delete set null,
  control_score   float not null default 0,
  strength        int   not null default 0  check (strength between 0 and 100),
  contested       boolean not null default false,
  last_activity   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Allow ALL users to READ the full tile map (required for seeing others' territory)
alter table public.tiles enable row level security;

create policy "Anyone can view tiles"
  on public.tiles for select
  using (true);

create policy "Auth users can upsert tiles"
  on public.tiles for insert
  with check (auth.uid() is not null);

create policy "Auth users can update tiles"
  on public.tiles for update
  using (auth.uid() is not null);

-- ────────────────────────────────────────────────────────────
-- 5. TILE CONTROL  (per-user cumulative contribution per tile)
-- ────────────────────────────────────────────────────────────
create table if not exists public.tile_control (
  tile_id       text not null references public.tiles(id) on delete cascade,
  user_id       uuid not null references public.user_profiles(id) on delete cascade,
  control_score float not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (tile_id, user_id)
);

alter table public.tile_control enable row level security;

create policy "Anyone can view tile control"
  on public.tile_control for select
  using (true);

create policy "Auth users can upsert tile control"
  on public.tile_control for insert
  with check (auth.uid() is not null);

create policy "Auth users can update tile control"
  on public.tile_control for update
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. TERRITORY EVENTS  (audit log / activity feed)
-- ────────────────────────────────────────────────────────────
create table if not exists public.territory_events (
  id          bigserial primary key,
  type        text not null,               -- 'tile_captured' | 'perimeter_closed' | ...
  user_id     uuid references public.user_profiles(id) on delete set null,
  tile_id     text references public.tiles(id) on delete set null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

-- Index for live activity feeds
create index if not exists territory_events_user_idx on public.territory_events(user_id, created_at desc);
create index if not exists territory_events_tile_idx on public.territory_events(tile_id, created_at desc);

alter table public.territory_events enable row level security;

create policy "Anyone can view events"
  on public.territory_events for select
  using (true);

create policy "Auth users can insert events"
  on public.territory_events for insert
  with check (auth.uid() is not null);

-- ────────────────────────────────────────────────────────────
-- 7. Enable Realtime on hot tables
-- ────────────────────────────────────────────────────────────
-- Run these in the Supabase dashboard → Database → Replication
-- or via the SQL editor:

alter publication supabase_realtime add table public.tiles;
alter publication supabase_realtime add table public.territory_events;
