const { test, expect } = require('@playwright/test');

function wav(seconds = 15) {
  const length = seconds * 8000 * 2;
  const buffer = Buffer.alloc(44 + length);
  buffer.write('RIFF'); buffer.writeUInt32LE(36 + length, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(length, 40);
  return buffer;
}
const audio = wav();
// Answer Range requests like the real relay does; without them Chrome marks the
// media unseekable and every currentTime assignment snaps back to 0.
const playable = route => {
  const match = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
  if (!match) return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes' }, body: audio });
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), audio.length - 1) : audio.length - 1;
  return route.fulfill({
    status: 206,
    contentType: 'audio/wav',
    headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${audio.length}` },
    body: audio.subarray(start, end + 1),
  });
};
const current = page => page.evaluate(() => ({ id: window.playerStore.getState().currentTrack?.id, playing: window.playerStore.getState().isPlaying, queue: window.playerStore.getState().queue.map(t => t.id), progress: window.playerStore.getState().progress }));
async function setup(page, ticketHandler) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/stream-ticket', ticketHandler || (route => route.fulfill({ json: { ticket: 'same-ticket' } })));
  await page.goto('/player');
  await page.waitForFunction(() => window.playerStore);
  await page.evaluate(() => window.playerStore.getState().playPlaylist([window.fixtureTracks.seed, window.fixtureTracks.next]));
  return errors;
}

test('A failed media request reloads even with an identical ticket and preserves the selected song', async ({ page }) => {
  const urls = [];
  await page.route('**/api/stream?*', route => { urls.push(route.request().url()); return urls.length === 1 ? route.fulfill({ status: 503, body: 'temporary outage' }) : playable(route); });
  const errors = await setup(page);
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  expect(urls.length).toBe(2);
  expect(new Set(urls).size).toBe(2);
  expect(await current(page)).toMatchObject({ id: 'abcdefghijk', playing: true, queue: ['freshsong01'] });
  expect(errors).toEqual([]);
});

test('Persistent media failures stop on the same song with a bounded retry budget; Play retries it', async ({ page }) => {
  let calls = 0, fail = true;
  await page.route('**/api/stream?*', route => { calls++; return fail ? route.fulfill({ status: 503, body: 'unavailable' }) : playable(route); });
  const errors = await setup(page);
  await expect.poll(() => current(page)).toMatchObject({ id: 'abcdefghijk', playing: false, queue: ['freshsong01'] });
  expect(calls).toBe(3);
  fail = false;
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  expect(await current(page)).toMatchObject({ id: 'abcdefghijk', playing: true, queue: ['freshsong01'] });
  expect(errors).toEqual([]);
});

test('Ticket outages retry without skipping and preserve the queue after retry exhaustion', async ({ page }) => {
  let count = 0, fail = true;
  await page.route('**/api/stream?*', playable);
  const errors = await setup(page, route => { count++; return fail ? route.fulfill({ status: 503, body: 'ticket unavailable' }) : route.fulfill({ json: { ticket: 'recovered' } }); });
  await expect.poll(() => current(page)).toMatchObject({ id: 'abcdefghijk', playing: false, queue: ['freshsong01'] });
  expect(count).toBe(3);
  fail = false;
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  expect(await current(page)).toMatchObject({ id: 'abcdefghijk', playing: true, queue: ['freshsong01'] });
  expect(errors).toEqual([]);
});

test('An old audio element cannot end, fail or change the progress of a newer selection', async ({ page }) => {
  await page.route('**/api/stream?*', playable);
  const errors = await setup(page);
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  await page.evaluate(() => {
    window.oldAudio = document.querySelector('audio');
    window.playerStore.getState().playNext();
  });
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  await page.evaluate(() => {
    Object.defineProperty(window.oldAudio, 'ended', { value: true });
    Object.defineProperty(window.oldAudio, 'error', { value: { code: 4 } });
    window.oldAudio.dispatchEvent(new Event('ended', { bubbles: true }));
    window.oldAudio.dispatchEvent(new Event('error', { bubbles: true }));
    window.oldAudio.dispatchEvent(new Event('timeupdate', { bubbles: true }));
  });
  expect(await current(page)).toMatchObject({ id: 'freshsong01', playing: true });
  expect(errors).toEqual([]);
});

test('Recovery restores the playhead and respects a pause during a delayed ticket refresh', async ({ page }) => {
  let ticketCount = 0, delayed;
  await page.route('**/api/stream?*', playable);
  const errors = await setup(page, async route => {
    ticketCount++;
    if (ticketCount === 2) await new Promise(resolve => { delayed = resolve; });
    await route.fulfill({ json: { ticket: 'same-ticket' } });
  });
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  await page.locator('audio').evaluate(el => {
    el.currentTime = 5;
    window.playerStore.setState({ progress: 5000 });
    Object.defineProperty(el, 'error', { configurable: true, value: { code: 2 } });
    el.dispatchEvent(new Event('error', { bubbles: true }));
    delete el.error;
  });
  await expect.poll(() => ticketCount).toBe(2);
  await page.evaluate(() => window.playerStore.getState().pause());
  delayed();
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThanOrEqual(5);
  expect(await page.locator('audio').evaluate(el => el.paused)).toBe(true);
  expect(await current(page)).toMatchObject({ id: 'abcdefghijk', playing: false, queue: ['freshsong01'] });
  expect(errors).toEqual([]);
});

test('A genuine track ending advances the queue once', async ({ page }) => {
  await page.route('**/api/stream?*', playable);
  const errors = await setup(page);
  await expect.poll(() => page.locator('audio').evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  await page.locator('audio').evaluate(el => { el.currentTime = el.duration - 0.05; });
  await expect.poll(() => current(page)).toMatchObject({ id: 'freshsong01', playing: true, queue: [] });
  expect(errors).toEqual([]);
});
