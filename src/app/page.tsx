"use client";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import UserRegistrationDialog from "@/components/UserRegistrationDialog";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import QRCodeHistory from "@/components/QRCodeHistory";

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

export default function Home() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // After Google sign-in, load the profile of the signed-in account
  useEffect(() => {
    if (status !== "authenticated") return;
    const loadProfile = async () => {
      const url = "/api/users";
      console.log("[Home][loadProfile] START", { email: session?.user?.email });
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (process.env.NODE_ENV === "development") {
          console.group("[DEV] API Response");
          console.log("URL:", url);
          console.log("Response:", data);
          console.groupEnd();
        }
        if (res.ok && data.user) {
          setUser(data.user);
          setQrCodes(data.user.qrCodes || []);
        }
        console.log("[Home][loadProfile] END", { found: !!data.user });
      } catch (error) {
        console.error("[Home][loadProfile] ERROR", { error, email: session?.user?.email });
      } finally {
        setProfileLoaded(true);
      }
    };
    loadProfile();
  }, [status, session?.user?.email]);

  const handleUserRegistered = (registeredUser: User, existingQrCodes: QRCode[]) => {
    setUser(registeredUser);
    setQrCodes(existingQrCodes);
  };

  const handleQRGenerated = (newQR: QRCode) => {
    setQrCodes((prev) => [newQR, ...prev]);
  };

  const handleLogout = () => {
    console.log("[Home][handleLogout]", { email: user?.email });
    setUser(null);
    setQrCodes([]);
    signOut({ callbackUrl: "/" });
  };

  const dialogStep: "login" | "info" | null =
    status === "unauthenticated" ? "login"
    : status === "authenticated" && profileLoaded && !user ? "info"
    : null;

  return (
    <div className="min-h-screen pattern-bg">
      {dialogStep && (
        <UserRegistrationDialog
          step={dialogStep}
          sessionEmail={session?.user?.email}
          sessionName={session?.user?.name}
          onSuccess={handleUserRegistered}
        />
      )}

      <header className="bg-white sticky top-0 z-40 border-b border-orange-100"
        style={{ boxShadow: "0 2px 15px -3px rgba(0,0,0,0.07)" }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
              QR
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">ระบบสร้าง QR Code</h1>
              <p className="text-xs text-gray-500">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                {user.name.charAt(0)}
              </div>
              <button onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100">
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!user ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}>
              QR
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">สร้าง QR Code ฟรี ไม่หมดอายุ</h2>
            <p className="text-gray-500">บริการสร้าง QR Code สำหรับบุคลากรและบุคคลทั่วไป<br />มหาวิทยาลัยราชภัฏมหาสารคาม</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 mb-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{user.name}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">📞</span>
                    <span className="text-gray-600">{user.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">👤</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.userType === "internal" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {user.userType === "internal" ? "บุคลากร มรม." : "บุคคลภายนอก"}
                    </span>
                  </div>
                  {user.department && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-gray-400">🏛️</span>
                      <span className="text-gray-600 text-xs">{user.department}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">QR Code ทั้งหมด</span>
                  <span className="font-bold text-orange-500">{qrCodes.length}</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <h4 className="font-semibold text-gray-700 text-sm mb-3">💡 เคล็ดลับการใช้งาน</h4>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li className="flex items-start gap-2"><span className="text-orange-400">•</span>QR Code ที่สร้างไม่มีวันหมดอายุ</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400">•</span>รองรับ URL, ข้อความ, ที่อยู่, เบอร์โทร</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400">•</span>ดาวน์โหลดเป็น PNG ความละเอียดสูง</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400">•</span>Login ด้วยบัญชี @rmu.ac.th เดิมเพื่อดูประวัติ QR Code</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-6 mb-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(to bottom, #F97316, #EA580C)" }} />
                  <h2 className="font-bold text-gray-900">สร้าง QR Code ใหม่</h2>
                </div>
                <QRCodeGenerator userId={user.id} onGenerated={handleQRGenerated} />
              </div>

              {qrCodes.length > 0 && (
                <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}>
                  <QRCodeHistory qrCodes={qrCodes} userId={user.id} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-orange-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">ระบบสร้าง QR Code · มหาวิทยาลัยราชภัฏมหาสารคาม (มรม.)</p>
          <p className="text-xs text-gray-300 mt-1">Rajabhat Maha Sarakham University</p>
        </div>
      </footer>
    </div>
  );
}