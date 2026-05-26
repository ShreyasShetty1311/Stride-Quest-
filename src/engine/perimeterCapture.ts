/**
 * perimeterCapture.ts — Loop detection and territory claim engine.
 *
 * Core mechanic: when the player's GPS path reconnects near a previous
 * segment/start point and the enclosed area exceeds the minimum threshold,
 * the loop is "closed" and territory claim is triggered.
 *
 * After closure:
 *   - Determine all 50m tiles inside the polygon
 *   - Apply cumulative control score to each tile (perimeter-distance model)
 *   - Flip ownership if the player's score exceeds the current owner
 *   - Increase tile strength on successful claim
 *   - Fire territory events
 */

import { territoryStore, TILE_SIZE_DEG_LAT, MIN_LOOP_AREA_SQ_M, LOOP_CLOSE_TOLERANCE_M, MIN_POINTS_FOR_LOOP, GPSPoint, TileControlEntry } from './territory';
import { haversineMetres, polygonAreaSqM, pointInPolygon, tilesInViewport, snapToTile } from './geoUtils';

/** The CURRENT_USER_ID is a placeholder until auth is wired up. */
const CURRENT_USER_ID = 'player-1';

/** Result returned from checkLoopClosure */
export interface LoopCheckResult {
  closed: boolean;
  enclosedTileCount: number;
  capturedCount: number;
  perimeterMetres: number;
}

/**
 * Check whether the latest GPS path has formed a closed loop.
 * Call this each time a new GPS point is accepted.
 *
 * @param path - The current session path (GPSPoint array)
 * @returns LoopCheckResult
 */
export function checkLoopClosure(path: GPSPoint[]): LoopCheckResult {
  const result: LoopCheckResult = { closed: false, enclosedTileCount: 0, capturedCount: 0, perimeterMetres: 0 };

  if (path.length < MIN_POINTS_FOR_LOOP) return result;

  const last = path[path.length - 1];

  // Look backwards through the path to find a point close enough to the last
  // that is NOT in the recent tail (avoid false positives from normal movement).
  // We skip the last 8 points (~16 seconds of movement minimum before checking).
  const TAIL_SKIP = 8;
  const searchEnd = path.length - 1 - TAIL_SKIP;

  for (let i = 0; i < searchEnd; i++) {
    const candidate = path[i];
    const dist = haversineMetres(last.lat, last.lon, candidate.lat, candidate.lon);

    if (dist <= LOOP_CLOSE_TOLERANCE_M) {
      // Potential loop closed! Extract the polygon segment from i to end
      const polygonCoords: [number, number][] = path
        .slice(i)
        .map(p => [p.lat, p.lon] as [number, number]);

      const area = polygonAreaSqM(polygonCoords);

      if (area < MIN_LOOP_AREA_SQ_M) {
        // Too small — ignore (GPS jitter)
        return result;
      }

      // Compute perimeter distance of this loop (sum of path distances from i to end)
      let perimeterM = 0;
      for (let j = i; j < path.length - 1; j++) {
        perimeterM += haversineMetres(path[j].lat, path[j].lon, path[j + 1].lat, path[j + 1].lon);
      }
      // Close the loop
      perimeterM += haversineMetres(last.lat, last.lon, candidate.lat, candidate.lon);

      result.perimeterMetres = perimeterM;

      // Determine bounding box to enumerate candidate tiles
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      polygonCoords.forEach(([lat, lon]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });

      const candidateTiles = tilesInViewport(minLat, maxLat, minLon, maxLon, TILE_SIZE_DEG_LAT);

      // Check each candidate tile — is its centre inside the polygon?
      let enclosedCount = 0;
      let capturedCount = 0;

      candidateTiles.forEach(({ id, nwLat, nwLon }) => {
        const tileSizeDegLon = 50 / (Math.cos((nwLat * Math.PI) / 180) * 111320);
        const centreLat = nwLat - TILE_SIZE_DEG_LAT / 2;
        const centreLon = nwLon + tileSizeDegLon / 2;

        if (!pointInPolygon(centreLat, centreLon, polygonCoords)) return;

        enclosedCount++;
        const tile = territoryStore.getOrCreateTile(id, nwLat, nwLon);

        // Contribute perimeter score
        const contribution = perimeterM;
        applyControlScore(tile, CURRENT_USER_ID, contribution);

        if (tile.ownerId === CURRENT_USER_ID) {
          capturedCount++;
          territoryStore.addEvent({ type: 'tile_captured', userId: CURRENT_USER_ID, tileId: id });
          if (territoryStore.session) {
            territoryStore.session.capturedTileIds.add(id);
          }
        } else {
          territoryStore.addEvent({ type: 'tile_contested', userId: CURRENT_USER_ID, tileId: id });
        }

        tile.lastActivity = Date.now();
        if (territoryStore.session) {
          territoryStore.session.affectedTileIds.add(id);
        }
      });

      result.closed = true;
      result.enclosedTileCount = enclosedCount;
      result.capturedCount = capturedCount;

      territoryStore.addEvent({
        type: 'perimeter_closed',
        userId: CURRENT_USER_ID,
        meta: { area, perimeterM, enclosedCount, capturedCount },
      });

      territoryStore.notify();
      return result;
    }
  }

  return result;
}

