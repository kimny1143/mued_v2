import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

// ユーザーデータの型定義
interface ClerkUserData {
  id: string;
  email_addresses?: { email_address: string }[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string;
  username?: string | null;
}

// 共通処理: ユーザー作成とサブスクリプション作成（トランザクション内で実行）
async function createUserWithSubscription(
  userData: ClerkUserData,
  source: "created" | "updated"
): Promise<void> {
  const { id, email_addresses, first_name, last_name, image_url, username } = userData;

  await db.transaction(async (tx) => {
    // ユーザーを作成
    const newUsers = await tx.insert(users).values({
      clerkId: id,
      email: email_addresses?.[0]?.email_address || username || "unknown",
      name: `${first_name || ""} ${last_name || ""}`.trim() || username || "Unknown",
      profileImageUrl: image_url,
      role: "student",
    }).returning();

    const newUser = newUsers[0];
    logger.debug(`User created via ${source} event: ${id}`);

    // Freemiumプランのサブスクリプションを自動作成
    await tx.insert(subscriptions).values({
      userId: newUser.id,
      tier: "freemium",
      status: "active",
    });
    logger.debug(`Freemium subscription created for user: ${id}`);
  });
}

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
    try {
      await createUserWithSubscription(evt.data as ClerkUserData, "created");
    } catch (error) {
      console.error(`Error creating user (clerk_id: ${evt.data.id}):`, error);
      // webhook処理失敗を示すため500を返す（Clerkがリトライする）
      return new Response("Error creating user", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    // ユーザー更新時の処理（存在しなければ作成 - upsert）
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

    try {
      await db.transaction(async (tx) => {
        // まず既存ユーザーを確認
        const existingUsers = await tx
          .select()
          .from(users)
          .where(eq(users.clerkId, id))
          .limit(1);

        if (existingUsers.length === 0) {
          // ユーザーが存在しない場合は作成（user.created が発火しなかった既存ユーザー対応）
          const newUsers = await tx.insert(users).values({
            clerkId: id,
            email: email_addresses?.[0]?.email_address || username || "unknown",
            name: `${first_name || ""} ${last_name || ""}`.trim() || username || "Unknown",
            profileImageUrl: image_url,
            role: "student",
          }).returning();

          const newUser = newUsers[0];
          logger.debug(`User created via update event: ${id}`);

          // Freemiumプランのサブスクリプションを自動作成（トランザクション内）
          await tx.insert(subscriptions).values({
            userId: newUser.id,
            tier: "freemium",
            status: "active",
          });
          logger.debug(`Freemium subscription created for user: ${id}`);
        } else {
          // 既存ユーザーを更新
          await tx
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
      });
    } catch (error) {
      console.error(`Error updating/creating user (clerk_id: ${id}):`, error);
      // webhook処理失敗を示すため500を返す（Clerkがリトライする）
      return new Response("Error updating/creating user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    // ユーザー削除時の処理
    try {
      await db.delete(users).where(eq(users.clerkId, evt.data.id!));
      logger.debug(`User deleted: ${evt.data.id}`);
    } catch (error) {
      console.error(`Error deleting user (clerk_id: ${evt.data.id}):`, error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
