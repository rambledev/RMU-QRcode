import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
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

    return NextResponse.json({ user: user || null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phone, userType, department, faculty } = body;

    if (!email || !name || !phone || !userType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: { name, phone, userType, department, faculty },
        include: {
          qrCodes: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
    } else {
      user = await prisma.user.create({
        data: { email, name, phone, userType, department, faculty },
        include: {
          qrCodes: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
    }

    const ipAddress =
      req.headers.get("x-forwarded-for") || "unknown";

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        email,
        action: existingUser ? "login" : "register",
        metadata: { userType, department, faculty },
        ipAddress,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ user, isNew: !existingUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}