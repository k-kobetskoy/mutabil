import { expect, test, type Page } from '@playwright/test';
import { FULL_ORDER, seedDraft } from './helpers';

/** A real JPEG with an EXIF segment (what phones write, GPS included), built in the page. */
async function photoWithExif(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const g = c.getContext('2d')!;
    g.fillStyle = '#d8cfc4';
    g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#6b7f99';
    g.fillRect(300, 300, 400, 200);
    const jpeg = new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9))).arrayBuffer());
    // APP1 "Exif\0\0" + little-endian TIFF header with an empty IFD
    const exif = [0xff, 0xe1, 0x00, 0x16, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const out = new Uint8Array(jpeg.length + exif.length);
    out.set(jpeg.subarray(0, 2));
    out.set(exif, 2);
    out.set(jpeg.subarray(2), 2 + exif.length);
    let s = '';
    out.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

/**
 * The first bytes of every stored file, read back from IndexedDB (UploadService mock: db
 * "mutabil-media", store "files"). Never creates the database: opening a missing one here would
 * make an empty db without the store and break the app's own idb-keyval store.
 */
async function storedFiles(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (!(await indexedDB.databases()).some((d) => d.name === 'mutabil-media')) return [];
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('mutabil-media');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!db.objectStoreNames.contains('files')) return (db.close(), []);
    // records are { info, file } (MockUploadService.put)
    const blobs = await new Promise<Blob[]>((resolve, reject) => {
      const all = db.transaction('files').objectStore('files').getAll();
      all.onsuccess = () => resolve((all.result as { file: Blob }[]).map((r) => r.file));
      all.onerror = () => reject(all.error);
    });
    db.close();
    return Promise.all(blobs.map(async (b) => String.fromCharCode(...new Uint8Array(await b.arrayBuffer()).subarray(0, 64))));
  });
}

test.describe('photos with marks (D27)', () => {
  test.skip(({ isMobile }) => isMobile, 'drawing is checked with a mouse on desktop');

  test('EXIF is gone, a stroke and a keyboard point are saved and survive a reload', async ({ page }) => {
    await seedDraft(page, { ...FULL_ORDER, inventory: { mode: 'preset' } });
    await page.goto('/ro/estimare/ce-transportam');

    const photo = await photoWithExif(page);
    expect(photo.includes(Buffer.from('Exif'))).toBe(true);
    await page.locator('input[type=file]').setInputFiles({ name: 'camera.jpg', mimeType: 'image/jpeg', buffer: photo });
    await expect(page.getByRole('button', { name: 'Marchează pe fotografie' })).toBeVisible();
    await expect.poll(() => storedFiles(page)).toHaveLength(1);
    const [stored] = await storedFiles(page);
    expect(stored.startsWith('\xff\xd8')).toBe(true); // still a JPEG
    expect(stored.includes('Exif')).toBe(false); // re-encoded without metadata (D27)

    await page.getByRole('button', { name: 'Marchează pe fotografie' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Marchează pe fotografie' })).toBeVisible();
    const frame = dialog.locator('.origin-top-left');
    await expect(frame).toHaveAttribute('style', /visibility: visible/);
    const box = (await frame.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * (0.3 + i * 0.03), box.y + box.height * (0.3 + i * 0.02));
    await page.mouse.up();

    const add = dialog.getByRole('button', { name: 'Adaugă un punct' });
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Punctul 1', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('textbox', { name: 'Comentariu pentru punctul 1' })).toBeFocused();
    await page.keyboard.type('dulap fragil');
    await dialog.getByRole('button', { name: 'Gata' }).first().click();

    await expect(page.getByRole('button', { name: '2 marcaje' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: '2 marcaje' })).toBeVisible();
  });
});
