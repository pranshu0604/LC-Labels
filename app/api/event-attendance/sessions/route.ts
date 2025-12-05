import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Get all attendance sessions for a coordinator
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const coordinatorId = searchParams.get("coordinatorId");

    if (!coordinatorId) {
      return NextResponse.json(
        { error: "Coordinator ID is required" },
        { status: 400 }
      );
    }

    const sessions = await prisma.eventAttendanceSession.findMany({
      where: {
        coordinatorId: parseInt(coordinatorId),
      },
      include: {
        attendanceRecords: {
          include: {
            volunteer: true,
          },
        },
      },
      orderBy: {
        sessionDateTime: "desc",
      },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Error fetching attendance sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance sessions" },
      { status: 500 }
    );
  }
}

// POST: Create a new attendance session
export async function POST(req: NextRequest) {
  try {
    const { coordinatorId } = await req.json();

    if (!coordinatorId) {
      return NextResponse.json(
        { error: "Coordinator ID is required" },
        { status: 400 }
      );
    }

    // Get all volunteers for this coordinator
    const volunteers = await prisma.volunteer.findMany({
      where: {
        coordinatorId: parseInt(coordinatorId),
      },
    });

    // Create the session with IST datetime (handled by database default)
    const session = await prisma.eventAttendanceSession.create({
      data: {
        coordinatorId: parseInt(coordinatorId),
      },
      include: {
        attendanceRecords: {
          include: {
            volunteer: true,
          },
        },
      },
    });

    // Create attendance records for all volunteers (initially marked as absent)
    // Use createMany with skipDuplicates to handle race conditions
    await prisma.eventAttendanceRecord.createMany({
      data: volunteers.map((volunteer) => ({
        sessionId: session.id,
        volunteerId: volunteer.id,
        isPresent: false,
      })),
      skipDuplicates: true,
    });

    // Fetch the created records with volunteer details
    const attendanceRecords = await prisma.eventAttendanceRecord.findMany({
      where: {
        sessionId: session.id,
      },
      include: {
        volunteer: true,
      },
    });

    // Return the session with the created records
    const updatedSession = {
      ...session,
      attendanceRecords,
    };

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error("Error creating attendance session:", error);
    return NextResponse.json(
      { error: "Failed to create attendance session" },
      { status: 500 }
    );
  }
}
