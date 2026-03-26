import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const vendorDir = path.join(root, 'site', 'vendor');

await mkdir(vendorDir, { recursive: true });

await Promise.all([
  cp(path.join(root, 'node_modules', '@xterm', 'xterm', 'lib', 'xterm.mjs'), path.join(vendorDir, 'xterm.mjs')),
  cp(path.join(root, 'node_modules', '@xterm', 'addon-fit', 'lib', 'addon-fit.mjs'), path.join(vendorDir, 'addon-fit.mjs')),
  cp(path.join(root, 'node_modules', '@xterm', 'xterm', 'css', 'xterm.css'), path.join(vendorDir, 'xterm.css')),
  cp(path.join(root, 'node_modules', 'phaser', 'dist', 'phaser.min.js'), path.join(vendorDir, 'phaser.min.js')),
]);

console.log(`Copied vendor assets to ${vendorDir}`);
