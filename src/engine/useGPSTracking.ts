/**
 * useGPSTracking.ts — Browser Geolocation API hook for live GPS tracking.
 *
 * Features:
 *   - Updates every ~2 seconds via watchPosition
 *   - Rejects poor accuracy readings (> MAX_ACCURACY_METRES)
 *   - Rejects points that are too close together (micro-jitter filter)
 *   - Rejects teleport jumps (too far too fast)
 *   - Flags suspicious speed (above walking/running threshold)
 *   - Integrates directly with territoryStore session
 *   - Returns live path, last point, running distance, and any error
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  territoryStore,
  GPSPoint,
  MAX_ACCURACY_METRES,
  MIN_POINT_DISTANCE_M,
  MAX_POINT_DISTANCE_M,
  MAX_VALID_SPEED_MS,
} from './territory';
import { haversineMetres, speedMs } from './geoUtils';

interface UseGPSTrackingOptions {
  /** Called every time a valid, accepted GPS point is appended to the session path. */
  onPoint?: (point: GPSPoint) => void;
  /** Called when the browser cannot provide location. */
  onError?: (message: string) => void;
}

interface UseGPSTrackingReturn {
  /** Start watching GPS. Creates a new session in territoryStore. */
  startTracking: (userId?: string) => void;
  /** Stop watching GPS. Ends the session in territoryStore. */
  stopTracking: () => void;
  /** Pause session (stop appending points but keep watch alive). */
  pauseTracking: () => void;
  /** Resume session. */
  resumeTracking: () => void;
  /** Whether geolocation is actively being watched. */
  isTracking: boolean;
  /** Whether GPS is unavailable in this environment. */
  gpsUnavailable: boolean;
}

export function useGPSTracking(options: UseGPSTrackingOptions = {}): UseGPSTrackingReturn {
  const watchIdRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const gpsUnavailableRef = useRef(false);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    territoryStore.endSession();
  }, []);

  const pauseTracking = useCallback(() => {
    territoryStore.pauseSession();
  }, []);

  const resumeTracking = useCallback(() => {
    territoryStore.resumeSession();
  }, []);

  const startTracking = useCallback((userId: string = 'player-1') => {
    if (!('geolocation' in navigator)) {
      gpsUnavailableRef.current = true;
      options.onError?.('Geolocation is not supported by this browser.');
      return;
    }

    // Start a session in the store
    territoryStore.startSession(userId);
    isTrackingRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const session = territoryStore.session;
        // Ignore points when session is paused or ended
        if (!session || session.status !== 'active') return;

        const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
        const timestamp = pos.timestamp;

        // 1. Reject low-quality GPS fixes
        if (accuracy > MAX_ACCURACY_METRES) return;

        const newPoint: GPSPoint = { lat, lon, timestamp, accuracy, speed };
        const path = session.path;
        const last = path.length > 0 ? path[path.length - 1] : null;

        if (last) {
          const dist = haversineMetres(last.lat, last.lon, lat, lon);

          // 2. Filter micro-jitter (too close)
          if (dist < MIN_POINT_DISTANCE_M) return;

          // 3. Reject teleport jumps
          if (dist > MAX_POINT_DISTANCE_M) {
            session.suspicious = true;
            territoryStore.addEvent({ type: 'suspicious_movement', userId: session.userId, meta: { reason: 'teleport', dist } });
            return;
          }

          // 4. Flag impossible speed (flag, still accept point for path continuity)
          const spd = speedMs(last.lat, last.lon, last.timestamp, lat, lon, timestamp);
          if (spd !== null && spd > MAX_VALID_SPEED_MS) {
            session.suspicious = true;
            territoryStore.addEvent({ type: 'suspicious_movement', userId: session.userId, meta: { reason: 'speed', spd } });
            // Don't accept this point — too fast
            return;
          }

          session.distanceMetres += dist;
        }

        // Accept point
        session.path.push(newPoint);
        options.onPoint?.(newPoint);
        territoryStore.notify();
      },
      (err) => {
        gpsUnavailableRef.current = true;
        options.onError?.(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    isTracking: isTrackingRef.current,
    gpsUnavailable: gpsUnavailableRef.current,
  };
}
