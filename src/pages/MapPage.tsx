import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useFriendIds } from '@/hooks/useFriendIds';
import BottomNav from '@/components/BottomNav';
import CheckInModal from '@/components/CheckInModal';
import VibeBar from '@/components/VibeBar';
import QuickVibe from '@/components/QuickVibe';
import TopSpots from '@/components/TopSpots';
import LoreDrops from '@/components/LoreDrops';
import { useNavigate } from 'react-router-dom';

const VIBE_EMOJI: Record<string, string> = {
  focused: '📚',
  social: '☕',
  silent: '🔇',
  flow: '🌊',
  chill: '🎧',
  cramming: '🔥',
};

const VIBE_COLORS: Record<string, string> = {
  focused: 'hsl(48, 94%, 56%)',
  social: 'hsl(30, 25%, 55%)',
  silent: 'hsl(100, 18%, 68%)',
  flow: 'hsl(220, 60%, 60%)',
  chill: 'hsl(200, 30%, 65%)',
  cramming: 'hsl(0, 60%, 65%)',
};

const LOCATION_COLORS: Record<string, string> = {
  library: '#A8B79A',
  cafe: '#A68B6B',
  outdoor: '#7DB37D',
};

// Sheffield center
const SHEFFIELD_CENTER: [number, number] = [-1.4886, 53.3811];

export default function MapPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [ghostMode, setGhostMode] = useState(false);
  const [currentVibe, setCurrentVibe] = useState<string>('');

  const friendIds = useFriendIds(user?.id);
  const { position } = useGeolocation(!ghostMode);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Fetch user's ghost mode + current vibe
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('ghost_mode').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setGhostMode(data.ghost_mode);
    });
    supabase.from('check_ins').select('vibe').eq('user_id', user.id).eq('is_active', true).maybeSingle().then(({ data }) => {
      if (data) setCurrentVibe(data.vibe);
    });
  }, [user]);

  // Broadcast location to check-in
  useEffect(() => {
    if (!user || !position || ghostMode) return;
    const updateLocation = async () => {
      const { data: activeCI } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (activeCI) {
        await supabase.from('check_ins').update({
          latitude: position.latitude,
          longitude: position.longitude,
        }).eq('id', activeCI.id);
      }
    };
    updateLocation();
  }, [position, user, ghostMode]);

  // Init MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: SHEFFIELD_CENTER,
      zoom: 15,
      pitch: 45,
      bearing: -10,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      // 3D building extrusion
      const layers = map.getStyle().layers;
      if (layers) {
        for (const layer of layers) {
          if (layer.id.includes('building') && layer.type === 'fill') {
            map.addLayer({
              id: '3d-buildings',
              source: layer.source,
              'source-layer': (layer as any)['source-layer'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': '#d4cfc4',
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, ['get', 'render_height']],
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-opacity': 0.5,
              },
            });
            break;
          }
        }
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fetch locations
  useEffect(() => {
    supabase.from('locations').select('*').then(({ data }) => {
      if (data) setLocations(data);
    });
  }, []);

  // Fetch check-ins realtime
  useEffect(() => {
    const fetchCheckIns = async () => {
      const { data } = await supabase
        .from('check_ins')
        .select('*, profiles:user_id(display_name, avatar_url, ghost_mode)')
        .eq('is_active', true);
      if (data) setActiveCheckIns(data);
    };
    fetchCheckIns();

    const channel = supabase
      .channel('check_ins_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, () => fetchCheckIns())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Place location markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    locations.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = LOCATION_COLORS[loc.type] || '#888';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      el.style.cursor = 'pointer';

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
        .setHTML(`<div style="font-size:12px;font-weight:600;padding:2px 4px;">${loc.name}</div>`);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [locations]);

  // Place friend check-in avatars on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old friend markers (keep location markers)
    const friendMarkerClass = 'friend-avatar-marker';
    document.querySelectorAll(`.${friendMarkerClass}`).forEach(el => el.remove());

    activeCheckIns.forEach(ci => {
      // Only show friends (not self) who are not in ghost mode and have coordinates
      const profile = ci.profiles as any;
      if (!ci.latitude || !ci.longitude) return;
      if (ci.user_id === user?.id) return; // don't show self as friend
      if (profile?.ghost_mode) return;
      if (!friendIds.includes(ci.user_id)) return;

      const initial = profile?.display_name?.[0] || '?';
      const vibeEmoji = VIBE_EMOJI[ci.vibe] || '';

      const el = document.createElement('div');
      el.className = friendMarkerClass;
      el.style.position = 'relative';
      el.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;background:hsl(100,18%,68%);border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:hsl(100,20%,15%);">
          ${initial}
        </div>
        <div style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:10px;">
          ${vibeEmoji}
        </div>
      `;

      new maplibregl.Marker({ element: el })
        .setLngLat([ci.longitude, ci.latitude])
        .addTo(map);
    });
  }, [activeCheckIns, friendIds, user?.id]);

  // Show own location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([position.longitude, position.latitude]);
    } else {
      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = 'hsl(48, 94%, 56%)';
      el.style.border = '4px solid white';
      el.style.boxShadow = '0 0 12px hsla(48, 94%, 56%, 0.4)';

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
    }
  }, [position]);

  // Ghost mode toggle
  const toggleGhostMode = async () => {
    if (!user) return;
    const newMode = !ghostMode;
    setGhostMode(newMode);
    await supabase.from('profiles').update({ ghost_mode: newMode }).eq('user_id', user.id);
  };

  // Vibe bar data
  const vibeData = (() => {
    const total = activeCheckIns.length || 1;
    const counts: Record<string, number> = { focused: 0, social: 0, silent: 0, flow: 0, chill: 0, cramming: 0 };
    activeCheckIns.forEach(ci => { counts[ci.vibe] = (counts[ci.vibe] || 0) + 1; });
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
      {/* Map */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">Study Spot</h1>
            <p className="text-xs text-muted-foreground">{activeCheckIns.length} studying now</p>
          </div>
          <div className="flex items-center gap-2">
            <LoreDrops locations={locations} />
            <div className="glass rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-outdoor animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>

      {/* Top Spots */}
      <TopSpots locations={locations} checkIns={activeCheckIns} />

      {/* Quick Vibe - bottom area above nav */}
      <div className="absolute bottom-44 left-4 right-4 z-30 overflow-x-auto">
        <QuickVibe ghostMode={ghostMode} onGhostToggle={toggleGhostMode} currentVibe={currentVibe} />
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
