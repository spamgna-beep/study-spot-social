import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const features = [
{ icon: MapPin, title: 'Live Map', desc: 'See where friends are studying in real-time', color: 'bg-secondary' },
{ icon: Users, title: 'Study Buddies', desc: 'Connect with classmates and form study groups', color: 'bg-primary/20' },
{ icon: Sparkles, title: 'Vibe Check', desc: 'Set your mood — focused, social, or silent', color: 'bg-outdoor/20' }];


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
          className="pt-16 pb-8">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary shadow-glow-primary flex items-center justify-center">
              <BookOpen size={24} className="text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Study Spot</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1] mb-4">
            Find your people.
            <br />
            <span className="text-gradient">Find your flow.</span>
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
            A real-time campus map that shows where your friends are studying. Check in, set your vibe, and find the perfect study spot.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-12">

          <button
            onClick={() => navigate(user ? '/map' : '/auth')}
            className="flex-1 py-3.5 rounded-xl text-primary-foreground font-semibold text-sm shadow-glow-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 bg-popover">

            {user ? 'Open Map' : 'Get Started'}
            <ArrowRight size={16} />
          </button>
          {!user &&
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3.5 rounded-xl text-foreground font-medium text-sm transition-colors bg-popover">

              Log In
            </button>
          }
        </motion.div>

        {/* Features */}
        <div className="space-y-3 pb-32">
          {features.map((feature, i) =>
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass-strong rounded-2xl p-4 flex items-start gap-4">

              <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
                <feature.icon size={20} className="text-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-0.5">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>);

}