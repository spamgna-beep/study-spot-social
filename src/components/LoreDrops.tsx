import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface LoreDrop {
  id: string;
  message: string;
  created_at: string;
  location_id: string | null;
  is_active: boolean;
}

interface LoreDropsProps {
  locations: any[];
}

export default function LoreDrops({ locations }: LoreDropsProps) {
  const { user } = useAuth();
  const isAdmin = useAdmin(user?.id);
  const [drops, setDrops] = useState<LoreDrop[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('lore_drops')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setDrops(data as LoreDrop[]);
    };
    fetch();

    const channel = supabase
      .channel('lore_drops_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lore_drops' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendDrop = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('lore_drops').insert({
      author_id: user.id,
      message: newMessage.trim(),
      location_id: selectedLocation || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Lore dropped! 📢');
      setNewMessage('');
    }
    setSending(false);
  };

  const hasUnread = drops.length > 0;

  return (
    <>
      {/* Bell icon */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPanel(true)}
        className="relative glass-strong w-10 h-10 rounded-xl flex items-center justify-center"
      >
        <Bell size={18} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-pulse" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/20"
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-t-3xl p-5 pb-10 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">📢 Campus Lore</h2>
                <button onClick={() => setShowPanel(false)} className="p-2 rounded-full hover:bg-muted">
                  <X size={18} />
                </button>
              </div>

              {/* Admin compose */}
              {isAdmin && (
                <div className="mb-4 p-3 rounded-xl bg-muted/50 space-y-2">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Admin — Drop Lore</p>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="What's the campus gossip? 👀"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-background text-xs"
                    >
                      <option value="">All campus</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={sendDrop}
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send size={12} /> Drop
                    </button>
                  </div>
                </div>
              )}

              {/* Drops list */}
              <div className="space-y-2">
                {drops.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">No lore yet... 🤫</p>
                ) : (
                  drops.map((drop) => {
                    const loc = locations.find(l => l.id === drop.location_id);
                    const ago = getTimeAgo(drop.created_at);
                    return (
                      <div key={drop.id} className="p-3 rounded-xl bg-muted/40">
                        <p className="text-sm">{drop.message}</p>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                          {loc && <span>📍 {loc.name}</span>}
                          <span>{ago}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
