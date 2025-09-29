import { test, expect } from "@playwright/test";

test.describe("MUED LMS Basic Flow", () => {
  const baseUrl = "http://localhost:3000";

  test("ホームページが表示される", async ({ page }) => {
    await page.goto(baseUrl);

    // タイトル確認
    await expect(page).toHaveTitle(/MUED LMS/);

    // ヒーローセクションの確認
    const heroText = await page.locator("h2").first().textContent();
    expect(heroText).toContain("音楽レッスンを、もっと身近に");

    // サインアップボタンの確認
    const signUpButton = page.locator('text="無料で始める"').first();
    await expect(signUpButton).toBeVisible();
  });

  test("レッスン一覧API", async ({ request }) => {
    // APIテスト
    const response = await request.get(`${baseUrl}/api/lessons?available=true`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("slots");
    expect(Array.isArray(data.slots)).toBeTruthy();
  });

  test("認証フロー", async ({ page }) => {
    await page.goto(`${baseUrl}/sign-up`);

    // Clerkのサインアップフォームが表示されることを確認
    await expect(page.locator("form")).toBeVisible({ timeout: 10000 });

    // ユーザー名フィールドの存在確認
    const usernameField = page.locator('input[name="username"]');
    if (await usernameField.count() > 0) {
      await usernameField.fill("testuser" + Date.now());

      // パスワードフィールド
      const passwordField = page.locator('input[name="password"]');
      await passwordField.fill("TestPassword123!");

      // 確認用パスワード
      const confirmPasswordField = page.locator('input[name="confirmPassword"]');
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill("TestPassword123!");
      }
    }
  });

  test("ダッシュボードアクセス（未認証）", async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);

    // 未認証の場合、サインインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("レッスン予約フロー", () => {
  const baseUrl = "http://localhost:3000";

  test("レッスン一覧が表示される", async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard/lessons`);

    // 認証が必要な場合はサインインページへ
    if (page.url().includes("sign-in")) {
      console.log("認証が必要です");
      return;
    }

    // レッスン一覧ページの要素確認
    await expect(page.locator("h1")).toContainText("レッスン予約");
  });
});