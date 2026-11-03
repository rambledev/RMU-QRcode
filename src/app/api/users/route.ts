import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "กรุณาเข้าสู่ระบบด้วยอีเมล @rmu.ac.th";

// Returns the profile of the signed-in user (null if not registered yet)
export async function GET() {
  const email = await getSessionEmail();
  console.log("[UsersAPI][GET] START", { email });
  if (!email) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        qrCodes: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    console.log("[UsersAPI][GET] END", { email, found: !!user, qrCount: user?.qrCodes.length ?? 0 });
    return NextResponse.json({ user: user || null });
  } catch (error) {
    console.error("[UsersAPI][GET] ERROR", { error, email });
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}

// Creates or updates the profile of the signed-in user
export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  console.log("[UsersAPI][POST] START", { email });
  if (!email) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
    const { name, phone, department, faculty } = body as {
      name?: string;
      phone?: string;
      department?: string | null;
      faculty?: string | null;
    };
    // Only @rmu.ac.th accounts can sign in, so every user is internal staff
    const userType = "internal";

    if (!name?.trim() || !phone?.trim() || !department || !faculty) {
      console.log("[UsersAPI][POST] END missing fields", { email, body });
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const data = { name: name.trim(), phone: phone.trim(), userType, department, faculty };

    const user = await prisma.user.upsert({
      where: { email },
      update: data,
      create: { email, ...data },
      include: {
        qrCodes: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        email,
        action: existingUser ? "update_profile" : "register",
        metadata: { userType, department, faculty },
        ipAddress,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    console.log("[UsersAPI][POST] END", { email, userId: user.id, isNew: !existingUser });
    return NextResponse.json({ user, isNew: !existingUser });
  } catch (error) {
    console.error("[UsersAPI][POST] ERROR", { error, email, body });
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
