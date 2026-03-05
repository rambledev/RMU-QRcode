import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, content, contentType, label } = body;

    if (!userId || !content || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (contentType === "url") {
      try {
        new URL(content);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
    }

    const qrDataUrl = await QRCode.toDataURL(content, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1a1a1a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    const qrCode = await prisma.qRCode.create({
      data: {
        userId,
        content,
        contentType,
        label: label || undefined,
        qrDataUrl,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    await prisma.usageLog.create({
      data: {
        userId,
        action: "generate_qr",
        metadata: { contentType, label, qrCodeId: qrCode.id },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const qrCodes = await prisma.qRCode.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ qrCodes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}