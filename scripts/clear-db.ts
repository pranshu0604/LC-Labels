import 'dotenv/config';
import prisma from '@/lib/prisma';

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database clear...');

    // Delete in order respecting foreign key constraints

    // Event attendance system (child tables first)
    const deletedEventAttendanceRecords = await prisma.eventAttendanceRecord.deleteMany({});
    console.log(`✅ Deleted ${deletedEventAttendanceRecords.count} event attendance records`);

    const deletedEventAttendanceSessions = await prisma.eventAttendanceSession.deleteMany({});
    console.log(`✅ Deleted ${deletedEventAttendanceSessions.count} event attendance sessions`);

    // Volunteers (depends on Coordinator)
    const deletedVolunteers = await prisma.volunteer.deleteMany({});
    console.log(`✅ Deleted ${deletedVolunteers.count} volunteers`);

    // Coordinators
    const deletedCoordinators = await prisma.coordinator.deleteMany({});
    console.log(`✅ Deleted ${deletedCoordinators.count} coordinators`);

    // Regular attendance system
    const deletedAttendance = await prisma.attendance.deleteMany({});
    console.log(`✅ Deleted ${deletedAttendance.count} attendance records`);

    // People
    const deletedPeople = await prisma.person.deleteMany({});
    console.log(`✅ Deleted ${deletedPeople.count} people records`);

    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
