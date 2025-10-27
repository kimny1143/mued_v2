const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('1. Navigating to sign-in page...');
    await page.goto('http://localhost:3000/sign-in');

    console.log('2. Waiting for Clerk SignIn component...');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 5000 });

    console.log('3. Entering username...');
    await page.fill('input[name="identifier"]', 'test_student');

    console.log('4. Clicking Continue...');
    await page.click('button:has-text("Continue")');

    console.log('5. Waiting for next step...');
    await page.waitForTimeout(3000);

    // 次の画面で何が表示されるか確認
    const inputs = await page.$$('input');
    console.log(`\n📊 After clicking Continue:`);
    console.log(`   Found ${inputs.length} input fields`);

    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`   - Input: name="${name}", type="${type}", placeholder="${placeholder}"`);
    }

    // パスワードフィールドがあるか確認
    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      console.log('\n✅ Password field found - Password authentication is enabled');
    } else {
      console.log('\n❌ No password field - Likely using passwordless authentication');
    }

    // 現在のURLを確認
    console.log(`\nCurrent URL: ${page.url()}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();