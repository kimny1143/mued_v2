#!/usr/bin/env tsx

/**
 * Database Utilities for MUED LMS v2
 *
 * Consolidated database management utilities:
 * - Create test users and data
 * - Verify database tables and structure
 * - Check reservations and data integrity
 * - Seed test lesson slots
 *
 * Usage:
 *   tsx db-utilities.ts seed-test              # Create test users and slots
 *   tsx db-utilities.ts verify                 # Verify all tables exist
 *   tsx db-utilities.ts check-reservations     # Check reservation data
 *   tsx db-utilities.ts check-tables          # List all tables and counts
 *   tsx db-utilities.ts clean-test            # Remove test data
 */

import { config } from 'dotenv';
import { db } from '../db';
import { users, lessonSlots, reservations } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createClerkClient } from '@clerk/backend';

// Load environment variables
config();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

// Command line argument parsing
const command = process.argv[2];

// Utility functions
async function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

async function logError(message: string) {
  console.error(`❌ ${message}`);
}

async function logInfo(message: string) {
  console.log(`📋 ${message}`);
}

// Command: seed-test - Create test users and lesson slots
async function seedTestData() {
  console.log('\n🌱 Seeding Test Data...\n');

  try {
    // Create test users
    const testUsers = [
      {
        clerkId: 'test_student_1',
        email: 'student1@test.com',
        name: 'Test Student 1',
        role: 'student' as const,
      },
      {
        clerkId: 'test_student_2',
        email: 'student2@test.com',
        name: 'Test Student 2',
        role: 'student' as const,
      },
      {
        clerkId: 'test_mentor_1',
        email: 'mentor1@test.com',
        name: 'Test Mentor 1',
        role: 'mentor' as const,
      },
      {
        clerkId: 'test_mentor_2',
        email: 'mentor2@test.com',
        name: 'Test Mentor 2',
        role: 'mentor' as const,
      }
    ];

    // Insert users
    for (const userData of testUsers) {
      const [user] = await db.insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: userData.email,
            name: userData.name,
            updatedAt: new Date()
          }
        })
        .returning();

      logSuccess(`Created/Updated user: ${user.name} (${user.role})`);
    }

    // Create test lesson slots for mentors
    const mentors = await db.select().from(users).where(eq(users.role, 'mentor'));

    for (const mentor of mentors) {
      // Create slots for next 7 days
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const slotDate = new Date(now);
        slotDate.setDate(slotDate.getDate() + i);

        // Morning slot (10:00)
        const morningSlot = new Date(slotDate);
        morningSlot.setHours(10, 0, 0, 0);

        // Afternoon slot (14:00)
        const afternoonSlot = new Date(slotDate);
        afternoonSlot.setHours(14, 0, 0, 0);

        // Evening slot (18:00)
        const eveningSlot = new Date(slotDate);
        eveningSlot.setHours(18, 0, 0, 0);

        const slots = [morningSlot, afternoonSlot, eveningSlot];

        for (const startTime of slots) {
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);

          await db.insert(lessonSlots)
            .values({
              mentorId: mentor.id,
              startTime,
              endTime,
              status: 'available',
              price: '5000'
            })
            .onConflictDoNothing();
        }
      }

      logSuccess(`Created lesson slots for ${mentor.name}`);
    }

    console.log('\n✅ Test data seeding completed!\n');

  } catch (error) {
    logError(`Failed to seed test data: ${error}`);
    process.exit(1);
  }
}

// Command: verify - Verify database tables exist
async function verifyTables() {
  console.log('\n🔍 Verifying Database Tables...\n');

  try {
    // Check each table
    const tables = [
      { name: 'users', query: () => db.select().from(users).limit(1) },
      { name: 'lesson_slots', query: () => db.select().from(lessonSlots).limit(1) },
      { name: 'reservations', query: () => db.select().from(reservations).limit(1) },
    ];

    for (const table of tables) {
      try {
        await table.query();
        logSuccess(`Table '${table.name}' exists and is accessible`);
      } catch (error) {
        logError(`Table '${table.name}' is not accessible: ${error}`);
      }
    }

    console.log('\n✅ Database verification completed!\n');

  } catch (error) {
    logError(`Database verification failed: ${error}`);
    process.exit(1);
  }
}

