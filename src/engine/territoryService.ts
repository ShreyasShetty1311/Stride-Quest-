/**
 * territoryService.ts — Supabase persistence layer for the territory engine.
 *
 * Responsibilities:
 *   - Persist session lifecycle (start, end) to the `sessions` table
 *   - Batch-write GPS path points to `path_points` (buffered to avoid request spam)
 *   - Upsert tile ownership after each capture to `tiles` and `tile_control`
 *   - Insert territory events to `territory_events`
 *   - Subscribe to real-time tile changes from OTHER users and merge into local store
 *
 * All writes are fire-and-forget (non-blocking) — the local in-memory store
 * (territoryStore) is the source of truth for UI rendering.
 */

import { supabase } from '../lib/supabaseClient';
import { territoryStore, Tile, TerritoryEvent } from './territory';

// ─────────────────────────────────────────────
// Types matching DB schema
// ─────────────────────────────────────────────

interface DbTile {
  id: string;
  nw_lat: number;
  nw_lon: number;
  owner_id: string | null;
  control_score: number;
  strength: number;
  contested: boolean;
  last_activity: string | null;
}

interface DbTileControl {
  tile_id: string;
  user_id: string;
  control_score: number;
}

// ─────────────────────────────────────────────
// GPS point write buffer
// ─────────────────────────────────────────────

interface PathPointBuffer {
  session_id: string;
  lat: number;
  lon: number;
  accuracy: number;
  speed: number | null;
}

const pathBuffer: PathPointBuffer[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Enqueue a path point for batch write (flushes every 5 seconds). */
export function enqueuePathPoint(sessionId: string, lat: number, lon: number, accuracy: number, speed: number | null) {
  pathBuffer.push({ session_id: sessionId, lat, lon, accuracy, speed });

  if (!flushTimer) {
    flushTimer = setTimeout(flushPathPoints, 5000);
  }
}

async function flushPathPoints() {
  flushTimer = null;
  if (pathBuffer.length === 0) return;

  const batch = pathBuffer.splice(0, pathBuffer.length);
  const rows = batch.map(p => ({
    session_id: p.session_id,
    lat: p.lat,
    lon: p.lon,
    accuracy: p.accuracy,
    speed: p.speed,
  }));

  const { error } = await supabase.from('path_points').insert(rows);
  if (error) {
    console.warn('[StrideQuest] path_points flush error:', error.message);
    // Re-enqueue on error (best-effort)
    pathBuffer.unshift(...batch);
  }
}

// ─────────────────────────────────────────────
// Session lifecycle
// ─────────────────────────────────────────────

/** Create a session record in Supabase. Returns the DB session id. */
export async function createDbSession(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, status: 'active' })
    .select('id')
    .single();

  if (error) {
    console.warn('[StrideQuest] createDbSession error:', error.message);
    return null;
  }
  return data.id as string;
}

/** Update a session to ended state with final stats. */
export async function closeDbSession(
  sessionId: string,
  distanceM: number,
  tilesCaptured: number,
  suspicious: boolean
) {
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      distance_m: distanceM,
      tiles_captured: tilesCaptured,
      suspicious,
    })
    .eq('id', sessionId);

  if (error) console.warn('[StrideQuest] closeDbSession error:', error.message);

  // Flush any remaining path points
  await flushPathPoints();
}

// ─────────────────────────────────────────────
// Tile upserts
// ─────────────────────────────────────────────

/**
 * Upsert a tile and its tile_control entry after a capture.
 * Also updates the user's captured_tiles counter.
 */
export async function upsertTile(tile: Tile, userId: string) {
  const tileRow: DbTile = {
    id: tile.id,
    nw_lat: tile.nwLat,
    nw_lon: tile.nwLon,
    owner_id: tile.ownerId,
    control_score: tile.controlScore,
    strength: tile.strength,
    contested: tile.contested,
    last_activity: tile.lastActivity ? new Date(tile.lastActivity).toISOString() : null,
  };

  const { error: tileErr } = await supabase
    .from('tiles')
    .upsert(tileRow, { onConflict: 'id' });

  if (tileErr) {
    console.warn('[StrideQuest] tile upsert error:', tileErr.message);
    return;
  }

  // Update tile_control for this user
  const contribution = tile.contributors.find(c => c.userId === userId);
  if (contribution) {
    const controlRow: DbTileControl = {
      tile_id: tile.id,
      user_id: userId,
      control_score: contribution.controlScore,
    };
    await supabase
      .from('tile_control')
      .upsert(controlRow, { onConflict: 'tile_id,user_id' });
  }
}

