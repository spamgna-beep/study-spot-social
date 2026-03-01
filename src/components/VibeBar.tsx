import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface VibeData {
  label: string;
  emoji: string;
  percentage: number;
  color: string;
}

interface VibeBarProps {
  data: VibeData[];
}

export default function VibeBar({ data }: VibeBarProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
      <motion.div
        layout
        className="glass-strong rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Campus Vibes</span>
            <span className="text-xs text-muted-foreground">
              {data.reduce((sum, d) => sum + Math.round(d.percentage), 0) > 0 ? 'Live' : 'No activity'}
            </span>
          </div>
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>

        {/* Mini bar preview */}
        {!expanded && (
          <div className="px-5 pb-3 flex gap-1 h-2 rounded-full overflow-hidden">
            {sortedData.map((v) => (
              <motion.div
                key={v.label}
                className="h-full rounded-full"
                style={{ 
                  width: `${Math.max(v.percentage, 2)}%`,
                  backgroundColor: v.color,
                }}
                layout
              />
            ))}
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="px-5 pb-4"
            >
              <div className="space-y-3">
                {sortedData.map((vibe) => (
                  <div key={vibe.label} className="flex items-center gap-3">
                    <span className="text-lg w-7">{vibe.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{vibe.label}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(vibe.percentage)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: vibe.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${vibe.percentage}%` }}
                          transition={{ delay: 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