// Command: check-tables - List all tables with row counts
async function checkTables() {
  console.log('\n📊 Database Tables Summary\n');

  try {
    // Get counts for each table
    const userCount = await db.select().from(users);
    const slotCount = await db.select().from(lessonSlots);
    const reservationCount = await db.select().from(reservations);

    console.log('Table Statistics:');
    console.log('─'.repeat(50));
    console.log(`Users:           ${userCount.length} rows`);
    console.log(`  - Students:    ${userCount.filter(u => u.role === 'student').length}`);
    console.log(`  - Mentors:     ${userCount.filter(u => u.role === 'mentor').length}`);
    console.log(`Lesson Slots:    ${slotCount.length} rows`);
    console.log(`  - Available:   ${slotCount.filter(s => s.status === 'available').length}`);
    console.log(`  - Reserved:    ${slotCount.filter(s => s.status === 'reserved').length}`);
    console.log(`Reservations:    ${reservationCount.length} rows`);
    console.log(`  - Pending:     ${reservationCount.filter(r => r.status === 'pending').length}`);
    console.log(`  - Confirmed:   ${reservationCount.filter(r => r.status === 'confirmed').length}`);
    console.log(`  - Completed:   ${reservationCount.filter(r => r.status === 'completed').length}`);
    console.log('─'.repeat(50));

    // Show sample data
    if (userCount.length > 0) {
      console.log('\nSample Users:');
      userCount.slice(0, 3).forEach(user => {
        console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
      });
    }

  } catch (error) {
    logError(`Failed to check tables: ${error}`);
    process.exit(1);
  }
}

// Command: check-reservations - Check reservation data integrity
async function checkReservations() {
  console.log('\n📅 Checking Reservations...\n');

  try {
    const allReservations = await db.select({
      reservation: reservations,
      student: users,
      slot: lessonSlots
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.studentId, users.id))
    .leftJoin(lessonSlots, eq(reservations.slotId, lessonSlots.id));

    console.log(`Total Reservations: ${allReservations.length}`);
    console.log('─'.repeat(50));

    for (const { reservation, student, slot } of allReservations) {
      const startTime = slot?.startTime ? new Date(slot.startTime).toLocaleString() : 'N/A';
      const studentName = student?.name || 'Unknown';

      console.log(`ID: ${reservation.id}`);
      console.log(`  Student: ${studentName}`);
      console.log(`  Time: ${startTime}`);
      console.log(`  Status: ${reservation.status}`);
      console.log(`  Created: ${new Date(reservation.createdAt).toLocaleString()}`);
      console.log('');
    }

    // Check for data integrity issues
    const orphanedReservations = allReservations.filter(r => !r.student || !r.slot);
    if (orphanedReservations.length > 0) {
      logError(`Found ${orphanedReservations.length} orphaned reservations!`);
    } else {
      logSuccess('All reservations have valid references');
    }

  } catch (error) {
    logError(`Failed to check reservations: ${error}`);
    process.exit(1);
  }
}

// Command: clean-test - Remove test data
async function cleanTestData() {
  console.log('\n🧹 Cleaning Test Data...\n');

  const confirmPrompt = 'Are you sure you want to delete all test data? (yes/no): ';
  process.stdout.write(confirmPrompt);

  process.stdin.once('data', async (data) => {
    const answer = data.toString().trim().toLowerCase();

    if (answer !== 'yes') {
      console.log('Cleanup cancelled.');
      process.exit(0);
    }

    try {
      // Delete test reservations first (foreign key constraints)
      const testUsers = await db.select().from(users)
        .where(eq(users.email, 'test@example.com'));

      for (const user of testUsers) {
        await db.delete(reservations).where(eq(reservations.studentId, user.id));
        await db.delete(lessonSlots).where(eq(lessonSlots.mentorId, user.id));
      }

      // Delete test users
      const deleted = await db.delete(users)
        .where(eq(users.email, 'test@example.com'));

      logSuccess('Test data cleaned successfully');
      process.exit(0);

    } catch (error) {
      logError(`Failed to clean test data: ${error}`);
      process.exit(1);
    }
  });
}

// Main command router
async function main() {
  console.log('🛠️  MUED LMS Database Utilities\n');

  if (!command) {
    console.log('Usage: tsx db-utilities.ts [command]\n');
    console.log('Available commands:');
    console.log('  seed-test           - Create test users and lesson slots');
    console.log('  verify              - Verify all tables exist');
    console.log('  check-tables        - List all tables with row counts');
    console.log('  check-reservations  - Check reservation data integrity');
    console.log('  clean-test          - Remove test data (use with caution)');
    process.exit(0);
  }

  switch (command) {
    case 'seed-test':
      await seedTestData();
      break;
    case 'verify':
      await verifyTables();
      break;
    case 'check-tables':
      await checkTables();
      break;
    case 'check-reservations':
      await checkReservations();
      break;
    case 'clean-test':
      await cleanTestData();
      break;
    default:
      logError(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Execute
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});