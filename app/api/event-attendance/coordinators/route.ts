import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { adminPassword, name, username, password, registrationNo } = await req.json();

    // Verify admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    // Validate required fields
    if (!name || !username || !password || !registrationNo) {
      return NextResponse.json(
        { error: "All fields are required: name, username, password, registrationNo" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.coordinator.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if registration number already exists
    const existingRegNo = await prisma.coordinator.findUnique({
      where: { registrationNo },
    });

    if (existingRegNo) {
      return NextResponse.json(
        { error: "Registration number already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create coordinator
    const coordinator = await prisma.coordinator.create({
      data: {
        name,
        username,
        password: hashedPassword,
        registrationNo,
      },
    });

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
    console.error("Error creating coordinator:", error);
    return NextResponse.json(
      { error: "Failed to create coordinator" },
      { status: 500 }
    );
  }
}
