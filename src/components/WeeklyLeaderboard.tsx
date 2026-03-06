import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_seconds: number;
}

export default function WeeklyLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('user_id, duration_seconds')
        .gte('created_at', weekStart);

      if (!sessions || sessions.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Aggregate by user
      const userTotals: Record<string, number> = {};
      sessions.forEach(s => {
        userTotals[s.user_id] = (userTotals[s.user_id] || 0) + (s.duration_seconds || 0);
      });

      const userIds = Object.keys(userTotals);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.display_name || 'Student'; });

      const sorted = userIds
        .map(uid => ({
          user_id: uid,
          display_name: profileMap[uid] || 'Student',
          total_seconds: userTotals[uid],
        }))
        .sort((a, b) => b.total_seconds - a.total_seconds)
        .slice(0, 20);

      setEntries(sorted);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={16} className="text-primary" />;
    if (index === 1) return <Medal size={16} className="text-muted-foreground" />;
    if (index === 2) return <Award size={16} className="text-cafe" />;
    return <span className="text-[10px] text-muted-foreground font-bold w-4 text-center">{index + 1}</span>;
  };

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Weekly Leaderboard</h3>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
              i === 0 ? 'bg-primary/10 border border-primary/20' :
              i < 3 ? 'bg-muted/50' : ''
            }`}
          >
            <div className="w-5 flex items-center justify-center">{getRankIcon(i)}</div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-semibold truncate block ${i === 0 ? 'text-foreground' : ''}`}>
                {entry.display_name}
              </span>
            </div>
            <span className="text-xs font-bold text-muted-foreground">{formatHours(entry.total_seconds)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
