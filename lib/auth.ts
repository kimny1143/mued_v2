import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 認証済みユーザーを取得する
 *
 * Clerk認証とデータベースのユーザー情報を統合して返す
 *
 * @throws {Error} 未認証の場合
 * @throws {Error} ユーザーがデータベースに存在しない場合
 * @returns 認証済みユーザー情報
 *
 * @example
 * ```typescript
 * // APIルートでの使用
 * export async function GET(request: Request) {
 *   try {
 *     const user = await getAuthenticatedUser();
 *     // ビジネスロジック
 *     return NextResponse.json({ data });
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: error.message },
 *       { status: 401 }
 *     );
 *   }
 * }
 * ```
 */
export async function getAuthenticatedUser() {
  // Clerk認証チェック
  const { userId } = auth();

  if (!userId) {
    throw new Error('Unauthorized: No valid session found');
  }

  // データベースからユーザー取得
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user) {
    throw new Error('User not found in database');
  }

  return user;
}

/**
 * E2Eテストモードかどうかを判定
 *
 * 環境変数 `E2E_TEST_MODE` が 'true' の場合にtrueを返す
 * 本番環境では常にfalseになることを保証
 *
 * @returns E2Eテストモードの場合true
 */
export function isE2ETestMode(): boolean {
  return process.env.E2E_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

/**
 * 認証済みユーザーを取得（E2Eテストモード対応）
 *
 * E2Eテストモードの場合、テストユーザーIDを受け入れる
 * 本番環境では常に通常の認証を使用
 *
 * @param testUserId E2Eテスト用のユーザーID（オプション）
 * @returns 認証済みユーザー情報
 *
 * @example
 * ```typescript
 * // E2Eテスト対応APIルート
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   const testUserId = isE2ETestMode() ? body.testUserId : undefined;
 *
 *   try {
 *     const user = await getAuthenticatedUserWithE2E(testUserId);
 *     // ビジネスロジック
 *   } catch (error) {
 *     return NextResponse.json({ error: error.message }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function getAuthenticatedUserWithE2E(testUserId?: string) {
  // E2Eテストモードの場合
  if (isE2ETestMode() && testUserId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });

    if (!user) {
      throw new Error('Test user not found in database');
    }

    return user;
  }

  // 通常の認証フロー
  return getAuthenticatedUser();
}

/**
 * 管理者権限チェック
 *
 * @param user ユーザー情報
 * @throws {Error} 管理者権限がない場合
 */
export function requireAdmin(user: { role: string }) {
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

/**
 * メンター権限チェック
 *
 * @param user ユーザー情報
 * @throws {Error} メンター権限がない場合
 */
export function requireMentor(user: { role: string }) {
  if (user.role !== 'mentor' && user.role !== 'admin') {
    throw new Error('Forbidden: Mentor access required');
  }
}

/**
 * ユーザー所有権チェック
 *
 * @param user 認証済みユーザー
 * @param resourceUserId リソースの所有者ID
 * @throws {Error} 所有者でない場合（管理者は除く）
 */
export function requireOwnership(user: { id: string; role: string }, resourceUserId: string) {
  if (user.role !== 'admin' && user.id !== resourceUserId) {
    throw new Error('Forbidden: You do not own this resource');
  }
}
