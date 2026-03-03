import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface TopSpotsProps {
  locations: any[];
  checkIns: any[];
}

export default function TopSpots({ locations, checkIns }: TopSpotsProps) {
  const [expanded, setExpanded] = useState(false);

  const spotData = locations.map((loc) => {
    const locCheckIns = checkIns.filter((ci) => ci.location_id === loc.id);
    const total = locCheckIns.length;
    const vibes: Record<string, number> = {};
    locCheckIns.forEach((ci) => {
      vibes[ci.vibe] = (vibes[ci.vibe] || 0) + 1;
    });
    const socialPct = total > 0 ? Math.round(((vibes['social'] || 0) / total) * 100) : 0;
    const studyPct = total > 0 ? Math.round((((vibes['focused'] || 0) + (vibes['silent'] || 0) + (vibes['flow'] || 0)) / total) * 100) : 0;
    const partyPct = total > 0 ? Math.round(((vibes['party'] || 0) / total) * 100) : 0;

    let headline = `${loc.name}`;
    if (total === 0) headline = `${loc.name} — Empty`;
    else if (partyPct > 40) headline = `${loc.name} is Lit! 🎉`;
    else if (socialPct > 60) headline = `${loc.name} is Buzzing! 🐝`;
    else if (studyPct > 60) headline = `${loc.name} is Locked In 🔒`;
    else if (total >= 3) headline = `${loc.name} is Active 🔥`;

    return { ...loc, total, socialPct, studyPct, partyPct, headline };
  }).sort((a, b) => b.total - a.total);

  if (spotData.length === 0) return null;

  return (
    <div className="absolute top-20 left-4 right-4 z-20">
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-2 w-full"
        whileTap={{ scale: 0.98 }}
      >
        <TrendingUp size={16} className="text-primary" />
        <span className="text-xs font-semibold flex-1 text-left">Top Spots Today</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {spotData.map((spot) => (
              <motion.div
                key={spot.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="glass-strong rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{spot.headline}</span>
                  <span className="text-[10px] text-muted-foreground">{spot.total} here</span>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>📚 Study {spot.studyPct}%</span>
                  <span>☕ Social {spot.socialPct}%</span>
                  {spot.partyPct > 0 && <span>🎉 Party {spot.partyPct}%</span>}
                </div>
                {spot.total > 0 && (
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-primary rounded-l-full" style={{ width: `${spot.studyPct}%` }} />
                    <div className="h-full bg-cafe" style={{ width: `${spot.socialPct}%` }} />
                    {spot.partyPct > 0 && <div className="h-full bg-destructive" style={{ width: `${spot.partyPct}%` }} />}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
