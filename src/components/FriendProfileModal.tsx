import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FriendProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    major: string | null;
    year: string | null;
    bio: string | null;
    username: string | null;
  } | null;
}

export default function FriendProfileModal({ open, onClose, profile }: FriendProfileModalProps) {
  const [studyStats, setStudyStats] = useState({ todayMinutes: 0, weekMinutes: 0 });

  useEffect(() => {
    if (!profile?.user_id || !open) return;
    const fetchStats = async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      const [todayRes, weekRes] = await Promise.all([
        supabase.from('study_sessions').select('duration_seconds').eq('user_id', profile.user_id).gte('created_at', todayStart),
        supabase.from('study_sessions').select('duration_seconds').eq('user_id', profile.user_id).gte('created_at', weekStart),
      ]);

      const sum = (data: any[] | null) => (data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0);
      setStudyStats({
        todayMinutes: Math.round(sum(todayRes.data) / 60),
        weekMinutes: Math.round(sum(weekRes.data) / 60),
      });
    };
    fetchStats();
  }, [profile?.user_id, open]);

  if (!profile) return null;

  const fmt = (mins: number) => mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-x-6 top-1/4 z-50 glass-strong rounded-2xl p-6 max-w-sm mx-auto"
          >
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted">
              <X size={16} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground mb-3">
                {profile.display_name?.[0] || '?'}
              </div>
              <h3 className="text-lg font-bold">{profile.display_name || 'Student'}</h3>
              {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
              {(profile.major || profile.year) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.major}{profile.major && profile.year && ' • '}{profile.year}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
              )}

              {/* Study Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                <div className="glass rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold">{fmt(studyStats.todayMinutes)}</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
                <div className="glass rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold">{fmt(studyStats.weekMinutes)}</p>
                  <p className="text-[10px] text-muted-foreground">This Week</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
