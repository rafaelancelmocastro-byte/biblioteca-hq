import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = readdirSync('dist/assets').filter((name) => /\.(js|mjs|css)$/.test(name)).map((name) => `/assets/${name}`);
const target = join('dist', 'sw.js');
const source = readFileSync(target, 'utf8');
if (!source.includes('__ASSETS__')) throw new Error('Service Worker template not found');
writeFileSync(target, source.replace('__ASSETS__', JSON.stringify(assets)));
