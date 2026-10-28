import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
const baseURL = process.env.PREVIEW_URL || 'http://localhost:3000';
const views = ['overview', 'translate', 'phrasebook', 'learn', 'collections', 'history', 'settings'];
const widths = [320, 375, 390, 580, 640, 820, 1024, 1280, 1440];
const failures = [];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function check(width, view) {
  const metrics = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
  if (metrics.scroll > metrics.inner) failures.push({ width, view, ...metrics });
}

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of views) {
      await page.evaluate((value) => { location.hash = value; }, view);
      await page.waitForTimeout(90);
      await check(width, view);
    }
  }
  for (const width of [320, 390, 820]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { location.hash = 'phrasebook'; });
    await page.getByRole('button', { name: 'Add phrase', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(width, 'phrase editor');
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.evaluate(() => { location.hash = 'collections'; });
    await page.getByRole('button', { name: 'New collection', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(width, 'collection editor');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  }
  expect(failures, 'Screens with horizontal overflow').toEqual([]);
  expect(errors, 'Browser runtime errors').toEqual([]);
  console.log(`✓ ${widths.length * views.length} responsive screen checks and 6 dialog checks passed.`);
  console.log('✓ No horizontal page overflow or client-side runtime errors.');
} finally {
  await browser.close();
}
