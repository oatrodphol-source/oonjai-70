import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export const useAuthProfile = () => {
  const [profile, setProfile] = useState({ name: 'กำลังโหลด...', role: '', initial: '?', loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.email) {
        try {
          const collections = ['admins', 'volunteers'];
          let found = false;
          for (const col of collections) {
            const q = query(collection(db, col), where('email', '==', currentUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const data = snap.docs[0].data();
              setProfile({ 
                name: data.name || 'ไม่ระบุชื่อ', 
                role: col === 'admins' ? 'Admin' : 'Volunteer', 
                initial: (data.name || '?')[0],
                loading: false 
              });
              found = true;
              break;
            }
          }
          if (!found) {
            setProfile({ name: currentUser.displayName || 'ผู้ใช้งานระบบ', role: 'User', initial: (currentUser.displayName || 'ผ')[0], loading: false });
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
          setProfile({ name: 'ผู้ใช้งานระบบ', role: '', initial: 'ผ', loading: false });
        }
      } else {
        setProfile({ name: 'ไม่ได้เข้าสู่ระบบ', role: '', initial: '?', loading: false });
      }
    });
  }, []);

  return profile;
};
