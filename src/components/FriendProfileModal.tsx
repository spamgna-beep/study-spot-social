import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FriendProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    major: string | null;
    year: string | null;
    bio: string | null;
    username: string | null;
  } | null;
}

export default function FriendProfileModal({ open, onClose, profile }: FriendProfileModalProps) {
  if (!profile) return null;

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-x-6 top-1/4 z-50 glass-strong rounded-2xl p-6 max-w-sm mx-auto"
          >
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted">
              <X size={16} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground mb-3">
                {profile.display_name?.[0] || '?'}
              </div>
              <h3 className="text-lg font-bold">{profile.display_name || 'Student'}</h3>
              {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
              {(profile.major || profile.year) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.major}{profile.major && profile.year && ' • '}{profile.year}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