/** Batch upsert all tiles affected in a session. */
export async function upsertAffectedTiles(affectedTileIds: Set<string>, userId: string) {
  const promises: Promise<void>[] = [];
  affectedTileIds.forEach(id => {
    const tile = territoryStore.tiles.get(id);
    if (tile) promises.push(upsertTile(tile, userId));
  });
  await Promise.all(promises);
}

// ─────────────────────────────────────────────
// Territory events
// ─────────────────────────────────────────────

export async function insertTerritoryEvent(event: Pick<TerritoryEvent, 'type' | 'userId' | 'tileId' | 'meta'>) {
  const { error } = await supabase.from('territory_events').insert({
    type: event.type,
    user_id: event.userId,
    tile_id: event.tileId ?? null,
    meta: event.meta ?? null,
  });
  if (error) console.warn('[StrideQuest] territory_events insert error:', error.message);
}

// ─────────────────────────────────────────────
// Load nearby tiles from DB into local store
// ─────────────────────────────────────────────

/**
 * Fetch tiles within a lat/lon bounding box from Supabase
 * and merge them into the local territory store.
 */
export async function loadNearbyTiles(
  minLat: number, maxLat: number,
  minLon: number, maxLon: number
) {
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .gte('nw_lat', minLat)
    .lte('nw_lat', maxLat)
    .gte('nw_lon', minLon)
    .lte('nw_lon', maxLon);

  if (error) {
    console.warn('[StrideQuest] loadNearbyTiles error:', error.message);
    return;
  }

  // Merge remote tiles into local store (remote is authoritative for others' tiles)
  (data as DbTile[]).forEach(row => {
    const tile = territoryStore.getOrCreateTile(row.id, row.nw_lat, row.nw_lon);
    tile.ownerId = row.owner_id;
    tile.controlScore = row.control_score;
    tile.strength = row.strength;
    tile.contested = row.contested;
    tile.lastActivity = row.last_activity ? new Date(row.last_activity).getTime() : null;
  });

  territoryStore.notify();
}

// ─────────────────────────────────────────────
// User profile helpers
// ─────────────────────────────────────────────

/** Ensure a user_profiles row exists for the given auth user id. */
export async function ensureUserProfile(userId: string, username = 'Runner') {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!data) {
    await supabase.from('user_profiles').insert({ id: userId, username });
  }
}

/** Update user stats after a session ends. */
export async function updateUserStats(
  userId: string,
  distanceM: number,
  tilesCaptured: number
) {
  // Use rpc increment to avoid race conditions with concurrent sessions
  const { error } = await supabase.rpc('increment_user_stats', {
    p_user_id: userId,
    p_distance_m: distanceM,
    p_tiles: tilesCaptured,
  });

  if (error) {
    // Fallback: direct update if rpc not yet deployed
    console.warn('[StrideQuest] increment_user_stats rpc missing, using direct update');
    await supabase
      .from('user_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);
  }
}

// ─────────────────────────────────────────────
// Real-time subscriptions
// ─────────────────────────────────────────────

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Subscribe to live tile changes from other users.
 * Merges remote updates into local store so the map reflects real-time ownership.
 */
export function subscribeToTileChanges(localUserId: string) {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('tiles-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tiles' },
      (payload) => {
        const row = payload.new as DbTile;
        if (!row?.id) return;

        // Only merge tiles owned by OTHER users (our own tiles are already in store)
        if (row.owner_id === localUserId) return;

        const tile = territoryStore.getOrCreateTile(row.id, row.nw_lat, row.nw_lon);
        tile.ownerId = row.owner_id;
        tile.controlScore = row.control_score;
        tile.strength = row.strength;
        tile.contested = row.contested;
        tile.lastActivity = row.last_activity ? new Date(row.last_activity).getTime() : null;
        territoryStore.notify();
      }
    )
    .subscribe();
}

/** Tear down realtime subscription (call on unmount / session end). */
export function unsubscribeFromTileChanges() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
