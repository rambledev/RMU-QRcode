"use client";
import { useState } from "react";
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
  onSuccess: (user: User, qrCodes: QRCode[]) => void;
};

export default function UserRegistrationDialog({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("external");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "info">("email");
  const [existingUser, setExistingUser] = useState<User | null>(null);

  const availableDepts =
    MRM_DEPARTMENTS.find((d) => d.category === selectedCategory)?.departments || [];

  const handleEmailCheck = async () => {
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("รูปแบบ email ไม่ถูกต้อง");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.user) {
        setExistingUser(data.user);
        setName(data.user.name);
        setPhone(data.user.phone);
        setUserType(data.user.userType);
        if (data.user.faculty) setSelectedCategory(data.user.faculty);
        if (data.user.department) setSelectedDept(data.user.department);
      }
      setStep("info");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (userType === "internal" && (!selectedCategory || !selectedDept)) {
      setError("กรุณาเลือกหน่วยงาน");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, name, phone, userType,
          department: userType === "internal" ? selectedDept : null,
          faculty: userType === "internal" ? selectedCategory : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
      onSuccess(data.user, data.user.qrCodes || []);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
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
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center font-bold">QR</div>
              <div>
                <p className="text-white/80 text-sm">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
                <h2 className="text-xl font-semibold">ระบบสร้าง QR Code</h2>
              </div>
            </div>
            <p className="text-white/75 text-sm mt-3">
              {step === "email" ? "กรุณากรอก Email เพื่อเข้าใช้งานระบบ" : "กรอกข้อมูลเพื่อใช้งานระบบ"}
            </p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {step === "email" ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล <span className="text-orange-500">*</span>
                </label>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailCheck()}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm transition-all"
                />
              </div>
              <button onClick={handleEmailCheck} disabled={loading || !email}
                className="w-full py-3 text-white font-semibold rounded-2xl text-sm disabled:opacity-60"
                style={{ background: !email ? "#ccc" : "linear-gradient(135deg, #F97316, #EA580C)" }}>
                {loading ? "กำลังตรวจสอบ..." : "ถัดไป →"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {existingUser && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-sm text-orange-800">
                  พบข้อมูลของคุณในระบบแล้ว กรุณายืนยันข้อมูล
                </div>
              )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทผู้ใช้งาน <span className="text-orange-500">*</span></label>
                <select value={userType} onChange={(e) => { setUserType(e.target.value); setSelectedCategory(""); setSelectedDept(""); }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white">
                  <option value="external">บุคคลภายนอก</option>
                  <option value="internal">บุคลากร มรม.</option>
                </select>
              </div>
              {userType === "internal" && (
                <div className="space-y-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-xs font-medium text-orange-700">เลือกหน่วยงาน</p>
                  <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedDept(""); }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white">
                    <option value="">-- เลือกกลุ่มหน่วยงาน --</option>
                    {MRM_DEPARTMENTS.map((cat) => (
                      <option key={cat.category} value={cat.category}>{cat.category}</option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white">
                      <option value="">-- เลือกหน่วยงาน --</option>
                      {availableDepts.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep("email"); setError(""); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
                  ← ย้อนกลับ
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