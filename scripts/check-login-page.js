const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/sign-in');

    // ページの読み込みを待つ
    await page.waitForTimeout(3000);

    // Clerk要素の存在確認
    const clerkElements = await page.$$('[data-clerk-id]');
    console.log(`Found ${clerkElements.length} Clerk elements`);

    // input要素を探す
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input elements`);

    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      console.log(`  Input: name="${name}", type="${type}", placeholder="${placeholder}", id="${id}"`);
    }

    // ボタンを探す
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} button elements`);

    for (const button of buttons) {
      const text = await button.textContent();
      console.log(`  Button: "${text}"`);
    }

    // 実際のHTMLの一部を表示
    const bodyHTML = await page.evaluate(() => {
      const body = document.querySelector('body');
      // Clerkのログインフォーム部分を探す
      const signInDiv = document.querySelector('[data-clerk-id], .cl-signIn-root, .cl-component');
      if (signInDiv) {
        return signInDiv.outerHTML.substring(0, 500) + '...';
      }
      return body ? body.innerHTML.substring(0, 500) + '...' : 'No body found';
    });

    console.log('\nHTML snippet:');
    console.log(bodyHTML);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();