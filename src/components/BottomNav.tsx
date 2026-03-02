import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Users, User, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = useAdmin(user?.id);

  const tabs = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Map, label: 'Map', path: '/map' },
    { icon: Users, label: 'Friends', path: '/friends' },
    { icon: User, label: 'Profile', path: '/profile' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4 glass-strong rounded-2xl px-2 py-1">
        <nav className="flex items-center justify-around">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-0.5 py-2 px-3 transition-colors"
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl bg-primary/15"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon
                  size={22}
                  className={active ? 'text-primary-foreground relative z-10' : 'text-muted-foreground relative z-10'}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={`text-[10px] font-medium relative z-10 ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
