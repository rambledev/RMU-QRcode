"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { MRM_DEPARTMENTS } from "@/lib/departments";

type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  userType: string;
  department?: string | null;
  faculty?: string | null;
};

type QRCode = {
  id: string;
  content: string;
  contentType: string;
  label?: string | null;
  qrDataUrl: string;
  createdAt: string;
};

type Props = {
  // "login": not signed in yet, "info": signed in with Google but no profile in DB
  step: "login" | "info";
  sessionEmail?: string | null;
  sessionName?: string | null;
  onSuccess: (user: User, qrCodes: QRCode[]) => void;
};

// Maps NextAuth error codes (from ?error=) to friendly messages
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  DomainNotAllowed: "ระบบนี้อนุญาตเฉพาะอีเมล @rmu.ac.th เท่านั้น กรุณาเลือกบัญชีของมหาวิทยาลัย",
  AccessDenied: "ระบบนี้อนุญาตเฉพาะอีเมล @rmu.ac.th เท่านั้น กรุณาเลือกบัญชีของมหาวิทยาลัย",
};
const DEFAULT_AUTH_ERROR = "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";

export default function UserRegistrationDialog({ step, sessionEmail, sessionName, onSuccess }: Props) {
  const [name, setName] = useState(sessionName ?? "");
  const [phone, setPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableDepts =
    MRM_DEPARTMENTS.find((d) => d.category === selectedCategory)?.departments || [];

  // Show the error NextAuth redirected back with, then clean the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (!code) return;
    console.log("[UserRegistrationDialog][authError]", { code });
    setError(AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (sessionName && !name) setName(sessionName);
  }, [sessionName, name]);

  const handleGoogleSignIn = async () => {
    console.log("[UserRegistrationDialog][handleGoogleSignIn] START");
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error("[UserRegistrationDialog][handleGoogleSignIn] ERROR", { err });
      setError(DEFAULT_AUTH_ERROR);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log("[UserRegistrationDialog][handleSubmit] START", { name, phone, selectedCategory, selectedDept });
    if (!name.trim() || !phone.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!selectedCategory || !selectedDept) {
      setError("กรุณาเลือกคณะ / หน่วยงาน");
      return;
    }
    setLoading(true);
    setError("");
    const url = "/api/users";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, department: selectedDept, faculty: selectedCategory }),
      });
      const data = await res.json();
      if (process.env.NODE_ENV === "development") {
        console.group("[DEV] API Response");
        console.log("URL:", url);
        console.log("Response:", data);
        console.groupEnd();
      }
      if (!res.ok) {
        console.error("[UserRegistrationDialog][handleSubmit] ERROR", { status: res.status, data });
        setError(data.error || "กรุณาลองใหม่อีกครั้ง");
        return;
      }
      console.log("[UserRegistrationDialog][handleSubmit] END", { userId: data.user?.id });
      onSuccess(data.user, data.user.qrCodes || []);
    } catch (err) {
      console.error("[UserRegistrationDialog][handleSubmit] ERROR", { err });
      setError("กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
      <div className="dialog-content bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)" }}>
          <div className="relative p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1 flex-shrink-0">
                <Image src="/logo.png" alt="RMU QR Code" width={52} height={52} priority className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-white/80 text-sm">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
                <h2 className="text-xl font-semibold">ระบบสร้าง QR Code</h2>
              </div>
            </div>
            <p className="text-white/75 text-sm mt-3">
              {step === "login"
                ? "สำหรับบุคลากรและนักศึกษา มรม. เข้าสู่ระบบด้วยบัญชี Google @rmu.ac.th"
                : "กรอกข้อมูลเพิ่มเติมสำหรับการใช้งานครั้งแรก"}
            </p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {step === "login" ? (
            <div className="space-y-4">
              <button onClick={handleGoogleSignIn} disabled={loading}
                className="w-full py-3 flex items-center justify-center gap-3 border border-gray-200 bg-white text-gray-700 font-semibold rounded-2xl text-sm hover:bg-gray-50 disabled:opacity-60">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
                {loading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Google"}
              </button>
              <p className="text-xs text-center text-gray-400">อนุญาตเฉพาะอีเมล @rmu.ac.th เท่านั้น</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                <input type="email" value={sessionEmail ?? ""} disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล <span className="text-orange-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ นามสกุล"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์ <span className="text-orange-500">*</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="0XX-XXX-XXXX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm transition-all" />
              </div>
              <div className="space-y-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-xs font-medium text-orange-700">เลือกคณะ / หน่วยงานที่สังกัด <span className="text-orange-500">*</span></p>
                <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedDept(""); }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white">
                  <option value="">-- เลือกกลุ่ม --</option>
                  {MRM_DEPARTMENTS.map((cat) => (
                    <option key={cat.category} value={cat.category}>{cat.category}</option>
                  ))}
                </select>
                {selectedCategory && (
                  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white">
                    <option value="">-- เลือกคณะ / หน่วยงาน --</option>
                    {availableDepts.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
                  เปลี่ยนบัญชี
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="py-3 px-6 text-white font-semibold rounded-2xl text-sm disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", flex: 2 }}>
                  {loading ? "กำลังบันทึก..." : "เข้าใช้งานระบบ →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
