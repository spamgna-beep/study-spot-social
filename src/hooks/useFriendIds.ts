import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFriendIds(userId: string | undefined) {
  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (data) {
        setFriendIds(data.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id));
      }
    };

    fetch();

    const channel = supabase
      .channel('friendships_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return friendIds;
}
