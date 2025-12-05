import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";

interface ExistingVolunteer {
  id: number;
  name: string;
  registrationNo: string;
  contactNo: string;
  uid: string | null;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 [VOLUNTEER BULK UPLOAD] Starting bulk upload process');

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const worksheetName = formData.get("worksheet") as string;
    const coordinatorId = parseInt(formData.get("coordinatorId") as string);

    console.log('📁 [VOLUNTEER BULK UPLOAD] File:', file?.name);
    console.log('📊 [VOLUNTEER BULK UPLOAD] Worksheet:', worksheetName);
    console.log('👤 [VOLUNTEER BULK UPLOAD] Coordinator ID:', coordinatorId);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!coordinatorId) {
      return NextResponse.json({ error: "Coordinator ID is required" }, { status: 400 });
    }

    // Verify coordinator exists
    const coordinator = await prisma.coordinator.findUnique({
      where: { id: coordinatorId },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);

    console.log('📋 [VOLUNTEER BULK UPLOAD] Available sheets:', workbook.SheetNames);

    // Use provided worksheet name or default to first sheet
    const sheetName = worksheetName && workbook.SheetNames.includes(worksheetName)
      ? worksheetName
      : workbook.SheetNames[0];

    console.log('✅ [VOLUNTEER BULK UPLOAD] Selected sheet:', sheetName);

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json({ error: "Worksheet not found" }, { status: 400 });
    }

    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    console.log('📊 [VOLUNTEER BULK UPLOAD] Total rows extracted:', data.length);
    console.log('📊 [VOLUNTEER BULK UPLOAD] First row sample:', JSON.stringify(data[0], null, 2));

    // Fetch all existing volunteers for this coordinator
    console.log('🔍 [VOLUNTEER BULK UPLOAD] Fetching all existing volunteers from database...');
    const allExistingVolunteers = await prisma.volunteer.findMany({
      where: { coordinatorId },
      select: {
        id: true,
        name: true,
        registrationNo: true,
        contactNo: true,
        uid: true,
      },
    });
    console.log(`✅ [VOLUNTEER BULK UPLOAD] Fetched ${allExistingVolunteers.length} existing volunteers`);

    // Fetch all volunteers from OTHER coordinators to check for conflicts
    console.log('🔍 [VOLUNTEER BULK UPLOAD] Fetching volunteers from other coordinators...');
    const volunteersFromOtherCoordinators = await prisma.volunteer.findMany({
      where: {
        coordinatorId: { not: coordinatorId }
      },
      select: {
        id: true,
        name: true,
        registrationNo: true,
        coordinatorId: true,
        coordinator: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log(`✅ [VOLUNTEER BULK UPLOAD] Fetched ${volunteersFromOtherCoordinators.length} volunteers from other coordinators`);

    // Create a map for quick lookup by registration number
    const otherCoordinatorVolunteersMap = new Map(
      volunteersFromOtherCoordinators.map(v => [
        v.registrationNo,
        { coordinatorId: v.coordinatorId, coordinatorName: v.coordinator.name, volunteerName: v.name }
      ])
    );

    // Create a map for quick lookup by registration number
    const existingVolunteersMap = new Map<string, ExistingVolunteer>(
      allExistingVolunteers.map((v: ExistingVolunteer) => [v.registrationNo, v])
    );

    const results = {
      added: [] as any[],
      duplicates: [] as any[],
      errors: [] as any[],
      skipped: 0,
    };

    const volunteersToCreate: Array<{
      name: string;
      registrationNo: string;
      contactNo: string;
      coordinatorId: number;
      uid?: string | null;
    }> = [];

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
        row["Registration Number"] ||
        row["REGISTRATION NUMBER"] ||
        ""
      ).trim();
      const contact_no = String(
        row["Contact No."] ||
        row["Contact no."] ||
        row["contact no."] ||
        row.contact_no ||
        row.CONTACT_NO ||
        row["Contact Number"] ||
        row["CONTACT NUMBER"] ||
        ""
      ).trim();

      console.log(`📝 [ROW ${i + 1}] Extracted - Name: "${name}", Reg: "${registration_no}", Contact: "${contact_no}"`);

      if (!name || !registration_no || !contact_no) {
        console.log(`❌ [ROW ${i + 1}] Skipped - Missing required fields`);
        results.errors.push({
          row,
          reason: "Missing name, registration number, or contact number",
        });
        continue;
      }

      // Check if volunteer exists for another coordinator
      const existsForOtherCoordinator = otherCoordinatorVolunteersMap.get(registration_no);
      if (existsForOtherCoordinator) {
        console.log(`❌ [ROW ${i + 1}] Blocked - Volunteer already exists for coordinator "${existsForOtherCoordinator.coordinatorName}"`);
        results.errors.push({
          row: { name, registration_no, contact_no },
          reason: `Volunteer "${name}" (${registration_no}) already exists for coordinator "${existsForOtherCoordinator.coordinatorName}". A volunteer cannot be assigned to multiple coordinators.`,
        });
        continue;
      }

      // Check if exists in our map
      const existing = existingVolunteersMap.get(registration_no);

      if (existing) {
        // Compare all fields to see if anything changed
        const nameChanged = existing.name !== name;
        const contactChanged = existing.contactNo !== contact_no;

        if (nameChanged || contactChanged) {
          console.log(`⚠️ [ROW ${i + 1}] Duplicate with different data: ${existing.name} (ID: ${existing.id})`);
          results.duplicates.push({
            existing: {
              id: existing.id,
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
        volunteersToCreate.push({
          name,
          registrationNo: registration_no,
          contactNo: contact_no,
          coordinatorId,
        });
      }
    }

    // Fetch UIDs from people table for all volunteers to create
    if (volunteersToCreate.length > 0) {
      console.log(`\n🔍 [VOLUNTEER BULK UPLOAD] Fetching UIDs from people table for ${volunteersToCreate.length} volunteers...`);
      const registrationNosToLookup = volunteersToCreate.map(v => v.registrationNo);
      const peopleRecords = await prisma.person.findMany({
        where: {
          registrationNo: { in: registrationNosToLookup },
        },
        select: {
          registrationNo: true,
          uid: true,
        },
      });

      // Create a map of registration number to UID
      const uidMap = new Map<string, string | null>(
        peopleRecords.map(p => [p.registrationNo, p.uid])
      );

      // Add UIDs to volunteers to create
      volunteersToCreate.forEach(volunteer => {
        const uid = uidMap.get(volunteer.registrationNo);
        if (uid) {
          volunteer.uid = uid;
          console.log(`✅ [UID LOOKUP] Found UID for ${volunteer.registrationNo}: ${uid}`);
        } else {
          console.log(`⚠️ [UID LOOKUP] No UID found in people table for ${volunteer.registrationNo}`);
        }
      });
    }

    // Batch create all new volunteers at once
    if (volunteersToCreate.length > 0) {
      console.log(`\n📦 [VOLUNTEER BULK UPLOAD] Batch creating ${volunteersToCreate.length} volunteers...`);
      try {
        const createdVolunteers = await prisma.volunteer.createMany({
          data: volunteersToCreate,
          skipDuplicates: true,
        });
        console.log(`✅ [VOLUNTEER BULK UPLOAD] Successfully created ${createdVolunteers.count} volunteers`);

        // Fetch the created volunteers to return their IDs
        const createdRegistrationNos = volunteersToCreate.map(v => v.registrationNo);
        const newVolunteers = await prisma.volunteer.findMany({
          where: {
            registrationNo: { in: createdRegistrationNos },
            coordinatorId,
          },
          select: {
            id: true,
            name: true,
            registrationNo: true,
            contactNo: true,
            uid: true,
          },
        });

        results.added = newVolunteers.map(v => ({
          id: v.id,
          name: v.name,
          registration_no: v.registrationNo,
          contact_no: v.contactNo,
          uid: v.uid,
        }));
      } catch (error: any) {
        console.error(`💥 [VOLUNTEER BULK UPLOAD] Batch creation error:`, error.message);
        results.errors.push({
          row: { batch: true },
          reason: error.message,
        });
      }
    }

    console.log('\n📊 [VOLUNTEER BULK UPLOAD] Summary:');
    console.log(`  ✅ Added: ${results.added.length}`);
    console.log(`  ⚠️ Duplicates: ${results.duplicates.length}`);
    console.log(`  ⏭️  Skipped (identical): ${results.skipped}`);
    console.log(`  ❌ Errors: ${results.errors.length}`);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error processing volunteer bulk upload:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
