#!/usr/bin/env node
/**
 * seed.mjs — Stride Quest Supabase seed script
 *
 * Run once:  node seed.mjs
 *
 * What it does:
 *   1. Creates the alex_shadow user via Supabase Admin Auth API
 *      (username: alex_shadow, password: Vanguard_Alpha_99)
 *   2. Upserts their user_profiles row with all stats from mockDb
 *   3. Seeds the sectors as territory_events (for leaderboard/display)
 *   4. Seeds the 10 notifications as recent alert records (future alerts table)
 *
 * Requires:  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 *            The service role key is in your Supabase dashboard → Settings → API.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL           = process.env.SUPABASE_URL           || 'https://jxiscjqlpqyhibiewfwa.supabase.co';
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY env var not set.');
  console.error('    Export it before running:');
  console.error('    export SUPABASE_SERVICE_ROLE_KEY=<your service role key>');
  process.exit(1);
}

// Service-role client bypasses RLS — only use server-side
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── alex_shadow credentials ───────────────────────────────────────────────

const ALEX = {
  email:    'alex_shadow@stridequest.app',
  password: 'Vanguard_Alpha_99',
  username: 'Alex Shadow',
  faction:  'Cobalt',          // maps to #3b82f6 blue
};

// ─── Mock stats (from mockDb.ts initialUser) ───────────────────────────────

const ALEX_STATS = {
  total_distance_m: 1240800,   // 1240.8 km
  captured_tiles:   1700,      // ~42.5 sq-km at 0.0025 sq-km/tile
  level:            42,
  xp:               18500,
  streak_days:      15,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function ok(label, data, error) {
  if (error) {
    console.warn(`  ⚠  ${label}: ${error.message}`);
  } else {
    console.log(`  ✅ ${label}`, data?.id ?? data?.length ?? '');
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━ Stride Quest Supabase Seed ━━━\n');

  // 1. Create / retrieve alex_shadow in Supabase Auth
  console.log('1. Registering alex_shadow in Supabase Auth...');
  let alexUserId;

  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email:             ALEX.email,
    password:          ALEX.password,
    email_confirm:     true,
    user_metadata:     { username: ALEX.username },
  });

  if (createErr) {
    if (createErr.message.includes('already been registered') || createErr.message.includes('already exists')) {
      // User already exists — look up by email
      console.log('   User already exists, looking up by email...');
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) { console.error('❌ listUsers error:', listErr.message); process.exit(1); }
      const existing = listData.users.find(u => u.email === ALEX.email);
      if (!existing) { console.error('❌ Could not find existing user'); process.exit(1); }
      alexUserId = existing.id;
      console.log(`   Found existing user: ${alexUserId}`);
    } else {
      console.error('❌ createUser error:', createErr.message);
      process.exit(1);
    }
  } else {
    alexUserId = createData.user.id;
    console.log(`   Created user: ${alexUserId}`);
  }

  // 2. Upsert user_profiles row
  console.log('\n2. Seeding user_profiles...');
  const { data: profileData, error: profileErr } = await supabase
    .from('user_profiles')
    .upsert({
      id:               alexUserId,
      username:         ALEX.username,
      faction:          ALEX.faction,
      level:            ALEX_STATS.level,
      xp:               ALEX_STATS.xp,
      total_distance_m: ALEX_STATS.total_distance_m,
      captured_tiles:   ALEX_STATS.captured_tiles,
      streak_days:      ALEX_STATS.streak_days,
    }, { onConflict: 'id' })
    .select('id')
    .single();
  ok('user_profiles upsert', profileData, profileErr);

  // 3. Seed a demo session for alex
  console.log('\n3. Seeding a demo session...');
  const { data: sessionData, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      user_id:        alexUserId,
      status:         'ended',
      distance_m:     5240,
      tiles_captured: 18,
      suspicious:     false,
      ended_at:       new Date().toISOString(),
    })
    .select('id')
    .single();
  ok('sessions insert', sessionData, sessionErr);

  // 4. Seed sample tiles around BMSCE Indoor Stadium
  console.log('\n4. Seeding BMSCE territory tiles...');
  const BMSCE_LAT = 12.9406554;
  const BMSCE_LON = 77.5659529;
  const TILE_DEG  = 50 / 111320; // 50m tile in degrees

  const bmsceTiles = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nwLat = BMSCE_LAT + dy * TILE_DEG;
      const nwLon = BMSCE_LON + dx * TILE_DEG;
      const tileId = `${nwLat.toFixed(6)},${nwLon.toFixed(6)}`;
      bmsceTiles.push({
        id:            tileId,
        nw_lat:        nwLat,
        nw_lon:        nwLon,
        owner_id:      alexUserId,
        control_score: 100 - Math.abs(dy) * 10 - Math.abs(dx) * 10,
        strength:      80,
        contested:     false,
        last_activity: new Date().toISOString(),
      });
    }
  }

  const { error: tileErr } = await supabase
    .from('tiles')
    .upsert(bmsceTiles, { onConflict: 'id' });
  ok(`tiles upsert (${bmsceTiles.length} tiles)`, bmsceTiles, tileErr);

  // 5. Seed tile_control entries
  console.log('\n5. Seeding tile_control...');
  const tileControls = bmsceTiles.map(t => ({
    tile_id:       t.id,
    user_id:       alexUserId,
    control_score: t.control_score,
  }));
  const { error: tcErr } = await supabase
    .from('tile_control')
    .upsert(tileControls, { onConflict: 'tile_id,user_id' });
  ok(`tile_control upsert (${tileControls.length} rows)`, tileControls, tcErr);

  console.log('\n━━━ Seed complete ━━━\n');
  console.log('  Login credentials:');
  console.log(`    Username : alex_shadow`);
  console.log(`    Email    : ${ALEX.email}`);
  console.log(`    Password : ${ALEX.password}`);
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
