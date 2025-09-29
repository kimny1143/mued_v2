const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false }); // ブラウザを表示
  const page = await browser.newPage();

  try {
    console.log('1. Navigating to sign-in page...');
    await page.goto('http://localhost:3000/sign-in');

    console.log('2. Waiting for Clerk SignIn component...');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });

    console.log('3. Entering username: test_student');
    await page.fill('input[name="identifier"]', 'test_student');

    console.log('4. Clicking Continue...');
    await page.click('button:has-text("Continue")');

    console.log('5. Waiting for password field...');
    await page.waitForTimeout(2000);

    // パスワードフィールドを探す
    const passwordField = await page.$('input[type="password"]:visible');
    if (passwordField) {
      console.log('6. Password field found! Entering password...');
      await passwordField.fill('TestPassword123!');

      console.log('7. Looking for Sign in button...');
      await page.waitForTimeout(1000);

      // サインインボタンを探す
      const buttons = await page.$$('button');
      console.log(`   Found ${buttons.length} buttons`);

      for (const button of buttons) {
        const text = await button.textContent();
        console.log(`   Button: "${text}"`);
      }

      // Continue または Sign in ボタンをクリック
      const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
      if (signInButton) {
        console.log('8. Clicking sign in button...');
        await signInButton.click();
      }

      console.log('9. Waiting for navigation...');
      await page.waitForTimeout(5000);

      const finalUrl = page.url();
      console.log(`\nFinal URL: ${finalUrl}`);

      if (finalUrl.includes('/dashboard')) {
        console.log('✅ SUCCESS: Logged in and redirected to dashboard!');
      } else if (finalUrl.includes('google.com')) {
        console.log('❌ FAILED: Still redirected to Google OAuth');
      } else {
        console.log(`⚠️ Redirected to: ${finalUrl}`);
      }
    } else {
      console.log('❌ No password field found - checking current URL...');
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      if (currentUrl.includes('google.com')) {
        console.log('❌ Redirected directly to Google OAuth - user might not exist or password auth not enabled');
      }
    }

    // ブラウザを10秒間開いたままにして確認
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();