"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "rescue">("rescue");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optional: save token to localStorage or context
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
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
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all z-10 ${role === "rescue" ? "text-orange-600" : "text-white"}`}
            onClick={() => setRole("rescue")}
          >
            หน่วยกู้ภัย
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
              ชื่อบัญชีผู้ใช้ / อีเมล
            </label>
            <input
              type="text"
              name="email"
              placeholder="Username or Email"
              className="w-full px-5 py-3 rounded-2xl bg-orange-200/90 text-gray-900 placeholder-gray-500 border-none outline-none focus:ring-2 focus:ring-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full px-5 py-3 rounded-2xl bg-orange-200/90 text-gray-900 placeholder-gray-500 border-none outline-none focus:ring-2 focus:ring-white"
              required
            />
          </div>

          {error && (
            <div className="text-red-300 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="w-full h-12 mt-6 bg-[#02163a] hover:bg-[#0b1325] text-lg rounded-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm">
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
    </div>
  );
}
