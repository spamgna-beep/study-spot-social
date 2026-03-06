import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Trash2, Users, MapPin, Bell, Plus, Ban, Send, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';

const LORE_CATEGORIES = [
  { value: 'general', label: '📢 General', bg: 'bg-muted' },
  { value: 'special_offer', label: '🎁 Special Offer', bg: 'bg-primary/10' },
  { value: 'party_announced', label: '🎉 Party', bg: 'bg-destructive/10' },
  { value: 'serious', label: '⚠️ Serious', bg: 'bg-foreground/10' },
  { value: 'call_to_action', label: '📣 Call to Action', bg: 'bg-secondary/30' },
];

const LOCATION_TYPES = [
  { value: 'library', label: 'Library' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'outdoor', label: 'Outdoor' },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { isAdmin, adminLoading } = useAdmin(user?.id);
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loreDrops, setLoreDrops] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [tab, setTab] = useState<'profiles' | 'checkins' | 'lore' | 'locations'>('profiles');
  const [testingMode, setTestingMode] = useState(false);

  // Lore compose
  const [loreMessage, setLoreMessage] = useState('');
  const [loreCategory, setLoreCategory] = useState('general');
  const [loreLocation, setLoreLocation] = useState('');
  const [loreSending, setLoreSending] = useState(false);

  // Location add
  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState('library');
  const [newLocLat, setNewLocLat] = useState('');
  const [newLocLng, setNewLocLng] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');

  // Ban modal
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banDays, setBanDays] = useState('1');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !adminLoading && user && !isAdmin) navigate('/');
  }, [user, loading, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    // Fetch testing mode
    supabase.from('app_settings').select('value').eq('key', 'testing_mode').maybeSingle().then(({ data }) => {
      if (data) setTestingMode(data.value === 'true');
    });
  }, [isAdmin]);

  const fetchAll = async () => {
    const [p, c, l, loc] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('check_ins').select('*, profiles:user_id(display_name)').eq('is_active', true),
      supabase.from('lore_drops').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('locations').select('*').order('name'),
    ]);
    if (p.data) setProfiles(p.data);
    if (c.data) setCheckIns(c.data);
    if (l.data) setLoreDrops(l.data);
    if (loc.data) setLocations(loc.data);
  };

  const toggleTestingMode = async () => {
    const newVal = !testingMode;
    setTestingMode(newVal);
    const { error } = await supabase
      .from('app_settings')
      .update({ value: String(newVal) } as any)
      .eq('key', 'testing_mode');
    if (error) {
      toast.error('Failed to toggle testing mode');
      setTestingMode(!newVal);
    } else {
      toast.success(newVal ? 'Testing mode ON — proximity checks disabled for all users' : 'Testing mode OFF');
    }
  };

  const updateProfile = async (userId: string, field: string, value: string) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Updated!'); fetchAll(); }
  };

  const banUser = async (userId: string) => {
    const days = parseInt(banDays) || 1;
    const bannedUntil = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase.from('profiles').update({ banned_until: bannedUntil } as any).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success(`User banned for ${days} day(s)`); setBanUserId(null); fetchAll(); }
  };

  const unbanUser = async (userId: string) => {
    await supabase.from('profiles').update({ banned_until: null } as any).eq('user_id', userId);
    toast.success('User unbanned');
    fetchAll();
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

  const sendLoreDrop = async () => {
    if (!user || !loreMessage.trim()) return;
    setLoreSending(true);
    const { error } = await supabase.from('lore_drops').insert({
      author_id: user.id,
      message: loreMessage.trim(),
      location_id: loreLocation || null,
      category: loreCategory as any,
    });
    if (error) toast.error(error.message);
    else { toast.success('Lore dropped! 📢'); setLoreMessage(''); fetchAll(); }
    setLoreSending(false);
  };

  const addLocation = async () => {
    if (!newLocName.trim() || !newLocLat || !newLocLng) {
      toast.error('Fill in name, latitude and longitude');
      return;
    }
    const { error } = await supabase.from('locations').insert({
      name: newLocName.trim(),
      type: newLocType as any,
      latitude: parseFloat(newLocLat),
      longitude: parseFloat(newLocLng),
      address: newLocAddress.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Location added!');
      setNewLocName(''); setNewLocLat(''); setNewLocLng(''); setNewLocAddress('');
      fetchAll();
    }
  };

  const deleteLocation = async (id: string) => {
    await supabase.from('locations').delete().eq('id', id);
    toast.success('Location removed');
    fetchAll();
  };

  if (loading || adminLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );

  if (!isAdmin) return null;

  const tabs = [
    { key: 'profiles' as const, icon: Users, label: 'Users' },
    { key: 'checkins' as const, icon: MapPin, label: 'Check-ins' },
    { key: 'lore' as const, icon: Bell, label: 'Lore' },
    { key: 'locations' as const, icon: MapPin, label: 'Locations' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-safe">
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className={testingMode ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-[10px] font-medium text-muted-foreground">Test</span>
            <Switch checked={testingMode} onCheckedChange={toggleTestingMode} />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-primary text-primary-foreground' : 'glass-strong'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {tab === 'profiles' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{profiles.length} registered users</p>
            {profiles.map(p => {
              const isBanned = p.banned_until && new Date(p.banned_until) > new Date();
              return (
                <div key={p.id} className="glass-strong rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                        {p.display_name?.[0] || '?'}
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{p.display_name}</span>
                        {p.username && <span className="text-[10px] text-muted-foreground ml-1">@{p.username}</span>}
                        {isBanned && <span className="text-[10px] text-destructive ml-2 font-bold">BANNED until {new Date(p.banned_until).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isBanned ? (
                        <button onClick={() => unbanUser(p.user_id)} className="px-2 py-1 rounded-lg bg-secondary/30 text-[10px] font-medium">
                          Unban
                        </button>
                      ) : (
                        <button onClick={() => setBanUserId(banUserId === p.user_id ? null : p.user_id)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                          <Ban size={12} className="text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                  {banUserId === p.user_id && (
                    <div className="flex gap-2 items-center p-2 rounded-lg bg-destructive/5">
                      <input type="number" value={banDays} onChange={e => setBanDays(e.target.value)} min="1" className="w-16 px-2 py-1 rounded-lg bg-muted text-xs" placeholder="Days" />
                      <span className="text-[10px] text-muted-foreground">days</span>
                      <button onClick={() => banUser(p.user_id)} className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-[10px] font-bold">Ban</button>
                      <button onClick={() => setBanUserId(null)} className="text-[10px] text-muted-foreground">Cancel</button>
                    </div>
                  )}
                  {['display_name', 'username', 'bio', 'major', 'year'].map(field => (
                    <div key={field}>
                      <label className="text-[10px] uppercase text-muted-foreground font-semibold">{field.replace('_', ' ')}</label>
                      <input
                        defaultValue={p[field] || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (p[field] || '')) updateProfile(p.user_id, field, e.target.value);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* CHECK-INS TAB */}
        {tab === 'checkins' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{checkIns.length} active check-ins</p>
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

        {/* LORE TAB */}
        {tab === 'lore' && (
          <div className="space-y-4">
            <div className="glass-strong rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Drop Lore</p>
              <textarea
                value={loreMessage}
                onChange={(e) => setLoreMessage(e.target.value)}
                placeholder="What's the campus gossip? 👀"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                {LORE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setLoreCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      loreCategory === cat.value ? 'bg-primary text-primary-foreground' : cat.bg
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <select value={loreLocation} onChange={(e) => setLoreLocation(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs">
                  <option value="">All campus</option>
                  {locations.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
                <button onClick={sendLoreDrop} disabled={loreSending || !loreMessage.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
                  <Send size={12} /> Drop
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {loreDrops.map(drop => (
                <div key={drop.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <p className="text-sm">{drop.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {drop.category !== 'general' && `${drop.category} • `}
                      {new Date(drop.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => deleteLoreDrop(drop.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOCATIONS TAB */}
        {tab === 'locations' && (
          <div className="space-y-4">
            <div className="glass-strong rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Add Location</p>
              <input value={newLocName} onChange={(e) => setNewLocName(e.target.value)} placeholder="Location name" className="w-full px-3 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <input value={newLocAddress} onChange={(e) => setNewLocAddress(e.target.value)} placeholder="Address (optional)" className="w-full px-3 py-2 rounded-lg bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <div className="grid grid-cols-3 gap-2">
                <select value={newLocType} onChange={(e) => setNewLocType(e.target.value)} className="px-3 py-2 rounded-lg bg-muted text-xs">
                  {LOCATION_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
                <input value={newLocLat} onChange={(e) => setNewLocLat(e.target.value)} placeholder="Latitude" type="number" step="any" className="px-3 py-2 rounded-lg bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <input value={newLocLng} onChange={(e) => setNewLocLng(e.target.value)} placeholder="Longitude" type="number" step="any" className="px-3 py-2 rounded-lg bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <button onClick={addLocation} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                <Plus size={14} /> Add Location
              </button>
              <p className="text-[10px] text-muted-foreground">💡 Tip: You can also drop locations directly on the map using the pin button in the top bar.</p>
            </div>
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{loc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{loc.type} • {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}{loc.address ? ` • ${loc.address}` : ''}</p>
                  </div>
                  <button onClick={() => deleteLocation(loc.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
