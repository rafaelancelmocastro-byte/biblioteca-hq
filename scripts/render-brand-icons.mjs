import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const symbol = await loadImage(await readFile('public/brand-icon.svg'));

async function render(path, size, inset = 0) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.fillStyle = '#090b12';
  context.fillRect(0, 0, size, size);
  context.drawImage(symbol, inset, inset, size - inset * 2, size - inset * 2);
  await writeFile(path, canvas.toBuffer('image/png'));
}

await render('public/icon-192.png', 192);
await render('public/icon-512.png', 512);
await render('public/icon-maskable-512.png', 512, 52);
await render('public/favicon-32.png', 32);
