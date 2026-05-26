-- ============================================================
-- Stride Quest — Schema v2: Tile Decay + Teams/Squads + XP
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add XP column to user_profiles
-- ────────────────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists xp int not null default 0;

-- ────────────────────────────────────────────────────────────
-- 2. TEAMS table
-- ────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  faction     text not null default 'Unaffiliated',
  tag         text not null default '',   -- short 2-4 char tag, e.g. [CRM]
  created_by  uuid references public.user_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.teams enable row level security;
create policy "Anyone can view teams" on public.teams for select using (true);
create policy "Auth users can create teams" on public.teams for insert with check (auth.uid() is not null);

-- ────────────────────────────────────────────────────────────
-- 3. TEAM MEMBERS table
-- ────────────────────────────────────────────────────────────
create table if not exists public.team_members (
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.user_profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('leader','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;
create policy "Anyone can view team members" on public.team_members for select using (true);
create policy "Auth users manage own membership"
  on public.team_members for all
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. Atomic increment_user_stats RPC
-- ────────────────────────────────────────────────────────────
create or replace function public.increment_user_stats(
  p_user_id   uuid,
  p_distance_m float,
  p_tiles      int
) returns void language plpgsql security definer as $$
declare
  v_xp_gain int;
begin
  -- XP formula: 1 XP per 100m + 10 XP per tile captured
  v_xp_gain := floor(p_distance_m / 100)::int + (p_tiles * 10);

  update public.user_profiles
  set
    total_distance_m = total_distance_m + p_distance_m,
    captured_tiles   = captured_tiles   + p_tiles,
    xp               = xp               + v_xp_gain,
    -- Level up: simple threshold table stored as xp
    level = case
      when (xp + v_xp_gain) >= 50000 then 10
      when (xp + v_xp_gain) >= 20000 then 9
      when (xp + v_xp_gain) >= 10000 then 8
      when (xp + v_xp_gain) >= 5000  then 7
      when (xp + v_xp_gain) >= 2000  then 6
      when (xp + v_xp_gain) >= 1000  then 5
      when (xp + v_xp_gain) >= 500   then 4
      when (xp + v_xp_gain) >= 250   then 3
      when (xp + v_xp_gain) >= 100   then 2
      else 1
    end,
    updated_at = now()
  where id = p_user_id;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. Tile Decay function (run nightly via pg_cron)
-- ────────────────────────────────────────────────────────────
-- Decays strength by 5 for tiles inactive > 48 hours.
-- Resets ownership when strength reaches 0.
create or replace function public.decay_inactive_tiles() returns void
language plpgsql security definer as $$
begin
  -- Decay strength
  update public.tiles
  set
    strength     = greatest(strength - 5, 0),
    updated_at   = now()
  where
    last_activity < now() - interval '48 hours'
    and strength  > 0;

  -- Reset ownership for fully decayed tiles
  update public.tiles
  set
    owner_id      = null,
    control_score = 0,
    contested     = false,
    updated_at    = now()
  where
    strength = 0
    and owner_id is not null
    and last_activity < now() - interval '48 hours';
end;
$$;

-- Schedule decay to run every night at 2 AM UTC
-- Requires pg_cron extension (pre-installed on Supabase):
select cron.schedule(
  'tile-decay-nightly',
  '0 2 * * *',
  $$ select public.decay_inactive_tiles(); $$
);

-- ────────────────────────────────────────────────────────────
-- 6. Leaderboard view (top 50 by captured_tiles)
-- ────────────────────────────────────────────────────────────
create or replace view public.leaderboard as
  select
    u.id,
    u.username,
    u.faction,
    u.level,
    u.xp,
    u.captured_tiles,
    u.total_distance_m,
    rank() over (order by u.captured_tiles desc) as rank
  from public.user_profiles u
  order by u.captured_tiles desc
  limit 50;

-- Allow public read
grant select on public.leaderboard to anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. Enable realtime on new tables
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
