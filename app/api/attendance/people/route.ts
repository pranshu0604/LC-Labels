import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch all people with attendance counts
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [GET PEOPLE] Fetching people from database');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "registrationNo";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const cutoffDate = searchParams.get("cutoffDate");

    console.log('🔍 [GET PEOPLE] Params - search:', search, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'cutoffDate:', cutoffDate);

    // Map frontend frontend sortBy values to database field names
    const sortField = sortBy === "registration" ? "registrationNo" : sortBy === "name" ? "name" : sortBy === "uid" ? "uid" : sortBy;

    const people = await prisma.person.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { registrationNo: { contains: search, mode: "insensitive" } },
              { contactNo: { contains: search, mode: "insensitive" } },
              { uid: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            attendance: cutoffDate ? {
              where: {
                date: {
                  lte: new Date(cutoffDate),
                },
              },
            } : true,
          },
        },
      },
      orderBy:
        sortBy === "attendance"
          ? { attendance: { _count: sortOrder as "asc" | "desc" } }
          : { [sortField]: sortOrder as "asc" | "desc" },
    });

    console.log('📊 [GET PEOPLE] Found', people.length, 'people');

    // Transform to match expected format
    const formattedPeople = people.map((person) => ({
      id: person.id,
      uid: person.uid,
      name: person.name,
      registration_no: person.registrationNo,
      contact_no: person.contactNo,
      created_at: person.createdAt,
      updated_at: person.updatedAt,
      attendance_count: person._count.attendance,
    }));

    console.log('✅ [GET PEOPLE] Returning', formattedPeople.length, 'formatted people');
    if (formattedPeople.length > 0) {
      console.log('📝 [GET PEOPLE] First person sample:', JSON.stringify(formattedPeople[0], null, 2));
    }

    return NextResponse.json({ people: formattedPeople });
  } catch (error: any) {
    console.error("❌ [GET PEOPLE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new person
export async function POST(req: NextRequest) {
  try {
    const { name, registration_no, contact_no } = await req.json();

    if (!name || !registration_no) {
      return NextResponse.json(
        { error: "Name and Registration No. are required" },
        { status: 400 }
      );
    }

    // Check if registration number already exists
    const existing = await prisma.person.findUnique({
      where: { registrationNo: registration_no },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "duplicate",
          existing: {
            id: existing.id,
            uid: existing.uid,
            name: existing.name,
            registration_no: existing.registrationNo,
            contact_no: existing.contactNo,
          },
        },
        { status: 409 }
      );
    }

    const person = await prisma.person.create({
      data: {
        name,
        registrationNo: registration_no,
        contactNo: contact_no || null,
      },
    });

    const updatedPerson = await prisma.person.update({
      where: { id: person.id },
      data: { uid: `UID-${person.id}` },
    });

    return NextResponse.json(
      {
        person: {
          id: updatedPerson.id,
          uid: updatedPerson.uid,
          name: updatedPerson.name,
          registration_no: updatedPerson.registrationNo,
          contact_no: updatedPerson.contactNo,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating person:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update a person
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, contact_no } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and Name are required" },
        { status: 400 }
      );
    }

    const person = await prisma.person.update({
      where: { id: Number(id) },
      data: {
        name,
        contactNo: contact_no || null,
      },
    });

    return NextResponse.json({
      person: {
        id: person.id,
        uid: person.uid,
        name: person.name,
        registration_no: person.registrationNo,
        contact_no: person.contactNo,
      },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    console.error("Error updating person:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a person
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.person.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting person:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