/**
 * Apply a player's control score contribution to a tile.
 * Ownership flips when a player's cumulative score exceeds the current owner.
 */
function applyControlScore(tile: typeof territoryStore.tiles extends Map<string, infer T> ? T : never, userId: string, contribution: number): void {
  // Update contributors list
  const existing = tile.contributors.find(c => c.userId === userId);
  if (existing) {
    existing.controlScore += contribution;
  } else {
    tile.contributors.push({ userId, controlScore: contribution });
  }

  // Sort contributors by score descending
  tile.contributors.sort((a, b) => b.controlScore - a.controlScore);

  const topContributor = tile.contributors[0];
  const previousOwner = tile.ownerId;

  tile.ownerId = topContributor.userId;
  tile.controlScore = topContributor.controlScore;

  // Contested: top two players within 20% of each other
  if (tile.contributors.length >= 2) {
    const second = tile.contributors[1].controlScore;
    tile.contested = second >= topContributor.controlScore * 0.8;
  } else {
    tile.contested = false;
  }

  // Increase strength on successful claim/defense
  if (tile.ownerId === userId) {
    if (previousOwner === userId) {
      // Defense bonus
      tile.strength = Math.min(tile.strength + 5, 100);
    } else {
      // New capture
      tile.strength = Math.max(10, tile.strength - 20); // enemy had some strength
    }
  }
}

// ─────────────────────────────────────────────
// Faction colour palette
// ─────────────────────────────────────────────

export type Faction = 'Unaffiliated' | 'Crimson' | 'Verdant' | 'Cobalt' | 'Amber';

export const FACTION_COLORS: Record<Faction, string> = {
  Unaffiliated: '#94a3b8', // slate
  Crimson:      '#ef4444', // red
  Verdant:      '#22c55e', // green  (local player is always green regardless)
  Cobalt:       '#3b82f6', // blue
  Amber:        '#f59e0b', // amber
};

/** Player's own faction — can be updated at runtime via setLocalFaction(). */
let _localFaction: Faction = 'Unaffiliated';
export function setLocalFaction(f: Faction) { _localFaction = f; }
export function getLocalFaction() { return _localFaction; }

/**
 * Map from userId → faction for all known players seen in the current session.
 * Updated by the territory service when it loads tiles from Supabase.
 */
export const userFactionMap = new Map<string, Faction>();

/**
 * Determine the display ownership type for a tile relative to the local player.
 */
export function getTileDisplayType(tile: { ownerId: string | null; contested: boolean }): 'neutral' | 'self' | 'enemy' | 'contested' {
  if (tile.contested) return 'contested';
  if (!tile.ownerId) return 'neutral';
  if (tile.ownerId === CURRENT_USER_ID) return 'self';
  return 'enemy';
}

/**
 * Get Leaflet polygon style options for a tile based on its ownership type.
 * Enemy tiles use the owner's faction colour when known.
 */
export function getTileStyle(
  type: 'neutral' | 'self' | 'enemy' | 'contested',
  ownerId?: string | null
): {
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  dashArray?: string;
} {
  switch (type) {
    case 'self': {
      const selfCol = FACTION_COLORS[getLocalFaction()];
      return { color: selfCol, fillColor: selfCol, fillOpacity: 0.32, weight: 0 };
    }
    case 'enemy': {
      const faction = ownerId ? (userFactionMap.get(ownerId) ?? 'Unaffiliated') : 'Unaffiliated';
      const col = faction === 'Verdant' ? '#22c55e' : FACTION_COLORS[faction];
      return { color: col, fillColor: col, fillOpacity: 0.28, weight: 0 };
    }
    case 'contested':
      return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3, weight: 1, dashArray: '3,3' };
    case 'neutral':
    default:
      return { color: '#7d7d7d', fillColor: '#7d7d7d', fillOpacity: 0.06, weight: 0 };
  }
}
