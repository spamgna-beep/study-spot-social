import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Save, Trash2, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = useAdmin(user?.id);
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loreDrops, setLoreDrops] = useState<any[]>([]);
  const [tab, setTab] = useState<'profiles' | 'checkins' | 'lore'>('profiles');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && user && !isAdmin) navigate('/map');
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const [p, c, l] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('check_ins').select('*, profiles:user_id(display_name)').eq('is_active', true),
      supabase.from('lore_drops').select('*').order('created_at', { ascending: false }),
    ]);
    if (p.data) setProfiles(p.data);
    if (c.data) setCheckIns(c.data);
    if (l.data) setLoreDrops(l.data);
  };

  const updateProfile = async (id: string, userId: string, field: string, value: string) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Updated!'); fetchAll(); }
  };

  const deleteLoreDrop = async (id: string) => {
    await supabase.from('lore_drops').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  const endCheckIn = async (id: string) => {
    await supabase.from('check_ins').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', id);
    toast.success('Check-in ended');
    fetchAll();
  };

  if (loading || !isAdmin) return null;

  const tabs = [
    { key: 'profiles' as const, icon: Users, label: 'Profiles' },
    { key: 'checkins' as const, icon: MapPin, label: 'Check-ins' },
    { key: 'lore' as const, icon: Shield, label: 'Lore Drops' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-safe">
        <div className="pt-6 pb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                tab === t.key ? 'bg-primary text-primary-foreground' : 'glass-strong'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'profiles' && (
          <div className="space-y-3">
            {profiles.map(p => (
              <div key={p.id} className="glass-strong rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                    {p.display_name?.[0] || '?'}
                  </div>
                  <span className="text-sm font-semibold">{p.display_name}</span>
                </div>
                {['display_name', 'username', 'bio', 'major'].map(field => (
                  <div key={field}>
                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">{field}</label>
                    <input
                      defaultValue={p[field] || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (p[field] || '')) {
                          updateProfile(p.id, p.user_id, field, e.target.value);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'checkins' && (
          <div className="space-y-2">
            {checkIns.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No active check-ins</p>
            ) : checkIns.map(ci => (
              <div key={ci.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{(ci.profiles as any)?.display_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">Vibe: {ci.vibe} {ci.study_goal && `• ${ci.study_goal}`}</p>
                </div>
                <button onClick={() => endCheckIn(ci.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'lore' && (
          <div className="space-y-2">
            {loreDrops.map(drop => (
              <div key={drop.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1 mr-2">
                  <p className="text-sm">{drop.message}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(drop.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteLoreDrop(drop.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
