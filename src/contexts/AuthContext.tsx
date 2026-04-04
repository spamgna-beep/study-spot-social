import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, university: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkoutPresence = useCallback(async (reason: 'signout' | 'pagehide' | 'beforeunload' = 'signout') => {
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/presence-manager`, {
      method: 'POST',
      keepalive: reason !== 'signout',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'checkout', reason }),
    }).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const heartbeat = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq('user_id', user.id);
    };

    heartbeat();

    const interval = window.setInterval(heartbeat, 30000);
    const handlePageHide = () => { void checkoutPresence('pagehide'); };
    const handleBeforeUnload = () => { void checkoutPresence('beforeunload'); };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, checkoutPresence]);

  const signUp = async (email: string, password: string, displayName: string, university: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, university },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    navigate('/map');
  };

  const signOut = async () => {
    await checkoutPresence('signout');
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
