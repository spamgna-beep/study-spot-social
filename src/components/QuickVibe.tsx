import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const vibes = [
  { value: 'focused', emoji: '📚', label: 'Focused' },
  { value: 'social', emoji: '☕', label: 'Social' },
  { value: 'silent', emoji: '🔇', label: 'Silent' },
  { value: 'flow', emoji: '🌊', label: 'Flow' },
  { value: 'party', emoji: '🎉', label: 'Party' },
] as const;

interface QuickVibeProps {
  ghostMode: boolean;
  onGhostToggle: () => void;
  currentVibe?: string;
}

export default function QuickVibe({ ghostMode, onGhostToggle, currentVibe }: QuickVibeProps) {
  const { user } = useAuth();
  const [activeVibe, setActiveVibe] = useState(currentVibe || '');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (currentVibe) setActiveVibe(currentVibe);
  }, [currentVibe]);

  const handleVibeSelect = async (vibe: string) => {
    if (!user) return;
    setActiveVibe(vibe);

    const { data: existing } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      await supabase.from('check_ins').update({ vibe: vibe as any }).eq('id', existing.id);
    } else {
      await supabase.from('check_ins').insert({ user_id: user.id, vibe: vibe as any });
    }

    setExpanded(false);
    toast.success(`Vibe set to ${vibe}!`);
  };

  const activeLabel = vibes.find((v) => v.value === activeVibe)?.label || 'Choose vibe';

  return (
    <div className="flex flex-col gap-2">
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          className="glass-strong rounded-2xl p-2 shadow-soft"
        >
          <div className="flex flex-col gap-1.5">
            {vibes.map((v, i) => (
              <motion.button
                key={v.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleVibeSelect(v.value)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeVibe === v.value
                    ? 'bg-primary text-primary-foreground shadow-glow-primary'
                    : 'bg-background/70 text-foreground'
                }`}
              >
                <span className="text-base">{v.emoji}</span>
                <span>{v.label}</span>
              </motion.button>
            ))}

            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onGhostToggle();
                setExpanded(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                ghostMode ? 'bg-foreground text-background' : 'bg-background/70 text-foreground'
              }`}
            >
              <span className="text-base">👻</span>
              <span>Ghost</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setExpanded((value) => !value)}
        className="glass-strong flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left shadow-soft"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quick vibe</p>
          <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
        </div>
        <div className="ml-3 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </motion.button>
    </div>
  );
}
