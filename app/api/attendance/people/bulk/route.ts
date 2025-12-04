import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 [BULK UPLOAD] Starting bulk upload process');

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const worksheetName = formData.get("worksheet") as string;

    console.log('📁 [BULK UPLOAD] File:', file?.name);
    console.log('📊 [BULK UPLOAD] Worksheet:', worksheetName);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);

    console.log('📋 [BULK UPLOAD] Available sheets:', workbook.SheetNames);

    // Use provided worksheet name or default to first sheet
    const sheetName = worksheetName && workbook.SheetNames.includes(worksheetName)
      ? worksheetName
      : workbook.SheetNames[0];

    console.log('✅ [BULK UPLOAD] Selected sheet:', sheetName);

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json({ error: "Worksheet not found" }, { status: 400 });
    }

    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    console.log('📊 [BULK UPLOAD] Total rows extracted:', data.length);
    console.log('📊 [BULK UPLOAD] First row sample:', JSON.stringify(data[0], null, 2));

    // Fetch all existing people at once
    console.log('🔍 [BULK UPLOAD] Fetching all existing people from database...');
    const allExistingPeople = await prisma.person.findMany({
      select: {
        id: true,
        uid: true,
        name: true,
        registrationNo: true,
        contactNo: true,
      },
    });
    console.log(`✅ [BULK UPLOAD] Fetched ${allExistingPeople.length} existing people`);

    // Create a map for quick lookup by registration number
    const existingPeopleMap = new Map(
      allExistingPeople.map(p => [p.registrationNo, p])
    );

    const results = {
      added: [] as any[],
      duplicates: [] as any[],
      errors: [] as any[],
      skipped: 0,
    };

    const peopleToCreate: Array<{ name: string; registrationNo: string; contactNo: string | null }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`\n🔍 [ROW ${i + 1}] Processing:`, JSON.stringify(row, null, 2));

      const name = row.NAME || row.Name || row.name;
      const registration_no = String(
        row["Registration no."] ||
        row["Registration No."] ||
        row["registration no."] ||
        row["REGISTRATION NO."] ||
        row.registration_no ||
        row.REGISTRATION_NO ||
        ""
      ).trim();
      const contact_no = String(
        row["Contact No."] ||
        row["Contact no."] ||
        row["contact no."] ||
        row.contact_no ||
        row.CONTACT_NO ||
        ""
      ).trim();

      console.log(`📝 [ROW ${i + 1}] Extracted - Name: "${name}", Reg: "${registration_no}", Contact: "${contact_no}"`);

      if (!name || !registration_no) {
        console.log(`❌ [ROW ${i + 1}] Skipped - Missing name or registration number`);
        results.errors.push({
          row,
          reason: "Missing name or registration number",
        });
        continue;
      }

      // Check if exists in our map
      const existing = existingPeopleMap.get(registration_no);

      if (existing) {
        // Compare all fields to see if anything changed
        const nameChanged = existing.name !== name;
        const contactChanged = (existing.contactNo || "") !== (contact_no || "");

        if (nameChanged || contactChanged) {
          console.log(`⚠️ [ROW ${i + 1}] Duplicate with different data: ${existing.name} (ID: ${existing.id})`);
          results.duplicates.push({
            existing: {
              id: existing.id,
              uid: existing.uid,
              name: existing.name,
              registration_no: existing.registrationNo,
              contact_no: existing.contactNo,
            },
            new: { name, registration_no, contact_no },
          });
        } else {
          console.log(`✓ [ROW ${i + 1}] Skipped - Identical duplicate: ${name}`);
          results.skipped++;
        }
      } else {
        console.log(`➕ [ROW ${i + 1}] Queued for creation: ${name}`);
        peopleToCreate.push({
          name,
          registrationNo: registration_no,
          contactNo: contact_no || null,
        });
      }
    }

    // Batch create all new people at once
    if (peopleToCreate.length > 0) {
      console.log(`\n📦 [BULK UPLOAD] Batch creating ${peopleToCreate.length} people...`);
      try {
        const createdPeople = await prisma.person.createMany({
          data: peopleToCreate,
          skipDuplicates: true,
        });
        console.log(`✅ [BULK UPLOAD] Successfully created ${createdPeople.count} people`);

        // Fetch the created people to return their IDs
        const createdRegistrationNos = peopleToCreate.map(p => p.registrationNo);
        const newPeople = await prisma.person.findMany({
          where: {
            registrationNo: { in: createdRegistrationNos },
          },
          select: {
            id: true,
            name: true,
            registrationNo: true,
            contactNo: true,
          },
        });

        // Update UIDs
        const newIds = newPeople.map(p => p.id);
        if (newIds.length > 0) {
             await prisma.$executeRaw`UPDATE people SET uid = 'UID-' || id::text WHERE id IN (${Prisma.join(newIds)})`;
        }

        results.added = newPeople.map(p => ({
          id: p.id,
          uid: `UID-${p.id}`,
          name: p.name,
          registration_no: p.registrationNo,
          contact_no: p.contactNo,
        }));
      } catch (error: any) {
        console.error(`💥 [BULK UPLOAD] Batch creation error:`, error.message);
        results.errors.push({
          row: { batch: true },
          reason: error.message,
        });
      }
    }

    console.log('\n📊 [BULK UPLOAD] Summary:');
    console.log(`  ✅ Added: ${results.added.length}`);
    console.log(`  ⚠️ Duplicates: ${results.duplicates.length}`);
    console.log(`  ⏭️  Skipped (identical): ${results.skipped}`);
    console.log(`  ❌ Errors: ${results.errors.length}`);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error processing bulk upload:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
