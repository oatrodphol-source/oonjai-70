'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const LineUserInitializer = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const lineUidParam = urlParams.get('line_uid');
    
    if (lineUidParam && lineUidParam.startsWith('U')) {
      localStorage.setItem('oonjai_line_uid', lineUidParam);
    }

    const lineUid = lineUidParam || localStorage.getItem('oonjai_line_uid');

    if (lineUid && lineUid.startsWith('U')) {
      const syncActiveCase = async () => {
        try {
          const { data: activeCase } = await supabase
            .from('cases')
            .select('id')
            .eq('reporter_name', lineUid)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (activeCase) {
            localStorage.setItem('oonjai_active_case_id', String(activeCase.id));
            localStorage.setItem('oonjai_last_report', JSON.stringify({
              caseId: String(activeCase.id),
              timestamp: Date.now()
            }));
          } else {
            localStorage.removeItem('oonjai_active_case_id');
          }
        } catch (e) {}
      };

      syncActiveCase();
    }
  }, []);

  return null;
};
