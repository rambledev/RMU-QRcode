import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { generateQRDataUrl } from "@/lib/qr";

const UNAUTHORIZED_MESSAGE = "กรุณาเข้าสู่ระบบด้วยอีเมล @rmu.ac.th";

// Resolves the DB user of the signed-in account; the client never chooses the userId
async function getSessionUser() {
  const email = await getSessionEmail();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

export async function POST(req: NextRequest) {
  console.log("[QRCodesAPI][POST] START");
  let body: Record<string, unknown> = {};
  try {
    const user = await getSessionUser();
    if (!user) {
      console.log("[QRCodesAPI][POST] END unauthorized");
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    body = await req.json();
    const { content, contentType, label, withLogo = true } = body as {
      content?: string;
      contentType?: string;
      label?: string;
      withLogo?: boolean;
    };

    if (!content || !contentType) {
      console.log("[QRCodesAPI][POST] END missing fields", { userId: user.id, body });
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    if (contentType === "url") {
      try {
        new URL(content);
      } catch {
        console.log("[QRCodesAPI][POST] END invalid url", { userId: user.id, content });
        return NextResponse.json({ error: "รูปแบบ URL ไม่ถูกต้อง" }, { status: 400 });
      }
    }

    const qrDataUrl = await generateQRDataUrl(content, withLogo !== false);

    const qrCode = await prisma.qRCode.create({
      data: {
        userId: user.id,
        content,
        contentType,
        label: label || undefined,
        qrDataUrl,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: "generate_qr",
        metadata: { contentType, label, withLogo: withLogo !== false, qrCodeId: qrCode.id },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    console.log("[QRCodesAPI][POST] END", { userId: user.id, qrCodeId: qrCode.id, withLogo: withLogo !== false });
    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error("[QRCodesAPI][POST] ERROR", { error, body });
    return NextResponse.json({ error: "ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}

export async function GET() {
  console.log("[QRCodesAPI][GET] START");
  try {
    const user = await getSessionUser();
    if (!user) {
      console.log("[QRCodesAPI][GET] END unauthorized");
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    console.log("[QRCodesAPI][GET] END", { userId: user.id, count: qrCodes.length });
    return NextResponse.json({ qrCodes });
  } catch (error) {
    console.error("[QRCodesAPI][GET] ERROR", { error });
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
