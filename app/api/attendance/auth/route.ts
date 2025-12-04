import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
