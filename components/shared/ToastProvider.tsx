'use client';

import React from 'react';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster 
      position="top-center"
      containerStyle={{
        top: 16,
        zIndex: 99999,
      }}
      toastOptions={{
        duration: 3000,
        className: 'text-xs sm:text-sm font-bold shadow-2xl rounded-2xl cursor-pointer active:scale-95 transition-all',
        style: {
          padding: '12px 18px',
          maxWidth: '92vw',
          wordBreak: 'break-word',
          borderRadius: '16px',
        },
        success: {
          duration: 3000,
          style: {
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #10b981',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          duration: 3000,
          style: {
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div 
              onClick={() => toast.dismiss(t.id)} 
              className="flex items-center gap-2 cursor-pointer w-full select-none"
              title="คลิกเพื่อปิดป้ายแจ้งเตือน"
            >
              {icon}
              {message}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
