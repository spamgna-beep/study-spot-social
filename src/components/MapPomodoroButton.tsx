import { motion } from 'framer-motion';
import { Play, Square, Timer } from 'lucide-react';
import { usePomodoro } from '@/contexts/PomodoroContext';

export default function MapPomodoroButton() {
  const { isRunning, elapsed, start, stop, formatTime } = usePomodoro();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={isRunning ? stop : start}
      className={`relative glass-strong rounded-xl flex items-center gap-1.5 px-3 h-10 text-xs font-medium transition-all ${
        isRunning ? 'bg-primary/20 border-primary/30' : ''
      }`}
    >
      {isRunning ? (
        <>
          <Square size={14} className="text-destructive" />
          <span className="tabular-nums font-bold">{formatTime(elapsed)}</span>
        </>
      ) : (
        <>
          <Timer size={16} />
          <span>Study</span>
        </>
      )}
      {isRunning && (
        <motion.span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
