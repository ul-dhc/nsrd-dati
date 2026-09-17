import { existsSync, renameSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputRoot = join(process.cwd(), 'dist', 'client');
const prefixedAssets = join(outputRoot, 'nsrd-dati', '_next');
const publicAssets = join(outputRoot, '_next');

if (!existsSync(prefixedAssets)) {
  throw new Error('GitHub Pages assets were not generated at dist/client/nsrd-dati/_next.');
}

renameSync(prefixedAssets, publicAssets);
rmdirSync(join(outputRoot, 'nsrd-dati'));
writeFileSync(join(outputRoot, '.nojekyll'), '');
