import 'dotenv/config';
import prisma from '@/lib/prisma';

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database clear...');

    // Delete attendance records first (due to foreign key)
    const deletedAttendance = await prisma.attendance.deleteMany({});
    console.log(`✅ Deleted ${deletedAttendance.count} attendance records`);

    // Delete people
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
