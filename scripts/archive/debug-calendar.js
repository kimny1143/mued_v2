const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });
  const page = await browser.newPage();

  // コンソールログをキャプチャ
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
  });

  // ネットワークリクエストをキャプチャ
  page.on('request', request => {
    if (request.url().includes('api')) {
      console.log(`[REQUEST]:`, request.method(), request.url());
    }
  });

  // レスポンスをキャプチャ
  page.on('response', response => {
    if (response.url().includes('api')) {
      console.log(`[RESPONSE]:`, response.status(), response.url());
    }
  });

  try {
    // ログイン
    console.log('\n=== STEP 1: Login ===');
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

    // カレンダーページへ
    console.log('\n=== STEP 2: Navigate to Calendar ===');
    await page.goto('http://localhost:3000/dashboard/booking-calendar');

    // 重要: ページの読み込み完了を待つ
    await page.waitForLoadState('networkidle');
    console.log('Page loaded - network idle');

    // APIコールを確認するために少し待つ
    await page.waitForTimeout(3000);

    // ページのHTMLを確認
    console.log('\n=== STEP 3: Check Page Content ===');
    const pageContent = await page.content();

    // data-available属性を持つ要素を探す
    const availableSlots = await page.$$('[data-available="true"]');
    console.log(`Found ${availableSlots.length} slots with data-available="true"`);

    // 別の方法でスロットを探す
    const slotButtons = await page.$$('button:has-text("このスロットを予約")');
    console.log(`Found ${slotButtons.length} booking buttons`);

    // カレンダービューの存在確認
    const calendarView = await page.$('[data-testid="calendar-view"]');
    console.log(`Calendar view element exists: ${!!calendarView}`);

    // ローディング状態を確認
    const loadingIndicator = await page.$('.animate-spin');
    console.log(`Loading indicator present: ${!!loadingIndicator}`);

    // エラーメッセージを確認
    const errorMessage = await page.$('text=エラー');
    console.log(`Error message present: ${!!errorMessage}`);

    // localStorageの確認
    console.log('\n=== STEP 4: Check Storage ===');
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.includes('clerk') || key.includes('auth'))) {
          items[key] = 'exists';
        }
      }
      return items;
    });
    console.log('LocalStorage auth keys:', Object.keys(localStorage));

    // 手動でAPIを呼び出してみる
    console.log('\n=== STEP 5: Manual API Call ===');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/lessons?available=true');
        const data = await response.json();
        return {
          status: response.status,
          slotsCount: data.slots ? data.slots.length : 0,
          error: data.error
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('Manual API call result:', apiResponse);

    // DevToolsを開いたまま10秒待つ
    console.log('\n=== Keeping browser open for inspection (10s) ===');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();