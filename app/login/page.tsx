"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { THAI_PROVINCES } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "volunteer">("volunteer");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetErrorMsg, setResetErrorMsg] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetErrorMsg("");
    setResetSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const username = formData.get("resetUsername") as string;
    const phone = formData.get("resetPhone") as string;
    const agency = (formData.get("resetAgency") as string) || "";
    const province = (formData.get("resetProvince") as string) || "";
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!agency.trim() || !province.trim()) {
      setResetErrorMsg("กรุณาระบุหน่วยงาน/สังกัดกู้ภัย และเลือกจังหวัดประจำการ");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetErrorMsg("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 4) {
      setResetErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          phone,
          agency,
          province,
          newPassword,
          role: 'volunteer',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetSuccessMsg(data.message || "เปลี่ยนรหัสผ่านสำเร็จ!");
        setTimeout(() => {
          setShowForgotModal(false);
        }, 2200);
      } else {
        setResetErrorMsg(data.error || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
      }
    } catch (err: any) {
      setResetErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      if (res.ok) {
        const data = await res.json();

        // 1. เก็บข้อมูลที่ได้ลง localStorage ตามที่กำหนด
        localStorage.setItem("oonjai_user", JSON.stringify(data));

        // 2. Redirect โดยเช็คจาก data.role
        if (data.role === "admin") {
          router.push("/dashboard");
        } else if (data.role === "rescue" || data.role === "volunteer") {
          // ในระบบปัจจุบัน dashboard รองรับทั้งสอง Role และแสดงผลต่างกัน
          router.push("/dashboard"); 
        } else {
          router.push("/");
        }
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center p-4 bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1547683905-f686c993aae5')",
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="w-full max-w-md bg-orange-600/90 dark:bg-[#e65c00]/95 backdrop-blur-md rounded-[35px] p-8 text-white relative z-10 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center mb-8">
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
          เข้าสู่ระบบเจ้าหน้าที่
        </h3>

        <div className="flex bg-white/20 p-1 rounded-full mb-8 relative">
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all z-10 ${role === "volunteer" ? "text-orange-600" : "text-white"}`}
            onClick={() => setRole("volunteer")}
          >
            อาสาสมัคร
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all z-10 ${role === "admin" ? "text-orange-600" : "text-white"}`}
            onClick={() => setRole("admin")}
          >
            ผู้ดูแลระบบ
          </button>
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 ${role === "admin" ? "translate-x-full left-1" : "left-1"}`}
          ></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-600" />
              </div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                className="w-full pl-11 pr-5 py-3 rounded-2xl bg-orange-200/90 text-gray-900 placeholder-gray-600 border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">รหัสผ่าน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                className="w-full pl-11 pr-12 py-3 rounded-2xl bg-orange-200/90 text-gray-900 placeholder-gray-600 border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-inner"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setResetSuccessMsg('');
                  setResetErrorMsg('');
                }}
                className="text-xs font-bold text-white/90 hover:text-white underline transition-colors cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-300 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="w-full h-12 mt-4 bg-[#02163a] hover:bg-[#0b1325] text-lg rounded-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-white/80">ยังไม่มีบัญชีผู้ใช้? </span>
          <Link
            href="/register"
            className="font-bold underline hover:text-white transition-colors"
          >
            ลงทะเบียนสมัครสมาชิก
          </Link>
          <br />
          <br />
          <Link
            href="/"
            className="font-bold underline hover:text-white transition-colors"
          >
            กลับไปหน้าแรก
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-orange-500/40 rounded-3xl p-6 sm:p-7 text-white shadow-2xl overflow-hidden">
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6600]/15 rounded-full blur-2xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">ตั้งรหัสผ่านใหม่</h3>
                  <p className="text-xs text-gray-400">ยืนยันข้อมูลตัวตนเพื่อกำหนดรหัสผ่านใหม่</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Volunteer Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-400 text-xs font-extrabold border border-orange-500/35 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff6600] animate-ping"></span>
                สำหรับเจ้าหน้าที่อาสาสมัครกู้ภัย
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleResetPassword} className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="resetUsername"
                  placeholder="เช่น somchai123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  เบอร์โทรศัพท์ที่ลงทะเบียน (10 หลัก) <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="resetPhone"
                  maxLength={10}
                  placeholder="08XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    หน่วยงาน/สังกัดกู้ภัย <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="resetAgency"
                    placeholder="เช่น บรรจง, ร่วมกตัญญู"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    จังหวัดประจำการ <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="resetProvince"
                    required
                    defaultValue=""
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="" disabled className="text-gray-400">
                      -- เลือกจังหวัด --
                    </option>
                    {THAI_PROVINCES.map((p) => (
                      <option key={p} value={p} className="bg-[#0f172a] text-white">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  รหัสผ่านใหม่ <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="กรอกยืนยันรหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
              </div>

              {resetErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold text-center">
                  ⚠️ {resetErrorMsg}
                </div>
              )}

              {resetSuccessMsg && (
                <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold text-center">
                  ✅ {resetSuccessMsg}
                </div>
              )}

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-3 rounded-xl bg-[#ff6600] hover:bg-[#e65c00] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-orange-500/25 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'กำลังตรวจสอบ...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
