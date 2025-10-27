const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false }); // ブラウザを表示
  const page = await browser.newPage();

  try {
    // ログイン
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/sign-in');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      await passwordField.fill('TestPassword123!');
      const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
      if (signInButton) await signInButton.click();
    }

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    // 予約カレンダーページへ
    console.log('2. Navigating to booking calendar...');
    await page.goto('http://localhost:3000/dashboard/booking-calendar');
    await page.waitForTimeout(3000); // ページ読み込み待機

    // ページソースを確認
    const pageContent = await page.content();

    // data-testidの存在確認
    if (pageContent.includes('data-testid="calendar-view"')) {
      console.log('✅ data-testid="calendar-view" FOUND');
    } else {
      console.log('❌ data-testid="calendar-view" NOT FOUND');
    }

    // 利用可能スロットの確認
    const availableSlots = await page.$$('[data-available="true"]');
    console.log(`\n📊 Available slots found: ${availableSlots.length}`);

    if (availableSlots.length > 0) {
      // 最初のスロット情報を取得
      const firstSlot = availableSlots[0];
      const slotText = await firstSlot.textContent();
      console.log(`First slot preview: ${slotText.substring(0, 100)}...`);
    }

    // エラーメッセージの確認
    const errorMessage = await page.$('text=エラー');
    if (errorMessage) {
      const error = await errorMessage.textContent();
      console.log(`⚠️ Error on page: ${error}`);
    }

    console.log('\n📸 Keeping browser open for 10 seconds to inspect...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();