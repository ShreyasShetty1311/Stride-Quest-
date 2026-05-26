/**
 * LoginScreen.tsx — Stride Quest tactical login gate.
 *
 * Supports:
 *   - Email/password sign-in (Supabase Auth)
 *   - Username-to-email mapping  (alex_shadow → alex_shadow@stridequest.app)
 *   - "Enter as Ghost" anonymous guest mode
 *   - Minecraft-themed pixel UI with faction-colored glow
 */

import React, { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Shield, Lock, Eye, EyeOff, Zap, Terminal } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

/** Map username → email so players never have to type @stridequest.app */
function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '_');
  if (clean.includes('@')) return clean; // already an email
  return `${clean}@stridequest.app`;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [mode, setMode]         = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = usernameToEmail(username);

    try {
      if (mode === 'login') {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      } else {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } },
        });
        if (signUpErr) throw signUpErr;
      }
      onLogin();
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) {
        // Anonymous auth might be disabled — still let them in as local guest
        console.warn('[StrideQuest] Anonymous auth not available, entering local guest mode');
      }
      onLogin();
    } catch {
      // Fallback: enter anyway in local mode
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center relative overflow-hidden">

      {/* Animated scanline background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.015) 2px, rgba(0,255,100,0.015) 4px)',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
      />

      {/* Corner brackets */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 border-mc-gold/30 opacity-60`}
          style={{
            borderTopWidth:    i < 2 ? 2 : 0,
            borderBottomWidth: i >= 2 ? 2 : 0,
            borderLeftWidth:   i % 2 === 0 ? 2 : 0,
            borderRightWidth:  i % 2 === 1 ? 2 : 0,
          }}
        />
      ))}

      {/* Logo */}
      <div className="mb-8 text-center select-none">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-mc-gold/10 border border-mc-gold/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-mc-gold" />
          </div>
          <div>
            <p className="font-pixel text-[10px] text-mc-gold tracking-[0.3em] leading-none">STRIDE QUEST</p>
            <p className="font-pixel text-[7px] text-slate-500 tracking-[0.2em] mt-1">TACTICAL TERRITORY ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-mc-gold/30 max-w-16" />
          <Terminal className="w-3 h-3 text-mc-gold/50" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-mc-gold/30 max-w-16" />
        </div>
      </div>

      {/* Panel */}
      <div className="w-full max-w-sm mx-4">
        <div className="bg-[#111118] border border-slate-700/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] p-6">

          {/* Mode tabs */}
          <div className="flex mb-6 border border-slate-700/40">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 font-pixel text-[8px] py-2 tracking-widest uppercase transition-colors ${
                  mode === m
                    ? 'bg-mc-gold/10 text-mc-gold border-b-2 border-mc-gold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Enlist'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="font-pixel text-[7px] text-slate-500 uppercase tracking-widest">
                Decryption ID (Username)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-pixel text-[9px] text-mc-xp/60 select-none">&gt;_</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="alex_shadow"
                  required
                  autoComplete="username"
                  className="w-full bg-[#0d0d14] border border-slate-700/60 text-slate-200 font-mono text-sm pl-8 pr-3 py-2.5
                             focus:outline-none focus:border-mc-gold/50 focus:shadow-[0_0_0_1px_rgba(225,193,110,0.2)]
                             placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-pixel text-[7px] text-slate-500 uppercase tracking-widest">
                Secret Seed (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Vanguard_Alpha_99"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-[#0d0d14] border border-slate-700/60 text-slate-200 font-mono text-sm pl-9 pr-10 py-2.5
                             focus:outline-none focus:border-mc-gold/50 focus:shadow-[0_0_0_1px_rgba(225,193,110,0.2)]
                             placeholder:text-slate-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-800/60 p-2.5 text-center">
                <p className="font-pixel text-[7px] text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-mc-gold/10 hover:bg-mc-gold/20 border border-mc-gold/50
                         text-mc-gold font-pixel text-[9px] tracking-widest py-3
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_0_12px_rgba(225,193,110,0.1)] hover:shadow-[0_0_20px_rgba(225,193,110,0.2)]
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">AUTHENTICATING...</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  {mode === 'login' ? 'DEPLOY IDENTITY' : 'FORGE ACCOUNT'}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="font-pixel text-[7px] text-slate-600">OR</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {/* Guest mode */}
          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full border border-slate-700/40 hover:border-slate-600/60 text-slate-500 hover:text-slate-300
                       font-pixel text-[8px] tracking-widest py-2.5 transition-all disabled:opacity-50"
          >
            ◈ ENTER AS GHOST (Anonymous)
          </button>

          {/* Hint */}
          <p className="mt-4 text-center font-pixel text-[6px] text-slate-700 leading-relaxed">
            STRIDE QUEST v1.0 · BMSCE BASAVANAGUDI · ALL SESSIONS ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  );
}
