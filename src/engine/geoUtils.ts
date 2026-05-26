/**
 * geoUtils.ts — Lightweight geographic math utilities.
 * No external dependencies — pure TypeScript.
 */

/** Haversine distance in metres between two lat/lon points. */
export function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Longitude tile size in degrees at a given latitude.
 * Exported so snapToTile and tilesInViewport always use the same computation.
 */
export function tileSizeDegLon(lat: number): number {
  return 50 / (Math.cos((lat * Math.PI) / 180) * 111320);
}

/**
 * Snap a lat/lon to the NW corner of the 50m tile it falls in.
 * Returns { id, nwLat, nwLon }.
 */
export function snapToTile(lat: number, lon: number, tileSizeDegLat: number): {
  id: string;
  nwLat: number;
  nwLon: number;
} {
  const tsdLon = tileSizeDegLon(lat);
  // NW corner: ceil for lat (northward), floor for lon (westward)
  const nwLat = Math.ceil(lat / tileSizeDegLat) * tileSizeDegLat;
  const nwLon = Math.floor(lon / tsdLon) * tsdLon;
  const id = `${nwLat.toFixed(7)}_${nwLon.toFixed(7)}`;
  return { id, nwLat, nwLon };
}

/**
 * Approximate polygon area in square metres using the Shoelace formula.
 * coords: array of [lat, lon] pairs (last point does NOT need to repeat first).
 */
export function polygonAreaSqM(coords: [number, number][]): number {
  const n = coords.length;
  if (n < 3) return 0;
  // Convert to local flat metres (approx)
  const originLat = coords[0][0];
  const originLon = coords[0][1];
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  const pts = coords.map(([lat, lon]) => [
    (lon - originLon) * cosLat * 111320,
    (lat - originLat) * 111320,
  ]);
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2;
}

/**
 * Check if point P is inside polygon using ray-casting.
 * poly: array of [lat, lon].
 */
export function pointInPolygon(lat: number, lon: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][1], yi = poly[i][0];
    const xj = poly[j][1], yj = poly[j][0];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generate all tile grid IDs that fall within a viewport rectangle.
 * Returns array of { id, nwLat, nwLon }.
 */
export function tilesInViewport(
  minLat: number, maxLat: number,
  minLon: number, maxLon: number,
  tileSizeDegLat: number
): Array<{ id: string; nwLat: number; nwLon: number }> {
  const result: Array<{ id: string; nwLat: number; nwLon: number }> = [];

  // Iterate row by row so each row's lon-grid uses the row's own latitude,
  // keeping tile IDs consistent with snapToTile().
  let lat = Math.ceil(minLat / tileSizeDegLat) * tileSizeDegLat;
  while (lat <= maxLat + tileSizeDegLat) {
    const tsdLon = tileSizeDegLon(lat); // per-row lon size matches snapToTile
    let lon = Math.floor(minLon / tsdLon) * tsdLon;
    while (lon <= maxLon + tsdLon) {
      const id = `${lat.toFixed(7)}_${lon.toFixed(7)}`;
      result.push({ id, nwLat: lat, nwLon: lon });
      lon += tsdLon;
    }
    lat += tileSizeDegLat;
  }
  return result;
}

/**
 * Compute speed in m/s between two GPS points (returns null if dt is 0).
 */
export function speedMs(
  lat1: number, lon1: number, t1: number,
  lat2: number, lon2: number, t2: number
): number | null {
  const dt = (t2 - t1) / 1000; // seconds
  if (dt <= 0) return null;
  return haversineMetres(lat1, lon1, lat2, lon2) / dt;
}
