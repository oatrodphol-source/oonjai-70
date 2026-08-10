'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GlobalStatusBlocker({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string>('active');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    let currentUserId: number | null = null;
    let currentUserRole: string = '';

    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        currentUserId = user.id || user.uid;
        currentUserRole = user.role;
      }
    } catch (e) {
      console.error(e);
    }

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const table = currentUserRole === 'admin' ? 'admins' : 'volunteers';

    const fetchStatus = async () => {
      try {
        const { data } = await supabase
          .from(table)
          .select('status')
          .eq('id', currentUserId)
          .maybeSingle();

        if (data) {
          setStatus(data.status || 'active');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    const channel = supabase
      .channel(`global-status-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: table, filter: `id=eq.${currentUserId}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status !== undefined) {
            setStatus(updated.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // We only block if we know for sure the status is inactive
  if (status !== 'active') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              บัญชีถูกระงับชั่วคราว
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              คุณไม่สามารถเข้าถึงระบบหรือทำการใดๆ ได้ในขณะนี้ เนื่องจากบัญชีของคุณถูกระงับการใช้งาน
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('oonjai_user');
              router.push('/login');
            }}
            className="w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // If loading or active, we render children. We don't want to block the initial UI render with a loader unnecessarily
  // if they are active anyway.
  return <>{children}</>;
}
