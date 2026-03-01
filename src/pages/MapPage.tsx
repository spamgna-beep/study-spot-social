import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import CheckInModal from '@/components/CheckInModal';
import VibeBar from '@/components/VibeBar';
import { useNavigate } from 'react-router-dom';

const VIBE_EMOJI: Record<string, string> = {
  focused: '📚',
  social: '☕',
  silent: '🔇',
  chill: '🎧',
  cramming: '🔥',
};

const VIBE_COLORS: Record<string, string> = {
  focused: 'hsl(48, 94%, 56%)',
  social: 'hsl(30, 25%, 55%)',
  silent: 'hsl(100, 18%, 68%)',
  chill: 'hsl(200, 30%, 65%)',
  cramming: 'hsl(0, 60%, 65%)',
};

const LOCATION_COLORS: Record<string, string> = {
  library: '#A8B79A',
  cafe: '#A68B6B',
  yourmumshouse: '#7DB37D',
};

export default function MapPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase.from('locations').select('*');
      if (data) setLocations(data);
    };
    fetchLocations();
  }, []);

  // Fetch active check-ins with realtime
  useEffect(() => {
    const fetchCheckIns = async () => {
      const { data } = await supabase
        .from('check_ins')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('is_active', true);
      if (data) setActiveCheckIns(data);
    };
    fetchCheckIns();

    const channel = supabase
      .channel('check_ins_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, () => {
        fetchCheckIns();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Placeholder map (Mapbox token needed)
  useEffect(() => {
    if (!mapContainer.current) return;
    // Show a beautiful placeholder instead of mapbox
    setMapLoaded(true);
  }, []);

  // Calculate vibe percentages
  const vibeData = (() => {
    const total = activeCheckIns.length || 1;
    const counts: Record<string, number> = { focused: 0, social: 0, silent: 0, chill: 0, cramming: 0 };
    activeCheckIns.forEach((ci) => { counts[ci.vibe] = (counts[ci.vibe] || 0) + 1; });
    return Object.entries(counts).map(([key, count]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      emoji: VIBE_EMOJI[key],
      percentage: (count / total) * 100,
      color: VIBE_COLORS[key],
    }));
  })();

  if (loading) return null;

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Map Placeholder */}
      <div ref={mapContainer} className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-muted via-background to-secondary/20 relative">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />

          {/* Location markers */}
          {locations.map((loc, i) => {
            const xPos = 15 + (i * 14) + (i % 2 === 0 ? 5 : 0);
            const yPos = 20 + (i * 10) + (i % 3 === 0 ? 8 : 0);
            return (
              <motion.div
                key={loc.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', damping: 15 }}
                className="absolute"
                style={{ left: `${xPos}%`, top: `${yPos}%` }}
              >
                <div className="relative group">
                  {/* Pulse ring */}
                  <div
                    className="absolute -inset-3 rounded-full animate-pulse-ring"
                    style={{ backgroundColor: LOCATION_COLORS[loc.type] + '30' }}
                  />
                  {/* Marker dot */}
                  <div
                    className="w-4 h-4 rounded-full shadow-soft border-2 border-card"
                    style={{ backgroundColor: LOCATION_COLORS[loc.type] }}
                  />
                  {/* Label */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="glass px-2.5 py-1 rounded-lg text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {loc.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Active user avatars */}
          {activeCheckIns.map((ci, i) => {
            const xPos = 25 + (i * 18) % 60;
            const yPos = 30 + (i * 15) % 40;
            return (
              <motion.div
                key={ci.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                className="absolute"
                style={{ left: `${xPos}%`, top: `${yPos}%` }}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-secondary border-2 border-card shadow-soft flex items-center justify-center text-sm font-semibold text-secondary-foreground">
                    {(ci.profiles as any)?.display_name?.[0] || '?'}
                  </div>
                  {/* Vibe badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card shadow-soft flex items-center justify-center text-[10px]">
                    {VIBE_EMOJI[ci.vibe]}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Center text if no token */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-strong rounded-2xl p-6 text-center max-w-xs">
              <div className="text-3xl mb-2">🗺️</div>
              <h3 className="font-bold text-sm mb-1">Map Preview</h3>
              <p className="text-xs text-muted-foreground">
                Add your Mapbox token to enable the interactive 3D map. Locations and check-ins are shown as placeholders.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold">Study Spot</h1>
            <p className="text-xs text-muted-foreground">{activeCheckIns.length} studying now</p>
          </div>
          <div className="glass rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outdoor animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCheckInOpen(true)}
        className="fixed bottom-32 right-5 z-40 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-glow-primary flex items-center justify-center"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      {/* Vibe Analytics Bar */}
      <VibeBar data={vibeData} />

      {/* Check-in Modal */}
      <CheckInModal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        locations={locations}
      />

      <BottomNav />
    </div>
  );
}
