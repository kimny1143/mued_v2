/**
 * Fix completed session status
 * Updates sessions where all questions are answered but status is still 'draft' or 'interviewing'
 */

import { db } from '@/db';
import { sessions, interviewQuestions, interviewAnswers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function fixCompletedSessionStatus() {
  console.log('🔍 Finding sessions with all questions answered...');

  // Get all sessions with their question/answer counts
  const allSessions = await db.select().from(sessions);

  for (const session of allSessions) {
    // Count total questions for this session
    const [{ totalQuestions }] = await db
      .select({ totalQuestions: sql<number>`count(*)::int` })
      .from(interviewQuestions)
      .where(eq(interviewQuestions.sessionId, session.id));

    // Count answered questions for this session
    const [{ answeredQuestions }] = await db
      .select({ answeredQuestions: sql<number>`count(*)::int` })
      .from(interviewAnswers)
      .where(eq(interviewAnswers.sessionId, session.id));

    console.log(`\n📊 Session: ${session.title} (${session.id})`);
    console.log(`   Current status: ${session.status}`);
    console.log(`   Questions: ${answeredQuestions}/${totalQuestions} answered`);

    // Determine correct status
    let correctStatus: 'draft' | 'interviewing' | 'completed' | 'archived' = session.status;

    if (totalQuestions > 0 && answeredQuestions === totalQuestions) {
      correctStatus = 'completed';
    } else if (answeredQuestions > 0) {
      correctStatus = 'interviewing';
    }

    // Update if status is incorrect
    if (correctStatus !== session.status) {
      console.log(`   ✅ Updating status: ${session.status} → ${correctStatus}`);

      await db
        .update(sessions)
        .set({
          status: correctStatus,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, session.id));

      console.log(`   ✓ Updated successfully!`);
    } else {
      console.log(`   ✓ Status is already correct`);
    }
  }

  console.log('\n✅ Done!');
}

fixCompletedSessionStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
