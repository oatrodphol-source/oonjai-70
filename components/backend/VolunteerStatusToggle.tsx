'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function VolunteerStatusToggle() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.id || user.uid) {
          setCurrentUserId(user.id || user.uid);
        }
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('is_online')
          .eq('id', currentUserId)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setIsOnline(data.is_online === true);
        }
      } catch (error) {
        console.error('Error fetching volunteer status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();

    const channelName = `vol-status-toggle-${currentUserId}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'volunteers', filter: `id=eq.${currentUserId}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.is_online !== undefined) {
            setIsOnline(updated.is_online);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleToggle = async () => {
    if (!currentUserId) return;
    
    setIsUpdating(true);
    const newStatus = !isOnline;
    
    try {
      const { error } = await supabase
        .from('volunteers')
        .update({ is_online: newStatus })
        .eq('id', currentUserId);

      if (error) throw error;
      
      setIsOnline(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!currentUserId) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating || isLoading}
      className={`
        relative flex items-center justify-center gap-2 px-4 py-3 w-full max-w-[220px] rounded-full font-bold text-base transition-all duration-300 shadow-lg outline-none ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111827]
        disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1
        ${isOnline 
          ? 'bg-green-500 text-white hover:bg-green-600 ring-green-500/50 shadow-green-500/40' 
          : 'bg-red-500 text-white hover:bg-red-600 ring-red-500/50 shadow-red-500/40 animate-pulse hover:animate-none'
        }
      `}
    >
      {isLoading || isUpdating ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <span className="relative flex h-3 w-3">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          )}
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      )}
      
      <span className="tracking-wide">
        {isOnline ? 'พร้อมรับงาน' : 'ปิดรับงาน'}
      </span>
    </button>
  );
}
