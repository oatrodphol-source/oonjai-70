import { useState, useEffect } from 'react';

export const useAuthProfile = () => {
  const [profile, setProfile] = useState({ name: 'กำลังตรวจสอบ...', role: '', initial: '?', loading: true });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('oonjai_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setProfile({
          name: user.name || 'ไม่ระบุชื่อ',
          role: user.role === 'admin' ? 'Admin' : 'Volunteer',
          initial: (user.name || '?').charAt(0).toUpperCase(),
          loading: false
        });
      } else {
        setProfile({ name: 'ไม่ได้เข้าสู่ระบบ', role: '', initial: '?', loading: false });
      }
    } catch (e) {
      console.error("Error parsing auth profile:", e);
      setProfile({ name: 'ผู้ใช้งานระบบ', role: '', initial: 'ผ', loading: false });
    }
  }, []);

  return profile;
};
