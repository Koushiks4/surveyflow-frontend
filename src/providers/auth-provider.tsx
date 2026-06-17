'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import type { AuthUser, User } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        try {
          const profile = await api.get<User>('/api/users/me');
          setUser({
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            organizationId: profile.organization_id,
            roles: profile.roles.map(r => r.name),
          });
        } catch (err: any) {
          setUser(null);
          if (err.message?.toLowerCase().includes('deactivated')) {
            await supabase.auth.signOut();
            setSession(null);
            window.location.href = '/login';
            return;
          }
        }
      }
      setLoading(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await api.get<User>('/api/users/me');
        setUser({
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          organizationId: profile.organization_id,
          roles: profile.roles.map(r => r.name),
        });
      } catch (err: any) {
        setUser(null);
        if (err.message?.toLowerCase().includes('deactivated')) {
          await supabase.auth.signOut();
          setSession(null);
          window.location.href = '/login';
          return;
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
