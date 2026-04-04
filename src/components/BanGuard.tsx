import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, TimerReset, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCountdown } from '@/lib/study';

interface BanState {
  bannedUntil: string | null;
  banReason: string | null;
}

export default function BanGuard() {
  const { user, signOut } = useAuth();
  const [banState, setBanState] = useState<BanState>({ bannedUntil: null, banReason: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setBanState({ bannedUntil: null, banReason: null });
      return;
    }

    const fetchBanState = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('banned_until, ban_reason')
        .eq('user_id', user.id)
        .single();

      setBanState({
        bannedUntil: (data as any)?.banned_until || null,
        banReason: (data as any)?.ban_reason || null,
      });
    };

    fetchBanState();

    const channel = supabase
      .channel(`ban_guard_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchBanState)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!banState.bannedUntil) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [banState.bannedUntil]);

  const isBanned = useMemo(() => {
    if (!banState.bannedUntil) return false;
    return new Date(banState.bannedUntil).getTime() > Date.now();
  }, [banState.bannedUntil, tick]);

  if (!user || !isBanned) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
      <div className="glass-strong w-full max-w-md rounded-3xl border border-destructive/20 p-6 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert size={30} />
        </div>

        <h2 className="text-2xl font-bold text-foreground">Account temporarily banned</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can view the remaining time below. If you think this is a mistake, contact support.
        </p>

        <div className="mt-5 rounded-2xl bg-muted/60 p-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <TimerReset size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Ban countdown</span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground">{formatCountdown(banState.bannedUntil)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ends {new Date(banState.bannedUntil as string).toLocaleString()}
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-secondary/40 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reason</p>
          <p className="mt-2 text-sm text-foreground">
            {banState.banReason?.trim() || 'A moderator has temporarily restricted this account.'}
          </p>
        </div>

        <button
          onClick={signOut}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}