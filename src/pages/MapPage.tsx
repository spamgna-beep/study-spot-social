import { useEffect, useRef, useState } from 'react';
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
import MapPomodoroButton from '@/components/MapPomodoroButton';
import { useNavigate } from 'react-router-dom';

const VIBE_EMOJI: Record<string, string> = {
  focused: '📚', social: '☕', silent: '🔇', flow: '🌊',
  chill: '🎧', cramming: '🔥', party: '🎉',
};

const VIBE_COLORS: Record<string, string> = {
  focused: 'hsl(48, 94%, 56%)', social: 'hsl(30, 25%, 55%)',
  silent: 'hsl(100, 18%, 68%)', flow: 'hsl(220, 60%, 60%)',
  chill: 'hsl(200, 30%, 65%)', cramming: 'hsl(0, 60%, 65%)',
  party: 'hsl(330, 80%, 60%)',
};

const LOCATION_COLORS: Record<string, string> = {
  library: '#A8B79A', cafe: '#A68B6B', outdoor: '#7DB37D',
};

const SHEFFIELD_CENTER: [number, number] = [-1.4886, 53.3811];
const PROXIMITY_METERS = 200;

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const friendMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [ghostMode, setGhostMode] = useState(false);
  const [currentVibe, setCurrentVibe] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);

  const friendIds = useFriendIds(user?.id);
  const { position } = useGeolocation(!ghostMode);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Fetch ghost mode + current vibe
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('ghost_mode').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setGhostMode(data.ghost_mode);
    });
    supabase.from('check_ins').select('vibe').eq('user_id', user.id).eq('is_active', true).maybeSingle().then(({ data }) => {
      if (data) setCurrentVibe(data.vibe);
    });
  }, [user]);

  // Broadcast location + auto-remove check-in if user left
  useEffect(() => {
    if (!user || !position || ghostMode) return;
    const updateLocation = async () => {
      const { data: activeCI } = await supabase
        .from('check_ins').select('id, location_id')
        .eq('user_id', user.id).eq('is_active', true).maybeSingle();

      if (activeCI) {
        await supabase.from('check_ins').update({
          latitude: position.latitude, longitude: position.longitude,
        }).eq('id', activeCI.id);

        if (activeCI.location_id) {
          const loc = locations.find(l => l.id === activeCI.location_id);
          if (loc) {
            const dist = distanceMeters(position.latitude, position.longitude, loc.latitude, loc.longitude);
            if (dist > PROXIMITY_METERS) {
              await supabase.from('check_ins').update({
                is_active: false, ended_at: new Date().toISOString(),
              }).eq('id', activeCI.id);
            }
          }
        }
      }
    };
    updateLocation();
  }, [position, user, ghostMode, locations]);

  // Init MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: SHEFFIELD_CENTER,
      zoom: 15, pitch: 45, bearing: -10,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      setMapReady(true);
      const layers = map.getStyle().layers;
      if (layers) {
        for (const layer of layers) {
          if (layer.id.includes('building') && layer.type === 'fill') {
            map.addLayer({
              id: '3d-buildings', source: layer.source,
              'source-layer': (layer as any)['source-layer'],
              type: 'fill-extrusion', minzoom: 14,
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
    const fetch = async () => {
      const { data } = await supabase.from('locations').select('*');
      if (data) setLocations(data);
    };
    fetch();
    // Subscribe to location changes (admin adds/removes)
    const channel = supabase
      .channel('locations_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  // Place location markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    locations.forEach(loc => {
      const count = activeCheckIns.filter(ci => ci.location_id === loc.id).length;
      const hasParty = activeCheckIns.some(ci => ci.location_id === loc.id && ci.vibe === 'party');

      const el = document.createElement('div');
      el.style.position = 'relative';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="width:24px;height:24px;border-radius:50%;background:${LOCATION_COLORS[loc.type] || '#888'};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>
        ${count > 0 ? `<div style="position:absolute;top:-8px;right:-10px;min-width:20px;height:20px;border-radius:10px;background:hsl(48,94%,56%);color:hsl(40,30%,12%);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;padding:0 4px;">${count}</div>` : ''}
        ${hasParty ? `<div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);font-size:16px;animation:float 2s ease-in-out infinite;">🎉</div>` : ''}
      `;

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false })
        .setHTML(`<div style="font-size:12px;padding:4px 6px;"><strong>${loc.name}</strong><br/><span style="color:#888;">${count} studying here</span></div>`);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [locations, activeCheckIns, mapReady]);

  // Place friend check-in avatars
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    friendMarkersRef.current.forEach(m => m.remove());
    friendMarkersRef.current = [];

    activeCheckIns.forEach(ci => {
      const profile = ci.profiles as any;
      if (ci.user_id === user?.id) return;
      if (profile?.ghost_mode) return;
      if (!friendIds.includes(ci.user_id)) return;

      // Use location coords if no personal lat/lng
      let lng = ci.longitude;
      let lat = ci.latitude;
      if (!lng || !lat) {
        const loc = locations.find(l => l.id === ci.location_id);
        if (loc) { lng = loc.longitude; lat = loc.latitude; }
        else return;
      }

      const initial = profile?.display_name?.[0] || '?';
      const vibeEmoji = VIBE_EMOJI[ci.vibe] || '';
      const locName = locations.find(l => l.id === ci.location_id)?.name;

      const el = document.createElement('div');
      el.style.position = 'relative';
      el.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;background:hsl(100,18%,68%);border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:hsl(100,20%,15%);">
          ${initial}
        </div>
        <div style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:9px;">
          ${vibeEmoji}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`<div style="font-size:11px;padding:2px 4px;"><strong>${profile?.display_name || 'Friend'}</strong>${locName ? `<br/><span style="color:#888;">📍 ${locName}</span>` : ''}${ci.study_goal ? `<br/><span style="color:#888;">🎯 ${ci.study_goal}</span>` : ''}</div>`);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      friendMarkersRef.current.push(marker);
    });
  }, [activeCheckIns, friendIds, user?.id, locations, mapReady]);

  // Show own location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !mapReady) return;

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

      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
    }
  }, [position, mapReady]);

  const toggleGhostMode = async () => {
    if (!user) return;
    const newMode = !ghostMode;
    setGhostMode(newMode);
    await supabase.from('profiles').update({ ghost_mode: newMode }).eq('user_id', user.id);
  };

  const vibeData = (() => {
    const total = activeCheckIns.length || 1;
    const counts: Record<string, number> = { focused: 0, social: 0, silent: 0, flow: 0, chill: 0, cramming: 0, party: 0 };
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
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">Study Spot</h1>
            <p className="text-xs text-muted-foreground">{activeCheckIns.length} studying now</p>
          </div>
          <div className="flex items-center gap-2">
            <MapPomodoroButton />
            <LoreDrops locations={locations} />
            <div className="glass rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-outdoor animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>

      <TopSpots locations={locations} checkIns={activeCheckIns} />

      {/* Quick Vibe - vertical stack above FAB */}
      <div className="absolute bottom-40 left-4 z-30 w-28">
        <QuickVibe ghostMode={ghostMode} onGhostToggle={toggleGhostMode} currentVibe={currentVibe} />
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCheckInOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-glow-primary flex items-center justify-center"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      <VibeBar data={vibeData} />

      <CheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)} locations={locations} />

      <BottomNav />
    </div>
  );
}
