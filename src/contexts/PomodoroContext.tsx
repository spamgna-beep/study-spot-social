import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StudyStats {
  todayMinutes: number;
  weekMinutes: number;
}

interface PomodoroContextType {
  isRunning: boolean;
  elapsed: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  stats: StudyStats;
  formatTime: (seconds: number) => string;
  formatMinutes: (mins: number) => string;
  fetchStats: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<StudyStats>({ todayMinutes: 0, weekMinutes: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const [todayRes, weekRes] = await Promise.all([
      supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id).gte('created_at', todayStart),
      supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id).gte('created_at', weekStart),
    ]);

    const sumSeconds = (data: any[] | null) => (data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0);
    setStats({
      todayMinutes: Math.round(sumSeconds(todayRes.data) / 60),
      weekMinutes: Math.round(sumSeconds(weekRes.data) / 60),
    });
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const start = async () => {
    if (!user) return;
    const { data } = await supabase.from('study_sessions').insert({ user_id: user.id }).select('id').single();
    if (data) {
      setSessionId(data.id);
      setElapsed(0);
      setIsRunning(true);
    }
  };

  const stop = async () => {
    if (!user || !sessionId) return;
    setIsRunning(false);
    await supabase.from('study_sessions').update({
      ended_at: new Date().toISOString(),
      duration_seconds: elapsed,
    }).eq('id', sessionId);
    setSessionId(null);
    fetchStats();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <PomodoroContext.Provider value={{ isRunning, elapsed, start, stop, stats, formatTime, formatMinutes, fetchStats }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
}
