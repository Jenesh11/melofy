const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const evidence = path.resolve(process.env.MELOFY_TEST_REPORT_DIR || 'test-results/discovery');
fs.mkdirSync(evidence, { recursive: true });

test('23 React hook and store regression scenarios', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => window.runComplete);
  const tests = await page.evaluate(() => window.runResults);
  fs.writeFileSync(path.join(evidence, 'browser-regressions.json'), JSON.stringify({ tests, pageErrors: errors }, null, 2));
  expect(tests.filter(test => !test.passed)).toEqual([]);
  expect(tests).toHaveLength(23);
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) test(`Discovery screen interactions at ${viewport.width}px`, async ({ page }) => {
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push(request.url()));
  await page.setViewportSize(viewport);
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Recommended For You' })).toBeVisible();
  await page.getByLabel('Discovery genre').selectOption('jazz');
  await page.getByLabel('Discovery language').selectOption('Hindi');
  await expect(page.getByRole('button', { name: 'Refresh discovery' })).toBeEnabled();
  await page.getByRole('button', { name: 'Refresh discovery' }).click();
  await expect.poll(() => page.evaluate(() => window.fixtureRequests.some(request => request.body?.genre === 'jazz' && request.body?.language === 'Hindi'))).toBe(true);
  await page.getByRole('button', { name: 'Play Chill Vibes', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.playerStore.getState().currentTrack?.id)).toBe('freshsong01');
  await expect.poll(() => page.evaluate(() => window.playerStore.getState().activeCollectionId)).toBe('mix:chill');
  await page.getByRole('button', { name: 'Save Chill Vibes to library', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.fixtureWrites?.length || 0)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.evaluate(() => { document.getElementById('root').scrollTop = 0; });
  await expect(page.getByLabel('Discovery genre')).toBeInViewport();
  await page.screenshot({ path: path.join(evidence, `discovery-${viewport.width}.png`) });
  fs.writeFileSync(path.join(evidence, `discovery-${viewport.width}.json`), JSON.stringify({ errors, failedRequests, viewport, mockedBoundaries: ['Firebase auth/storage', 'discovery HTTP data', 'navigation'] }, null, 2));
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
