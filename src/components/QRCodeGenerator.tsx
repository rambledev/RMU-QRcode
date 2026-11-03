"use client";
import { useState } from "react";

type QRCode = {
  id: string;
  content: string;
  contentType: string;
  label?: string | null;
  qrDataUrl: string;
  createdAt: string;
};

type Props = {
  userId: string;
  onGenerated: (qrCode: QRCode) => void;
};

export default function QRCodeGenerator({ userId, onGenerated }: Props) {
  const [contentType, setContentType] = useState<"url" | "text">("url");
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("");
  const [withLogo, setWithLogo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedQR, setGeneratedQR] = useState<QRCode | null>(null);

  const isValidUrl = (str: string) => {
    try { new URL(str); return true; } catch { return false; }
  };

  const handleGenerate = async () => {
    if (!content.trim()) { setError("กรุณากรอก URL หรือข้อความ"); return; }
    if (contentType === "url" && !isValidUrl(content)) {
      setError("รูปแบบ URL ไม่ถูกต้อง เช่น https://www.example.com"); return;
    }
    setLoading(true); setError("");
    const url = "/api/qrcodes";
    console.log("[QRCodeGenerator][handleGenerate] START", { contentType, label, withLogo });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, contentType, label, withLogo }),
      });
      const data = await res.json();
      if (process.env.NODE_ENV === "development") {
        console.group("[DEV] API Response");
        console.log("URL:", url);
        console.log("Response:", { ...data, qrCode: data.qrCode && { ...data.qrCode, qrDataUrl: `(${data.qrCode.qrDataUrl?.length} chars)` } });
        console.groupEnd();
      }
      if (!res.ok) {
        console.error("[QRCodeGenerator][handleGenerate] ERROR", { status: res.status, data });
        setError(data.error || "กรุณาลองใหม่อีกครั้ง");
        return;
      }
      console.log("[QRCodeGenerator][handleGenerate] END", { qrCodeId: data.qrCode?.id });
      setGeneratedQR(data.qrCode);
      onGenerated(data.qrCode);
    } catch (err) {
      console.error("[QRCodeGenerator][handleGenerate] ERROR", { err, contentType });
      setError("กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedQR) return;
    const link = document.createElement("a");
    link.href = generatedQR.qrDataUrl;
    link.download = `QRCode_${label || generatedQR.id}_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    await fetch("/api/qrcodes/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, qrCodeId: generatedQR.id }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {[
          { value: "url", icon: "🔗", label: "URL / ลิงก์", desc: "เว็บไซต์, โซเชียลมีเดีย" },
          { value: "text", icon: "📝", label: "ข้อความ", desc: "ข้อมูล, ที่อยู่, หมายเลข" },
        ].map((type) => (
          <button key={type.value}
            onClick={() => { setContentType(type.value as "url" | "text"); setContent(""); setError(""); setGeneratedQR(null); }}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left ${
              contentType === type.value ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
            }`}>
            <div className="text-2xl mb-1">{type.icon}</div>
            <div className="font-semibold text-gray-800 text-sm">{type.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl text-sm" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
        <div className="flex gap-3">
          <span className="text-orange-500 text-base flex-shrink-0">💡</span>
          <div className="text-orange-900">
            {contentType === "url" ? (
              <><strong>วางลิงก์ URL</strong> ที่ต้องการสร้าง QR Code<br />
              <span className="text-orange-600 text-xs">ตัวอย่าง: https://www.rmu.ac.th</span></>
            ) : (
              <><strong>พิมพ์ข้อความ</strong> ที่ต้องการเข้ารหัสลงใน QR Code<br />
              <span className="text-orange-600 text-xs">รองรับข้อความสูงสุดประมาณ 2,000 ตัวอักษร</span></>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {contentType === "url" ? "URL / ลิงก์" : "ข้อความ"} <span className="text-orange-500">*</span>
          </label>
          {contentType === "url" ? (
            <input type="url" value={content}
              onChange={(e) => { setContent(e.target.value); setError(""); setGeneratedQR(null); }}
              placeholder="https://www.example.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm transition-all" />
          ) : (
            <textarea value={content}
              onChange={(e) => { setContent(e.target.value); setError(""); setGeneratedQR(null); }}
              placeholder="พิมพ์ข้อความที่ต้องการสร้าง QR Code..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none transition-all" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อ / คำอธิบาย <span className="text-gray-400 text-xs">(ไม่บังคับ)</span>
          </label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="เช่น เว็บไซต์คณะ, ลิงก์ลงทะเบียน..."
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm transition-all" />
        </div>
        <label className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
          withLogo ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
        }`}>
          <input type="checkbox" checked={withLogo}
            onChange={(e) => { setWithLogo(e.target.checked); setGeneratedQR(null); }}
            className="w-4 h-4 accent-orange-500" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
          <div>
            <div className="font-semibold text-gray-800 text-sm">ใส่โลโก้มหาวิทยาลัยกลาง QR Code</div>
            <div className="text-xs text-gray-500">ยังสแกนได้ตามปกติ</div>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">{error}</div>
      )}

      <button onClick={handleGenerate} disabled={loading || !content.trim()}
        className="w-full py-4 text-white font-bold rounded-2xl text-base transition-all disabled:opacity-50"
        style={{ background: !content.trim() ? "#ccc" : "linear-gradient(135deg, #F97316, #EA580C)" }}>
        {loading ? "กำลังสร้าง QR Code..." : "⬛ สร้าง QR Code"}
      </button>

      {generatedQR && (
        <div className="qr-appear mt-6 p-6 bg-white rounded-3xl border border-orange-100 text-center">
          <p className="font-semibold text-gray-800 mb-4">✅ QR Code พร้อมใช้งานแล้ว!</p>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-2xl shadow border border-gray-100">
              <img src={generatedQR.qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>
          {generatedQR.label && <p className="text-gray-600 text-sm mb-1 font-medium">{generatedQR.label}</p>}
          <p className="text-gray-400 text-xs mb-5 break-all max-w-xs mx-auto">
            {generatedQR.content.length > 60 ? generatedQR.content.slice(0, 60) + "..." : generatedQR.content}
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setGeneratedQR(null); setContent(""); setLabel(""); }}
              className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
              สร้างใหม่
            </button>
            <button onClick={handleDownload}
              className="py-3 px-5 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", flex: 2 }}>
              ⬇ ดาวน์โหลด PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}