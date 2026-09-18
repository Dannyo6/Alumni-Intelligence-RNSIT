import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { queryClient } from '../main';
import type { Database } from '../types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type AuthStatus =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'PROFILE_LOADING'
  | 'AUTHORIZED'
  | 'UNAUTHORIZED'
  | 'ERROR';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isActive: boolean;
  isAdmin: boolean;
  loading: boolean;
  authStatus: AuthStatus;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isActive: false,
  isAdmin: false,
  loading: true,
  authStatus: 'INITIALIZING',
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');

  // Sequence ref to guard against out-of-order asynchronous responses
  const fetchSeqRef = useRef<number>(0);

  const fetchProfile = useCallback(async (userId?: string) => {
    const currentSeq = ++fetchSeqRef.current;

    if (!userId) {
      setProfile(null);
      setIsActive(false);
      setIsAdmin(false);
      setAuthStatus('UNAUTHENTICATED');
      return;
    }

    setAuthStatus('PROFILE_LOADING');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (currentSeq !== fetchSeqRef.current) {
        return;
      }

      if (!error && data) {
        setProfile(data);
        const active = Boolean(data.is_active);
        const admin = data.role === 'admin' && active;
        setIsActive(active);
        setIsAdmin(admin);
        setAuthStatus(admin ? 'AUTHORIZED' : 'UNAUTHORIZED');
      } else {
        setProfile(null);
        setIsActive(false);
        setIsAdmin(false);
        setAuthStatus('UNAUTHORIZED');
      }
    } catch (err) {
      if (currentSeq !== fetchSeqRef.current) {
        return;
      }
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Error fetching user profile:', err);
      }
      setProfile(null);
      setIsActive(false);
      setIsAdmin(false);
      setAuthStatus('ERROR');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Initial session check
    supabase.auth?.getSession?.()
      .then(({ data: { session } }: any) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setIsActive(false);
          setIsAdmin(false);
          setAuthStatus('UNAUTHENTICATED');
        }
      })
      .catch((err: any) => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Supabase auth session initialization error:', err);
        }
        setUser(null);
        setProfile(null);
        setIsActive(false);
        setIsAdmin(false);
        setAuthStatus('ERROR');
      });

    // 2. Auth state listener
    const { data: authListener } = supabase.auth?.onAuthStateChange?.((event: any, session: any) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'SIGNED_OUT' || !currentUser) {
        fetchSeqRef.current++;
        setProfile(null);
        setIsActive(false);
        setIsAdmin(false);
        setAuthStatus('UNAUTHENTICATED');
        // Clear TanStack Query cache to avoid data leakage on logout
        queryClient.clear();
      } else {
        // Clear prior profile & query cache on account switch immediately to avoid stale data leakage
        fetchSeqRef.current++;
        setProfile(null);
        setIsActive(false);
        setIsAdmin(false);
        queryClient.clear();
        fetchProfile(currentUser.id);
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    } else {
      try {
        const { data: { session } } = await supabase.auth?.getSession?.() || { data: { session: null } };
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setIsActive(false);
          setIsAdmin(false);
          setAuthStatus('UNAUTHENTICATED');
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Session refresh error:', err);
        }
        setUser(null);
        setProfile(null);
        setIsActive(false);
        setIsAdmin(false);
        setAuthStatus('ERROR');
      }
    }
  }, [user, fetchProfile]);

  const loading = authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isActive,
        isAdmin,
        loading,
        authStatus,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
