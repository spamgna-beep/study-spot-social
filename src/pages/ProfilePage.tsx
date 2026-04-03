import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { LogOut, Ghost, Save, ShoppingBag, Coins } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import PomodoroTimer from '@/components/PomodoroTimer';
import { getStudyRank } from '@/lib/ranks';
import { UNIVERSITIES } from '@/lib/universities';

const YEAR_OPTIONS = ['Foundation', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Masters', 'Doctorate'];

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  const [university, setUniversity] = useState('');
  const [saving, setSaving] = useState(false);
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [studyCoins, setStudyCoins] = useState(0);
  const [equippedBadges, setEquippedBadges] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setUsername(data.username || '');
        setMajor(data.major || '');
        setYear(data.year || '');
        setBio(data.bio || '');
        setGhostMode(data.ghost_mode || false);
        setStudyCoins((data as any).study_coins || 0);
        setUniversity((data as any).university || '');
      }
    });

    // Fetch total study hours
    supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id).then(({ data }) => {
      const total = (data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0);
      setTotalStudyHours(total / 3600);
    });

    // Fetch equipped badges
    supabase.from('user_purchases' as any).select('*, shop_items:item_id(name, metadata)').eq('user_id', user.id).eq('equipped', true).then(({ data }: any) => {
      if (data) {
        setEquippedBadges(data.map((p: any) => p.shop_items?.metadata?.emoji || '').filter(Boolean));
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName, username: username || null,
      major: major || null, year: year || null,
      bio: bio || null, ghost_mode: ghostMode,
      university: university || null,
    }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else toast.success('Profile updated!');
    setSaving(false);
  };

  if (loading || !profile) return null;

  const rank = getStudyRank(totalStudyHours);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-safe">
        <div className="pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <button onClick={signOut} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <LogOut size={20} className="text-muted-foreground" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Avatar + Rank */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground shadow-soft">
                {displayName[0] || '?'}
              </div>
              {rank && (
                <div
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-soft border-2 border-card"
                  style={{ backgroundColor: rank.color }}
                >
                  {rank.emoji}
                </div>
              )}
            </div>
            {rank && (
              <p className="text-xs font-semibold mt-2" style={{ color: rank.color }}>
                {rank.name} Rank • {Math.floor(totalStudyHours)}h studied
              </p>
            )}
            {equippedBadges.length > 0 && (
              <div className="flex gap-1 mt-1">
                {equippedBadges.map((b, i) => <span key={i} className="text-lg">{b}</span>)}
              </div>
            )}
          </div>

          {/* Coins + Shop */}
          <div className="glass-strong rounded-2xl p-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins size={20} className="text-primary" />
              <div>
                <p className="text-sm font-bold">{studyCoins} Study Coins</p>
                <p className="text-[10px] text-muted-foreground">Earn 1 coin per 15 min of study</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/shop')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <ShoppingBag size={14} /> Shop
            </button>
          </div>

          <div className="mb-4"><PomodoroTimer /></div>

          <div className="glass-strong rounded-2xl p-5 space-y-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Major</label>
                <input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
                  <option value="">Select year</option>
                  {YEAR_OPTIONS.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">University</label>
              <select value={university} onChange={(e) => setUniversity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
                <option value="">Select university</option>
                {UNIVERSITIES.map((u) => (<option key={u.name} value={u.name}>{u.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Ghost size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ghost Mode</p>
                <p className="text-xs text-muted-foreground">Hide your location from friends</p>
              </div>
            </div>
            <button onClick={() => setGhostMode(!ghostMode)} className={`w-12 h-7 rounded-full transition-colors relative ${ghostMode ? 'bg-primary' : 'bg-muted'}`}>
              <motion.div className="w-5 h-5 rounded-full bg-card shadow-soft absolute top-1" animate={{ left: ghostMode ? 26 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </button>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
