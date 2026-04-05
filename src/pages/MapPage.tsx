import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, MapPin as MapPinIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useFriendIds } from '@/hooks/useFriendIds';
import { useAdmin } from '@/hooks/useAdmin';
import BottomNav from '@/components/BottomNav';
import CheckInModal from '@/components/CheckInModal';
import VibeBar from '@/components/VibeBar';
import QuickVibe from '@/components/QuickVibe';
import TopSpots from '@/components/TopSpots';
import LoreDrops from '@/components/LoreDrops';
import MapPomodoroButton from '@/components/MapPomodoroButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { findUniversity } from '@/lib/universities';
import uniSheffieldLogo from '@/assets/uni-sheffield-logo.png';

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

const PROXIMITY_METERS = 200;

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(startedAt: string): string {
  const mins = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MapPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin(user?.id);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const locMarkerRefs = useRef<Map<string, { marker: maplibregl.Marker; badge: HTMLElement; party: HTMLElement; popup: maplibregl.Popup }>>(new Map());
  const friendMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [ghostMode, setGhostMode] = useState(false);
  const [currentVibe, setCurrentVibe] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [testingMode, setTestingMode] = useState(false);
  const [adminDropMode, setAdminDropMode] = useState(false);
  const [hasDarkModeTheme, setHasDarkModeTheme] = useState(false);
  const [timerTick, setTimerTick] = useState(0);
  const [userUni, setUserUni] = useState<string | null>(null);

  const friendIds = useFriendIds(user?.id);
  const { position } = useGeolocation(!ghostMode);

  const fetchTestingMode = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'testing_mode').maybeSingle();
    setTestingMode(data?.value === 'true');
  }, []);

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from('locations').select('*');
    if (data) setLocations(data);
  }, []);

  const fetchActiveCheckIns = useCallback(async () => {
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('*')
      .eq('is_active', true);

    if (!checkIns?.length) {
      setActiveCheckIns([]);
      setCurrentVibe('');
      return;
    }

    const userIds = [...new Set(checkIns.map((checkIn) => checkIn.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, ghost_mode, username, last_seen_at')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
    const mergedCheckIns = checkIns.map((checkIn) => ({
      ...checkIn,
      profile: profileMap.get(checkIn.user_id) || null,
    }));

    setActiveCheckIns(mergedCheckIns);

    const ownCheckIn = mergedCheckIns.find((checkIn) => checkIn.user_id === user?.id);
    setCurrentVibe(ownCheckIn?.vibe || '');
  }, [user?.id]);

  const fetchDarkModeOwnership = useCallback(async () => {
    if (!user) {
      setHasDarkModeTheme(false);
      return;
    }

    const { data }: any = await supabase
      .from('user_purchases' as any)
      .select('shop_items:item_id(name, metadata)')
      .eq('user_id', user.id);

    const unlockedDarkMode = (data || []).some((purchase: any) => {
      const name = purchase.shop_items?.name || '';
      const theme = purchase.shop_items?.metadata?.theme || '';
      return theme === 'dark' || /dark/i.test(name);
    });

    setHasDarkModeTheme(unlockedDarkMode);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const interval = window.setInterval(() => setTimerTick((value) => value + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Fetch ghost mode + current vibe + testing mode
  useEffect(() => {
    if (!user) return;

    supabase.from('profiles').select('ghost_mode, university').eq('user_id', user.id).single().then(({ data }: any) => {
      if (data) {
        setGhostMode(data.ghost_mode);
        setUserUni(data.university || null);
      }
    });

    fetchActiveCheckIns();
    fetchDarkModeOwnership();
  }, [user, fetchActiveCheckIns, fetchDarkModeOwnership]);

  useEffect(() => {
    fetchTestingMode();

    const channel = supabase
      .channel('app_settings_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchTestingMode)
      .subscribe();

    const interval = window.setInterval(fetchTestingMode, 12000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchTestingMode]);

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

        // Auto-remove if too far (skip if testing mode or admin)
        if (activeCI.location_id && !isAdmin && !testingMode) {
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
  }, [position, user, ghostMode, locations, isAdmin, testingMode]);

  // Init MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const uni = findUniversity(userUni);
    const center: [number, number] = uni ? uni.center : [-1.4886, 53.3811];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
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

    // Admin drag-drop: click to add location
    map.on('click', async (e) => {
      if (!adminDropMode) return;
      const name = prompt('Enter location name:');
      if (!name) return;
      const type = prompt('Enter type (library, cafe, outdoor):', 'library');
      if (!type || !['library', 'cafe', 'outdoor'].includes(type)) return;

      const { error } = await supabase.from('locations').insert({
        name, type: type as any,
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
        university: userUni,
      });
      if (error) toast.error(error.message);
      else toast.success(`${name} added!`);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [userUni]);

  // Update adminDropMode ref for click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = adminDropMode ? 'crosshair' : '';
  }, [adminDropMode]);

  // Fetch locations
  useEffect(() => {
    fetchLocations();

    const channel = supabase
      .channel('locations_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, fetchLocations)
      .subscribe();

    const interval = window.setInterval(fetchLocations, 15000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchLocations]);

  // Fetch check-ins realtime
  useEffect(() => {
    fetchActiveCheckIns();

    const channel = supabase
      .channel('check_ins_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, fetchActiveCheckIns)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchActiveCheckIns)
      .subscribe();

    const interval = window.setInterval(fetchActiveCheckIns, 8000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchActiveCheckIns]);

  // Create STABLE location markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    locMarkerRefs.current.forEach(({ marker }) => marker.remove());
    locMarkerRefs.current.clear();

    locations.forEach(loc => {
      const isOtherUni = userUni && loc.university && loc.university !== userUni;

      const el = document.createElement('div');
      el.style.cssText = 'width:32px;height:32px;position:relative;cursor:pointer;';

      if (isOtherUni) {
        const dot = document.createElement('div');
        const color = LOCATION_COLORS[loc.type] || '#888';
        dot.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);position:absolute;top:4px;left:4px;opacity:0.7;`;
        el.appendChild(dot);
      } else {
        const img = document.createElement('img');
        img.src = uniSheffieldLogo;
        img.style.cssText = 'width:28px;height:28px;object-fit:contain;border-radius:4px;background:white;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);position:absolute;top:2px;left:2px;';
        el.appendChild(img);
      }

      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;border-radius:9px;background:hsl(48,94%,56%);color:hsl(40,30%,12%);font-size:9px;font-weight:700;display:none;align-items:center;justify-content:center;border:2px solid white;padding:0 3px;z-index:2;';
      el.appendChild(badge);

      const partyEl = document.createElement('div');
      partyEl.style.cssText = 'position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:16px;display:none;';
      partyEl.textContent = '🎉';
      el.appendChild(partyEl);

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false })
        .setHTML(`<div style="font-size:12px;padding:4px 6px;"><strong>${loc.name}</strong>${isOtherUni ? `<br/><span style="color:#b07000;font-size:10px;">📌 ${loc.university}</span>` : ''}<br/><span style="color:#888;">0 studying here</span></div>`);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map);

      locMarkerRefs.current.set(loc.id, { marker, badge, party: partyEl, popup });
    });
  }, [locations, mapReady]);

  // Update location badges + popups WITHOUT recreating markers
  useEffect(() => {
    locMarkerRefs.current.forEach(({ badge, party, popup }, locId) => {
      const count = activeCheckIns.filter(ci => ci.location_id === locId).length;
      const hasParty = activeCheckIns.some(ci => ci.location_id === locId && ci.vibe === 'party');
      const loc = locations.find(l => l.id === locId);
      const visiblePeople = activeCheckIns.filter((checkIn) => {
        if (checkIn.location_id !== locId) return false;
        if (checkIn.user_id === user?.id) return true;
        if (isAdmin) return true;
        return friendIds.includes(checkIn.user_id);
      });
      const visibleNames = visiblePeople
        .map((checkIn) => (checkIn.profile as any)?.display_name || 'Student')
        .slice(0, 3);

      if (count > 0) {
        badge.style.display = 'flex';
        badge.textContent = String(count);
      } else {
        badge.style.display = 'none';
      }

      party.style.display = hasParty ? 'block' : 'none';

      popup.setHTML(`
        <div style="font-size:12px;padding:4px 6px;min-width:150px;">
          <strong>${loc?.name || ''}</strong><br/>
          ${loc?.university && loc.university !== userUni ? `<span style="color:#b07000;font-size:10px;">📌 ${loc.university}</span><br/>` : ''}
          <span style="color:#888;">${count} studying here</span>
          ${visibleNames.length ? `<br/><span style="color:#888;">👥 ${visibleNames.join(', ')}${visiblePeople.length > visibleNames.length ? '…' : ''}</span>` : ''}
        </div>
      `);
    });
  }, [activeCheckIns, locations, friendIds, isAdmin, user?.id]);

  // Place friend/user check-in avatars on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    friendMarkersRef.current.forEach(m => m.remove());
    friendMarkersRef.current = [];

    activeCheckIns.forEach(ci => {
      const profile = ci.profile as any;
      if (ci.user_id === user?.id) return;
      if (profile?.ghost_mode) return;
      // Admin sees everyone, non-admin sees only friends
      if (!isAdmin && !friendIds.includes(ci.user_id)) return;

      // Filter out stale users (not seen in last 5 minutes) unless testing
      const lastSeen = profile?.last_seen_at;
      if (!testingMode && lastSeen) {
        const seenAgo = Date.now() - new Date(lastSeen).getTime();
        if (seenAgo > 5 * 60 * 1000) return;
      }

      // Get location coordinates - use the location's fixed position
      const loc = locations.find(l => l.id === ci.location_id);
      let lng = loc?.longitude;
      let lat = loc?.latitude;
      
      // Fall back to check-in coordinates if no location
      if (!lng || !lat) {
        lng = ci.longitude;
        lat = ci.latitude;
      }
      if (!lng || !lat) return;

      const markerOffsets: Array<[number, number]> = [
        [0, -28],
        [18, -10],
        [-18, -10],
        [18, 12],
        [-18, 12],
      ];
      const markerOffset = markerOffsets[friendMarkersRef.current.length % markerOffsets.length];

      const initial = profile?.display_name?.[0] || '?';
      const vibeEmoji = VIBE_EMOJI[ci.vibe] || '';
      const vibeName = ci.vibe ? ci.vibe.charAt(0).toUpperCase() + ci.vibe.slice(1) : '';
      const locName = loc?.name;
      const duration = formatDuration(ci.started_at);
      const isFriend = friendIds.includes(ci.user_id);

      const el = document.createElement('div');
      el.style.cssText = 'width:44px;height:44px;position:relative;cursor:pointer;';
      el.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;background:hsl(100,18%,68%);border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:hsl(100,20%,15%);position:absolute;top:4px;left:4px;">
          ${initial}
        </div>
        <div style="position:absolute;top:0;right:0;width:18px;height:18px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:9px;">
          ${vibeEmoji}
        </div>
        <div style="position:absolute;right:2px;bottom:2px;width:10px;height:10px;border-radius:999px;background:hsl(140, 25%, 60%);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.16);"></div>
      `;

      const popupHtml = `
        <div style="font-size:11px;padding:4px 6px;min-width:130px;">
          <strong>${profile?.display_name || 'Student'}</strong>
          <br/><span style="color:#888;">🟢 Online now</span>
          ${loc?.university && loc.university !== userUni ? `<br/><span style="color:#b07000;font-size:10px;">📌 ${loc.university}</span>` : ''}
          ${locName ? `<br/><span style="color:#888;">📍 ${locName}</span>` : ''}
          <br/><span style="color:#888;">⏱️ ${duration}</span>
          ${ci.vibe ? `<br/><span style="color:#888;">${vibeEmoji} ${vibeName}</span>` : ''}
          ${ci.study_goal ? `<br/><span style="color:#888;">🎯 ${ci.study_goal}</span>` : ''}
          ${!isFriend && isAdmin ? '<br/><span style="color:#cc8800;font-size:9px;">👁️ Admin view</span>' : ''}
        </div>`;

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        offset: markerOffset,
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      friendMarkersRef.current.push(marker);
    });
  }, [activeCheckIns, friendIds, user?.id, locations, mapReady, isAdmin, timerTick]);

  // Heatmap layer for all locations
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Build heatmap data from check-ins
    const features = activeCheckIns
      .filter(ci => ci.location_id)
      .map(ci => {
        const loc = locations.find(l => l.id === ci.location_id);
        if (!loc) return null;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [loc.longitude, loc.latitude] },
          properties: { weight: 1 },
        };
      })
      .filter(Boolean);

    const sourceId = 'heatmap-source';
    const layerId = 'heatmap-layer';

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as any).setData({ type: 'FeatureCollection', features });
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 15, 15, 30],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(168,183,154,0.3)',
            0.4, 'rgba(168,183,154,0.5)',
            0.6, 'rgba(200,180,100,0.6)',
            0.8, 'rgba(230,190,60,0.7)',
            1, 'rgba(230,170,30,0.8)',
          ],
          'heatmap-opacity': 0.6,
        },
      });
    }
  }, [activeCheckIns, locations, mapReady]);

  // Show own location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !mapReady) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([position.longitude, position.latitude]);
    } else {
      const el = document.createElement('div');
      el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:hsl(48,94%,56%);border:4px solid white;box-shadow:0 0 12px hsla(48,94%,56%,0.4);';

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
            {hasDarkModeTheme && <ThemeToggle />}
            <LoreDrops locations={locations} />
            {isAdmin && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setAdminDropMode(!adminDropMode)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                  adminDropMode ? 'bg-primary text-primary-foreground' : 'glass-strong'
                }`}
                title="Drop location on map"
              >
                <MapPinIcon size={18} />
              </motion.button>
            )}
            <div className="glass rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-outdoor animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>

      <TopSpots locations={locations} checkIns={activeCheckIns} />

      {/* Quick Vibe */}
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
