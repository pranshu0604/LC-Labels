import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);

    if (isNaN(personId)) {
      return NextResponse.json({ error: "Invalid person ID" }, { status: 400 });
    }

    // Fetch all attendance records for this person
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        personId: personId,
      },
      select: {
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Format dates as YYYY-MM-DD strings
    const dates = attendanceRecords.map((record) => {
      const date = new Date(record.date);
      return date.toISOString().split("T")[0];
    });

    return NextResponse.json({ dates });
  } catch (error: any) {
    console.error("Error fetching attendance dates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
