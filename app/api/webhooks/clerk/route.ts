import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

export async function POST(req: Request) {
  // Clerk Webhookの秘密鍵を取得
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local");
  }

  // ヘッダーを取得
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // ヘッダーが存在しない場合はエラー
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // リクエストボディを取得
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Webhookを検証
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // イベントタイプに応じて処理
  const eventType = evt.type;

  if (eventType === "user.created") {
    // ユーザー作成時の処理
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

    try {
      // ユーザーを作成
      const newUsers = await db.insert(users).values({
        clerkId: id,
        email: email_addresses?.[0]?.email_address || username || "unknown",
        name: `${first_name || ""} ${last_name || ""}`.trim() || username || "Unknown",
        profileImageUrl: image_url,
        role: "student", // デフォルトは生徒
      }).returning();

      const newUser = newUsers[0];
      logger.debug(`User created: ${id}`);

      // 新規ユーザーにFreemiumプランのサブスクリプションを自動作成
      await db.insert(subscriptions).values({
        userId: newUser.id,
        tier: "freemium",
        status: "active",
      });
      logger.debug(`Freemium subscription created for user: ${id}`);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  if (eventType === "user.updated") {
    // ユーザー更新時の処理（存在しなければ作成 - upsert）
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

    try {
      // まず既存ユーザーを確認
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, id))
        .limit(1);

      if (existingUsers.length === 0) {
        // ユーザーが存在しない場合は作成（user.created が発火しなかった既存ユーザー対応）
        const newUsers = await db.insert(users).values({
          clerkId: id,
          email: email_addresses?.[0]?.email_address || username || "unknown",
          name: `${first_name || ""} ${last_name || ""}`.trim() || username || "Unknown",
          profileImageUrl: image_url,
          role: "student",
        }).returning();

        const newUser = newUsers[0];
        logger.debug(`User created via update event: ${id}`);

        // Freemiumプランのサブスクリプションを自動作成
        await db.insert(subscriptions).values({
          userId: newUser.id,
          tier: "freemium",
          status: "active",
        });
        logger.debug(`Freemium subscription created for user: ${id}`);
      } else {
        // 既存ユーザーを更新
        await db
          .update(users)
          .set({
            email: email_addresses?.[0]?.email_address || username || "unknown",
            name: `${first_name || ""} ${last_name || ""}`.trim() || username || "Unknown",
            profileImageUrl: image_url,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id));
        logger.debug(`User updated: ${id}`);
      }
    } catch (error) {
      console.error("Error updating/creating user:", error);
    }
  }

  if (eventType === "user.deleted") {
    // ユーザー削除時の処理
    try {
      await db.delete(users).where(eq(users.clerkId, evt.data.id!));
      logger.debug(`User deleted: ${evt.data.id}`);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  return new Response("", { status: 200 });
}