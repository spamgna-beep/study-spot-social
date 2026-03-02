import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, BookOpen, Coffee, TreePine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const vibes = [
  { value: 'focused', emoji: '📚', label: 'Focused' },
  { value: 'social', emoji: '☕', label: 'Social' },
  { value: 'silent', emoji: '🔇', label: 'Silent' },
  { value: 'flow', emoji: '🌊', label: 'Flow' },
  { value: 'chill', emoji: '🎧', label: 'Chill' },
  { value: 'cramming', emoji: '🔥', label: 'Cramming' },
] as const;

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  locations: Array<{ id: string; name: string; type: string }>;
}

export default function CheckInModal({ open, onClose, locations }: CheckInModalProps) {
  const { user } = useAuth();
  const [selectedVibe, setSelectedVibe] = useState<string>('focused');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [studyGoal, setStudyGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCheckIn = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // End any active check-ins first
      await supabase
        .from('check_ins')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create new check-in
      const { error } = await supabase.from('check_ins').insert({
        user_id: user.id,
        location_id: selectedLocation || null,
        vibe: selectedVibe as any,
        study_goal: studyGoal || null,
      });

      if (error) throw error;
      toast.success('Checked in! 📍');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'library': return <BookOpen size={16} className="text-secondary" />;
      case 'cafe': return <Coffee size={16} className="text-cafe" />;
      case 'outdoor': return <TreePine size={16} className="text-outdoor" />;
      default: return <MapPin size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Check In</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Vibe Selection */}
            <div className="mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">What's your vibe?</p>
              <div className="flex gap-2 flex-wrap">
                {vibes.map((vibe) => (
                  <button
                    key={vibe.value}
                    onClick={() => setSelectedVibe(vibe.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                      selectedVibe === vibe.value
                        ? 'bg-primary text-primary-foreground shadow-glow-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span>{vibe.emoji}</span>
                    <span>{vibe.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">Where are you studying?</p>
              <div className="grid grid-cols-2 gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl transition-all text-sm text-left ${
                      selectedLocation === loc.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {getLocationIcon(loc.type)}
                    <span className="font-medium truncate">{loc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Goal */}
            <div className="mb-8">
              <p className="text-sm font-medium text-muted-foreground mb-3">Study goal (optional)</p>
              <input
                type="text"
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                placeholder="e.g., Prepping for Calc Exam"
                className="w-full px-4 py-3 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <button
              onClick={handleCheckIn}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? 'Checking in...' : 'Check In ✨'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
