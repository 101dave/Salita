import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL });
const page = await context.newPage();
const errors = [];
let originalIds = new Set();
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('artifacts', { recursive: true });
const stamp = Date.now();
const email = `taylor.${stamp}@example.com`;
const password = 'Salita-test-2026!';
const log = (message) => console.log(`✓ ${message}`);
const workspace = async () => {
  const response = await context.request.get('/api/workspace');
  expect(response.ok()).toBeTruthy();
  return response.json();
};
const navigation = (name) => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) });

try {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Alex');
  const initial = await workspace();
  originalIds = new Set(initial.translations.map((item) => item.id));
  expect(initial.translations.length).toBeGreaterThanOrEqual(32);
  expect(initial.translations.filter((item) => item.saved).length).toBeGreaterThanOrEqual(24);
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  log('Seeded dashboard renders without horizontal overflow');

  await navigation('Translate').click();
  await page.getByLabel('Text to translate').fill('Thank you');
  await page.getByLabel('Translate to', { exact: true }).selectOption('ceb');
  await page.locator('main').getByRole('button', { name: 'Translate', exact: true }).click();
  await expect(page.locator('.translated-text')).toHaveText('Salamat');
  await page.getByRole('button', { name: 'Save to phrasebook', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unsave phrase', exact: true })).toBeVisible();
  log('Cebuano translation and optimistic phrase saving');

  await navigation('My phrasebook').click();
  await page.getByRole('button', { name: 'Add phrase', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase', { exact: true }).fill('Where can I get a taxi?');
  await dialog.getByLabel('Translation', { exact: true }).fill('Saan ako makakakuha ng taksi?');
  await dialog.getByRole('button', { name: 'Save phrase', exact: true }).click();
  let row = page.getByRole('row').filter({ hasText: 'Where can I get a taxi?' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Edit phrase', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Translation', { exact: true }).fill('Saan ako puwedeng sumakay ng taksi?');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(row).toContainText('Saan ako puwedeng sumakay ng taksi?');
  await page.getByLabel('Find the words you need…').fill('taxi');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await row.getByRole('button', { name: 'Delete phrase', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row).toHaveCount(0);
  log('Phrase creation, editing, searching, and confirmed deletion');

  await navigation('Collections').click();
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Collection name', { exact: true }).fill('Travel with confidence');
  await dialog.getByLabel('Description', { exact: false }).fill('Useful phrases for the next adventure.');
  await dialog.getByRole('button', { name: 'Ocean blue', exact: true }).click();
  await dialog.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Travel with confidence', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Travel with confidence', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Collection name', { exact: true }).fill('Travel essentials');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Travel essentials', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Travel essentials');
  await page.getByRole('button', { name: 'Add phrase', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase', { exact: true }).fill('A window seat, please');
  await dialog.getByLabel('Translation', { exact: true }).fill('Sa tabi ng bintana, pakiusap');
  await dialog.getByRole('button', { name: 'Save phrase', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'A window seat, please' })).toBeVisible();
  await navigation('Collections').click();
  await page.getByRole('button', { name: 'Delete Travel essentials', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Travel essentials', exact: true })).toHaveCount(0);
  let current = await workspace();
  expect(current.translations.find((item) => item.sourceText === 'A window seat, please').collectionId).toBeNull();
  log('Collection CRUD and phrase preservation after collection deletion');

  // Remove only phrases made during the public-demo checks.
  for (const item of current.translations.filter((item) => !originalIds.has(item.id))) {
    const response = await context.request.delete('/api/workspace', { data: { resource: 'translations', id: item.id } });
    expect(response.ok()).toBeTruthy();
  }

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create an account', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Your name', { exact: true }).fill('Taylor Santos');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Create your account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Taylor');
  current = await workspace();
  expect(current.isDemo).toBe(false);
  expect(current.translations).toHaveLength(24);
  expect(current.activity).toHaveLength(0);
  const accountId = current.user.id;
  const session = (await context.cookies()).find((cookie) => cookie.name === 'salita_session');
  expect(session.httpOnly).toBe(true);
  expect(session.secure).toBe(true);
  log('Secure account registration creates a private seeded workspace');

  await navigation('Learn languages').click();
  await page.getByRole('button', { name: 'World languages', exact: true }).click();
  const japanese = page.locator('.course-card').filter({ has: page.getByRole('heading', { name: 'Japanese', exact: true }) });
  await japanese.getByRole('button', { name: 'Start learning', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Let’s practice', exact: true }).click();
  for (const [index, answer] of ['こんにちは', 'おはようございます', 'ありがとうございます'].entries()) {
    await dialog.getByRole('button').filter({ hasText: answer }).click();
    await dialog.getByRole('button', { name: index < 2 ? 'Next phrase' : 'Finish lesson', exact: true }).click();
  }
  await expect(dialog.getByRole('heading', { name: 'A little more connected.', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Back to my languages', exact: true }).click();
  current = await workspace();
  expect(current.progress.find((item) => item.language === 'ja').completed).toBe(1);
  expect(current.activity).toHaveLength(1);
  log('Interactive world-language lesson saves progress and streak activity');

  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.locator('.profile-menu').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Alex');
  expect((await workspace()).isDemo).toBe(true);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Taylor');
  current = await workspace();
  expect(current.user.id).toBe(accountId);
  expect(current.progress.find((item) => item.language === 'ja').completed).toBe(1);
  log('Sign-out and sign-in restore the same private account and lesson progress');

  // Verify settings and ensure private data cannot be accessed from a fresh session.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Taylor Santos');
  await page.getByLabel('A little learning, every day', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Settings saved');
  expect((await workspace()).user.dailyGoal).toBe(15);
  const anonymousContext = await browser.newContext({ baseURL });
  const anonymousWorkspace = await (await anonymousContext.request.get('/api/workspace')).json();
  expect(anonymousWorkspace.isDemo).toBe(true);
  expect(anonymousWorkspace.user.id).not.toBe(accountId);
  const badLogin = await anonymousContext.request.post('/api/auth/sign-in', { data: { email, password: 'wrong-password' } });
  expect(badLogin.status()).toBe(401);
  const blockedMutation = await anonymousContext.request.patch('/api/workspace', { data: { resource: 'translations', id: current.translations[0].id, translatedText: 'Not allowed' } });
  expect(blockedMutation.status()).toBe(404);
  await anonymousContext.close();
  log('Profile persistence, credential checks, and cross-workspace isolation');

  await page.getByRole('button', { name: 'Sign out securely', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Alex');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning, Alex');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await navigation('Learn languages').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find your next connection');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'artifacts/learning-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await navigation('My phrasebook').click();
  await page.getByRole('button', { name: 'Add phrase', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  log('390px mobile dashboard, navigation, language cards, and accessible editors');

  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'artifacts/dashboard-tablet.png', fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
  log('Tablet layout and zero client-side runtime errors');
  console.log('\nAll end-to-end smoke checks passed.');
} catch (error) {
  await page.screenshot({ path: 'artifacts/test-failure.png', fullPage: true, animations: 'disabled' });
  console.error('SMOKE TEST FAILED:', error);
  console.error('Client errors:', errors);
  process.exitCode = 1;
} finally {
  try {
    await context.request.post('/api/auth/sign-out');
    const demo = await workspace();
    if (originalIds.size) for (const item of demo.translations.filter((item) => !originalIds.has(item.id))) await context.request.delete('/api/workspace', { data: { resource: 'translations', id: item.id } });
    for (const item of demo.collections.filter((item) => ['Travel with confidence', 'Travel essentials'].includes(item.title))) await context.request.delete('/api/workspace', { data: { resource: 'collections', id: item.id } });
  } catch (error) { console.error('Test cleanup:', error.message); }
  await browser.close();
}
