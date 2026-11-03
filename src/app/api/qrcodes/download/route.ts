import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  console.log("[DownloadAPI][POST] START");
  let body: Record<string, unknown> = {};
  try {
    const email = await getSessionEmail();
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
      console.log("[DownloadAPI][POST] END unauthorized", { email });
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบด้วยอีเมล @rmu.ac.th" }, { status: 401 });
    }

    body = await req.json();
    const { qrCodeId } = body as { qrCodeId?: string };

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: "download",
        metadata: { qrCodeId },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    console.log("[DownloadAPI][POST] END", { userId: user.id, qrCodeId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DownloadAPI][POST] ERROR", { error, body });
    return NextResponse.json({ error: "ระบบกำลังดำเนินการ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
