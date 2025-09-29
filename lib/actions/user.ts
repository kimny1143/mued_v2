import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  // DBからユーザー情報を取得
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  // ユーザーが存在しない場合は作成（初回ログイン対応）
  if (dbUser.length === 0) {
    const newUser = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.username || "unknown",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "Unknown",
        profileImageUrl: clerkUser.imageUrl,
        role: "student", // デフォルトは生徒
      })
      .returning();

    return newUser[0];
  }

  return dbUser[0];
}

export async function updateUserRole(userId: string, role: "student" | "mentor" | "admin") {
  return await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
}