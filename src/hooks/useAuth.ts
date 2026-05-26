/**
 * useAuth.ts — Supabase authentication hook for Stride Quest.
 *
 * Strategy:
 *   1. On first load, restore any existing session from localStorage.
 *   2. Expose `isAuthenticated` — true only when user has signed in with
 *      email/password (not anonymous). App shows LoginScreen when false.
 *   3. Anonymous "guest" sessions are valid auth state; onLogin() clears
 *      the login gate after signInAnonymously.
 */

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { ensureUserProfile } from '../engine/territoryService';

interface UseAuthReturn {
  user: User | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  /** True once the user has passed the login gate (email OR guest). */
  isAuthenticated: boolean;
  /** Call after successful signIn / signUp / signInAnonymously */
  markAuthenticated: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Persisted so refreshing the page doesn't boot you back to login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sq_authed') === '1';
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Restore existing session (Supabase stores it in localStorage)
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user ?? null;

        if (mounted && currentUser) {
          setUser(currentUser);
          // If a valid session already exists, skip the login gate automatically.
          // Users are only shown LoginScreen when there is truly no session.
          localStorage.setItem('sq_authed', '1');
          setIsAuthenticated(true);
          await ensureUserProfile(currentUser.id, currentUser.user_metadata?.username);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Auth error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // Keep user state in sync on token refresh / tab focus
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const markAuthenticated = () => {
    localStorage.setItem('sq_authed', '1');
    setIsAuthenticated(true);
  };

  return {
    user,
    userId: user?.id ?? null,
    loading,
    error,
    isAuthenticated,
    markAuthenticated,
  };
}
