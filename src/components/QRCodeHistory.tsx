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
  qrCodes: QRCode[];
  userId: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function QRCodeHistory({ qrCodes, userId }: Props) {
  const [selected, setSelected] = useState<QRCode | null>(null);

  if (qrCodes.length === 0) return null;

  const handleDownload = async (qr: QRCode) => {
    const link = document.createElement("a");
    link.href = qr.qrDataUrl;
    link.download = `QRCode_${qr.label || qr.id}_${new Date(qr.createdAt).toISOString().slice(0, 10)}.png`;
    link.click();
    await fetch("/api/qrcodes/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, qrCodeId: qr.id }),
    });
  };

  return (
    <>
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(to bottom, #F97316, #EA580C)" }} />
          <h3 className="font-semibold text-gray-800">QR Code ที่เคยสร้าง</h3>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {qrCodes.length} รายการ
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {qrCodes.map((qr) => (
            <button key={qr.id} onClick={() => setSelected(qr)}
              className="p-3 bg-white rounded-2xl border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  <img src={qr.qrDataUrl} alt="QR" className="w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    qr.contentType === "url" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  }`}>
                    {qr.contentType === "url" ? "URL" : "Text"}
                  </span>
                  <p className="text-xs text-gray-800 font-medium truncate mt-1">{qr.label || "ไม่มีชื่อ"}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 truncate">{qr.content}</p>
              <p className="text-xs text-gray-300 mt-1">{formatDate(qr.createdAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelected(null)}>
          <div className="dialog-content bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-1">{selected.label || "QR Code"}</h4>
            <p className="text-xs text-gray-400 mb-4 break-all">
              {selected.content.length > 80 ? selected.content.slice(0, 80) + "..." : selected.content}
            </p>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-2xl shadow border border-gray-100">
                <img src={selected.qrDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">สร้างเมื่อ {formatDate(selected.createdAt)}</p>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-50">
                ปิด
              </button>
              <button onClick={() => handleDownload(selected)}
                className="flex-1 py-3 text-white font-semibold rounded-2xl text-sm"
                style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                ⬇ ดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}