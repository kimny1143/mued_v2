const { chromium } = require('@playwright/test');

// テスト結果を格納
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    testResults.passed.push(name);
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    testResults.failed.push({ name, error: error.message });
    console.error(`❌ FAILED: ${name} - ${error.message}`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    // 1. ヘルスチェック
    await runTest('Health Check', async () => {
      const response = await page.goto('http://localhost:3000/api/health');
      if (response.status() !== 200) throw new Error(`Status: ${response.status()}`);
    });

    // 2. DB接続確認
    await runTest('Database Connection', async () => {
      const response = await page.goto('http://localhost:3000/api/health/db');
      if (response.status() !== 200) throw new Error(`Status: ${response.status()}`);
    });

    // 3. レッスンAPI
    await runTest('Lessons API', async () => {
      const response = await page.goto('http://localhost:3000/api/lessons?available=true');
      if (response.status() !== 200) throw new Error(`Status: ${response.status()}`);
      const data = await response.json();
      if (!data.slots || data.slots.length === 0) {
        throw new Error('No available slots found');
      }
      console.log(`  Found ${data.slots.length} available slots`);
    });

    // 4. ログインフロー
    await runTest('Login Flow', async () => {
      await page.goto('http://localhost:3000/sign-in');

      // Clerkコンポーネントを待つ
      await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // ユーザー名入力
      await page.fill('input[name="identifier"]', 'test_student');
      await page.click('button:has-text("Continue")');

      // パスワード入力
      await page.waitForTimeout(2000);
      const passwordField = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await passwordField.fill('TestPassword123!');

      // サインインボタンを探してクリック
      await page.waitForTimeout(1000);
      const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
      if (signInButton) {
        await signInButton.click();
      }

      // ダッシュボードへのリダイレクトを待つ
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('  Successfully logged in and redirected to dashboard');
    });

    // 5. ダッシュボード表示
    await runTest('Dashboard Display', async () => {
      if (!page.url().includes('/dashboard')) {
        await page.goto('http://localhost:3000/dashboard');
      }

      // ダッシュボード要素の確認
      await page.waitForSelector('text=ようこそ', { timeout: 5000 });
      await page.waitForSelector('text=レッスン予約', { timeout: 5000 });
      console.log('  Dashboard loaded successfully');
    });

    // 6. 予約カレンダーページ
    await runTest('Booking Calendar Page', async () => {
      await page.goto('http://localhost:3000/dashboard/booking-calendar');

      // ページ読み込みとデータ取得を待つ
      await page.waitForTimeout(3000);

      // カレンダービューの確認（より柔軟な検索）
      let calendarView = await page.$('[data-testid="calendar-view"]');
      if (!calendarView) {
        // data-testidがない場合、他の方法で確認
        calendarView = await page.$('text=レッスン予約カレンダー');
        if (!calendarView) throw new Error('Calendar page not loaded');
      }

      // 利用可能スロットの確認
      const availableSlots = await page.$$('[data-available="true"]');

      if (availableSlots.length === 0) {
        // スロットがレンダリングされていない可能性
        const loadingIndicator = await page.$('.animate-spin');
        if (loadingIndicator) {
          await page.waitForTimeout(3000); // 追加の待機
          const slotsAfterWait = await page.$$('[data-available="true"]');
          if (slotsAfterWait.length > 0) {
            console.log(`  Found ${slotsAfterWait.length} available slots after waiting`);
          } else {
            testResults.warnings.push('No available slots displayed on calendar');
          }
        } else {
          testResults.warnings.push('No available slots displayed on calendar');
        }
      } else {
        console.log(`  Found ${availableSlots.length} available slots on calendar`);
      }
    });

    // 7. スロット予約クリック
    await runTest('Slot Booking Click', async () => {
      const slots = await page.$$('[data-available="true"]');
      if (slots.length === 0) {
        throw new Error('No available slots to click');
      }

      // 最初のスロットの予約ボタンをクリック
      const bookButton = await slots[0].$('button:has-text("このスロットを予約")');
      if (bookButton) {
        await bookButton.click();
        await page.waitForTimeout(2000);
        console.log('  Clicked booking button successfully');
      } else {
        throw new Error('Booking button not found');
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    // テスト結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const total = testResults.passed.length + testResults.failed.length;
    const passRate = ((testResults.passed.length / total) * 100).toFixed(1);

    console.log(`\n✅ Passed: ${testResults.passed.length}/${total} (${passRate}%)`);
    if (testResults.passed.length > 0) {
      testResults.passed.forEach(test => {
        console.log(`   - ${test}`);
      });
    }

    if (testResults.failed.length > 0) {
      console.log(`\n❌ Failed: ${testResults.failed.length}/${total}`);
      testResults.failed.forEach(({ name, error }) => {
        console.log(`   - ${name}: ${error}`);
      });
    }

    if (testResults.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      testResults.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // デプロイ可否判定
    if (passRate >= 80) {
      console.log('🚀 DEPLOY STATUS: READY (>80% pass rate)');
    } else if (passRate >= 60) {
      console.log('⚠️  DEPLOY STATUS: RISKY (60-79% pass rate)');
    } else {
      console.log('🛑 DEPLOY STATUS: NOT READY (<60% pass rate)');
    }

    await browser.close();

    // エラーコードを返す
    process.exit(testResults.failed.length > 0 ? 1 : 0);
  }
})();