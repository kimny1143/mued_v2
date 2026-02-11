const pw = require('@playwright/test');
const { mkdirSync } = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'screenshots', 'muedlobe-ui-brushup');
mkdirSync(dir, { recursive: true });

const games = [
  'tone-sequence',
  'mental-math',
  'symbol-match',
  'code-fill',
  'word-bridge',
  'pattern-complete',
  'focus-flow',
];

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const game of games) {
    const url = 'https://mued.jp/lobe/games/' + game + '?test=true';
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(dir, game + '.png'), fullPage: false });
    console.log('Saved: ' + path.join(dir, game + '.png'));
  }

  try {
    await page.goto('https://mued.jp/lobe', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('/lobe')) {
      await page.screenshot({ path: path.join(dir, 'lobe-list.png'), fullPage: true });
      console.log('Saved: ' + path.join(dir, 'lobe-list.png'));
    } else {
      console.log('List page redirected to: ' + currentUrl);
    }
  } catch (e) {
    console.log('List page: ' + e.message);
  }

  await browser.close();
  console.log('Done!');
})();
