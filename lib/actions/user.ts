import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  // Upsertパターンで競合状態を回避
  // Clerk webhookと同時に実行されても安全
  const [user] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.username || "unknown",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "Unknown",
      profileImageUrl: clerkUser.imageUrl,
      role: "student", // デフォルトは生徒
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.username || "unknown",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "Unknown",
        profileImageUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function updateUserRole(userId: string, role: "student" | "mentor" | "admin") {
  return await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
}