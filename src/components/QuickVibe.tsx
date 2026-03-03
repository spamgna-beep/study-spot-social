import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    toast.success(`Vibe set to ${vibe}!`);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {vibes.map((v, i) => (
        <motion.button
          key={v.value}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, type: 'spring', damping: 14 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleVibeSelect(v.value)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-medium w-full ${
            activeVibe === v.value
              ? 'bg-primary text-primary-foreground shadow-glow-primary'
              : 'glass-strong text-foreground'
          }`}
        >
          <span className="text-base">{v.emoji}</span>
          <span>{v.label}</span>
        </motion.button>
      ))}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 14 }}
        whileTap={{ scale: 0.95 }}
        onClick={onGhostToggle}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-medium w-full ${
          ghostMode ? 'bg-foreground text-background' : 'glass-strong text-foreground'
        }`}
      >
        <span className="text-base">👻</span>
        <span>Ghost</span>
      </motion.button>
    </div>
  );
}
