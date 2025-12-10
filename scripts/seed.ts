import { config } from "dotenv";
import { db } from "../db";
import { users, lessonSlots, reservations, materials, subscriptions } from "../db/schema";

config({ path: ".env.local" });

async function seed() {
  console.log("🌱 シードデータの投入を開始します...");

  try {
    // 既存のデータをクリア（開発環境のみ）
    console.log("既存データをクリアしています...");
    await db.delete(reservations);
    await db.delete(lessonSlots);
    await db.delete(materials);
    await db.delete(subscriptions);
    await db.delete(users);

    // テストユーザーの作成
    console.log("テストユーザーを作成しています...");

    const testUsers = await db.insert(users).values([
      {
        clerkId: "test_admin_001",
        email: "admin@example.com",
        name: "管理者",
        role: "admin",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "システム管理者です",
      },
      {
        clerkId: "test_mentor_001",
        email: "mentor1@example.com",
        name: "田中先生",
        role: "mentor",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "ピアノ講師として10年の経験があります",
        skills: ["ピアノ", "音楽理論", "作曲"],
      },
      {
        clerkId: "test_mentor_002",
        email: "mentor2@example.com",
        name: "佐藤先生",
        role: "mentor",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "ギター指導のスペシャリストです",
        skills: ["ギター", "ベース", "バンド指導"],
      },
      {
        clerkId: "test_mentor_003",
        email: "mentor3@example.com",
        name: "鈴木エンジニア",
        role: "mentor",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "レコーディングスタジオで15年の経験。Pro Tools認定インストラクター。ミックス・マスタリングから録音まで幅広く指導します。",
        skills: ["Pro Tools", "ミックス", "マスタリング", "レコーディング", "DTM"],
      },
      {
        clerkId: "test_student_001",
        email: "student1@example.com",
        name: "山田太郎",
        role: "student",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "ピアノを始めたばかりの初心者です",
      },
      {
        clerkId: "test_student_002",
        email: "student2@example.com",
        name: "鈴木花子",
        role: "student",
        profileImageUrl: "https://via.placeholder.com/150",
        bio: "ギターで弾き語りができるようになりたいです",
      },
    ]).returning();

    const adminUser = testUsers[0];
    const mentor1 = testUsers[1];
    const mentor2 = testUsers[2];
    const mentor3 = testUsers[3]; // エンジニア
    const student1 = testUsers[4];
    const student2 = testUsers[5];

    // レッスンスロットの作成
    console.log("レッスンスロットを作成しています...");

    const now = new Date();

    // 明日と明後日の基準日を作成
    const getTomorrow = () => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const getDayAfterTomorrow = () => {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const slots = await db.insert(lessonSlots).values([
      {
        mentorId: mentor1.id,
        startTime: new Date(getTomorrow().setHours(10, 0, 0, 0)),
        endTime: new Date(getTomorrow().setHours(11, 0, 0, 0)),
        price: "5000",
        maxCapacity: 1,
        currentCapacity: 0,
        status: "available",
        tags: ["piano", "beginner", "classical"],
      },
      {
        mentorId: mentor1.id,
        startTime: new Date(getTomorrow().setHours(14, 0, 0, 0)),
        endTime: new Date(getTomorrow().setHours(15, 0, 0, 0)),
        price: "5000",
        maxCapacity: 1,
        currentCapacity: 1,
        status: "booked",
        tags: ["piano", "intermediate", "theory"],
      },
      {
        mentorId: mentor2.id,
        startTime: new Date(getDayAfterTomorrow().setHours(13, 0, 0, 0)),
        endTime: new Date(getDayAfterTomorrow().setHours(14, 0, 0, 0)),
        price: "4500",
        maxCapacity: 1,
        currentCapacity: 0,
        status: "available",
        tags: ["guitar", "beginner", "pop"],
      },
      {
        mentorId: mentor2.id,
        startTime: new Date(getDayAfterTomorrow().setHours(16, 0, 0, 0)),
        endTime: new Date(getDayAfterTomorrow().setHours(17, 0, 0, 0)),
        price: "4500",
        maxCapacity: 2,
        currentCapacity: 0,
        status: "available",
        tags: ["guitar", "bass", "rock", "intermediate"],
      },
      // エンジニア（鈴木）のスロット
      {
        mentorId: mentor3.id,
        startTime: new Date(getTomorrow().setHours(19, 0, 0, 0)),
        endTime: new Date(getTomorrow().setHours(21, 0, 0, 0)),
        price: "8000",
        maxCapacity: 1,
        currentCapacity: 0,
        status: "available",
        tags: ["protools", "mixing", "recording", "dtm"],
      },
      {
        mentorId: mentor3.id,
        startTime: new Date(getDayAfterTomorrow().setHours(14, 0, 0, 0)),
        endTime: new Date(getDayAfterTomorrow().setHours(16, 0, 0, 0)),
        price: "8000",
        maxCapacity: 1,
        currentCapacity: 0,
        status: "available",
        tags: ["protools", "mastering", "dtm"],
      },
    ]).returning();

    // 予約の作成
    console.log("予約を作成しています...");

    await db.insert(reservations).values([
      {
        slotId: slots[1].id, // 田中先生の14時のスロット
        studentId: student1.id,
        mentorId: mentor1.id,
        status: "approved",
        paymentStatus: "completed",
        amount: "5000",
        notes: "初回レッスンです。よろしくお願いします。",
      },
    ]);

    // 教材の作成
    console.log("教材を作成しています...");

    await db.insert(materials).values([
      {
        creatorId: mentor1.id,
        title: "ピアノ基礎練習 - ハノン第1番",
        description: "指の独立性を高める基礎練習です",
        content: "毎日15分、ゆっくりとしたテンポから始めましょう。",
        type: "text",
        tags: ["ピアノ", "基礎", "ハノン"],
        difficulty: "beginner",
        isPublic: true,
      },
      {
        creatorId: mentor1.id,
        title: "音階練習の重要性",
        description: "全調の音階をマスターすることの意味",
        content: "音階練習は一見退屈に思えますが、演奏技術の基礎となります。",
        type: "text",
        tags: ["音楽理論", "音階", "基礎"],
        difficulty: "intermediate",
        isPublic: true,
      },
      {
        creatorId: mentor2.id,
        title: "ギターコード表 - 初心者向け",
        description: "最初に覚えるべき10個のコード",
        content: "C, G, D, A, E, Am, Em, Dm, F, Bm の押さえ方を解説します。",
        type: "text",
        tags: ["ギター", "コード", "初心者"],
        difficulty: "beginner",
        isPublic: true,
      },
    ]);

    console.log("✅ シードデータの投入が完了しました！");
    console.log("\n📝 作成されたテストユーザー:");
    console.log("  管理者: admin (password: test1234)");
    console.log("  メンター1 (ピアノ): 田中先生");
    console.log("  メンター2 (ギター): 佐藤先生");
    console.log("  メンター3 (エンジニア): 鈴木エンジニア - Pro Tools, ミックス, マスタリング");
    console.log("  生徒1: 山田太郎");
    console.log("  生徒2: 鈴木花子");
    console.log("\n⚠️  注意: これらのユーザーでログインするには、Clerkでアカウントを作成する必要があります。");

  } catch (error) {
    console.error("❌ シードデータの投入中にエラーが発生しました:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();