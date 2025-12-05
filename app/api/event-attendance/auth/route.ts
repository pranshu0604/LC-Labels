import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find coordinator by username
    const coordinator = await prisma.coordinator.findUnique({
      where: { username },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, coordinator.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Return coordinator data (without password)
    return NextResponse.json({
      success: true,
      coordinator: {
        id: coordinator.id,
        name: coordinator.name,
        username: coordinator.username,
        registrationNo: coordinator.registrationNo,
      },
    });
  } catch (error) {
    console.error("Error authenticating coordinator:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
