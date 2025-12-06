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
    const worksheetName = req.headers.get("x-worksheet") || "";
    const rowRangeType = req.headers.get("x-row-range-type") || "all";
    const startRowStr = req.headers.get("x-start-row") || "1";
    const endRowStr = req.headers.get("x-end-row") || "";
    const labelMode = req.headers.get("x-label-mode") || "with-from";
    
    const arrayBuffer = await req.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const inputWb = XLSX.read(buf, { type: "buffer" });
    const sheetName = worksheetName || inputWb.SheetNames[0];
    const sheet = inputWb.Sheets[sheetName];
    if (!sheet) {
      return NextResponse.json({ error: `Worksheet "${sheetName}" not found` }, { status: 400 });
    }
    let rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Debug: log first row keys to see column names
    if (rows.length > 0) {
      console.log("Available columns:", Object.keys(rows[0]));
      console.log("First row data:", rows[0]);
    }

    // Check if the first row contains the actual headers (common issue with merged cells or non-standard spreadsheets)
    // If we detect __EMPTY columns and first row has "Name", "Designation", etc., re-parse with correct header row
    const firstRowKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const hasEmptyColumns = firstRowKeys.some(k => k.includes('__EMPTY'));

    if (hasEmptyColumns && rows.length > 0) {
      // Check if first row contains header-like values
      const firstRow = rows[0];
      const firstRowValues = Object.values(firstRow).map(v => String(v).toLowerCase().trim());
      const hasHeaderKeywords = firstRowValues.some(v =>
        v.includes('name') || v.includes('designation') || v.includes('address') || v.includes('phone')
      );

      if (hasHeaderKeywords) {
        console.log("Detected header row in data. Re-parsing with correct headers...");

        // Get the range of the sheet
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        // Find which row has the actual headers by checking cell values
        let headerRowIndex = range.s.r; // start row
        for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
          const cellAddr = XLSX.utils.encode_cell({ r, c: range.s.c + 1 }); // check second column
          const cell = sheet[cellAddr];
          if (cell && String(cell.v).toLowerCase().includes('name')) {
            headerRowIndex = r;
            console.log(`Found header row at Excel row ${r + 1}`);
            break;
          }
        }

        // Re-parse with the correct header row
        rows = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          range: headerRowIndex // start from the header row
        });

        console.log("Re-parsed columns:", rows.length > 0 ? Object.keys(rows[0]) : []);
        console.log("Re-parsed first data row:", rows.length > 0 ? rows[0] : {});
      }
    }

    // Apply row range filter if specified
    if (rowRangeType === "range") {
      const startRow = parseInt(startRowStr, 10) || 1;
      const endRow = endRowStr ? parseInt(endRowStr, 10) : rows.length;
      // Excel rows are 1-indexed, but after sheet_to_json the first data row is index 0
      // Assuming header is row 1, data starts at row 2 → index 0
      // If user says "start row 2", they mean the first data row (index 0)
      // If user says "start row 3", they mean index 1, etc.
      const startIdx = Math.max(0, startRow - 2); // row 2 → index 0, row 3 → index 1
      const endIdx = endRow - 1; // row 2 → index 1 (exclusive slice), row 3 → index 2
      rows = rows.slice(startIdx, endIdx);
    }

    const labels: string[] = rows.map((r, idx) => {
      if (labelMode === "name-designation-address-phone") {
        const name = String(getField(r, "name") || "").toUpperCase();
        const designation = String(getField(r, "designation") || "").toUpperCase();
        const address = String(getField(r, "address") || "").toUpperCase();
        const phone = String(getField(r, "phone no") || "").toUpperCase();

        // Debug first row
        if (idx === 0) {
          console.log("First label extraction:");
          console.log("  name:", name);
          console.log("  designation:", designation);
          console.log("  address:", address);
          console.log("  phone:", phone);
        }

        return `${name}\n${designation}\n${address}\n${phone}`;
      } else {
        const name = String(getField(r, "name") || "").toUpperCase();
        const contact = String(getField(r, "ph. no.") || "").toUpperCase();
        const address = String(getField(r, "add.") || "").toUpperCase();

        if (labelMode === "with-from") {
          const from = String(getField(r, "from") || "").toUpperCase();
          return `${name}\n${contact}\n${address}\n\nFROM:${from}`;
        } else {
          return `${name}\n${contact}\n${address}`;
        }
      }
    });

    // Use ExcelJS to write the output workbook so styles are preserved reliably
    const outWb = new ExcelJS.Workbook();
    const worksheet = outWb.addWorksheet("Labels");

    // Set columns: filled column, thin spacer, filled, thin spacer, filled (exactly 5 columns)
    // Note: ExcelJS width is in Excel column units (approximately character widths)
    worksheet.columns = [
      { header: "", key: "c1", width: 44 }, // filled (~300 pixels)
      { header: "", key: "s1", width: 3 }, // spacer (~20 pixels)
      { header: "", key: "c2", width: 44 }, // filled (~300 pixels)
      { header: "", key: "s2", width: 3 }, // spacer (~20 pixels)
      { header: "", key: "c3", width: 44 }, // filled (~300 pixels)
    ];
    
    // Ensure no additional columns are created beyond these 5
    worksheet.properties.defaultColWidth = undefined;

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
    const colWidthsChars = [40, 3, 40, 3, 40];
    const lineHeightPoints = 15; // approximate line height in points per text line

    // Add rows: repeat each label 3 times per row (in columns 1, 3, 5 with spacers in between)
    // All modes now work the same way: same label 3 times per row
    for (let i = 0; i < labels.length; i++) {
      const lbl = labels[i] || "";

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

      // apply alignment, wrapText and thick border to all cells
      for (let idx = 1; idx <= 5; idx++) {
        const cell = row.getCell(idx);
        cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thick" },
          left: { style: "thick" },
          bottom: { style: "thick" },
          right: { style: "thick" },
        };
        if (cell.value == null) cell.value = "";
      }

      // insert a thin empty spacer row after the filled row
      const spacer = worksheet.addRow(["", "", "", "", ""]);
      spacer.height = 6; // small spacer height in points

      // Ensure spacer row only has 5 cells and apply thick borders there too
      for (let idx = 1; idx <= 5; idx++) {
        const cell = spacer.getCell(idx);
        cell.border = {
          top: { style: "thick" },
          left: { style: "thick" },
          bottom: { style: "thick" },
          right: { style: "thick" },
        };
        if (cell.value == null) cell.value = "";
      }
    }

    // Remove any columns beyond column E that might have been created implicitly
    const extraColumns = worksheet.columnCount - 5;
    if (extraColumns > 0) {
      worksheet.spliceColumns(6, extraColumns);
    }

    // Limit the print area to the first five columns for clarity when printing
    worksheet.pageSetup.printArea = `A1:E${worksheet.rowCount}`;

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
