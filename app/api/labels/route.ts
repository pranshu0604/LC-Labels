import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

function getField(row: any, name: string) {
  const keys = Object.keys(row);
  const key = keys.find((k) => k.toLowerCase().trim() === name.toLowerCase().trim());
  return key ? row[key] : "";
}

export async function POST(req: Request) {
  try {
    const filename = req.headers.get("x-filename") || "upload.xlsx";
    const arrayBuffer = await req.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const inputWb = XLSX.read(buf, { type: "buffer" });
    const firstSheetName = inputWb.SheetNames[0];
    const sheet = inputWb.Sheets[firstSheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const labels: string[] = rows.map((r) => {
      const name = getField(r, "name");
      const contact = getField(r, "ph. no.");
      const address = getField(r, "add.");
      const from = getField(r, "from");
      // Use real line breaks for Excel cells
      return `${name}\n${contact}\n${address}\n\nFrom:${from}`;
    });

    // Use ExcelJS to write the output workbook so styles are preserved reliably
    const outWb = new ExcelJS.Workbook();
    const worksheet = outWb.addWorksheet("Labels");

    // Set columns: filled column, thin spacer, filled, thin spacer, filled
    worksheet.columns = [
      { header: "", key: "c1", width: 45 }, // filled
      { header: "", key: "s1", width: 3 }, // spacer
      { header: "", key: "c2", width: 45 }, // filled
      { header: "", key: "s2", width: 3 }, // spacer
      { header: "", key: "c3", width: 45 }, // filled
    ];

    // Helper: estimate required row height (points) for wrapped text in given column width (chars)
    function estimateLinesForText(text: string, colWidthChars: number) {
      if (!text) return 1;
      const softLines = String(text).split(/\r?\n/);
      let lines = 0;
      for (const l of softLines) {
        const len = l.length || 0;
        // prevent division by zero
        const wrap = Math.max(1, Math.ceil(len / Math.max(1, colWidthChars)));
        lines += wrap || 1;
      }
      return Math.max(1, lines);
    }

    // column widths (in characters) corresponding to worksheet.columns width values
    const colWidthsChars = [45, 3, 45, 3, 45];
    const lineHeightPoints = 15; // approximate line height in points per text line

    // Add rows: one label per row, duplicated across the three filled columns with thin empty columns between
    // Also insert a thin spacer row after each filled row to visually separate labels
    for (const lbl of labels) {
      // positions: [filled, spacer, filled, spacer, filled]
      const values = [lbl, "", lbl, "", lbl];
      const row = worksheet.addRow(values);

      // compute required lines for each filled cell (columns 1,3,5)
      const filledIndices = [0, 2, 4]; // 0-based for our array of values
      let maxLines = 1;
      for (const idx of filledIndices) {
        const txt = String(values[idx] ?? "");
        const colWidth = colWidthsChars[idx] || 40;
        const lines = estimateLinesForText(txt, colWidth);
        if (lines > maxLines) maxLines = lines;
      }

      // set row height based on the maximum number of lines among filled cells
      row.height = Math.max(1, maxLines) * lineHeightPoints;

      // apply alignment and wrapText only to filled cells
      const filledCellIndices = [1, 3, 5]; // 1-based cell indices in ExcelJS
      for (const idx of filledCellIndices) {
        const cell = row.getCell(idx);
        cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        if (cell.value == null) cell.value = "";
      }

      // insert a thin empty spacer row after the filled row
      const spacer = worksheet.addRow(["", "", "", "", ""]);
      spacer.height = 6; // small spacer height in points
    }

    // Generate buffer
    const outBuf = await outWb.xlsx.writeBuffer();

    return new Response(Buffer.from(outBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="labels-${Date.now()}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
