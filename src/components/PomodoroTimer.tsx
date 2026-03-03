import { motion } from 'framer-motion';
import { Play, Square, Clock, TrendingUp } from 'lucide-react';
import { usePomodoro } from '@/hooks/usePomodoro';

interface PomodoroTimerProps {
  large?: boolean;
}

export default function PomodoroTimer({ large = false }: PomodoroTimerProps) {
  const { isRunning, elapsed, start, stop, stats, formatTime, formatMinutes } = usePomodoro();

  if (large) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 text-center"
      >
        {/* Timer display */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isRunning ? '🔥 Study Session Active' : '📚 Ready to Study?'}
          </p>
          <motion.div
            key={isRunning ? 'running' : 'stopped'}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <div className={`text-6xl font-extrabold tabular-nums tracking-tight ${isRunning ? 'text-primary' : 'text-foreground'}`}>
              {formatTime(elapsed)}
            </div>
            {isRunning && (
              <motion.div
                className="absolute -inset-4 rounded-3xl border-2 border-primary/20"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>

        {/* Start/Stop button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={isRunning ? stop : start}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isRunning
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground shadow-glow-primary'
          }`}
        >
          {isRunning ? <><Square size={18} /> Stop Session</> : <><Play size={18} /> Start Studying</>}
        </motion.button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="glass rounded-xl p-3 text-center">
            <Clock size={16} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{formatMinutes(stats.todayMinutes)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Today</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <TrendingUp size={16} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{formatMinutes(stats.weekMinutes)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">This Week</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Compact version for profile
  return (
    <div className="glass-strong rounded-2xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📊 Study Stats</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold">{formatMinutes(stats.todayMinutes)}</p>
          <p className="text-[10px] text-muted-foreground">Today</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{formatMinutes(stats.weekMinutes)}</p>
          <p className="text-[10px] text-muted-foreground">This Week</p>
        </div>
      </div>
    </div>
  );
}
