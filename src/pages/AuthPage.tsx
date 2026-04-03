import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { UNIVERSITIES } from '@/lib/universities';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!university) { toast.error('Please select your university'); setLoading(false); return; }
        await signUp(email, password, displayName, university);
        toast.success('Check your email to confirm your account!');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-primary shadow-glow-primary flex items-center justify-center">
            <BookOpen size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Study Spot</h1>
            <p className="text-xs text-muted-foreground">Find your people. Find your flow.</p>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1">{isSignUp ? 'Create Account' : 'Welcome back'}</h2>
          <p className="text-xs text-muted-foreground mb-6">
            {isSignUp ? 'Join your campus study community' : 'Log in to see where everyone\'s studying'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                  required
                >
                  <option value="" disabled>Select your university</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u.name} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isSignUp ? 'Already have an account? Log in' : 'Don\'t have an account? Sign up'}
        </button>
      </motion.div>
    </div>
  );
}
