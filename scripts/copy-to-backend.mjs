import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '../../cc-gateway');
const distDir = path.resolve(scriptDir, '../dist');
const targetDir = path.join(backendDir, 'webui', 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`Error: ${distDir} does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

console.log('Copying frontend build to backend...');
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(distDir, targetDir, { recursive: true });
console.log(`Done. Copied to ${targetDir}`);
