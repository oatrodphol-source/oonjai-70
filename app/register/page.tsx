'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    agency: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Phone strictly numbers
    if (name === 'phone') {
      const val = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: val }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'rescue',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      setSuccess('ลงทะเบียนสำเร็จ! กำลังพากลับไปหน้าเข้าสู่ระบบ...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1547683905-f686c993aae5')",
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="w-full max-w-[500px] bg-orange-600/90 dark:bg-[#e65c00]/95 backdrop-blur-md rounded-[35px] p-8 md:p-10 text-white relative z-10 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full p-2 mb-4 shadow-lg flex items-center justify-center">
            <img
              src="/icon01.ico"
              alt="logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h2 className="text-3xl font-bold tracking-wider">OonJai</h2>
        </div>

        <h3 className="text-xl font-bold text-center mb-6">
          ลงทะเบียนเจ้าหน้าที่
        </h3>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">ชื่อ-นามสกุล</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="ชื่อ-นามสกุล"
                required
                className="w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-white bg-[#f4b685] text-gray-900 placeholder-gray-600 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">หน่วยกู้ภัย</label>
              <input
                type="text"
                name="agency"
                value={formData.agency}
                onChange={handleChange}
                placeholder="ชื่อหน่วยงาน"
                required
                className="w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-white bg-[#f4b685] text-gray-900 placeholder-gray-600 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-1.5">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="08X-XXX-XXXX"
              required
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-white bg-[#f4b685] text-gray-900 placeholder-gray-600 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">อีเมล</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="อีเมล"
                required
                className="w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-white bg-[#e6efff] text-gray-900 placeholder-gray-500 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-white bg-[#e6efff] text-gray-900 placeholder-gray-500 shadow-inner"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001433] hover:bg-[#002255] text-white font-semibold py-4 px-4 rounded-xl transition duration-200 disabled:opacity-70 shadow-lg text-lg"
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </button>
          </div>
        </form>

        <div className="text-center mt-8">
          <Link href="/login" className="text-white/90 hover:text-white hover:underline text-sm transition">
            &larr; กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
