import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, UserX, Search, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import FriendProfileModal from '@/components/FriendProfileModal';

interface FriendProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  major: string | null;
  year: string | null;
  bio: string | null;
  username: string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<(FriendshipRow & { profile: FriendProfile })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(FriendshipRow & { profile: FriendProfile })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<FriendProfile | null>(null);
  const [friendStudyStats, setFriendStudyStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFriendships();
    const channel = supabase
      .channel('friendships_page_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetchFriendships())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchFriendships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships').select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (!data) return;

    const userIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const accepted = data
      .filter(f => f.status === 'accepted')
      .map(f => ({ ...f, profile: profileMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id) as FriendProfile }))
      .filter(f => f.profile);

    const pending = data
      .filter(f => f.status === 'pending' && f.addressee_id === user.id)
      .map(f => ({ ...f, profile: profileMap.get(f.requester_id) as FriendProfile }))
      .filter(f => f.profile);

    setFriends(accepted);
    setPendingRequests(pending);

    // Fetch weekly study stats for accepted friends
    if (accepted.length > 0) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const friendUserIds = accepted.map(f => f.profile.user_id);
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('user_id, duration_seconds')
        .in('user_id', friendUserIds)
        .gte('created_at', weekStart.toISOString());
      
      const statsMap: Record<string, number> = {};
      (sessions || []).forEach(s => {
        statsMap[s.user_id] = (statsMap[s.user_id] || 0) + s.duration_seconds;
      });
      setFriendStudyStats(statsMap);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .neq('user_id', user.id)
      .limit(10);
    setSearchResults((data as FriendProfile[]) || []);
  };

  const sendRequest = async (targetUserId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('friendships').select('id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (existing) { toast.error('Friend request already exists!'); return; }
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: targetUserId });
    if (error) toast.error(error.message);
    else { toast.success('Friend request sent! 🤝'); setSearchResults(prev => prev.filter(p => p.user_id !== targetUserId)); fetchFriendships(); }
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) toast.error(error.message);
    else { toast.success('Friend added! 🎉'); fetchFriendships(); }
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriendships();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    toast.success('Friend removed');
    fetchFriendships();
  };

  const formatStudyTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-safe">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold">Friends</h1>
          <p className="text-sm text-muted-foreground">See who's studying nearby</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or username..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Search</button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <motion.div key={profile.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                  <button onClick={() => setSelectedProfile(profile)} className="flex items-center gap-3 text-left flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">{profile.display_name?.[0] || '?'}</div>
                    <div>
                      <p className="text-sm font-medium">{profile.display_name}</p>
                      {profile.major && <p className="text-xs text-muted-foreground">{profile.major}</p>}
                    </div>
                  </button>
                  <button onClick={() => sendRequest(profile.user_id)} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <UserPlus size={18} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Requests ({pendingRequests.length})</h3>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">{req.profile.display_name?.[0] || '?'}</div>
                    <p className="text-sm font-medium">{req.profile.display_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(req.id)} className="p-2 rounded-xl bg-primary/15 hover:bg-primary/25 transition-colors"><UserCheck size={18} className="text-primary" /></button>
                    <button onClick={() => declineRequest(req.id)} className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors"><UserX size={18} className="text-destructive" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Friends ({friends.length})</h3>
          {friends.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm text-muted-foreground">Search for friends to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => {
                const weekSecs = friendStudyStats[friend.profile.user_id] || 0;
                return (
                  <div key={friend.id} className="glass-strong rounded-xl p-3 flex items-center justify-between">
                    <button onClick={() => setSelectedProfile(friend.profile)} className="flex items-center gap-3 text-left flex-1">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">{friend.profile.display_name?.[0] || '?'}</div>
                      <div>
                        <p className="text-sm font-medium">{friend.profile.display_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {friend.profile.major && <span>{friend.profile.major}</span>}
                          {friend.profile.year && <span>• {friend.profile.year}</span>}
                          {weekSecs > 0 && (
                            <span className="flex items-center gap-0.5 text-primary font-medium">
                              <Clock size={10} /> {formatStudyTime(weekSecs)} this week
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button onClick={() => removeFriend(friend.id)} className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors" title="Remove friend">
                      <X size={16} className="text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FriendProfileModal open={!!selectedProfile} onClose={() => setSelectedProfile(null)} profile={selectedProfile} />
      <BottomNav />
    </div>
  );
}
