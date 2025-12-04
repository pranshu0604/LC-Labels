import { NextRequest, NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";
import ExcelJS from "exceljs";

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDB();

    // Fetch all people with attendance count
    const result = await pool.query(`
      SELECT
        p.id,
        p.uid,
        p.name,
        p.registration_no,
        p.contact_no,
        COUNT(DISTINCT a.date) as attendance_count
      FROM people p
      LEFT JOIN attendance a ON p.id = a.person_id
      GROUP BY p.id, p.uid, p.name, p.registration_no, p.contact_no
      ORDER BY p.name
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Report");

    // Add headers
    worksheet.columns = [
      { header: "UID", key: "uid", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Registration No.", key: "registration_no", width: 20 },
      { header: "Contact No.", key: "contact_no", width: 20 },
      { header: "Total Attendance Days", key: "attendance_count", width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data
    result.rows.forEach((row: any) => {
      worksheet.addRow({
        uid: row.uid,
        name: row.name,
        registration_no: row.registration_no,
        contact_no: row.contact_no || "",
        attendance_count: row.attendance_count,
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
