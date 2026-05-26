/**
 * useTileRenderer.ts — Manages the Leaflet tile grid layer for an active map.
 *
 * Responsibilities:
 *   - Subscribe to territoryStore tile changes
 *   - Add/update/remove Leaflet polygons for visible tiles
 *   - Keep a ref-based cache to avoid unnecessary DOM mutations
 *   - Expose a `refreshViewport` function to load tiles for the visible map area
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import L from 'leaflet';
import { territoryStore, TILE_SIZE_DEG_LAT, Tile } from './territory';
import { tilesInViewport } from './geoUtils';
import { getTileDisplayType, getTileStyle } from './perimeterCapture';

interface UseTileRendererOptions {
  /** Leaflet map reference */
  mapRef: RefObject<L.Map | null>;
  /** Layer group where tile polygons are drawn */
  tileLayerGroupRef: RefObject<L.LayerGroup | null>;
}

export function useTileRenderer({ mapRef, tileLayerGroupRef }: UseTileRendererOptions) {
  /** Cache: tileId → Leaflet Polygon */
  const polygonCacheRef = useRef<Map<string, L.Polygon>>(new Map());

  /**
   * Render or update a single tile polygon on the map.
   */
  const renderTile = useCallback((tile: Tile) => {
    const layerGroup = tileLayerGroupRef.current;
    if (!layerGroup) return;

    const type = getTileDisplayType(tile);
    const style = getTileStyle(type);
    const cache = polygonCacheRef.current;

    const existing = cache.get(tile.id);
    if (existing) {
      // Update style only
      existing.setStyle(style);
    } else {
      // Create new polygon
      const poly = L.polygon(tile.bounds as L.LatLngTuple[], style);
      poly.addTo(layerGroup);
      cache.set(tile.id, poly);
    }
  }, []);

  /**
   * Load and render all tiles currently in the store that are visible.
   * Also add placeholder neutral tiles for any new grid positions in the viewport.
   */
  const refreshViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLon = bounds.getWest();
    const maxLon = bounds.getEast();

    // Render existing store tiles that are within viewport
    territoryStore.tiles.forEach(tile => {
      if (
        tile.nwLat >= minLat && tile.seLat <= maxLat + TILE_SIZE_DEG_LAT &&
        tile.nwLon >= minLon && tile.seLon <= maxLon
      ) {
        renderTile(tile);
      }
    });
  }, [renderTile]);

  /**
   * Subscribe to store changes and re-render affected tiles.
   */
  useEffect(() => {
    const unsubscribe = territoryStore.subscribe(() => {
      // Re-render all tiles currently in store
      territoryStore.tiles.forEach(tile => renderTile(tile));
    });
    return unsubscribe;
  }, [renderTile]);

  /**
   * Clear all rendered tile polygons (e.g., on session end).
   */
  const clearTiles = useCallback(() => {
    const layerGroup = tileLayerGroupRef.current;
    if (layerGroup) layerGroup.clearLayers();
    polygonCacheRef.current.clear();
  }, []);

  return { refreshViewport, clearTiles };
}
