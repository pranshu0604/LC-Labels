import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Get a specific attendance session with all records
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = parseInt(sessionIdParam);

    const session = await prisma.eventAttendanceSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        coordinator: {
          select: {
            id: true,
            name: true,
            username: true,
            registrationNo: true,
          },
        },
        attendanceRecords: {
          include: {
            volunteer: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Error fetching attendance session:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance session" },
      { status: 500 }
    );
  }
}

// PATCH: Update attendance records for a session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = parseInt(sessionIdParam);
    const { volunteerIds } = await req.json();

    if (!Array.isArray(volunteerIds)) {
      return NextResponse.json(
        { error: "volunteerIds must be an array" },
        { status: 400 }
      );
    }

    // Get current IST time for markedAt
    const now = new Date();

    // Get all attendance records for this session
    const allRecords = await prisma.eventAttendanceRecord.findMany({
      where: {
        sessionId,
      },
    });

    // Update all records: set isPresent to true for selected volunteers, false for others
    const updatePromises = allRecords.map((record) => {
      const isPresent = volunteerIds.includes(record.volunteerId);
      return prisma.eventAttendanceRecord.update({
        where: {
          id: record.id,
        },
        data: {
          isPresent,
          markedAt: isPresent ? now : null,
        },
      });
    });

    await Promise.all(updatePromises);

    // Also update the volunteer's attendance array for present volunteers
    const presentVolunteerIds = volunteerIds;

    // Fetch the session to get the sessionDateTime
    const session = await prisma.eventAttendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      // Update each present volunteer's attendance array
      await Promise.all(
        presentVolunteerIds.map(async (volunteerId: number) => {
          const volunteer = await prisma.volunteer.findUnique({
            where: { id: volunteerId },
          });

          if (volunteer) {
            // Check if this datetime is not already in the array
            const attendanceArray = volunteer.attendance || [];
            const sessionDateTime = session.sessionDateTime;

            // Only add if not already present
            const alreadyExists = attendanceArray.some(
              (date) => date.getTime() === sessionDateTime.getTime()
            );

            if (!alreadyExists) {
              await prisma.volunteer.update({
                where: { id: volunteerId },
                data: {
                  attendance: {
                    push: sessionDateTime,
                  },
                },
              });
            }
          }
        })
      );
    }

    // Fetch updated session with records
    const updatedSession = await prisma.eventAttendanceSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        attendanceRecords: {
          include: {
            volunteer: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error("Error updating attendance records:", error);
    return NextResponse.json(
      { error: "Failed to update attendance records" },
      { status: 500 }
    );
  }
}
