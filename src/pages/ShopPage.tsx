import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, ShoppingBag, Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const COIN_PACKS = [
  { coins: 10, price: '£0.99', id: 'pack_10' },
  { coins: 25, price: '£1.99', id: 'pack_25' },
  { coins: 50, price: '£2.99', id: 'pack_50' },
  { coins: 100, price: '£4.99', id: 'pack_100' },
];

const ITEM_TYPE_LABELS: Record<string, string> = {
  badge: '🏅 Badges',
  theme: '🎨 Themes',
  map_icon: '📍 Map Icons',
};

export default function ShopPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [tab, setTab] = useState<string>('badge');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, itemsRes, purchasesRes] = await Promise.all([
      supabase.from('profiles').select('study_coins').eq('user_id', user.id).single(),
      supabase.from('shop_items' as any).select('*').order('cost'),
      supabase.from('user_purchases' as any).select('*').eq('user_id', user.id),
    ]);
    setCoins((profileRes.data as any)?.study_coins || 0);
    if (itemsRes.data) setItems(itemsRes.data as any[]);
    if (purchasesRes.data) setPurchases(purchasesRes.data as any[]);
  };

  const buyItem = async (item: any) => {
    if (!user) return;
    if (coins < item.cost) {
      toast.error('Not enough Study Coins!');
      return;
    }
    // Deduct coins
    await supabase.from('profiles').update({ study_coins: coins - item.cost } as any).eq('user_id', user.id);
    // Record purchase
    await (supabase.from('user_purchases' as any) as any).insert({ user_id: user.id, item_id: item.id });
    toast.success(`Purchased ${item.name}! 🎉`);
    fetchData();
  };

  const toggleEquip = async (purchaseId: string, currentlyEquipped: boolean) => {
    await (supabase.from('user_purchases' as any) as any).update({ equipped: !currentlyEquipped }).eq('id', purchaseId);
    toast.success(currentlyEquipped ? 'Unequipped!' : 'Equipped! ✨');
    fetchData();
  };

  const ownedItemIds = new Set(purchases.map((p: any) => p.item_id));
  const filteredItems = items.filter((i: any) => i.type === tab);
  const tabs = ['badge', 'theme', 'map_icon'];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-safe">
        <div className="pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Shop</h1>
          </div>
          <div className="glass-strong rounded-xl px-3 py-2 flex items-center gap-1.5">
            <Coins size={16} className="text-primary" />
            <span className="text-sm font-bold">{coins}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t ? 'bg-primary text-primary-foreground' : 'glass-strong'
              }`}
            >
              {ITEM_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {filteredItems.map((item: any) => {
            const owned = ownedItemIds.has(item.id);
            const purchase = purchases.find((p: any) => p.item_id === item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-strong rounded-2xl p-4 flex flex-col items-center text-center"
              >
                <span className="text-3xl mb-2">{item.metadata?.emoji || item.metadata?.effect === 'fireworks' ? '🎆' : item.metadata?.theme ? '🎨' : '✨'}</span>
                <p className="text-sm font-semibold mb-1">{item.name}</p>
                <p className="text-[10px] text-muted-foreground mb-3">{item.description}</p>
                {owned ? (
                  <button
                    onClick={() => toggleEquip(purchase.id, purchase.equipped)}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                      purchase?.equipped
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {purchase?.equipped ? (
                      <span className="flex items-center justify-center gap-1"><Check size={12} /> Equipped</span>
                    ) : 'Equip'}
                  </button>
                ) : (
                  <button
                    onClick={() => buyItem(item)}
                    disabled={coins < item.cost}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    <Coins size={12} /> {item.cost} coins
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Buy coins section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
            <CreditCard size={12} /> Buy Study Coins
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {COIN_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => toast.info('Payments coming soon! Keep studying to earn coins 📚')}
                className="glass-strong rounded-2xl p-4 text-center hover:bg-muted/50 transition-all"
              >
                <p className="text-2xl mb-1">🪙</p>
                <p className="text-sm font-bold">{pack.coins} Coins</p>
                <p className="text-xs text-primary font-semibold">{pack.price}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
