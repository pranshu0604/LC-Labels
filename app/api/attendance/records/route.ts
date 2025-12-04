import { NextRequest, NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";
import { getISTDateString } from "@/lib/timezone";

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// GET: Fetch attendance for a specific date
export async function GET(req: NextRequest) {
  try {
    await ensureDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT
        a.id as attendance_id,
        a.date,
        p.id,
        p.uid,
        p.name,
        p.registration_no,
        p.contact_no
      FROM attendance a
      JOIN people p ON a.person_id = p.id
      WHERE a.date = $1
      ORDER BY p.name`,
      [date]
    );

    return NextResponse.json({ attendance: result.rows });
  } catch (error: any) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Mark attendance for a person on a date
export async function POST(req: NextRequest) {
  try {
    await ensureDB();

    const { person_id, date } = await req.json();

    if (!person_id || !date) {
      return NextResponse.json(
        { error: "Person ID and date are required" },
        { status: 400 }
      );
    }

    // Check if already marked
    const existing = await pool.query(
      "SELECT * FROM attendance WHERE person_id = $1 AND date = $2",
      [person_id, date]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Attendance already marked for this person on this date" },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `INSERT INTO attendance (person_id, date)
       VALUES ($1, $2)
       RETURNING *`,
      [person_id, date]
    );

    return NextResponse.json({ attendance: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove attendance record
export async function DELETE(req: NextRequest) {
  try {
    await ensureDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Attendance ID is required" },
        { status: 400 }
      );
    }

    await pool.query("DELETE FROM attendance WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
