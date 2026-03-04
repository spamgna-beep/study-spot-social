import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAdminLoading(false);
      return;
    }
    setAdminLoading(true);
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .then(({ data }) => {
        setIsAdmin(!!(data && data.length > 0));
        setAdminLoading(false);
      });
  }, [userId]);

  return { isAdmin, adminLoading };
}
