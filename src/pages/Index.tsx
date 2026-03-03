import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, Sparkles, ArrowRight, BookOpen, Clock, Shield, Zap } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PomodoroTimer from '@/components/PomodoroTimer';

const features = [
  { icon: MapPin, title: 'Live Campus Map', desc: 'See where friends are studying in real-time with vibe badges and location markers.' },
  { icon: Users, title: 'Study Buddies', desc: 'Find and connect with classmates. Send friend requests and see who\'s online.' },
  { icon: Sparkles, title: 'Vibe Check', desc: 'Set your mood — Focused, Social, Silent, Flow, or Party — and broadcast it.' },
  { icon: Clock, title: 'Study Timer', desc: 'Track your study sessions with a built-in timer. See daily and weekly stats.' },
  { icon: Shield, title: 'Ghost Mode', desc: 'Go invisible when you need to. Hide your location from everyone.' },
  { icon: Zap, title: 'Campus Lore', desc: 'Get real-time campus notifications, special offers, and event announcements.' },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-safe">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-12 pb-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary shadow-glow-primary flex items-center justify-center">
              <BookOpen size={24} className="text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg">Study Spot</span>
              <p className="text-[10px] text-muted-foreground">University of Sheffield</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight leading-[1.1] mb-3">
            Find your people.
            <br />
            <span className="text-gradient">Find your flow.</span>
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            The real-time campus study companion. See where friends are studying, check in to spots, track your study time, and find the perfect place to focus.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-8"
        >
          <button
            onClick={() => navigate(user ? '/map' : '/auth')}
            className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {user ? 'Open Map' : 'Get Started'}
            <ArrowRight size={16} />
          </button>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-3.5 rounded-xl glass-strong text-foreground font-medium text-sm transition-colors"
            >
              Log In
            </button>
          )}
        </motion.div>

        {/* Pomodoro Timer (only when logged in) */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <PomodoroTimer large />
          </motion.div>
        )}

        {/* What We Do */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">What Study Spot Does</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="glass-strong rounded-2xl p-4"
              >
                <feature.icon size={18} className="text-primary mb-2" />
                <h3 className="text-xs font-bold mb-1">{feature.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pb-32"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Sign up', desc: 'Create your profile with your major and year.' },
              { step: '2', title: 'Check in', desc: 'Open the map, pick a study spot, and set your vibe.' },
              { step: '3', title: 'Connect', desc: 'Add friends and see where they\'re studying in real-time.' },
              { step: '4', title: 'Track', desc: 'Start the study timer and build your weekly streak.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
