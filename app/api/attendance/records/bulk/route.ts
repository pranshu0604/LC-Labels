import { NextRequest, NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// POST: Mark attendance for multiple people on a date
export async function POST(req: NextRequest) {
  try {
    await ensureDB();

    const { person_ids, date } = await req.json();

    if (!person_ids || !Array.isArray(person_ids) || !date) {
      return NextResponse.json(
        { error: "Person IDs (array) and date are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    const results = {
      added: [] as any[],
      duplicates: [] as any[],
      errors: [] as any[],
    };

    try {
      await client.query("BEGIN");

      // Fetch all existing attendance records for these people on this date (single query)
      const existingRecords = await client.query(
        "SELECT person_id FROM attendance WHERE person_id = ANY($1) AND date = $2",
        [person_ids, date]
      );

      const existingPersonIds = new Set(existingRecords.rows.map((r: any) => r.person_id));

      // Separate new records from duplicates
      const newPersonIds: number[] = [];
      person_ids.forEach(person_id => {
        if (existingPersonIds.has(person_id)) {
          results.duplicates.push({ person_id, date });
        } else {
          newPersonIds.push(person_id);
        }
      });

      // Batch insert all new records at once
      if (newPersonIds.length > 0) {
        const values = newPersonIds.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
        const params = newPersonIds.flatMap(id => [id, date]);

        const result = await client.query(
          `INSERT INTO attendance (person_id, date)
           VALUES ${values}
           RETURNING *`,
          params
        );
        results.added = result.rows;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error marking bulk attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
