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

    // Update active check-in vibe or create quick check-in
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
    <div className="flex gap-2 items-center">
      {vibes.map((v, i) => (
        <motion.button
          key={v.value}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', damping: 12 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleVibeSelect(v.value)}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all text-xs font-medium ${
            activeVibe === v.value
              ? 'bg-primary text-primary-foreground shadow-glow-primary'
              : 'glass-strong text-foreground'
          }`}
          style={{
            transform: activeVibe === v.value ? 'translateY(-2px)' : 'none',
          }}
        >
          <span className="text-lg">{v.emoji}</span>
          <span>{v.label}</span>
        </motion.button>
      ))}

      {/* Ghost toggle */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 12 }}
        whileTap={{ scale: 0.9 }}
        onClick={onGhostToggle}
        className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all text-xs font-medium ${
          ghostMode
            ? 'bg-foreground text-background'
            : 'glass-strong text-foreground'
        }`}
      >
        <span className="text-lg">👻</span>
        <span>Ghost</span>
      </motion.button>
    </div>
  );
}
