const { neon } = require("@neondatabase/serverless");

async function createTestSlots() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log("Creating test users and lesson slots...");

    // まずテストメンターユーザーを作成または取得
    const mentors = [];
    for (let i = 1; i <= 3; i++) {
      const clerkId = `test_mentor_${i}`;
      const email = `mentor${i}@test.com`;
      const name = `テストメンター${i}`;

      // ユーザーが存在しなければ作成
      const existingUser = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkId}
      `;

      let mentorId;
      if (existingUser.length === 0) {
        const newUser = await sql`
          INSERT INTO users (clerk_id, email, name, role)
          VALUES (${clerkId}, ${email}, ${name}, 'mentor')
          RETURNING id
        `;
        mentorId = newUser[0].id;
        console.log(`Created mentor: ${name}`);
      } else {
        mentorId = existingUser[0].id;
        console.log(`Using existing mentor: ${name}`);
      }
      mentors.push({ id: mentorId, name });
    }

    // 既存のスロットをクリア
    await sql`DELETE FROM lesson_slots WHERE status = 'available'`;

    // 今日から7日間のスロットを作成
    const today = new Date();
    const slots = [];

    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);

      // 各日に3つのスロットを作成（10:00, 14:00, 18:00）
      const times = [10, 14, 18];

      for (const hour of times) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(hour + 1, 0, 0, 0);

        const mentor = mentors[Math.floor(Math.random() * mentors.length)];

        slots.push({
          mentorId: mentor.id,
          mentorName: mentor.name,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: "available",
          price: 5000 + (Math.floor(Math.random() * 3) * 1000),
        });
      }
    }

    // データベースに挿入
    for (const slot of slots) {
      await sql`
        INSERT INTO lesson_slots (mentor_id, start_time, end_time, status, price)
        VALUES (${slot.mentorId}, ${slot.startTime}, ${slot.endTime}, ${slot.status}, ${slot.price})
      `;
    }

    console.log(`✅ Created ${slots.length} test slots successfully`);

    // 作成したスロットを確認
    const result = await sql`SELECT COUNT(*) as count FROM lesson_slots WHERE status = 'available'`;
    console.log(`Total available slots in database: ${result[0].count}`);

  } catch (error) {
    console.error("Error creating test slots:", error);
  }
}

// 環境変数を読み込み
require("dotenv").config({ path: ".env.local" });

createTestSlots();