import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .then(({ data }) => {
        setIsAdmin(!!(data && data.length > 0));
      });
  }, [userId]);

  return isAdmin;
}
