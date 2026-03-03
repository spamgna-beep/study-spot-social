import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  general: { bg: 'bg-muted/60', border: 'border-border', icon: '📢' },
  special_offer: { bg: 'bg-primary/10', border: 'border-primary/30', icon: '🎁' },
  party_announced: { bg: 'bg-destructive/10', border: 'border-destructive/30', icon: '🎉' },
  serious: { bg: 'bg-foreground/10', border: 'border-foreground/20', icon: '⚠️' },
  call_to_action: { bg: 'bg-secondary/30', border: 'border-secondary/50', icon: '📣' },
};

interface LoreDrop {
  id: string;
  message: string;
  created_at: string;
  location_id: string | null;
  is_active: boolean;
  category: string;
}

interface LoreDropsProps {
  locations: any[];
}

export default function LoreDrops({ locations }: LoreDropsProps) {
  const [drops, setDrops] = useState<LoreDrop[]>([]);
  const [showPanel, setShowPanel] = useState(false);

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

  const hasUnread = drops.length > 0;

  return (
    <>
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
              initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-16 right-4 z-50 glass-strong rounded-2xl p-4 w-80 max-h-[70vh] overflow-y-auto shadow-soft"
              style={{ transformOrigin: 'top right' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold">📢 Campus Lore</h2>
                <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-full hover:bg-muted">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {drops.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No lore yet... 🤫</p>
                ) : (
                  drops.map((drop) => {
                    const loc = locations.find(l => l.id === drop.location_id);
                    const style = CATEGORY_STYLES[drop.category] || CATEGORY_STYLES.general;
                    const ago = getTimeAgo(drop.created_at);
                    return (
                      <div key={drop.id} className={`p-3 rounded-xl border ${style.bg} ${style.border}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-base">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-relaxed">{drop.message}</p>
                            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                              {loc && <span>📍 {loc.name}</span>}
                              <span>{ago}</span>
                            </div>
                          </div>
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
